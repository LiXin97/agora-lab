#!/usr/bin/env bash
# meeting-inject.sh — SessionStart hook to inject pending messages and meeting status
# Usage: meeting-inject.sh <agent-name>

set -euo pipefail

AGENT_NAME="${1:-}"
[[ -n "$AGENT_NAME" ]] || exit 0

# Validate agent name
if [[ ! "$AGENT_NAME" =~ ^[a-zA-Z][a-zA-Z0-9_-]*$ ]]; then
  exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# Use env var from agent session; fall back to legacy layout for backward compat
AGORA_PROJECT_DIR="${AGORA_PROJECT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
PATH_LIB="$SCRIPT_DIR/../scripts/path-lib.sh"
if [[ ! -f "$PATH_LIB" ]]; then
  echo "ERROR: path-lib.sh not found at $PATH_LIB. Reinstall Agora or reinitialize this lab runtime." >&2
  exit 1
fi
# shellcheck source=/dev/null
source "$PATH_LIB"
MESSAGES_DIR="$(lab_message_dir)"
MEETINGS_DIR="$(lab_meeting_dir)"
KANBAN_FILE="$(lab_kanban_file)"
MESSAGE_REL="$(lab_message_rel)"
MEETING_REL="$(lab_meeting_rel)"

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

message_sender() {
  basename "$1" | awk -F'_to_' '{print $1}'
}

# --- Check for unread messages ---
unread_count=0
unread_summary=""

if [[ -d "$MESSAGES_DIR" ]]; then
    for msg_file in "$MESSAGES_DIR"/*"_to_${AGENT_NAME}_"*.md "$MESSAGES_DIR"/*_to_all_*.md; do
      [[ -f "$msg_file" ]] || continue
      if grep -q "^status: unread" "$msg_file" 2>/dev/null; then
        unread_count=$((unread_count + 1))
        msg_from=$(message_sender "$msg_file")
        msg_type=$(frontmatter_field "$msg_file" "type")
        [[ -n "$msg_type" ]] || msg_type="message"
        msg_file_name=$(basename "$msg_file")
        unread_summary="${unread_summary}  - [${msg_type}] from ${msg_from}: ${MESSAGE_REL}${msg_file_name}
"
    fi
  done
fi

if [[ $unread_count -gt 0 ]]; then
  output="${output}You have ${unread_count} unread message(s):
${unread_summary}
"
fi

# --- Check for active meetings ---
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
      output="${output}Active meeting: ${meeting_id} -- Phase: ${phase_upper}
  Meeting directory: ${MEETING_REL}${meeting_id}/
"

      # Check if this agent has submitted for current phase
      # Also check reviews/ for reviewers in prepare phase
      case "$phase" in
        prepare)
          if [[ -f "${meeting_dir}perspectives/${AGENT_NAME}.md" ]] || [[ -f "${meeting_dir}reviews/${AGENT_NAME}.md" ]]; then
            output="${output}  [OK] Your perspective/review is submitted
"
          else
            output="${output}  [ACTION] Write your perspective to ${MEETING_REL}${meeting_id}/perspectives/${AGENT_NAME}.md
"
          fi
          ;;
        challenge)
          has_critique=0
          for f in "${meeting_dir}critiques/${AGENT_NAME}"_*.md; do
            [[ -f "$f" ]] && has_critique=1 && break
          done
          if [[ $has_critique -eq 1 ]]; then
            output="${output}  [OK] You have submitted critique(s)
"
          else
            output="${output}  [ACTION] Write your critiques to ${MEETING_REL}${meeting_id}/critiques/
"
          fi
          ;;
        respond)
          if [[ -f "${meeting_dir}responses/${AGENT_NAME}_response.md" ]]; then
            output="${output}  [OK] Your response is submitted
"
          else
            output="${output}  [ACTION] Write your response to ${MEETING_REL}${meeting_id}/responses/${AGENT_NAME}_response.md
"
          fi
          ;;
        cross-read)
          if [[ -f "${meeting_dir}read-acks/${AGENT_NAME}.ack" ]]; then
            output="${output}  [OK] Your cross-read acknowledgement is recorded
"
          else
            output="${output}  [ACTION] Read all perspectives/reviews, then run: bash ../../scripts/lab-meeting.sh -caller ${AGENT_NAME} -ack-read
"
          fi
          ;;
        decision)
          if [[ "$AGENT_NAME" == "$(lab_decision_maker)" ]]; then
            if [[ -f "${meeting_dir}decision.md" ]]; then
              output="${output}  [OK] Decision written
"
            else
              output="${output}  [ACTION] Write decision to ${MEETING_REL}${meeting_id}/decision.md
"
            fi
          else
            output="${output}  Waiting for the configured decision maker's decision
"
          fi
          ;;
      esac
      output="${output}
"
    fi
  done
fi

# --- Check kanban for assigned tasks ---
if [[ -f "$KANBAN_FILE" ]]; then
  assigned_tasks=$(grep "| ${AGENT_NAME} |" "$KANBAN_FILE" 2>/dev/null | head -5 || true)
  if [[ -n "$assigned_tasks" ]]; then
    output="${output}Tasks assigned to you:
"
    while IFS= read -r row; do
      task_id=$(printf '%s' "$row" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $2); print $2}')
      title=$(printf '%s' "$row" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $3); print $3}')
      output="${output}  - ${task_id}: ${title}
"
    done <<< "$assigned_tasks"
    output="${output}
"
  fi
fi

# --- Output (no echo -e, use printf %s for safety) ---
if [[ -n "$output" ]]; then
  echo ""
  echo "=== Session Start: ${AGENT_NAME} ==="
  printf '%s' "$output"
  echo "==================================="
fi

exit 0
