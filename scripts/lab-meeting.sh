#!/usr/bin/env bash
# lab-meeting.sh — Group meeting orchestration for the virtual research lab
# Usage: lab-meeting.sh -new|-phase|-auto|-status [options]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AGORA_HOME="${AGORA_HOME:-$(cd "$SCRIPT_DIR/.." && pwd)}"
AGORA_PROJECT_DIR="${AGORA_PROJECT_DIR:-$AGORA_HOME}"
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
MEETINGS_DIR="$(lab_meeting_dir)"
MESSAGES_DIR="$(lab_message_dir)"

err() { printf 'ERROR: %b\n' "$1" >&2; exit 1; }
info() { echo "$1" >&2; }
warn() { echo "WARN: $1" >&2; }

PERSONA_LIB="$SCRIPT_DIR/persona-lib.sh"
[[ -f "$PERSONA_LIB" ]] || err "persona-lib.sh not found at $PERSONA_LIB"
# shellcheck source=/dev/null
source "$PERSONA_LIB"

# --- Caller identity ---
CALLER=""

get_caller_role() {
  local caller="$1"
  [[ -f "$LAB_YAML" ]] || return
  awk -v agent="$caller" '
    /^agents:/ { in_agents=1; next }
    in_agents && /^[^ ]/ { in_agents=0 }
    in_agents && /^  / {
      line = $0; sub(/^  /, "", line); sub(/:.*/, "", line)
      if (line == agent) { in_agent=1; next }
    }
    in_agent && /^  [^ ]/ { in_agent=0 }
    in_agent && /^    role:/ { sub(/.*role:[[:space:]]*/, ""); gsub(/[[:space:]]*#.*/, ""); print; exit }
  ' "$LAB_YAML"
}

agent_field() {
  local name="$1" field="$2"
  awk -v agent="$name" -v field="$field" '
    /^agents:/ { in_agents=1; next }
    in_agents && /^[^ ]/ { in_agents=0 }
    in_agents && /^  / {
      line = $0
      sub(/^  /, "", line)
      sub(/:.*/, "", line)
      if (line == agent) { in_agent=1; next }
    }
    in_agent && /^  [^ ]/ { in_agent=0 }
    in_agent && /^    / {
      fline = $0
      sub(/^    /, "", fline)
      fkey = fline
      sub(/:.*/, "", fkey)
      if (fkey == field) {
        sub(/^[^:]+:[[:space:]]*/, "", fline)
        gsub(/[[:space:]]*#.*/, "", fline)
        gsub(/^["'"'"']|["'"'"']$/, "", fline)
        print fline
        exit
      }
    }
  ' "$LAB_YAML"
}

effective_agent_backend() {
  local name="$1"
  local backend
  backend=$(agent_field "$name" "backend")
  [[ -n "$backend" ]] || return 1
  case "$backend" in
    claude|claude-code) printf 'claude-code\n' ;;
    codex) printf 'codex\n' ;;
    copilot|copilot-cli|gh-copilot) printf 'copilot\n' ;;
    *) return 1 ;;
  esac
}

resolve_agent_persona_preset() {
  local name="$1" role="${2:-}"
  [[ -n "$role" ]] || role=$(agent_field "$name" "role")

  local preset
  preset=$(agent_field "$name" "persona_preset")
  if [[ -z "$preset" ]]; then
    preset=$(derived_persona_preset "$role" "$name" 2>/dev/null || true)
  fi
  if [[ -n "$preset" ]] && persona_preset_exists "$role" "$preset"; then
    printf '%s\n' "$preset"
    return 0
  fi
  persona_default_field "$role" "persona_preset" 2>/dev/null || true
}

resolve_agent_persona_value() {
  local name="$1" role="$2" field="$3"
  local explicit="" fallback_field="$field"
  case "$field" in
    persona_preset)
      explicit=$(agent_field "$name" "persona_preset")
      ;;
    mbti|background|notable_results)
      explicit=$(agent_field "$name" "$field")
      ;;
    persona_lens)
      fallback_field="lens"
      ;;
  esac

  if [[ -n "$explicit" ]]; then
    if [[ "$field" == "mbti" ]]; then
      normalize_mbti "$explicit"
    else
      printf '%s\n' "$explicit"
    fi
    return 0
  fi

  local preset value=""
  preset=$(resolve_agent_persona_preset "$name" "$role")
  if [[ -n "$preset" ]]; then
    if [[ "$field" == "persona_lens" ]]; then
      value=$(persona_catalog_value "$role" "$preset" "lens" 2>/dev/null || true)
    else
      value=$(persona_catalog_value "$role" "$preset" "$field" 2>/dev/null || true)
    fi
    if [[ -n "$value" ]]; then
      if [[ "$field" == "mbti" ]]; then
        normalize_mbti "$value"
      else
        printf '%s\n' "$value"
      fi
      return 0
    fi
  fi

  value=$(persona_default_field "$role" "$fallback_field" 2>/dev/null || true)
  if [[ "$field" == "mbti" && -n "$value" ]]; then
    normalize_mbti "$value"
  else
    printf '%s\n' "$value"
  fi
}

agent_primary_notable_result() {
  local name="$1" role="$2"
  local results
  results=$(resolve_agent_persona_value "$name" "$role" "notable_results")
  first_delimited_segment "$results"
}

participant_profile_text() {
  local name="$1"
  local role backend mbti background strongest_result
  role=$(agent_field "$name" "role")
  backend=$(effective_agent_backend "$name" 2>/dev/null || agent_field "$name" "backend")
  mbti=$(resolve_agent_persona_value "$name" "$role" "mbti")
  background=$(resolve_agent_persona_value "$name" "$role" "background")
  strongest_result=$(agent_primary_notable_result "$name" "$role")
  printf '%s (%s, %s, %s) - %s Strongest result: %s' \
    "$name" "$role" "${backend:-unknown}" "${mbti:-unknown}" \
    "$(compact_text "$background" 110)" \
    "$(compact_text "$strongest_result" 88)"
}

