#!/usr/bin/env bash
# lab-kanban.sh — Research task board operations for the virtual research lab
# Usage: lab-kanban.sh -new|-start|-submit|-approve|-reject|-done|-status [options]

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
KANBAN_FILE="$(lab_kanban_file)"
LOCK_FILE="$KANBAN_FILE.lock"
LOCK_TIMEOUT=5

# Source centralized schema if available
KANBAN_SCHEMA="$SCRIPT_DIR/kanban-schema.sh"
# shellcheck source=/dev/null
[[ -f "$KANBAN_SCHEMA" ]] && source "$KANBAN_SCHEMA"

# --- Error codes ---
RC_USAGE=1
RC_FILE=2
RC_PARSE=3
RC_LOCK=4
RC_NOT_FOUND=5
RC_INVALID=6

RC_AUTHZ=7

err() { echo "ERROR: $2" >&2; exit "$1"; }
info() { echo "$1"; }

# --- Caller identity + role lookup ---
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

agent_exists() {
  local name="$1"
  awk -v agent="$name" '
    /^agents:/ { in_agents=1; next }
    in_agents && /^[^ ]/ { in_agents=0 }
    in_agents && /^  / {
      line = $0
      sub(/^  /, "", line)
      sub(/:.*/, "", line)
      if (line == agent) { print "yes"; exit }
    }
  ' "$LAB_YAML"
}

require_bound_caller() {
  if [[ -z "$CALLER" ]]; then
    err $RC_AUTHZ "Missing -caller: caller identity required for authorization"
  fi

  local role
  role=$(get_caller_role "$CALLER")
  if [[ -z "$role" ]]; then
    err $RC_AUTHZ "Unknown caller '$CALLER' — register the agent in lab.yaml first"
  fi

  local bound_agent=""
  bound_agent=$(lab_bound_agent_from_cwd "$AGORA_PROJECT_DIR" || true)

  if [[ -n "$bound_agent" ]]; then
    if [[ "$bound_agent" != "$CALLER" ]]; then
      err $RC_AUTHZ "Caller '$CALLER' does not match the bound agent workspace '$bound_agent'"
    fi
  elif [[ "$CALLER" != "supervisor" ]]; then
    err $RC_AUTHZ "Unbound caller identity for '$CALLER'. Run this command from the caller's agent workspace, or use the supervisor operator shell."
  fi

  printf '%s\n' "$role"
}

require_supervisor() {
  local role
  role=$(require_bound_caller)
  if [[ "$role" != "supervisor" ]]; then
    err $RC_AUTHZ "Only supervisor can perform this action (caller: $CALLER, role: ${role:-unknown})"
  fi
}

require_mutation_runtime() {
  lab_require_script_runtime "$SCRIPT_DIR" "$AGORA_PROJECT_DIR"
}

require_assignee_or_supervisor() {
  local assignee="$1"
  local role
  role=$(require_bound_caller)
  if [[ "$CALLER" == "$assignee" ]]; then
    return 0
  fi
  if [[ "$role" == "supervisor" ]]; then
    return 0
  fi
  err $RC_AUTHZ "Only the assignee ($assignee) or supervisor can perform this action (caller: $CALLER)"
}

# --- Temp file cleanup ---
_tmp_files=()
cleanup() {
  for f in "${_tmp_files[@]}"; do
    rm -f "$f" 2>/dev/null || true
  done
  release_lock
}
trap cleanup EXIT

make_tmp() {
  local t
  t=$(mktemp "${KANBAN_FILE}.tmp.XXXXXX")
  _tmp_files+=("$t")
  echo "$t"
}

# --- File locking (uses separate lockfile, not data file) ---
lock_fd=""
acquire_lock() {
  [[ -f "$KANBAN_FILE" ]] || err $RC_FILE "Research task board file KANBAN.md not found at $KANBAN_FILE"
  touch "$LOCK_FILE"
  exec {lock_fd}< "$LOCK_FILE" || err $RC_LOCK "Cannot open lock file"
  flock -x -w "$LOCK_TIMEOUT" "$lock_fd" || err $RC_LOCK "Cannot acquire lock on the Research task board (KANBAN.md) (timeout ${LOCK_TIMEOUT}s)"
}
release_lock() {
  if [[ -n "${lock_fd:-}" ]]; then
    exec {lock_fd}<&- || true
    lock_fd=""
  fi
}

