#!/usr/bin/env bash
# lab-poll.sh — Check for new messages, meeting phases, and kanban changes for an agent
# Usage: lab-poll.sh <agent-name> [--quiet]
#
# Returns non-zero if there's nothing new. Prints a summary of pending items.
# With --quiet, only returns exit code (0=has new items, 1=nothing new).
#
# Designed to be called:
#   1. Directly by agents:       bash ../../scripts/lab-poll.sh <your-name>
#   2. By lab-agent.sh -poll:    injects output into agent's tmux session
#   3. By lab-meeting.sh:        after phase changes to notify agents

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# Use env var from agent session; fall back to legacy layout for backward compat
AGORA_PROJECT_DIR="${AGORA_PROJECT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
LAB_YAML="$AGORA_PROJECT_DIR/lab.yaml"
PATH_LIB="$SCRIPT_DIR/path-lib.sh"
if [[ ! -f "$PATH_LIB" ]]; then
  echo "ERROR: path-lib.sh not found at $PATH_LIB. Reinstall Agora or reinitialize the project runtime." >&2
  exit 1
fi
# shellcheck source=/dev/null
source "$PATH_LIB"
derived_project_dir=$(lab_find_project_dir_from_cwd 2>/dev/null || true)
if [[ -n "$derived_project_dir" ]]; then
  AGORA_PROJECT_DIR="$derived_project_dir"
  LAB_YAML="$AGORA_PROJECT_DIR/lab.yaml"
fi
MESSAGES_DIR="$(lab_message_dir)"
MEETINGS_DIR="$(lab_meeting_dir)"
PAPER_REVIEWS_DIR="$(lab_paper_review_dir)"
MESSAGE_REL="$(lab_message_rel)"
MEETING_REL="$(lab_meeting_rel)"
PAPER_REVIEW_REL="$(lab_paper_review_rel)"

AGENT_NAME="${1:-}"
[[ -n "$AGENT_NAME" ]] || { echo "Usage: lab-poll.sh <agent-name> [--quiet]" >&2; exit 2; }

# Validate agent name
if [[ ! "$AGENT_NAME" =~ ^[a-zA-Z][a-zA-Z0-9_-]*$ ]]; then
  echo "ERROR: Invalid agent name: '$AGENT_NAME'" >&2
  exit 2
fi

QUIET=0
if [[ "${2:-}" == "--quiet" ]]; then
  QUIET=1
fi

has_new=0
output=""

frontmatter_field() {
  local file="$1" key="$2"
  awk -v key="$key" '
    BEGIN { in_header=0 }
    /^---$/ {
      if (in_header == 0) {
        in_header=1
        next
      }
      exit
    }
    in_header && $0 ~ "^" key ":[[:space:]]*" {
      sub(/^[^:]+:[[:space:]]*/, "")
      print
      exit
    }
  ' "$file" 2>/dev/null || true
}

yaml_scalar() {
  local file="$1" key="$2"
  awk -v key="$key" '
    $0 ~ "^" key ":[[:space:]]*" {
      sub(/^[^:]+:[[:space:]]*/, "")
      print
      exit
    }
  ' "$file" 2>/dev/null || true
}