participant_profile_markdown() {
  local name="$1"
  local role backend mbti background strongest_result
  role=$(agent_field "$name" "role")
  backend=$(effective_agent_backend "$name" 2>/dev/null || agent_field "$name" "backend")
  mbti=$(resolve_agent_persona_value "$name" "$role" "mbti")
  background=$(resolve_agent_persona_value "$name" "$role" "background")
  strongest_result=$(agent_primary_notable_result "$name" "$role")
  printf -- '- **%s** (%s, %s, %s) — %s Strongest result: %s\n' \
    "$name" "$role" "${backend:-unknown}" "${mbti:-unknown}" \
    "$(compact_text "$background" 120)" \
    "$(compact_text "$strongest_result" 96)"
}

require_mutation_runtime() {
  lab_require_script_runtime "$SCRIPT_DIR" "$AGORA_PROJECT_DIR"
}

require_bound_caller() {
  if [[ -z "$CALLER" ]]; then
    err "Missing -caller: caller identity required for authorization"
  fi

  local role
  role=$(get_caller_role "$CALLER")
  if [[ -z "$role" ]]; then
    err "Unknown caller '$CALLER' — register the agent in lab.yaml first"
  fi

  local bound_agent=""
  bound_agent=$(lab_bound_agent_from_cwd "$AGORA_PROJECT_DIR" || true)

  if [[ -n "$bound_agent" ]]; then
    if [[ "$bound_agent" != "$CALLER" ]]; then
      err "Caller '$CALLER' does not match the bound agent workspace '$bound_agent'"
    fi
  elif [[ "$CALLER" != "supervisor" ]]; then
    err "Unbound caller identity for '$CALLER'. Run this command from the caller's agent workspace, or use the supervisor operator shell."
  fi

  printf '%s\n' "$role"
}

require_meeting_controller() {
  local role
  role=$(require_bound_caller)
  if [[ "$role" == "supervisor" ]]; then
    return 0
  fi
  err "Only supervisor can perform this action (caller: $CALLER, role: ${role:-unknown})"
}

