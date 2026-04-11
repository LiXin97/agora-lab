#!/usr/bin/env bash
# kanban-guard.sh — PostToolUse hook to validate KANBAN.md format after writes
# Reads tool input from stdin (Claude Code hook protocol)
# Exits 1 (blocks) on format errors to prevent corruption

set -euo pipefail

# Read tool input from stdin
TOOL_INPUT=""
if [[ ! -t 0 ]]; then
  if command -v timeout &>/dev/null; then
    TOOL_INPUT=$(timeout 5 cat || true)
  else
    TOOL_INPUT=$(cat)
  fi
fi
[[ -n "$TOOL_INPUT" ]] || exit 0

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# Use env var from agent session; fall back to legacy layout for backward compat
AGORA_HOME="${AGORA_HOME:-$(cd "$SCRIPT_DIR/.." && pwd)}"
AGORA_PROJECT_DIR="${AGORA_PROJECT_DIR:-$AGORA_HOME}"
PATH_LIB="$SCRIPT_DIR/../scripts/path-lib.sh"
if [[ ! -f "$PATH_LIB" ]]; then
  echo "BLOCKED: path-lib.sh not found at $PATH_LIB. Reinstall Agora or reinitialize this lab runtime." >&2
  exit 1
fi
# shellcheck source=/dev/null
source "$PATH_LIB"
KANBAN_FILE="$(lab_kanban_file)"

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

[[ -n "$FILE_PATH" ]] || exit 0

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

# Only validate writes to KANBAN.md — use full path comparison, not basename
KANBAN_REAL=$(resolve_path "$KANBAN_FILE")
FILE_PATH=$(resolve_path "$FILE_PATH")

if [[ "$FILE_PATH" != "$KANBAN_REAL" ]]; then
  exit 0
fi

[[ -f "$KANBAN_FILE" ]] || exit 0

# --- Validate structure ---
errors=""

# Source centralized schema if available
KANBAN_SCHEMA="$AGORA_HOME/scripts/kanban-schema.sh"
# shellcheck source=/dev/null
[[ -f "$KANBAN_SCHEMA" ]] && source "$KANBAN_SCHEMA"

# Check required sections exist
if [[ -v KANBAN_SECTIONS && ${#KANBAN_SECTIONS[@]} -gt 0 ]]; then
  for section in "${KANBAN_SECTIONS[@]}"; do
    if ! grep -q "^## ${section}" "$KANBAN_FILE"; then
      errors="${errors}Missing section: ## ${section}\n"
    fi
  done
else
  # Fallback: hardcoded sections
  for section in "Backlog" "In Progress" "Review" "Done"; do
    if ! grep -q "^## ${section}" "$KANBAN_FILE"; then
      errors="${errors}Missing section: ## ${section}\n"
    fi
  done
fi

# Check each section has a table header and separator
in_section=""
has_header=0
has_separator=0
while IFS= read -r line; do
  if [[ "$line" =~ ^##[[:space:]]+(.*) ]]; then
    if [[ -n "$in_section" ]]; then
      if [[ $has_header -eq 0 ]]; then
        errors="${errors}Section '${in_section}' has no table header\n"
      fi
      if [[ $has_separator -eq 0 ]]; then
        errors="${errors}Section '${in_section}' has no table separator\n"
      fi
    fi
    in_section="${BASH_REMATCH[1]}"
    has_header=0
    has_separator=0
  elif [[ -n "$in_section" ]]; then
    # Table header: starts with | and contains column names
    if [[ "$line" =~ ^\|[[:space:]]*[A-Z] && $has_header -eq 0 ]]; then
      has_header=1
    fi
    # Table separator: |---|---|...| (with at least 3 dashes per column)
    if [[ "$line" =~ ^\|[[:space:]]*-{3} ]]; then
      has_separator=1
    fi
  fi
done < "$KANBAN_FILE"

# Check last section
if [[ -n "$in_section" ]]; then
  if [[ $has_header -eq 0 ]]; then
    errors="${errors}Section '${in_section}' has no table header\n"
  fi
  if [[ $has_separator -eq 0 ]]; then
    errors="${errors}Section '${in_section}' has no table separator\n"
  fi
fi

if [[ -n "$errors" ]]; then
  echo "BLOCKED: KANBAN.md format errors detected:"
  printf '%b' "$errors"
  echo "The write has been flagged. Run 'lab-kanban.sh -status' to verify the board."
  exit 1
fi

exit 0