get_agent_role() {
  [[ -f "$LAB_YAML" ]] || return 0
  awk -v agent="$AGENT_NAME" '
    /^agents:/ { in_agents=1; next }
    in_agents && /^[^ ]/ { in_agents=0 }
    in_agents && /^  / {
      line = $0
      sub(/^  /, "", line)
      sub(/:.*/, "", line)
      if (line == agent) { in_agent=1; next }
    }
    in_agent && /^  [^ ]/ { in_agent=0 }
    in_agent && /^    role:/ {
      sub(/^[[:space:]]*role:[[:space:]]*/, "")
      gsub(/[[:space:]]*#.*/, "")
      print
      exit
    }
  ' "$LAB_YAML"
}

meeting_meta_list() {
  local meta="$1" section="$2"
  awk -v section="$section" '
    $0 == section ":" { in_section=1; next }
    in_section && /^[^ ]/ { exit }
    in_section {
      if ($0 ~ /^  - /) {
        line = $0
        sub(/^  - /, "", line)
        print line
        next
      }
      if ($0 ~ /^  [^ -]/) {
        exit
      }
    }
  ' "$meta"
}

paper_review_meta_list() {
  local meta="$1" section="$2"
  awk -v section="$section" '
    $0 == section ":" { in_section=1; next }
    in_section && /^[^ ]/ { exit }
    in_section {
      if ($0 ~ /^  - /) {
        line = $0
        sub(/^  - /, "", line)
        print line
        next
      }
      if ($0 ~ /^  [^ -]/) {
        exit
      }
    }
  ' "$meta" 2>/dev/null || true
}

message_sender() {
  basename "$1" | awk -F'_to_' '{print $1}'
}

AGENT_ROLE="$(get_agent_role)"

# --- Check for unread messages ---
unread_count=0
unread_summary=""

if [[ -d "$MESSAGES_DIR" ]]; then
  for msg_file in "$MESSAGES_DIR"/*"_to_${AGENT_NAME}_"*.md "$MESSAGES_DIR"/*_to_all_*.md; do
    [[ -f "$msg_file" ]] || continue
    if grep -q "^status: unread" "$msg_file" 2>/dev/null; then
      unread_count=$((unread_count + 1))
      if [[ $QUIET -eq 0 ]]; then
        msg_from=$(message_sender "$msg_file")
        msg_type=$(frontmatter_field "$msg_file" "type")
        [[ -n "$msg_type" ]] || msg_type="message"
        msg_file_name=$(basename "$msg_file")
        unread_summary="${unread_summary}  - [${msg_type}] from ${msg_from}: ${MESSAGE_REL}${msg_file_name}
"
      fi
    fi
  done
fi

if [[ $unread_count -gt 0 ]]; then
  has_new=1
  if [[ $QUIET -eq 0 ]]; then
    output="${output}[POLL] ${unread_count} unread message(s):
${unread_summary}"
  fi
fi

# --- Check for active meeting + pending actions ---
if [[ -d "$MEETINGS_DIR" ]]; then
  for meeting_dir in "$MEETINGS_DIR"/M*/; do
    [[ -d "$meeting_dir" ]] || continue
    meta="$meeting_dir/meta.yaml"
    [[ -f "$meta" ]] || continue

    status=$(yaml_scalar "$meta" "status")
    if [[ "$status" == "active" || "$status" == "deciding" ]]; then
      meeting_id=$(basename "$meeting_dir")
      phase=$(yaml_scalar "$meta" "phase")
      phase_upper=$(printf '%s' "$phase" | tr '[:lower:]' '[:upper:]')
      decision_maker=$(lab_decision_maker)

      # Check if this agent has pending action for current phase
      action_needed=""
      case "$phase" in
        prepare)
          if [[ "$AGENT_ROLE" == "student" ]]; then
            if [[ ! -f "${meeting_dir}perspectives/${AGENT_NAME}.md" ]]; then
              action_needed="Write your perspective to ${MEETING_REL}${meeting_id}/perspectives/${AGENT_NAME}.md"
            fi
          elif [[ "$AGENT_ROLE" == "research-staff" ]]; then
            if [[ ! -f "${meeting_dir}judgments/${AGENT_NAME}.md" ]]; then
              action_needed="Write your judgment to ${MEETING_REL}${meeting_id}/judgments/${AGENT_NAME}.md"
            fi
          fi
          ;;
        cross-read)
          if [[ ! -f "${meeting_dir}read-acks/${AGENT_NAME}.ack" ]]; then
            action_needed="Read all perspectives/judgments, then acknowledge with: bash ../../scripts/lab-meeting.sh -caller ${AGENT_NAME} -ack-read"
          fi
          ;;
        challenge)
          if [[ "$AGENT_ROLE" == "student" ]]; then
            students=$(meeting_meta_list "$meta" "students")
            missing_targets=()
            for other in $students; do
              [[ "$other" == "$AGENT_NAME" ]] && continue
              if [[ ! -f "${meeting_dir}critiques/${AGENT_NAME}_on_${other}.md" ]]; then
                missing_targets+=("$other")
              fi
            done
            if [[ ${#missing_targets[@]} -gt 0 ]]; then
              action_needed="Write critiques for ${missing_targets[*]} in ${MEETING_REL}${meeting_id}/critiques/"
            fi
          elif [[ "$AGENT_ROLE" == "research-staff" ]]; then
            if [[ ! -f "${meeting_dir}critiques/${AGENT_NAME}_on_all.md" ]]; then
              action_needed="Write systematic critique to ${MEETING_REL}${meeting_id}/critiques/${AGENT_NAME}_on_all.md"
            fi
          fi
          ;;
        respond)
          if [[ "$AGENT_ROLE" == "student" && ! -f "${meeting_dir}responses/${AGENT_NAME}_response.md" ]]; then
            action_needed="Write response to ${MEETING_REL}${meeting_id}/responses/${AGENT_NAME}_response.md"
          fi
          ;;
        decision)
          if [[ "$AGENT_NAME" == "$decision_maker" ]] && [[ ! -f "${meeting_dir}decision.md" ]]; then
            action_needed="Write decision to ${MEETING_REL}${meeting_id}/decision.md"
          fi
          ;;
      esac

      if [[ -n "$action_needed" ]]; then
        has_new=1
        if [[ $QUIET -eq 0 ]]; then
          output="${output}[POLL] Meeting ${meeting_id} — Phase: ${phase_upper}
  ACTION: ${action_needed}
"
        fi
      fi
    fi
  done
fi

# --- Check for active paper review rounds ---
if [[ -d "$PAPER_REVIEWS_DIR" ]]; then
  for meta in "$PAPER_REVIEWS_DIR"/P*/meta.yaml; do
    [[ -f "$meta" ]] || continue

    case_id=$(yaml_scalar "$meta" "case_id")
    status=$(yaml_scalar "$meta" "status")
    active_round=$(yaml_scalar "$meta" "active_round")
    [[ -n "$case_id" && -n "$active_round" ]] || continue

    if [[ "$status" == "active" ]]; then
      round_dir="$PAPER_REVIEWS_DIR/$case_id/rounds/$active_round"
      resolution_file="$round_dir/supervisor-resolution.md"

      if [[ "$AGENT_ROLE" == "paper-reviewer" ]]; then
        assigned=0
        while IFS= read -r reviewer; do
          [[ -n "$reviewer" ]] || continue
          if [[ "$reviewer" == "$AGENT_NAME" ]]; then
            assigned=1
            break
          fi
        done < <(paper_review_meta_list "$meta" "assigned_reviewers")

        if [[ $assigned -eq 1 && ! -s "$round_dir/reviews/${AGENT_NAME}.md" ]]; then
          has_new=1
          if [[ $QUIET -eq 0 ]]; then
            output="${output}[POLL] Paper review ${case_id} — Round: ${active_round}
  ACTION: Write your review to ${PAPER_REVIEW_REL}${case_id}/rounds/${active_round}/reviews/${AGENT_NAME}.md
"
          fi
        fi
      fi

      if [[ "$AGENT_NAME" == "supervisor" && ! -s "$resolution_file" ]]; then
        total_reviewers=0
        present_reviews=0
        while IFS= read -r reviewer; do
          [[ -n "$reviewer" ]] || continue
          total_reviewers=$((total_reviewers + 1))
          if [[ -s "$round_dir/reviews/${reviewer}.md" ]]; then
            present_reviews=$((present_reviews + 1))
          fi
        done < <(paper_review_meta_list "$meta" "assigned_reviewers")

        if [[ $total_reviewers -gt 0 && $present_reviews -eq $total_reviewers ]]; then
          has_new=1
          if [[ $QUIET -eq 0 ]]; then
            output="${output}[POLL] Paper review ${case_id} — Round: ${active_round}
  ACTION: All assigned reviews are present. Write the supervisor gate decision to ${PAPER_REVIEW_REL}${case_id}/rounds/${active_round}/supervisor-resolution.md
"
          fi
        fi
      fi
    fi
  done
fi

# --- Output ---
if [[ $QUIET -eq 1 ]]; then
  exit $((1 - has_new))
fi

if [[ $has_new -eq 1 ]]; then
  echo ""
  echo "=== Poll: ${AGENT_NAME} ($(date -u +"%H:%M:%S UTC")) ==="
  printf '%s' "$output"
  echo "==================================="
  exit 0
else
  exit 1
fi