validate_agent_name() {
  local name="$1"
  if [[ ! "$name" =~ ^[a-zA-Z][a-zA-Z0-9_-]*$ ]]; then
    err "Invalid agent name: '$name'"
  fi
  if [[ ${#name} -gt 64 ]]; then
    err "Agent name too long (max 64): '$name'"
  fi
}

# --- Temp file cleanup ---
_tmp_files=()
cleanup() {
  for f in "${_tmp_files[@]}"; do
    rm -f "$f" 2>/dev/null || true
  done
  release_lock 2>/dev/null || true
}
trap cleanup EXIT

make_tmp() {
  local t
  t=$(mktemp "${MEETINGS_DIR}/tmp.XXXXXX")
  _tmp_files+=("$t")
  echo "$t"
}

# --- File locking (flock-based, same pattern as lab-kanban.sh) ---
LOCK_FILE="$MEETINGS_DIR/.meeting.lock"
LOCK_TIMEOUT=10
lock_fd=""

acquire_lock() {
  mkdir -p "$MEETINGS_DIR"
  touch "$LOCK_FILE"
  exec {lock_fd}< "$LOCK_FILE" || err "Cannot open meeting lock file"
  flock -x -w "$LOCK_TIMEOUT" "$lock_fd" || err "Cannot acquire meeting lock (timeout ${LOCK_TIMEOUT}s)"
}

release_lock() {
  if [[ -n "$lock_fd" ]]; then
    exec {lock_fd}<&- || true
    lock_fd=""
  fi
}

# --- Portable uppercase ---
to_upper() {
  printf '%s' "$1" | tr '[:lower:]' '[:upper:]'
}

# --- YAML helpers ---
yaml_get() {
  local key="$1"
  grep -E "^[[:space:]]*${key}:" "$LAB_YAML" | head -1 | awk -F': ' '{
    val = substr($0, index($0, ": ") + 2)
    if (val ~ /^"/) { sub(/^"/, "", val); sub(/"[[:space:]]*(#.*)?$/, "", val) }
    else if (val ~ /^'"'"'/) { sub(/^'"'"'/, "", val); sub(/'"'"'[[:space:]]*(#.*)?$/, "", val) }
    else { sub(/[[:space:]]*#.*$/, "", val) }
    gsub(/^[[:space:]]+|[[:space:]]+$/, "", val)
    print val
  }'
}

# Get all agent names from lab.yaml
get_all_agents() {
  awk '/^agents:/{found=1; next} found && /^[^ ]/{exit} found && /^  [a-zA-Z]/{gsub(/:.*/, ""); gsub(/^  /, ""); print}' "$LAB_YAML"
}

# Get agents by role (uses string comparison, not regex)
get_agents_by_role() {
  local target_role="$1"
  local agents
  agents=$(get_all_agents)
  for agent in $agents; do
    local role
    role=$(awk -v agent="$agent" '
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
    ' "$LAB_YAML")
    if [[ "$role" == "$target_role" ]]; then
      echo "$agent"
    fi
  done
}

get_meeting_participants() {
  {
    get_agents_by_role "supervisor"
    get_agents_by_role "student"
    get_agents_by_role "research-staff"
  } | awk 'NF'
}

# --- Phase ordering ---
PHASE_ORDER=("prepare" "cross-read" "challenge" "respond" "decision")

phase_index() {
  local phase="$1"
  for i in "${!PHASE_ORDER[@]}"; do
    if [[ "${PHASE_ORDER[$i]}" == "$phase" ]]; then
      echo "$i"
      return 0
    fi
  done
  return 1
}

# --- Meeting ID validation ---
validate_meeting_id() {
  local id="$1"
  if [[ ! "$id" =~ ^M[0-9]{3,}$ ]]; then
    err "Invalid meeting ID format: '$id'. Expected M followed by digits (e.g., M001)"
  fi
  # Prevent symlink attacks
  local meeting_path="$MEETINGS_DIR/$id"
  if [[ -L "$meeting_path" ]]; then
    err "Meeting path is a symlink: $meeting_path"
  fi
}

# --- Meeting ID generation (atomic via mkdir) ---
generate_meeting_id() {
  # Use atomic mkdir to prevent race conditions
  local max_attempts=100
  local next=1
  # Find highest existing meeting number once
  for d in "$MEETINGS_DIR"/M*/; do
    [[ -d "$d" ]] || continue
    local num
    num=$(basename "$d" | sed 's/^M0*//')
    if [[ -n "$num" && "$num" =~ ^[0-9]+$ && $num -ge $next ]]; then
      next=$((num + 1))
    fi
  done

  local attempt=0
  while [[ $attempt -lt $max_attempts ]]; do
    local meeting_id
    meeting_id=$(printf "M%03d" "$next")
    # mkdir is atomic — if two processes race, one will fail
    if mkdir "$MEETINGS_DIR/$meeting_id" 2>/dev/null; then
      echo "$meeting_id"
      return 0
    fi
    next=$((next + 1))
    attempt=$((attempt + 1))
  done
  err "Failed to create unique meeting directory after $max_attempts attempts"
}

# --- Get current meeting ---
get_active_meeting() {
  # Find the most recent meeting that hasn't reached decision phase completed
  # Use numeric sort on the M-prefix number to handle M1000+ correctly
  local latest
  latest=$(find "$MEETINGS_DIR" -maxdepth 1 -mindepth 1 -type d -name 'M*' -exec basename {} \; 2>/dev/null | sed 's/^M//' | sort -rn | head -1) || true
  if [[ -n "$latest" ]]; then
    local meeting_dir="$MEETINGS_DIR/M${latest}"
    # Re-add leading zeros if needed
    for d in "$MEETINGS_DIR"/M*; do
      if [[ "$(basename "$d" | sed 's/^M0*//')" == "$latest" ]]; then
        meeting_dir="$d"
        break
      fi
    done
    local meta="$meeting_dir/meta.yaml"
    if [[ -f "$meta" ]]; then
      local status
      status=$(grep "^status:" "$meta" | sed 's/^status:[[:space:]]*//')
      if [[ "$status" != "completed" ]]; then
        basename "$meeting_dir"
        return 0
      fi
    fi
  fi
  return 1
}

get_current_phase() {
  local meeting_id="$1"
  local meta="$MEETINGS_DIR/$meeting_id/meta.yaml"
  [[ -f "$meta" ]] || err "Meeting $meeting_id meta.yaml not found"
  grep "^phase:" "$meta" | sed 's/^phase:[[:space:]]*//'
}

meeting_meta_list() {
  local meeting_id="$1" section="$2"
  local meta="$MEETINGS_DIR/$meeting_id/meta.yaml"
  [[ -f "$meta" ]] || return 0
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

random_hex() {
  if [[ -r /dev/urandom ]]; then
    head -c 4 /dev/urandom | od -An -tx1 | tr -d ' \n'
  else
    printf '%s%s' "$RANDOM" "$RANDOM"
  fi
}

artifact_ready() {
  local path="$1"
  [[ -f "$path" && -s "$path" ]]
}

set_phase() {
  local meeting_id="$1" phase="$2"
  local meta="$MEETINGS_DIR/$meeting_id/meta.yaml"
  local tmp_file
  tmp_file=$(make_tmp)
  # Use awk for portable in-place-like editing (no sed -i portability issues)
  local ts
  ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  awk -v phase="$phase" -v ts="$ts" '
    /^phase:/ { print "phase: " phase; next }
    /^updated:/ { print "updated: " ts; next }
    { print }
  ' "$meta" > "$tmp_file"
  mv "$tmp_file" "$meta"
}

set_meeting_status() {
  local meeting_id="$1" status="$2"
  local meta="$MEETINGS_DIR/$meeting_id/meta.yaml"
  local tmp_file
  tmp_file=$(make_tmp)
  local now
  now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  awk -v status="$status" -v now="$now" '
    /^status:/ { print "status: " status; next }
    /^updated:/ { print "updated: " now; next }
    { print }
  ' "$meta" > "$tmp_file"
  mv "$tmp_file" "$meta"
}

# --- Send notifications to all agents ---
notify_agents() {
  local meeting_id="$1" phase="$2" message="$3"
  local agents
  agents=$(meeting_meta_list "$meeting_id" "participants")
  local timestamp
  timestamp=$(date -u +"%Y%m%dT%H%M%SZ")
  local phase_upper
  phase_upper=$(to_upper "$phase")
  local msg_timestamp
  msg_timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  mkdir -p "$MESSAGES_DIR"

  for agent in $agents; do
    local rand
    rand=$(random_hex)
    local msg_file="$MESSAGES_DIR/meeting-system_to_${agent}_${timestamp}_$$_${rand}_meeting-phase.md"
    local tmp_msg
    tmp_msg=$(mktemp "$MESSAGES_DIR/.meeting-message.XXXXXX")
    cat > "$tmp_msg" <<EOF
---
from: meeting-system
to: ${agent}
type: meeting-phase
timestamp: ${msg_timestamp}
meeting: ${meeting_id}
phase: ${phase}
status: unread
---

## Meeting ${meeting_id} — Phase: ${phase_upper}

${message}

**Meeting directory**: $(lab_meeting_rel)${meeting_id}/
EOF
    mv "$tmp_msg" "$msg_file"
  done
  info "Notified $(echo "$agents" | wc -w | tr -d ' ') agents about phase '${phase}'"

  # Deliver notifications immediately to running agent sessions
  local agent_sh="$SCRIPT_DIR/lab-agent.sh"
  if [[ -f "$agent_sh" ]]; then
    bash "$agent_sh" -poll-all 2>/dev/null || true
  fi
}

# --- Operations ---

do_new() {
  # Only supervisor can create meetings
  require_meeting_controller

  acquire_lock

  # Check for existing active meeting (under lock to prevent race)
  if get_active_meeting &>/dev/null; then
    local active
    active=$(get_active_meeting)
    release_lock
    err "Active meeting $active already exists. Complete it before creating a new one, or use: -complete"
  fi

  # Enforce min_participants
  local participants
  participants=$(get_meeting_participants)
  local agent_count
  agent_count=$(echo "$participants" | wc -w | tr -d ' ')
  local min_participants
  min_participants=$(yaml_get "min_participants")
  min_participants="${min_participants:-3}"
  if [[ "$agent_count" -lt "$min_participants" ]]; then
    release_lock
    err "Need at least $min_participants participants (have $agent_count). Add more agents first."
  fi

  local meeting_id
  meeting_id=$(generate_meeting_id)
  local meeting_dir="$MEETINGS_DIR/$meeting_id"

  # meeting_dir already created by generate_meeting_id's mkdir
  mkdir -p "$meeting_dir"/{perspectives,judgments,critiques,responses,read-acks}

  # Get participants
  local students
  students=$(get_agents_by_role "student")
  local research_staff
  research_staff=$(get_agents_by_role "research-staff")

  # Create meta.yaml atomically (temp + mv)
  local tmp_meta
  tmp_meta=$(make_tmp)
  cat > "$tmp_meta" <<EOF
meeting_id: ${meeting_id}
created: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
updated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
called_by: ${CALLER:-supervisor}
phase: prepare
status: active
participants:
$(for a in $participants; do echo "  - $a"; done)
students:
$(for a in $students; do echo "  - $a"; done)
research_staff:
$(for a in $research_staff; do echo "  - $a"; done)
EOF
  mv "$tmp_meta" "$meeting_dir/meta.yaml"

  # Build participant table using printf (not echo -e)
  local research_topic
  research_topic=$(yaml_get "research_topic")
  local participant_lines=""
  for agent in $participants; do
    participant_lines="${participant_lines}$(participant_profile_markdown "$agent")
"
  done

  cat > "$meeting_dir/agenda.md" <<EOF
# Group Meeting ${meeting_id}

**Research Topic**: ${research_topic}
**Called by**: ${CALLER}
**Date**: $(date -u +"%Y-%m-%d %H:%M UTC")
**Phase**: PREPARE

## Participants

${participant_lines}
## Discussion Topics

1. Progress updates from each student
2. Cross-critique of research directions
3. Research staff judgment synthesis
4. Decision on next steps

## Phase Status

| Phase | Status |
|---|---|
| PREPARE | **active** |
| CROSS-READ | pending |
| CHALLENGE | pending |
| RESPOND | pending |
| DECISION | pending |
EOF

  # Update meeting log (atomic: copy + append + mv)
  local meeting_log="$AGORA_PROJECT_DIR/shared/MEETING_LOG.md"
  if [[ ! -f "$meeting_log" ]]; then
    cat > "$meeting_log" <<EOF
# Meeting Log

| ID | Date | Phase | Status |
|---|---|---|---|
EOF
  fi
  local tmp_log
  tmp_log=$(mktemp "${meeting_log}.tmp.XXXXXX")
  _tmp_files+=("$tmp_log")
  cp "$meeting_log" "$tmp_log"
  echo "| ${meeting_id} | $(date -u +"%Y-%m-%d") | prepare | active |" >> "$tmp_log"
  mv "$tmp_log" "$meeting_log"

  release_lock

  # Notify all agents
  notify_agents "$meeting_id" "prepare" \
    "A new group meeting has been called.

Students: write your perspective to $(lab_meeting_rel)${meeting_id}/perspectives/{your-name}.md
Research staff: write your judgment to $(lab_meeting_rel)${meeting_id}/judgments/{your-name}.md"

  info "Created meeting ${meeting_id} with $(echo "$participants" | wc -w | tr -d ' ') participants"
  info "Meeting directory: $(lab_meeting_rel)${meeting_id}/"
  info "Current phase: PREPARE"
}

do_phase() {
  # Only supervisor can advance phases
  require_meeting_controller

  local phase="" skip_unresponsive=0
  local args=()
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --skip-unresponsive) skip_unresponsive=1; shift ;;
      *) args+=("$1"); shift ;;
    esac
  done

  [[ ${#args[@]} -eq 1 ]] || err "Expected exactly one phase argument"
  case "${args[0]}" in
    prepare|cross-read|challenge|respond|decision) phase="${args[0]}" ;;
    *) err "Unknown phase: ${args[0]}. Valid: prepare, cross-read, challenge, respond, decision" ;;
  esac

  local meeting_id
  acquire_lock
  meeting_id=$(get_active_meeting) || { release_lock; err "No active meeting found"; }
  validate_meeting_id "$meeting_id"
  local meeting_dir="$MEETINGS_DIR/$meeting_id"

  # Enforce phase ordering (under lock to prevent concurrent advances)
  local current_phase
  current_phase=$(get_current_phase "$meeting_id")
  local current_idx requested_idx
  current_idx=$(phase_index "$current_phase") || { release_lock; err "Unknown current phase: $current_phase"; }
  requested_idx=$(phase_index "$phase") || { release_lock; err "Unknown phase: $phase"; }
  if [[ $requested_idx -lt $current_idx ]]; then
    release_lock
    err "Cannot go back to phase '$phase' — current phase is '$current_phase'"
  fi
  if [[ $requested_idx -eq $current_idx ]]; then
    release_lock
    err "Already in phase '$phase' — no advancement needed"
  fi
  if [[ $requested_idx -gt $((current_idx + 1)) ]]; then
    release_lock
    err "Cannot skip to phase '$phase' — must advance from '$current_phase' one step at a time"
  fi

  # Enforce require_all_read: check that required artifacts from current phase exist
  # Build skip list from unresponsive agents if --skip-unresponsive was given
  local skip_list=""
  if [[ $skip_unresponsive -eq 1 ]]; then
    local agent_sh="$SCRIPT_DIR/lab-agent.sh"
    if [[ -f "$agent_sh" ]]; then
      local participants
      participants=$(meeting_meta_list "$meeting_id" "participants")
      for p in $participants; do
        if ! bash "$agent_sh" -check-heartbeat -name "$p" -max-age 120 &>/dev/null; then
          skip_list="${skip_list} $p"
          warn "Skipping unresponsive agent '$p' (stale/missing heartbeat)"
        fi
      done
    fi
  fi

  local require_all
  require_all=$(yaml_get "require_all_read")
  if [[ "$require_all" == "true" ]]; then
    if ! check_phase_ready "$meeting_id" "$current_phase" "" "$skip_list"; then
      local missing_msg
      missing_msg=$(check_phase_ready "$meeting_id" "$current_phase" --verbose "$skip_list" 2>&1) || true
      release_lock
      err "require_all_read is enabled — cannot advance from '$current_phase':\n${missing_msg}\nAll required submissions must exist before phase advancement."
    fi
  fi

  set_phase "$meeting_id" "$phase"

  # For decision phase, set status=deciding while still holding the lock
  if [[ "$phase" == "decision" ]]; then
    set_meeting_status "$meeting_id" "deciding"
  fi

  release_lock

  local students research_staff
  students=$(meeting_meta_list "$meeting_id" "students")
  research_staff=$(meeting_meta_list "$meeting_id" "research_staff")

  local phase_upper
  phase_upper=$(to_upper "$phase")

  case "$phase" in
    prepare)
      notify_agents "$meeting_id" "prepare" \
        "Write your perspective to $(lab_meeting_rel)${meeting_id}/perspectives/{your-name}.md

Students: Include progress summary, key findings, open questions, proposed next steps.
Research staff: Write judgment to $(lab_meeting_rel)${meeting_id}/judgments/{your-name}.md"
      ;;

    cross-read)
      notify_agents "$meeting_id" "cross-read" \
        "Read all perspectives and judgments in $(lab_meeting_rel)${meeting_id}/perspectives/ and $(lab_meeting_rel)${meeting_id}/judgments/

After you finish reading, acknowledge it:
bash ../../scripts/lab-meeting.sh -caller {your-name} -ack-read

Do NOT start critiques until your read acknowledgement is recorded."
      ;;

    challenge)
      # Build student-specific critique instructions
      local student_msg="Write critiques of other students' work:"
      for s1 in $students; do
        for s2 in $students; do
          if [[ "$s1" != "$s2" ]]; then
            student_msg="${student_msg}
  - ${s1} critiques ${s2}: critiques/${s1}_on_${s2}.md"
          fi
        done
      done

      notify_agents "$meeting_id" "challenge" \
        "Write your critiques to $(lab_meeting_rel)${meeting_id}/critiques/

Students: Critique each other student (N x N cross-critique)
${student_msg}

Research staff: Write systematic critique of all work -> critiques/{your-name}_on_all.md"
      ;;

    respond)
      notify_agents "$meeting_id" "respond" \
        "Read critiques targeting your work in $(lab_meeting_rel)${meeting_id}/critiques/

Students: write your response to $(lab_meeting_rel)${meeting_id}/responses/{your-name}_response.md
- Address each critique point-by-point
- Acknowledge valid concerns, defend where appropriate
- Propose revisions for accepted feedback

Research staff: no response artifact is required in this phase."
      ;;

    decision)
      # Only notify the configured decision maker
      local decision_maker
      decision_maker=$(lab_decision_maker)
      local timestamp
      timestamp=$(date -u +"%Y%m%dT%H%M%SZ")
      mkdir -p "$MESSAGES_DIR"
      local rand
      rand=$(random_hex)
      local msg_file="$MESSAGES_DIR/meeting-system_to_${decision_maker}_${timestamp}_$$_${rand}_meeting-phase.md"
      local tmp_msg
      tmp_msg=$(mktemp "$MESSAGES_DIR/.meeting-message.XXXXXX")
      cat > "$tmp_msg" <<EOF
---
from: meeting-system
to: ${decision_maker}
type: meeting-phase
timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
meeting: ${meeting_id}
phase: decision
status: unread
---

## Meeting ${meeting_id} — Phase: DECISION

Read all perspectives, critiques, and responses in $(lab_meeting_rel)${meeting_id}/

Write your decision to $(lab_meeting_rel)${meeting_id}/decision.md with:
- Per-student direction: CONTINUE | PIVOT | MERGE | SPLIT
- Specific action items (create Research task board tasks via lab-kanban.sh)
- Next meeting trigger condition
EOF
      mv "$tmp_msg" "$msg_file"
      info "Notified ${decision_maker} for decision phase"
      # Deliver immediately to the running decision-maker session, if any.
      local agent_sh="$SCRIPT_DIR/lab-agent.sh"
      if [[ -f "$agent_sh" ]]; then
        bash "$agent_sh" -poll -name "$decision_maker" 2>/dev/null || true
      fi
      ;;
  esac

  info "Meeting ${meeting_id} advanced to phase: ${phase_upper}"
}

# --- Check if all required artifacts for a phase are present ---
# Returns 0 if phase is complete (all artifacts exist), 1 otherwise.
# With --verbose, prints missing artifacts.
check_phase_ready() {
  local meeting_id="$1" phase="$2" verbose="${3:-}" skip_agents="${4:-}"
  local meeting_dir="$MEETINGS_DIR/$meeting_id"
  local students research_staff participants missing=""

  # Helper: check if agent should be skipped
  _is_skipped() {
    local name="$1"
    [[ -n "$skip_agents" ]] || return 1
    for s in $skip_agents; do
      [[ "$s" == "$name" ]] && return 0
    done
    return 1
  }

  participants=$(meeting_meta_list "$meeting_id" "participants")
  students=$(meeting_meta_list "$meeting_id" "students")
  research_staff=$(meeting_meta_list "$meeting_id" "research_staff")

  case "$phase" in
    prepare)
      for s in $students; do
        _is_skipped "$s" && continue
        if ! artifact_ready "$meeting_dir/perspectives/${s}.md"; then
          missing="${missing}  perspectives/${s}.md\n"
        fi
      done
      for staff in $research_staff; do
        _is_skipped "$staff" && continue
        if ! artifact_ready "$meeting_dir/judgments/${staff}.md"; then
          missing="${missing}  judgments/${staff}.md\n"
        fi
      done
      ;;
    cross-read)
      if [[ "$(yaml_get "require_all_read")" != "true" ]]; then
        return 0
      fi
      for participant in $participants; do
        _is_skipped "$participant" && continue
        if ! artifact_ready "$meeting_dir/read-acks/${participant}.ack"; then
          missing="${missing}  read-acks/${participant}.ack\n"
        fi
      done
      ;;
    challenge)
      for s1 in $students; do
        _is_skipped "$s1" && continue
        for s2 in $students; do
          if [[ "$s1" != "$s2" ]]; then
            if ! artifact_ready "$meeting_dir/critiques/${s1}_on_${s2}.md"; then
              missing="${missing}  critiques/${s1}_on_${s2}.md\n"
            fi
          fi
        done
      done
      for staff in $research_staff; do
        _is_skipped "$staff" && continue
        if ! artifact_ready "$meeting_dir/critiques/${staff}_on_all.md"; then
          missing="${missing}  critiques/${staff}_on_all.md\n"
        fi
      done
      ;;
    respond)
      for s in $students; do
        _is_skipped "$s" && continue
        if ! artifact_ready "$meeting_dir/responses/${s}_response.md"; then
          missing="${missing}  responses/${s}_response.md\n"
        fi
      done
      ;;
    decision)
      if ! artifact_ready "$meeting_dir/decision.md"; then
        missing="  decision.md\n"
      fi
      ;;
  esac

  if [[ -n "$missing" ]]; then
    if [[ "$verbose" == "--verbose" ]]; then
      printf "Missing for phase '%s':\n%b" "$phase" "$missing" >&2
    fi
    return 1
  fi
  return 0
}

