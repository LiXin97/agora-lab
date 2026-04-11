#!/usr/bin/env bash
# workspace-guard.sh — PreToolUse hook to enforce workspace isolation
# Prevents agents from writing outside their workspace and approved shared paths.

set -euo pipefail

AGENT_NAME="${1:-}"

if [[ -z "$AGENT_NAME" ]]; then
  echo "BLOCKED: No agent name provided to workspace guard. Failing closed."
  exit 1
fi

if [[ ! "$AGENT_NAME" =~ ^[a-zA-Z][a-zA-Z0-9_-]*$ ]]; then
  echo "BLOCKED: Invalid agent name '${AGENT_NAME}'"
  exit 1
fi

TOOL_INPUT=""
if [[ ! -t 0 ]]; then
  if command -v timeout &>/dev/null; then
    TOOL_INPUT=$(timeout 5 cat || true)
  else
    TOOL_INPUT=$(cat)
  fi
fi

if [[ -z "$TOOL_INPUT" ]]; then
  echo "BLOCKED: Empty tool input. Failing closed for safety."
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AGORA_PROJECT_DIR="${AGORA_PROJECT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
PATH_LIB="$SCRIPT_DIR/../scripts/path-lib.sh"
if [[ ! -f "$PATH_LIB" ]]; then
  echo "BLOCKED: path-lib.sh not found at $PATH_LIB. Reinstall Agora or reinitialize this lab runtime." >&2
  exit 1
fi
# shellcheck source=/dev/null
source "$PATH_LIB"

derived_project_dir=$(lab_find_project_dir_from_cwd 2>/dev/null || true)
if [[ -z "$derived_project_dir" ]]; then
  echo "BLOCKED: Could not determine the bound lab from the current working directory."
  exit 1
fi
AGORA_PROJECT_DIR="$derived_project_dir"

json_field() {
  local key="$1"
  if command -v jq &>/dev/null; then
    printf '%s' "$TOOL_INPUT" | jq -r --arg key "$key" '.[$key] // empty' 2>/dev/null
    return
  fi
  if command -v python3 &>/dev/null; then
    TOOL_INPUT="$TOOL_INPUT" python3 - "$key" <<'PY'
import json, os, sys
key = sys.argv[1]
try:
    data = json.loads(os.environ["TOOL_INPUT"])
except Exception:
    sys.exit(1)
value = data.get(key, "")
if value is None:
    value = ""
sys.stdout.write(str(value))
PY
    return
  fi
  if command -v python &>/dev/null; then
    TOOL_INPUT="$TOOL_INPUT" python - "$key" <<'PY'
import json, os, sys
key = sys.argv[1]
try:
    data = json.loads(os.environ["TOOL_INPUT"])
except Exception:
    sys.exit(1)
value = data.get(key, "")
if value is None:
    value = ""
sys.stdout.write(str(value))
PY
    return
  fi
  return 1
}

FILE_PATH=$(json_field "file_path" 2>/dev/null) || true
if [[ -z "$FILE_PATH" ]]; then
  echo "BLOCKED: Could not extract file_path from tool input. Failing closed for safety."
  exit 1
fi