# --- Task ID generation (macOS + Linux compatible, higher entropy) ---
generate_id() {
  local date_part
  date_part=$(date +%Y%m%d)
  local random_bits=""
  # Use /dev/urandom for better entropy than $RANDOM (15-bit)
  if [[ -r /dev/urandom ]]; then
    random_bits=$(head -c 8 /dev/urandom | od -An -tx1 | tr -d ' \n')
  else
    random_bits="${RANDOM}${RANDOM}${RANDOM}${RANDOM}"
  fi
  local seed="${date_part}|${1:-}|$$|${random_bits}"
  local digest
  if command -v sha1sum &>/dev/null; then
    digest=$(printf '%s' "$seed" | sha1sum | cut -c1-8)
  elif command -v shasum &>/dev/null; then
    digest=$(printf '%s' "$seed" | shasum -a 1 | cut -c1-8)
  else
    # Fallback: use cksum
    digest=$(printf '%s' "$seed" | cksum | awk '{printf "%08x", $1}')
  fi
  echo "T-${date_part}-${digest}"
}

# --- Input sanitization: reject pipe chars and newlines in user values ---
sanitize_field() {
  local name="$1" value="$2"
  if [[ "$value" == *"|"* ]]; then
    err $RC_INVALID "$name cannot contain '|' (pipe character)"
  fi
  if [[ "$value" == *$'\n'* ]]; then
    err $RC_INVALID "$name cannot contain newlines"
  fi
}

# --- Task ID format validation ---
validate_task_id() {
  local id="$1"
  if [[ ! "$id" =~ ^T-[0-9]{8}-[a-f0-9]{8}$ ]]; then
    err $RC_INVALID "Invalid task ID format: '$id'. Expected T-YYYYMMDD-xxxxxxxx"
  fi
}

# --- Priority validation ---
validate_priority() {
  local p="$1"
  case "$p" in
    P0|P1|P2|P3) ;;
    *) err $RC_INVALID "Invalid priority '$p'. Must be P0, P1, P2, or P3" ;;
  esac
}

# --- Agent name validation ---
validate_agent_name() {
  local name="$1"
  if [[ ! "$name" =~ ^[a-zA-Z][a-zA-Z0-9_-]*$ ]]; then
    err $RC_INVALID "Invalid agent name: '$name'"
  fi
}

# --- Markdown table helpers ---