do_auto() {
  # Only supervisor can run auto meeting cycle
  require_meeting_controller

  # Require interactive terminal
  if [[ ! -t 0 ]]; then
    err "-auto requires an interactive terminal. Use -auto-advance for non-interactive, or -new and -phase for manual control."
  fi

  info "=== Starting automated meeting cycle ==="

  # Create new meeting (already sends prepare notification)
  do_new

  local meeting_id
  meeting_id=$(get_active_meeting) || err "Failed to create meeting"

  # Skip prepare phase since do_new already set it up and notified agents
  local phases=("cross-read" "challenge" "respond" "decision")
  for phase in "${phases[@]}"; do
    local phase_upper
    phase_upper=$(to_upper "$phase")
    info ""
    info "=== Phase: ${phase_upper} ==="
    info "Waiting for agents to complete current phase..."
    info "(Press Enter to advance to '${phase}', or Ctrl+C to stop)"
    read -r || true
    do_phase "$phase"
  done

  acquire_lock
  if ! check_phase_ready "$meeting_id" "decision"; then
    release_lock
    err "Decision phase is not complete. Write shared/meetings/${meeting_id}/decision.md before completing the meeting."
  fi
  set_meeting_status "$meeting_id" "completed"

  # Update meeting log (same as do_complete)
  local meeting_log="$AGORA_PROJECT_DIR/shared/MEETING_LOG.md"
  if [[ -f "$meeting_log" ]]; then
    local tmp_log
    tmp_log=$(mktemp "${meeting_log}.tmp.XXXXXX")
    _tmp_files+=("$tmp_log")
    awk -v mid="$meeting_id" -F'|' '
      NF >= 5 {
        gsub(/^[ \t]+|[ \t]+$/, "", $2)
        if ($2 == mid) {
          sub(/active|deciding/, "completed")
        }
      }
      { print }
    ' "$meeting_log" > "$tmp_log"
    mv "$tmp_log" "$meeting_log"
  fi

  release_lock
  info ""
  info "=== Meeting ${meeting_id} completed ==="
}