normalize_path_lexically() {
  local path="$1"
  if [[ "$path" != /* ]]; then
    path="$(pwd -P)/$path"
  fi

  local IFS='/'
  local -a parts stack=()
  read -r -a parts <<< "$path"

  local part
  for part in "${parts[@]}"; do
    case "$part" in
      ""|".") ;;
      "..")
        if [[ ${#stack[@]} -gt 0 ]]; then
          unset 'stack[${#stack[@]}-1]'
        fi
        ;;
      *)
        stack+=("$part")
        ;;
    esac
  done

  local resolved="/"
  for part in "${stack[@]}"; do
    if [[ "$resolved" == "/" ]]; then
      resolved="/$part"
    else
      resolved="$resolved/$part"
    fi
  done

  printf '%s\n' "$resolved"
}

resolve_path() {
  local path="$1"
  if command -v realpath &>/dev/null && realpath -m / >/dev/null 2>&1; then
    realpath -m "$path" 2>/dev/null || normalize_path_lexically "$path"
    return
  fi

  local normalized
  normalized=$(normalize_path_lexically "$path")
  local dir base
  dir=$(dirname "$normalized")
  base=$(basename "$normalized")
  if [[ -d "$dir" ]]; then
    printf '%s/%s\n' "$(cd "$dir" && pwd -P)" "$base" | sed 's#//*#/#g'
  else
    printf '%s\n' "$normalized"
  fi
}

path_has_symlink_component() {
  local path="$1"
  while :; do
    if [[ -L "$path" ]]; then
      return 0
    fi
    [[ "$path" == "/" ]] && break
    path=$(dirname "$path")
  done
  return 1
}

canonicalize_write_target() {
  local path="$1" parent base
  parent=$(dirname "$path")
  base=$(basename "$path")
  printf '%s/%s\n' "$(resolve_path "$parent")" "$base" | sed 's#//*#/#g'
}

get_agent_role() {
  local name="$1"
  local lab_yaml="$AGORA_PROJECT_DIR/lab.yaml"
  [[ -f "$lab_yaml" ]] || return
  awk -v agent="$name" '
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
      sub(/.*role:[[:space:]]*/, "")
      print
      exit
    }
  ' "$lab_yaml"
}

if [[ "$FILE_PATH" != /* ]]; then
  FILE_PATH="$AGORA_PROJECT_DIR/agents/$AGENT_NAME/$FILE_PATH"
fi

if path_has_symlink_component "$FILE_PATH"; then
  echo "BLOCKED: Target path or one of its parent directories is a symlink."
  exit 1
fi

FILE_PATH=$(canonicalize_write_target "$FILE_PATH")
BOUND_AGENT=$(lab_bound_agent_from_cwd "$AGORA_PROJECT_DIR" || true)
if [[ -z "$BOUND_AGENT" ]]; then
  echo "BLOCKED: Could not determine the bound agent workspace from the current working directory."
  exit 1
fi
if [[ "$BOUND_AGENT" != "$AGENT_NAME" ]]; then
  echo "BLOCKED: Agent '${AGENT_NAME}' does not match the bound workspace '${BOUND_AGENT}'."
  exit 1
fi
AGENT_DIR=$(resolve_path "$AGORA_PROJECT_DIR/agents/$AGENT_NAME")
AGENTS_DIR=$(resolve_path "$AGORA_PROJECT_DIR/agents")
ARTIFACT_DIR=$(resolve_path "$(lab_artifact_dir)")
MESSAGE_DIR=$(resolve_path "$(lab_message_dir)")
MEETING_DIR=$(resolve_path "$(lab_meeting_dir)")
PAPER_REVIEW_DIR=$(resolve_path "$(lab_paper_review_dir)")
KANBAN_PATH=$(resolve_path "$(lab_kanban_file)")
DECISION_MAKER=$(lab_decision_maker)
AGENT_ROLE=$(get_agent_role "$AGENT_NAME")

if [[ -z "$AGENT_ROLE" ]]; then
  echo "BLOCKED: Could not determine role for '${AGENT_NAME}'."
  exit 1
fi

if [[ "$FILE_PATH" == "$AGENT_DIR/"* || "$FILE_PATH" == "$AGENT_DIR" ]]; then
  exit 0
fi

if [[ "$FILE_PATH" == "$KANBAN_PATH" ]]; then
  echo "BLOCKED: Use lab-kanban.sh to modify KANBAN.md, not direct edits."
  exit 1
fi

if [[ "$FILE_PATH" == "$ARTIFACT_DIR/"* ]]; then
  local_artifact_dir="$ARTIFACT_DIR/$AGENT_NAME/"
  if [[ "$FILE_PATH" == "$local_artifact_dir"* ]]; then
    exit 0
  fi
  echo "BLOCKED: You can only write to your configured artifact directory."
  exit 1
fi

if [[ "$FILE_PATH" == "$MESSAGE_DIR/"* ]]; then
  message_rel="${FILE_PATH#"$MESSAGE_DIR"/}"
  if [[ "$message_rel" == */* ]]; then
    echo "BLOCKED: Message files must be written directly under shared/messages/."
    exit 1
  fi
  message_name="$message_rel"
  if [[ "$message_name" == "${AGENT_NAME}_to_"*.md ]]; then
    exit 0
  fi
  echo "BLOCKED: Message files must be named ${AGENT_NAME}_to_<recipient>_*.md."
  exit 1