# Find a task row by ID across all sections, returns: section_name|row_content
# Matches task ID in the first column only (prevents substring matching)
find_task() {
  local task_id="$1"
  local current_section=""
  while IFS= read -r line; do
    if [[ "$line" =~ ^##[[:space:]]+(.*) ]]; then
      current_section="${BASH_REMATCH[1]}"
    elif [[ "$line" =~ ^\|[[:space:]]*"$task_id"[[:space:]]*\| ]]; then
      echo "${current_section}|${line}"
      return 0
    fi
  done < "$KANBAN_FILE"
  return 1
}

# Atomic remove-from-section + insert-to-section in a single pass
# This prevents data loss if a crash occurs between two operations
move_task() {
  local task_id="$1"
  local target_section="$2"
  local new_row="$3"
  local tmp_file
  tmp_file=$(make_tmp)

  local lines=()

  # Read all lines
  while IFS= read -r line || [[ -n "$line" ]]; do
    lines+=("$line")
  done < "$KANBAN_FILE"

  # Find the line to skip (old task row) and the last table line in target section
  local current_section=""
  local in_target=0
  local insert_after=-1
  local skip_line=-1

  for i in "${!lines[@]}"; do
    local line="${lines[$i]}"
    if [[ "$line" =~ ^##[[:space:]]+(.*) ]]; then
      current_section="${BASH_REMATCH[1]}"
      if [[ "$current_section" == "$target_section" ]]; then
        in_target=1
      else
        in_target=0
      fi
    fi

    # Find the row to remove (match first column)
    if [[ "$line" =~ ^\|[[:space:]]*"$task_id"[[:space:]]*\| ]]; then
      skip_line=$i
    fi

    # Track last table line in target section (excluding the row we're about to remove)
    if [[ $in_target -eq 1 && "$line" =~ ^\| && $i -ne $skip_line ]]; then
      insert_after=$i
    fi
  done

  if [[ $insert_after -eq -1 ]]; then
    err $RC_PARSE "Cannot find table in section '$target_section'"
  fi

  # If skip_line is before insert_after in the same section, the insert_after
  # index is correct since we excluded skip_line from tracking.
  # If skip_line IS the last table line in target section, insert_after will be
  # the second-to-last table line, which is correct.

  # Write output
  local inserted=0
  for i in "${!lines[@]}"; do
    # Skip the old task row
    if [[ $i -eq $skip_line ]]; then
      continue
    fi
    echo "${lines[$i]}"
    # Insert new row after the insert point
    if [[ $i -eq $insert_after && $inserted -eq 0 ]]; then
      echo "$new_row"
      inserted=1
    fi
  done > "$tmp_file"

  if [[ $inserted -eq 0 ]]; then
    # Append at end of file as fallback
    echo "$new_row" >> "$tmp_file"
  fi

  mv "$tmp_file" "$KANBAN_FILE"
}

# Insert row at end of section's table (for new tasks)
insert_row_in_section() {
  local section_name="$1"
  local new_row="$2"
  local tmp_file
  tmp_file=$(make_tmp)
  local in_section=0
  local insert_after=-1
  local line_num=0

  # First pass: find where to insert
  while IFS= read -r line || [[ -n "$line" ]]; do
    line_num=$((line_num + 1))
    if [[ "$line" =~ ^##[[:space:]]+(.*) ]]; then
      if [[ $in_section -eq 1 ]]; then
        break  # left the section
      fi
      if [[ "${BASH_REMATCH[1]}" == "$section_name" ]]; then
        in_section=1
      fi
    elif [[ $in_section -eq 1 ]]; then
      if [[ "$line" =~ ^\| ]]; then
        insert_after=$line_num
      fi
    fi
  done < "$KANBAN_FILE"

  if [[ $insert_after -eq -1 ]]; then
    err $RC_PARSE "Cannot find table in section '$section_name'"
  fi

  # Second pass: write with insertion
  line_num=0
  while IFS= read -r line || [[ -n "$line" ]]; do
    line_num=$((line_num + 1))
    echo "$line"
    if [[ $line_num -eq $insert_after ]]; then
      echo "$new_row"
    fi
  done < "$KANBAN_FILE" > "$tmp_file"
  mv "$tmp_file" "$KANBAN_FILE"
}

# --- Date helper (macOS + Linux) ---
utc_now() {
  if date -u +"%Y-%m-%d %H:%M UTC" 2>/dev/null; then
    return
  fi
  # Fallback
  date +"%Y-%m-%d %H:%M UTC"
}

# --- Operations ---

do_new() {
  local title="" assign="" priority="P2" description=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -title)
        [[ $# -ge 2 ]] || err $RC_USAGE "Missing value for -title"
        title="$2"; shift 2 ;;
      -assign)
        [[ $# -ge 2 ]] || err $RC_USAGE "Missing value for -assign"
        assign="$2"; shift 2 ;;
      -priority)
        [[ $# -ge 2 ]] || err $RC_USAGE "Missing value for -priority"
        priority="$2"; shift 2 ;;
      -desc|-description)
        [[ $# -ge 2 ]] || err $RC_USAGE "Missing value for -desc"
        description="$2"; shift 2 ;;
      *) err $RC_USAGE "Unknown option for -new: $1" ;;
    esac
  done
  [[ -n "$title" ]] || err $RC_USAGE "Missing -title for -new"
  [[ -n "$assign" ]] || err $RC_USAGE "Missing -assign for -new"

  # Only supervisor can create tasks
  require_supervisor

  # Validate inputs
  sanitize_field "title" "$title"
  sanitize_field "description" "$description"
  sanitize_field "assign" "$assign"
  validate_priority "$priority"
  validate_agent_name "$assign"
  [[ -n "$(agent_exists "$assign")" ]] || err $RC_INVALID "Unknown assignee '$assign' — register the agent first"

  local task_id
  task_id=$(generate_id "$title")
  local created
  created=$(utc_now)
  local row="| ${task_id} | ${title} | ${assign} | ${created} | ${priority} | ${description} |"

  acquire_lock
  insert_row_in_section "Backlog" "$row"
  release_lock
  info "Created task ${task_id}: '${title}' assigned to ${assign} (${priority})"
}

do_start() {
  local task_id=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -id)
        [[ $# -ge 2 ]] || err $RC_USAGE "Missing value for -id"
        task_id="$2"; shift 2 ;;
      *) err $RC_USAGE "Unknown option for -start: $1" ;;
    esac
  done
  [[ -n "$task_id" ]] || err $RC_USAGE "Missing -id for -start"
  validate_task_id "$task_id"

  acquire_lock
  local result
  result=$(find_task "$task_id") || err $RC_NOT_FOUND "Task $task_id not found"
  local section="${result%%|*}"
  local row="${result#*|}"

  if [[ "$section" == "In Progress" ]]; then
    # Allow re-starting rework tasks (rejected from Review)
    local current_status
    current_status=$(printf '%s' "$row" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $5); print $5}')
    if [[ "$current_status" != "rework" ]]; then
      err $RC_INVALID "Task $task_id is already in progress with status '$current_status' — cannot re-start"
    fi
  elif [[ "$section" != "Backlog" ]]; then
    err $RC_INVALID "Task $task_id is in '$section', not 'Backlog' or 'In Progress' (rework)"
  fi

  # Parse fields from backlog row: | ID | Title | Assigned | Created | Priority | Description |
  local title assigned description
  title=$(printf '%s' "$row" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $3); print $3}')
  assigned=$(printf '%s' "$row" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $4); print $4}')
  description=$(printf '%s' "$row" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $7); print $7}')

  # Only assignee or supervisor can start
  require_assignee_or_supervisor "$assigned"

  local started
  started=$(utc_now)
  local new_row="| ${task_id} | ${title} | ${assigned} | active | ${started} | ${description} |"

  move_task "$task_id" "In Progress" "$new_row"
  release_lock
  info "Started task ${task_id}: moved to In Progress"
}

do_submit() {
  local task_id="" artifacts=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -id)
        [[ $# -ge 2 ]] || err $RC_USAGE "Missing value for -id"
        task_id="$2"; shift 2 ;;
      -artifacts)
        [[ $# -ge 2 ]] || err $RC_USAGE "Missing value for -artifacts"
        artifacts="$2"; shift 2 ;;
      *) err $RC_USAGE "Unknown option for -submit: $1" ;;
    esac
  done
  [[ -n "$task_id" ]] || err $RC_USAGE "Missing -id for -submit"
  validate_task_id "$task_id"
  sanitize_field "artifacts" "$artifacts"

  acquire_lock
  local result
  result=$(find_task "$task_id") || err $RC_NOT_FOUND "Task $task_id not found"
  local section="${result%%|*}"
  local row="${result#*|}"

  [[ "$section" == "In Progress" ]] || err $RC_INVALID "Task $task_id is in '$section', not 'In Progress'"

  # Parse fields: | ID | Title | Assigned | Status | Started | Description |
  local title assigned
  title=$(printf '%s' "$row" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $3); print $3}')
  assigned=$(printf '%s' "$row" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $4); print $4}')

  # Only assignee or supervisor can submit
  require_assignee_or_supervisor "$assigned"

  local submitted
  submitted=$(utc_now)
  local new_row="| ${task_id} | ${title} | ${assigned} | pending | ${submitted} | ${artifacts} |"

  move_task "$task_id" "Review" "$new_row"
  release_lock
  info "Submitted task ${task_id} for review with artifacts: ${artifacts}"
}

do_approve() {
  local task_id=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -id)
        [[ $# -ge 2 ]] || err $RC_USAGE "Missing value for -id"
        task_id="$2"; shift 2 ;;
      *) err $RC_USAGE "Unknown option for -approve: $1" ;;
    esac
  done
  [[ -n "$task_id" ]] || err $RC_USAGE "Missing -id for -approve"
  validate_task_id "$task_id"

  acquire_lock
  local result
  result=$(find_task "$task_id") || err $RC_NOT_FOUND "Task $task_id not found"
  local section="${result%%|*}"
  local row="${result#*|}"

  [[ "$section" == "Review" ]] || err $RC_INVALID "Task $task_id is in '$section', not 'Review'"

  # Only supervisor can approve
  require_supervisor

  local title artifacts
  title=$(printf '%s' "$row" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $3); print $3}')
  artifacts=$(printf '%s' "$row" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $7); print $7}')

  local completed
  completed=$(utc_now)
  local new_row="| ${task_id} | ${title} | ${completed} | Approved | ${artifacts} |"

  move_task "$task_id" "Done" "$new_row"
  release_lock
  info "Approved task ${task_id}: moved to Done"
}

do_reject() {
  local task_id="" reason=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -id)
        [[ $# -ge 2 ]] || err $RC_USAGE "Missing value for -id"
        task_id="$2"; shift 2 ;;
      -reason)
        [[ $# -ge 2 ]] || err $RC_USAGE "Missing value for -reason"
        reason="$2"; shift 2 ;;
      *) err $RC_USAGE "Unknown option for -reject: $1" ;;
    esac
  done
  [[ -n "$task_id" ]] || err $RC_USAGE "Missing -id for -reject"
  validate_task_id "$task_id"
  sanitize_field "reason" "$reason"

  acquire_lock
  local result
  result=$(find_task "$task_id") || err $RC_NOT_FOUND "Task $task_id not found"
  local section="${result%%|*}"
  local row="${result#*|}"

  [[ "$section" == "Review" ]] || err $RC_INVALID "Task $task_id is in '$section', not 'Review'"

  # Only supervisor can reject
  require_supervisor

  local title assigned
  title=$(printf '%s' "$row" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $3); print $3}')
  assigned=$(printf '%s' "$row" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $4); print $4}')

  local started
  started=$(utc_now)
  local desc="REJECTED: ${reason}"
  local new_row="| ${task_id} | ${title} | ${assigned} | rework | ${started} | ${desc} |"

  move_task "$task_id" "In Progress" "$new_row"
  release_lock
  info "Rejected task ${task_id}: moved back to In Progress. Reason: ${reason}"
}

do_done() {
  local task_id="" summary=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -id)
        [[ $# -ge 2 ]] || err $RC_USAGE "Missing value for -id"
        task_id="$2"; shift 2 ;;
      -summary)
        [[ $# -ge 2 ]] || err $RC_USAGE "Missing value for -summary"
        summary="$2"; shift 2 ;;
      *) err $RC_USAGE "Unknown option for -done: $1" ;;
    esac
  done
  [[ -n "$task_id" ]] || err $RC_USAGE "Missing -id for -done"
  validate_task_id "$task_id"
  [[ -z "$summary" ]] || sanitize_field "summary" "$summary"

  acquire_lock
  local result
  result=$(find_task "$task_id") || err $RC_NOT_FOUND "Task $task_id not found"
  local section="${result%%|*}"
  local row="${result#*|}"

  # Validate workflow: only allow from In Progress or Review
  if [[ "$section" != "In Progress" && "$section" != "Review" ]]; then
    err $RC_INVALID "Task $task_id is in '$section' — can only -done from 'In Progress' or 'Review'"
  fi

  local title assigned
  title=$(printf '%s' "$row" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $3); print $3}')
  assigned=$(printf '%s' "$row" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $4); print $4}')

  # Authorization depends on current section
  if [[ "$section" == "Review" ]]; then
    # Moving from Review to Done requires supervisor approval
    require_supervisor
  else
    # Moving from In Progress to Done
    require_assignee_or_supervisor "$assigned"
    if [[ "$CALLER" != "supervisor" ]]; then
      err $RC_INVALID "Task $task_id must be submitted for review before the assignee can mark it done. Use -submit first."
    fi
  fi

  # Preserve artifacts from Review section
  local artifacts="—"
  if [[ "$section" == "Review" ]]; then
    artifacts=$(printf '%s' "$row" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $7); print $7}')
    [[ -n "$artifacts" ]] || artifacts="—"
  fi

  local completed
  completed=$(utc_now)
  local new_row="| ${task_id} | ${title} | ${completed} | ${summary} | ${artifacts} |"

  move_task "$task_id" "Done" "$new_row"
  release_lock
  info "Completed task ${task_id}: moved to Done"
}