# --- Non-interactive auto-advance: polls for artifact readiness ---
PHASE_POLL_INTERVAL=30   # seconds between readiness checks
PHASE_TIMEOUT=1800       # 30 minutes per phase timeout

do_auto_advance() {
  require_meeting_controller

  local timeout="${PHASE_TIMEOUT}"
  local interval="${PHASE_POLL_INTERVAL}"

  # Parse options
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -timeout)
        [[ $# -ge 2 ]] || err "Missing value for -timeout"
        timeout="$2"; shift 2 ;;
      -interval)
        [[ $# -ge 2 ]] || err "Missing value for -interval"
        interval="$2"; shift 2 ;;
      *) err "Unknown option for -auto-advance: $1" ;;
    esac
  done

  # Validate numeric
  if [[ ! "$timeout" =~ ^[0-9]+$ ]] || [[ "$timeout" -lt 10 ]]; then
    err "-timeout must be a positive integer >= 10 (seconds)"
  fi
  if [[ ! "$interval" =~ ^[0-9]+$ ]] || [[ "$interval" -lt 5 ]]; then
    err "-interval must be a positive integer >= 5 (seconds)"
  fi

  info "=== Starting non-interactive meeting cycle ==="
  info "Phase timeout: ${timeout}s, poll interval: ${interval}s"

  # Create new meeting
  do_new

  local meeting_id
  meeting_id=$(get_active_meeting) || err "Failed to create meeting"
  local meeting_dir="$MEETINGS_DIR/$meeting_id"

  # Phase progression: prepare (already active) → cross-read → challenge → respond → decision
  # We need to wait for prepare to complete, then advance to cross-read, etc.
  local wait_phases=("prepare" "cross-read" "challenge" "respond" "decision")
  local advance_phases=("cross-read" "challenge" "respond" "decision")

  for i in "${!wait_phases[@]}"; do
    local wait_phase="${wait_phases[$i]}"
    local wait_upper
    wait_upper=$(to_upper "$wait_phase")

    info ""
    info "=== Waiting for phase: ${wait_upper} ==="

    # Poll for artifact readiness
    local elapsed=0
    while ! check_phase_ready "$meeting_id" "$wait_phase"; do
      if [[ $elapsed -ge $timeout ]]; then
        warn "Timeout (${timeout}s) waiting for phase '${wait_phase}' to complete"
        check_phase_ready "$meeting_id" "$wait_phase" --verbose
        err "Phase '${wait_phase}' timed out. Use -phase to advance manually, or increase -timeout."
      fi
      sleep "$interval"
      elapsed=$((elapsed + interval))
      # Check agent heartbeats and warn about unresponsive agents
      local agent_sh="$SCRIPT_DIR/lab-agent.sh"
      if [[ $((elapsed % 60)) -eq 0 && -f "$agent_sh" ]]; then
        local dead_agents=""
        local all_participants
        all_participants=$(meeting_meta_list "$meeting_id" "participants")
        for p in $all_participants; do
          if ! bash "$agent_sh" -check-heartbeat -name "$p" -max-age 120 &>/dev/null; then
            dead_agents="${dead_agents} $p"
          fi
        done
        if [[ -n "$dead_agents" ]]; then
          warn "Unresponsive agents (stale heartbeat):${dead_agents}"
        fi
      fi
      # Re-poll agents to remind them
      if [[ $((elapsed % 120)) -eq 0 && -f "$agent_sh" ]]; then
        bash "$agent_sh" -poll-all 2>/dev/null || true
      fi
    done
    info "Phase '${wait_upper}' artifacts complete"

    # Advance to next phase (if there is one)
    if [[ $i -lt ${#advance_phases[@]} ]]; then
      local next_phase="${advance_phases[$i]}"
      do_phase "$next_phase"
    fi
  done

  # Meeting completed after decision phase
  acquire_lock
  set_meeting_status "$meeting_id" "completed"

  local meeting_log="$AGORA_PROJECT_DIR/shared/MEETING_LOG.md"
  if [[ -f "$meeting_log" ]]; then
    local tmp_log
    tmp_log=$(mktemp "${meeting_log}.tmp.XXXXXX")
    _tmp_files+=("$tmp_log")
    awk -v mid="$meeting_id" -F'|' '
      NF >= 5 {
        gsub(/^[ \t]+|[ \t]+$/, "", $2)
        if ($2 == mid) {
          sub(/active|deciding/, "completed")
        }
      }
      { print }
    ' "$meeting_log" > "$tmp_log"
    mv "$tmp_log" "$meeting_log"
  fi

  release_lock
  info ""
  info "=== Meeting ${meeting_id} completed (non-interactive) ==="
}

do_ack_read() {
  local role
  role=$(require_bound_caller)
  [[ -n "$role" ]] || err "Unable to determine caller role"

  acquire_lock

  local meeting_id
  meeting_id=$(get_active_meeting) || { release_lock; err "No active meeting found"; }
  validate_meeting_id "$meeting_id"

  local current_phase
  current_phase=$(get_current_phase "$meeting_id")
  if [[ "$current_phase" != "cross-read" ]]; then
    release_lock
    err "Read acknowledgements are only valid during the cross-read phase (current phase: $current_phase)"
  fi

  local meeting_dir="$MEETINGS_DIR/$meeting_id"
  local ack_file="$meeting_dir/read-acks/${CALLER}.ack"
  local tmp_ack
  tmp_ack=$(make_tmp)
  cat > "$tmp_ack" <<EOF
acknowledged_by: ${CALLER}
role: ${role}
timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
EOF
  mv "$tmp_ack" "$ack_file"

  release_lock
  info "Recorded cross-read acknowledgement for '${CALLER}' in meeting ${meeting_id}"
}

do_check_ready() {
  local meeting_id
  meeting_id=$(get_active_meeting) || err "No active meeting found"
  local phase
  phase=$(get_current_phase "$meeting_id")
  if check_phase_ready "$meeting_id" "$phase" --verbose; then
    info "Phase '$(to_upper "$phase")' is ready to advance"
    exit 0
  else
    info "Phase '$(to_upper "$phase")' is NOT ready"
    exit 1
  fi
}

do_complete() {
  # Only the configured meeting controller can complete meetings
  require_meeting_controller

  acquire_lock

  local meeting_id
  meeting_id=$(get_active_meeting) || { release_lock; err "No active meeting found"; }
  validate_meeting_id "$meeting_id"
  local current_phase
  current_phase=$(get_current_phase "$meeting_id")
  if [[ "$current_phase" != "decision" ]]; then
    release_lock
    err "Cannot complete meeting from phase '$current_phase' — advance to decision first"
  fi
  if ! check_phase_ready "$meeting_id" "decision"; then
    local missing_msg
    missing_msg=$(check_phase_ready "$meeting_id" "decision" --verbose 2>&1) || true
    release_lock
    err "Cannot complete meeting before the decision artifact exists:\n${missing_msg}"
  fi
  set_meeting_status "$meeting_id" "completed"

  # Update meeting log
  local meeting_log="$AGORA_PROJECT_DIR/shared/MEETING_LOG.md"
  if [[ -f "$meeting_log" ]]; then
    local tmp_log
    tmp_log=$(mktemp "${meeting_log}.tmp.XXXXXX")
    _tmp_files+=("$tmp_log")
    awk -v mid="$meeting_id" -F'|' '
      NF >= 5 {
        gsub(/^[ \t]+|[ \t]+$/, "", $2)
        if ($2 == mid) {
          sub(/active|deciding/, "completed")
        }
      }
      { print }
    ' "$meeting_log" > "$tmp_log"
    mv "$tmp_log" "$meeting_log"
  fi

  release_lock

  info "Meeting ${meeting_id} marked as completed"
}

do_status() {
  local meeting_id
  if meeting_id=$(get_active_meeting); then
    local meeting_dir="$MEETINGS_DIR/$meeting_id"
    local phase
    phase=$(get_current_phase "$meeting_id")
    local phase_upper
    phase_upper=$(to_upper "$phase")

    info "Active Meeting: ${meeting_id}"
    info "Phase: ${phase_upper}"
    info ""

    info "--- Participants ---"
    local participants
    participants=$(meeting_meta_list "$meeting_id" "participants")
    if [[ -n "$participants" ]]; then
      local participant
      for participant in $participants; do
        info "  - $(participant_profile_text "$participant")"
      done
    else
      info "  (none recorded)"
    fi
    info ""

    # Show what's been submitted
    info "--- Perspectives ---"
    local found=0
    for f in "$meeting_dir/perspectives/"*.md; do
      [[ -f "$f" ]] || continue
      info "  [x] $(basename "$f" .md)"
      found=1
    done
    [[ $found -eq 1 ]] || info "  (none yet)"

    info "--- Judgments ---"
    found=0
    for f in "$meeting_dir/judgments/"*.md; do
      [[ -f "$f" ]] || continue
      info "  [x] $(basename "$f" .md)"
      found=1
    done
    [[ $found -eq 1 ]] || info "  (none yet)"

    info "--- Critiques ---"
    found=0
    for f in "$meeting_dir/critiques/"*.md; do
      [[ -f "$f" ]] || continue
      info "  [x] $(basename "$f" .md)"
      found=1
    done
    [[ $found -eq 1 ]] || info "  (none yet)"

    info "--- Responses ---"
    found=0
    for f in "$meeting_dir/responses/"*.md; do
      [[ -f "$f" ]] || continue
      info "  [x] $(basename "$f" .md)"
      found=1
    done
    [[ $found -eq 1 ]] || info "  (none yet)"

    if [[ -f "$meeting_dir/decision.md" ]]; then
      info "--- Decision ---"
      info "  [x] decision.md"
    fi
  else
    info "No active meeting."
    info ""
    # Show meeting history
    if [[ -f "$AGORA_PROJECT_DIR/shared/MEETING_LOG.md" ]]; then
      info "Meeting History:"
      cat "$AGORA_PROJECT_DIR/shared/MEETING_LOG.md"
    fi
  fi
}

# --- Main ---
usage() {
  cat <<'EOF'
Usage: lab-meeting.sh [-caller <name>] <operation> [options]

Global:
  -caller <name>   Identity of the calling agent (supervisor required for most ops)

Operations:
  -new                Create a new group meeting (supervisor only)
  -phase <name>       Advance to phase: prepare|cross-read|challenge|respond|decision (supervisor only)
                      Options: [--skip-unresponsive]  Skip agents with stale heartbeats
  -complete           Mark the active meeting as completed (supervisor only)
  -auto               Run all phases interactively — press Enter to advance (supervisor only)
  -auto-advance       Run all phases non-interactively — auto-detect artifact readiness (supervisor only)
                      Options: [-timeout <secs>] [-interval <secs>]
  -ack-read           Record that the caller finished the CROSS-READ phase
  -status             Show current meeting status
  -check-ready        Check if current phase artifacts are complete (exit 0=ready, 1=not ready)
EOF
  exit 1
}

[[ $# -ge 1 ]] || usage

# Parse global -caller option
if [[ "$1" == "-caller" ]]; then
  [[ $# -ge 3 ]] || err "Missing value for -caller"
  CALLER="$2"
  validate_agent_name "$CALLER"
  shift 2
fi

op="$1"; shift
case "$op" in
  -new)           require_mutation_runtime; do_new ;;
  -phase)         require_mutation_runtime; do_phase "$@" ;;
  -complete)      require_mutation_runtime; do_complete ;;
  -auto)          require_mutation_runtime; do_auto ;;
  -auto-advance)  require_mutation_runtime; do_auto_advance "$@" ;;
  -ack-read)      require_mutation_runtime; do_ack_read ;;
  -check-ready)   do_check_ready ;;
  -status)        do_status ;;
  *)              usage ;;
esac