fi

if [[ "$FILE_PATH" == "$MEETING_DIR/"* ]]; then
  meeting_rel="${FILE_PATH#"$MEETING_DIR"/}"
  meeting_id="${meeting_rel%%/*}"
  rest="${meeting_rel#*/}"

  if [[ "$meeting_id" == "$meeting_rel" || ! "$meeting_id" =~ ^M[0-9]{3,}$ ]]; then
    echo "BLOCKED: Invalid meeting write path '$FILE_PATH'."
    exit 1
  fi

  if [[ "$AGENT_ROLE" == "paper-reviewer" ]]; then
    echo "BLOCKED: Paper reviewers cannot write regular meeting files."
    exit 1
  fi

  if [[ "$rest" == "perspectives/${AGENT_NAME}.md" ]]; then
    exit 0
  fi

  if [[ "$AGENT_ROLE" == "research-staff" && "$rest" == "judgments/${AGENT_NAME}.md" ]]; then
    exit 0
  fi

  if [[ "$AGENT_ROLE" == "research-staff" && "$rest" == "critiques/${AGENT_NAME}_on_all.md" ]]; then
    exit 0
  fi

  if [[ "$AGENT_ROLE" == "student" && "$rest" == critiques/"$AGENT_NAME"_*.md ]]; then
    exit 0
  fi

  if [[ "$rest" == "responses/${AGENT_NAME}_response.md" ]]; then
    exit 0
  fi

  if [[ "$rest" == "read-acks/${AGENT_NAME}.ack" ]]; then
    exit 0
  fi

  if [[ "$AGENT_ROLE" == "supervisor" ]]; then
    case "$rest" in
      meta.yaml|agenda.md)
        exit 0
        ;;
    esac
  fi

  if [[ "$AGENT_NAME" == "$DECISION_MAKER" && "$rest" == "decision.md" ]]; then
    exit 0
  fi

  echo "BLOCKED: Meeting writes are limited to your own submission files. Cannot write '$FILE_PATH'."
  exit 1
fi

if [[ "$FILE_PATH" == "$PAPER_REVIEW_DIR/"* ]]; then
  paper_rel="${FILE_PATH#"$PAPER_REVIEW_DIR"/}"

  case "$AGENT_ROLE:$paper_rel" in
    paper-reviewer:P*/rounds/R*/reviews/${AGENT_NAME}.md)
      exit 0
      ;;
    supervisor:P*/rounds/R*/supervisor-resolution.md)
      exit 0
      ;;
    student:P*/rounds/R*/author-response.md)
      exit 0
      ;;
  esac

  echo "BLOCKED: Paper-review writes are limited to your role-specific files. Cannot write '$FILE_PATH'."
  exit 1
fi

if [[ "$FILE_PATH" == "$AGENTS_DIR/"* ]]; then
  target_agent=$(printf '%s' "$FILE_PATH" | sed "s|$AGENTS_DIR/||" | cut -d'/' -f1)
  echo "BLOCKED: Cannot write to agent '${target_agent}' workspace. You can only write to your own workspace."
  exit 1
fi

echo "BLOCKED: Write to '${FILE_PATH}' is outside allowed boundaries."
exit 1