do_status() {
  [[ -f "$KANBAN_FILE" ]] || err $RC_FILE "Research task board file KANBAN.md not found at $KANBAN_FILE"
  cat "$KANBAN_FILE"
}

# --- Main ---
usage() {
  cat <<'EOF'
Usage: lab-kanban.sh [-caller <name>] <operation> [options]

Global:
  -caller <name>   Identity of the calling agent (required for RBAC)

Operations:
  -new     -title "..." -assign <agent> [-priority P0-P3] [-desc "..."]
  -start   -id <TASK_ID>
  -submit  -id <TASK_ID> -artifacts "path1,path2"
  -approve -id <TASK_ID>            (supervisor only)
  -reject  -id <TASK_ID> -reason "..."  (supervisor only)
  -done    -id <TASK_ID> [-summary "..."]
  -status  Print the Research task board
EOF
  exit $RC_USAGE
}

[[ $# -ge 1 ]] || usage

# Parse global -caller option
if [[ "$1" == "-caller" ]]; then
  [[ $# -ge 3 ]] || err $RC_USAGE "Missing value for -caller"
  CALLER="$2"
  validate_agent_name "$CALLER"
  shift 2
fi

op="$1"; shift
case "$op" in
  -new)     require_mutation_runtime; do_new "$@" ;;
  -start)   require_mutation_runtime; do_start "$@" ;;
  -submit)  require_mutation_runtime; do_submit "$@" ;;
  -approve) require_mutation_runtime; do_approve "$@" ;;
  -reject)  require_mutation_runtime; do_reject "$@" ;;
  -done)    require_mutation_runtime; do_done "$@" ;;
  -status)  do_status ;;
  *)        usage ;;
esac
