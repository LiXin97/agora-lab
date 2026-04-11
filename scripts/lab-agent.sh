#!/usr/bin/env bash
# lab-agent.sh — Dynamic agent management for the virtual research lab
# Usage: lab-agent.sh -add|-remove|-init|-init-all|-send|-list|-status|-wake [options]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AGORA_HOME="${AGORA_HOME:-$(cd "$SCRIPT_DIR/.." && pwd)}"
AGORA_PROJECT_DIR="${AGORA_PROJECT_DIR:-$AGORA_HOME}"
LAB_YAML="$AGORA_PROJECT_DIR/lab.yaml"
LAB_YAML_LOCK="$LAB_YAML.lock"
AGENTS_DIR="$AGORA_PROJECT_DIR/agents"
TEMPLATES_DIR="$AGORA_HOME/templates"
SKILLS_DIR="$AGORA_HOME/skills"
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
fi
LAB_YAML="$AGORA_PROJECT_DIR/lab.yaml"
LAB_YAML_LOCK="$LAB_YAML.lock"
AGENTS_DIR="$AGORA_PROJECT_DIR/agents"
if [[ -e "$AGORA_PROJECT_DIR/templates" ]]; then
  TEMPLATES_DIR="$AGORA_PROJECT_DIR/templates"
fi
if [[ -e "$AGORA_PROJECT_DIR/skills" ]]; then
  SKILLS_DIR="$AGORA_PROJECT_DIR/skills"
fi
MESSAGES_DIR="$(lab_message_dir)"
ARTIFACTS_DIR="$(lab_artifact_dir)"

err() { echo "ERROR: $1" >&2; exit 1; }
info() { echo "$1" >&2; }
warn() { echo "WARN: $1" >&2; }

PERSONA_LIB="$SCRIPT_DIR/persona-lib.sh"
[[ -f "$PERSONA_LIB" ]] || err "persona-lib.sh not found at $PERSONA_LIB"
# shellcheck source=/dev/null
source "$PERSONA_LIB"

resolve_path() {
  path_resolve "$1"
}

require_mutation_runtime() {
  lab_require_script_runtime "$SCRIPT_DIR" "$AGORA_PROJECT_DIR"
}

random_hex() {
  if [[ -r /dev/urandom ]]; then
    head -c 4 /dev/urandom | od -An -tx1 | tr -d ' \n'
  else
    printf '%s%s' "$RANDOM" "$RANDOM"
  fi
}

canonicalize_backend() {
  local backend="$1"
  case "$backend" in
    claude|claude-code) printf 'claude-code\n' ;;
    codex) printf 'codex\n' ;;
    copilot|copilot-cli|gh-copilot) printf 'copilot\n' ;;
    gemini|gemini-cli) printf 'gemini\n' ;;
    *) return 1 ;;
  esac
}

backend_is_unsafe() {
  local backend="$1"
  [[ "$backend" == "codex" || "$backend" == "copilot" || "$backend" == "gemini" ]]
}

unsafe_backends_allowed() {
  [[ "$(yaml_get "allow_unsafe_backends")" == "true" ]]
}

assert_backend_launch_allowed() {
  local backend="$1"
  if backend_is_unsafe "$backend" && ! unsafe_backends_allowed; then
    err "Backend '$backend' is disabled by default because it runs without enforced workspace isolation. Set security.allow_unsafe_backends: true in lab.yaml to opt in."
  fi
}

build_backend_command() {
  local backend="$1" model="$2"
  case "$backend" in
    claude-code|claude)
      if [[ -n "$model" ]]; then
        printf 'claude --model %s' "$model"
      else
        printf 'claude'
      fi
      ;;
    codex)
      if [[ -n "$model" ]]; then
        printf 'codex --model %s' "$model"
      else
        printf 'codex'
      fi
      ;;
    copilot)
      printf 'gh copilot'
      ;;
    gemini)
      if [[ -n "$model" ]]; then
        printf 'gemini --model %s' "$model"
      else
        printf 'gemini'
      fi
      ;;
    *)
      warn "Unknown backend '$backend', defaulting to claude"
      printf 'claude'
      ;;
  esac
}

build_resume_command() {
  local backend="$1" model="$2"
  case "$backend" in
    claude-code|claude)
      if [[ -n "$model" ]]; then
        printf 'claude --continue --model %s' "$model"
      else
        printf 'claude --continue'
      fi
      ;;
    *)
      build_backend_command "$backend" "$model"
      ;;
  esac
}

# --- tmux session naming ---
# Returns a namespaced session name: agora-{sanitized_lab_name}-{agent_name}
# This prevents collisions with the user's own tmux sessions and allows
# multiple labs to run on the same machine.
_cached_lab_slug=""
_cached_project_hash=""
sanitized_lab_slug() {
  if [[ -n "$_cached_lab_slug" ]]; then
    printf '%s' "$_cached_lab_slug"
    return
  fi
  local raw_name
  raw_name=$(awk '/^lab_name:/{
    val = substr($0, index($0, ":") + 1)
    gsub(/^[[:space:]]+/, "", val)
    gsub(/[[:space:]]*#.*$/, "", val)
    if (val ~ /^"/) { sub(/^"/, "", val); sub(/"$/, "", val) }
    print val
  }' "$LAB_YAML" 2>/dev/null)
  # Sanitize: lowercase, spaces/underscores to hyphens, strip non-alnum/hyphen, collapse hyphens
  local slug
  slug=$(printf '%s' "${raw_name:-lab}" | tr '[:upper:]' '[:lower:]' | tr ' _' '-' | sed 's/[^a-z0-9-]//g; s/-\{2,\}/-/g; s/^-//; s/-$//')
  [[ -n "$slug" ]] || slug="lab"
  # Truncate to keep total session name within tmux limits (typically 256 chars)
  slug="${slug:0:24}"
  _cached_lab_slug="$slug"
  printf '%s' "$slug"
}

project_hash() {
  if [[ -n "$_cached_project_hash" ]]; then
    printf '%s' "$_cached_project_hash"
    return
  fi
  local seed hash
  seed="$AGORA_PROJECT_DIR"
  if [[ -d "$seed" ]]; then
    seed="$(cd "$seed" && pwd -P)"
  fi
  hash=$(printf '%s' "$seed" | cksum | awk '{printf "%08x", $1}')
  _cached_project_hash="${hash:0:8}"
  printf '%s' "$_cached_project_hash"
}

tmux_session_name() {
  local agent_name="$1"
  printf 'agora-%s-%s-%s' "$(sanitized_lab_slug)" "$(project_hash)" "$agent_name"
}

tmux_pane_target() {
  local session_name="$1"
  printf '=%s:0.0' "$session_name"
}

export_runtime_env() {
  local session_name="$1" agent_name="$2" agent_role="$3" backend="$4"
  local export_cmd bound_project_dir
  bound_project_dir=$(resolve_path "$AGORA_PROJECT_DIR")
  printf -v export_cmd 'export AGORA_HOME=%q AGORA_PROJECT_DIR=%q AGORA_BOUND_PROJECT_DIR=%q AGORA_AGENT_NAME=%q AGORA_AGENT_ROLE=%q AGORA_AGENT_BACKEND=%q' \
    "$AGORA_HOME" "$AGORA_PROJECT_DIR" "$bound_project_dir" "$agent_name" "$agent_role" "$backend"
  tmux send-keys -t "$(tmux_pane_target "$session_name")" -- "$export_cmd" Enter
}

agent_cli_running() {
  local name="$1"
  local session
  session=$(tmux_session_name "$name")
  if ! tmux has-session -t "=$session" 2>/dev/null; then
    return 1
  fi

  local pane_pid
  pane_pid=$(tmux list-panes -t "=$session" -F '#{pane_pid}' 2>/dev/null | head -1)
  [[ -n "$pane_pid" ]] || return 1

  local children
  children=$(pgrep -P "$pane_pid" 2>/dev/null | wc -l | tr -d ' ')
  [[ "${children:-0}" -gt 0 ]]
}

inject_pending_items() {
  local name="$1"
  local poll_sh="$SCRIPT_DIR/lab-poll.sh"
  [[ -f "$poll_sh" ]] || return 0

  agent_cli_running "$name" || return 0

  local session
  session=$(tmux_session_name "$name")
  local poll_output
  poll_output=$(AGORA_HOME="$AGORA_HOME" AGORA_PROJECT_DIR="$AGORA_PROJECT_DIR" bash "$poll_sh" "$name" 2>/dev/null) || true
  if [[ -n "$poll_output" ]] && agent_cli_running "$name"; then
    tmux send-keys -t "$(tmux_pane_target "$session")" -l -- "$poll_output"
    tmux send-keys -t "$(tmux_pane_target "$session")" Enter
  fi
}

write_message_file() {
  local from="$1" to="$2" type="$3" heading="$4" body="$5"
  mkdir -p "$MESSAGES_DIR"
  local timestamp msg_timestamp rand msg_file tmp_msg
  timestamp=$(date -u +"%Y%m%dT%H%M%SZ")
  msg_timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  rand=$(random_hex)
  msg_file="$MESSAGES_DIR/${from}_to_${to}_${timestamp}_${$}_${rand}_${type}.md"
  tmp_msg=$(mktemp "$MESSAGES_DIR/.message.XXXXXX")
  cat > "$tmp_msg" <<EOF
---
from: ${from}
to: ${to}
type: ${type}
timestamp: ${msg_timestamp}
status: unread
---

## ${heading}

${body}
EOF
  mv "$tmp_msg" "$msg_file"
  printf '%s\n' "$msg_file"
}

# --- Name validation ---
validate_agent_name() {
  local name="$1"
  if [[ ! "$name" =~ ^[a-zA-Z][a-zA-Z0-9_-]*$ ]]; then
    err "Invalid agent name '$name'. Must start with a letter and contain only letters, digits, hyphens, underscores."
  fi
  if [[ ${#name} -gt 64 ]]; then
    err "Agent name '$name' too long (max 64 chars)"
  fi
}

# --- lab.yaml locking ---
_yaml_lock_fd=""
_yaml_tmp_files=()
yaml_lock() {
  touch "$LAB_YAML_LOCK"
  exec {_yaml_lock_fd}< "$LAB_YAML_LOCK"
  flock -x -w 5 "$_yaml_lock_fd" || err "Cannot acquire lock on lab.yaml"
}
yaml_unlock() {
  if [[ -n "${_yaml_lock_fd:-}" ]]; then
    exec {_yaml_lock_fd}<&- || true
    _yaml_lock_fd=""
  fi
}
yaml_cleanup() {
  for f in "${_yaml_tmp_files[@]}"; do
    rm -f "$f" 2>/dev/null || true
  done
  yaml_unlock
}
trap yaml_cleanup EXIT

# --- YAML helpers (lightweight, no dependencies) ---
# Read a top-level or nested value from lab.yaml
yaml_get() {
  local key="$1"
  # Strip quotes but preserve # inside quoted values
  grep -E "^[[:space:]]*${key}:" "$LAB_YAML" | head -1 | awk -F': ' '{
    val = substr($0, index($0, ": ") + 2)
    # If value is quoted, extract content between quotes (preserving #)
    if (val ~ /^"/) { sub(/^"/, "", val); sub(/"[[:space:]]*(#.*)?$/, "", val) }
    else if (val ~ /^'"'"'/) { sub(/^'"'"'/, "", val); sub(/'"'"'[[:space:]]*(#.*)?$/, "", val) }
    else { sub(/[[:space:]]*#.*$/, "", val) }  # Only strip comments from unquoted values
    gsub(/^[[:space:]]+|[[:space:]]+$/, "", val)
    print val
  }'
}

sanitize_direction() {
  sanitize_yaml_scalar "$1" "Research direction"
}

# Check if an agent exists in lab.yaml
agent_exists() {
  local name="$1"
  # Use exact string match with anchored pattern (not regex from user input)
  awk -v name="$name" '
    /^agents:/ { found=1; next }
    found && /^[^ ]/ { exit }
    found && /^  / {
      line = $0
      sub(/^  /, "", line)
      sub(/:.*/, "", line)
      if (line == name) { print "yes"; exit }
    }
  ' "$LAB_YAML"
}

# Count agents with a given role
count_agents_by_role() {
  local target_role="$1"
  awk -v role="$target_role" '
    /^agents:/ { in_agents=1; next }
    in_agents && /^[^ ]/ { in_agents=0 }
    in_agents && /^  [a-zA-Z]/ { in_agent=1; next }
    in_agent && /^  [^ ]/ { in_agent=0 }
    in_agent && /^    role:/ {
      val=$0; sub(/.*role:[[:space:]]*/, "", val); gsub(/[[:space:]]*#.*/, "", val)
      if (val == role) count++
      in_agent=0
    }
    END { print count+0 }
  ' "$LAB_YAML"
}

# Get agent field from lab.yaml (uses string comparison, not regex)
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

# Get role template field (uses string comparison, not regex)
role_field() {
  local role="$1" field="$2"
  awk -v role="$role" -v field="$field" '
    /^roles:/ { in_roles=1; next }
    in_roles && /^[^ ]/ { in_roles=0 }
    in_roles && /^  / {
      line = $0
      sub(/^  /, "", line)
      sub(/:.*/, "", line)
      if (line == role) { in_role=1; next }
    }
    in_role && /^  [^ ]/ { in_role=0 }
    in_role && /^    / {
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
  canonicalize_backend "$backend" 2>/dev/null || return 1
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

# Append agent to lab.yaml
yaml_add_agent() {
  local name="$1" role="$2" backend="$3" model="${4:-}" direction="${5:-}"
  local persona_preset="${6:-}" mbti="${7:-}" background="${8:-}" notable_results="${9:-}"
  local tmp_file
  tmp_file=$(mktemp "${LAB_YAML}.tmp.XXXXXX")
  _yaml_tmp_files+=("$tmp_file")
  local in_agents=0
  local last_agent_line=0
  local line_num=0
  while IFS= read -r line; do
    line_num=$((line_num + 1))
    if [[ "$line" =~ ^agents: ]]; then
      in_agents=1
    elif [[ $in_agents -eq 1 ]]; then
      if [[ "$line" =~ ^[^[:space:]] && -n "$line" ]]; then
        # Non-indented line = left agents section
        break
      fi
      if [[ -n "$line" && "$line" =~ ^[[:space:]] ]]; then
        last_agent_line=$line_num
      fi
    fi
  done < "$LAB_YAML"

  # If no agents exist yet (just the "agents:" header), insert after it
  if [[ $last_agent_line -eq 0 ]]; then
    line_num=0
    while IFS= read -r line; do
      line_num=$((line_num + 1))
      if [[ "$line" =~ ^agents: ]]; then
        last_agent_line=$line_num
        break
      fi
    done < "$LAB_YAML"
  fi

  line_num=0
  while IFS= read -r line; do
    line_num=$((line_num + 1))
    echo "$line"
    if [[ $line_num -eq $last_agent_line ]]; then
      echo ""
      echo "  ${name}:"
      echo "    role: ${role}"
      echo "    backend: ${backend}"
      [[ -n "$model" ]] && echo "    model: ${model}"
      [[ -n "$direction" ]] && echo "    research_direction: \"${direction}\""
      [[ -n "$persona_preset" ]] && echo "    persona_preset: ${persona_preset}"
      [[ -n "$mbti" ]] && echo "    mbti: ${mbti}"
      [[ -n "$background" ]] && echo "    background: \"${background}\""
      [[ -n "$notable_results" ]] && echo "    notable_results: \"${notable_results}\""
    fi
  done < "$LAB_YAML" > "$tmp_file"
  mv "$tmp_file" "$LAB_YAML"
}

# Remove agent from lab.yaml (scoped to agents: section, exact string match)
yaml_remove_agent() {
  local name="$1"
  local tmp_file
  tmp_file=$(mktemp "${LAB_YAML}.tmp.XXXXXX")
  _yaml_tmp_files+=("$tmp_file")
  local in_agents=0
  local in_target=0
  while IFS= read -r line || [[ -n "$line" ]]; do
    # Track whether we're in the agents: section
    if [[ "$line" =~ ^agents:[[:space:]]*$ || "$line" == "agents:" ]]; then
      in_agents=1
      echo "$line"
      continue
    fi
    # Non-indented line (not in any section's content)
    if [[ $in_agents -eq 1 && "$line" =~ ^[^[:space:]] && -n "$line" ]]; then
      in_agents=0
      in_target=0
    fi

    if [[ $in_agents -eq 1 && $in_target -eq 0 ]]; then
      # Check for exact agent name match: "  name:" (2-space indent, exact name, colon)
      local trimmed="${line#  }"
      local candidate="${trimmed%%:*}"
      if [[ "$line" =~ ^[[:space:]]{2}[^[:space:]] && "$candidate" == "$name" && "$trimmed" == "${name}:"* ]]; then
        in_target=1
        continue
      fi
    fi

    if [[ $in_target -eq 1 ]]; then
      # Skip lines belonging to the removed agent (4-space indented or blank after it)
      if [[ "$line" =~ ^[[:space:]]{4} ]]; then
        continue  # skip agent's fields
      elif [[ -z "$line" ]]; then
        continue  # skip blank line after removed agent
      else
        # No longer in target agent's block
        in_target=0
        echo "$line"
      fi
    else
      echo "$line"
    fi
  done < "$LAB_YAML" > "$tmp_file"
  mv "$tmp_file" "$LAB_YAML"
}

# --- Template rendering (uses awk to avoid sed delimiter injection) ---
# Escapes & and \ in awk gsub replacement strings to prevent injection
awk_safe() {
  # Escape for awk gsub replacement: \ → \\, & → \&
  # Order matters: escape backslashes first, then ampersands
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/&/\\&/g'
}

render_template() {
  local template="$1" name="$2" role="$3"
  local lab_name research_topic direction backend model persona_preset mbti background notable_results persona_lens

  lab_name=$(yaml_get "lab_name")
  research_topic=$(yaml_get "research_topic")
  direction=$(agent_field "$name" "research_direction")
  backend=$(effective_agent_backend "$name" 2>/dev/null || agent_field "$name" "backend")
  model=$(agent_field "$name" "model")
  persona_preset=$(resolve_agent_persona_preset "$name" "$role")
  mbti=$(resolve_agent_persona_value "$name" "$role" "mbti")
  background=$(resolve_agent_persona_value "$name" "$role" "background")
  notable_results=$(resolve_agent_persona_value "$name" "$role" "notable_results")
  persona_lens=$(resolve_agent_persona_value "$name" "$role" "persona_lens")

  # Escape special chars for awk gsub replacement (& and \ are special)
  local safe_name safe_lab safe_topic safe_direction safe_backend safe_model safe_preset
  local safe_mbti safe_background safe_results safe_lens
  local safe_kanban_rel safe_message_rel safe_meeting_rel safe_artifact_rel safe_paper_review_rel
  safe_name=$(awk_safe "$name")
  safe_lab=$(awk_safe "$lab_name")
  safe_topic=$(awk_safe "$research_topic")
  safe_direction=$(awk_safe "${direction:-TBD}")
  safe_backend=$(awk_safe "${backend:-unknown}")
  safe_model=$(awk_safe "${model:-default}")
  safe_preset=$(awk_safe "${persona_preset:-derived}")
  safe_mbti=$(awk_safe "${mbti:-unknown}")
  safe_background=$(awk_safe "${background:-No background configured.}")
  safe_results=$(awk_safe "${notable_results:-No notable results configured.}")
  safe_lens=$(awk_safe "${persona_lens:-No explicit research lens configured.}")
  safe_kanban_rel=$(awk_safe "$(lab_kanban_agent_rel)")
  safe_message_rel=$(awk_safe "$(lab_message_agent_rel)")
  safe_meeting_rel=$(awk_safe "$(lab_meeting_agent_rel)")
  safe_artifact_rel=$(awk_safe "$(lab_artifact_agent_rel)")
  safe_paper_review_rel=$(awk_safe "$(lab_paper_review_agent_rel)")

  awk -v name="$safe_name" -v lab_name="$safe_lab" -v topic="$safe_topic" -v direction="$safe_direction" \
      -v backend="$safe_backend" -v model="$safe_model" -v persona_preset="$safe_preset" \
      -v mbti="$safe_mbti" -v background="$safe_background" -v notable_results="$safe_results" \
      -v persona_lens="$safe_lens" -v kanban="$safe_kanban_rel" -v message_dir="$safe_message_rel" \
      -v meeting_dir="$safe_meeting_rel" -v artifact_dir="$safe_artifact_rel" \
      -v paper_review_dir="$safe_paper_review_rel" '
  {
    gsub(/\{\{NAME\}\}/, name)
    gsub(/\{\{LAB_NAME\}\}/, lab_name)
    gsub(/\{\{RESEARCH_TOPIC\}\}/, topic)
    gsub(/\{\{RESEARCH_DIRECTION\}\}/, direction)
    gsub(/\{\{BACKEND\}\}/, backend)
    gsub(/\{\{MODEL\}\}/, model)
    gsub(/\{\{PERSONA_PRESET\}\}/, persona_preset)
    gsub(/\{\{MBTI\}\}/, mbti)
    gsub(/\{\{BACKGROUND\}\}/, background)
    gsub(/\{\{NOTABLE_RESULTS\}\}/, notable_results)
    gsub(/\{\{PERSONA_LENS\}\}/, persona_lens)
    gsub(/\{\{KANBAN_FILE_REL\}\}/, kanban)
    gsub(/\{\{MESSAGE_DIR_REL\}\}/, message_dir)
    gsub(/\{\{MEETING_DIR_REL\}\}/, meeting_dir)
    gsub(/\{\{ARTIFACT_DIR_REL\}\}/, artifact_dir)
    gsub(/\{\{PAPER_REVIEW_DIR_REL\}\}/, paper_review_dir)
    print
  }
  ' "$template"
}

render_settings() {
  local name="$1" role="${2:-}"
  # Use role-specific template if available, else generic
  local template=""
  if [[ -n "$role" && -f "$TEMPLATES_DIR/settings.${role}.json.tmpl" ]]; then
    template="$TEMPLATES_DIR/settings.${role}.json.tmpl"
  elif [[ -f "$TEMPLATES_DIR/settings.json.tmpl" ]]; then
    template="$TEMPLATES_DIR/settings.json.tmpl"
  fi
  if [[ -n "$template" ]]; then
    # Build Skill allow entries from role's skill list
    local skill_allows=""
    if [[ -n "$role" ]]; then
      local skills_str
      skills_str=$(role_field "$role" "skills")
      skills_str="${skills_str#\[}"
      skills_str="${skills_str%\]}"
      IFS=',' read -ra skills <<< "$skills_str"
      for skill in "${skills[@]}"; do
        skill=$(echo "$skill" | tr -d ' ')
        [[ -n "$skill" ]] || continue
        skill_allows+="      \"Skill(${skill} *)\","$'\n'
      done
    fi
    # First pass: replace AGENT_NAME via awk
    local safe_name safe_kanban_rel safe_message_rel safe_meeting_rel safe_artifact_rel safe_paper_review_rel
    safe_name=$(awk_safe "$name")
    safe_kanban_rel=$(awk_safe "$(lab_kanban_agent_rel)")
    safe_message_rel=$(awk_safe "$(lab_message_agent_rel)")
    safe_meeting_rel=$(awk_safe "$(lab_meeting_agent_rel)")
    safe_artifact_rel=$(awk_safe "$(lab_artifact_agent_rel)")
    safe_paper_review_rel=$(awk_safe "$(lab_paper_review_agent_rel)")
    local intermediate
    intermediate=$(awk \
      -v name="$safe_name" \
      -v kanban="$safe_kanban_rel" \
      -v message_dir="$safe_message_rel" \
      -v meeting_dir="$safe_meeting_rel" \
      -v artifact_dir="$safe_artifact_rel" \
      -v paper_review_dir="$safe_paper_review_rel" '
      {
        gsub(/\{\{AGENT_NAME\}\}/, name)
        gsub(/\{\{KANBAN_FILE_REL\}\}/, kanban)
        gsub(/\{\{MESSAGE_DIR_REL\}\}/, message_dir)
        gsub(/\{\{MEETING_DIR_REL\}\}/, meeting_dir)
        gsub(/\{\{ARTIFACT_DIR_REL\}\}/, artifact_dir)
        gsub(/\{\{PAPER_REVIEW_DIR_REL\}\}/, paper_review_dir)
        print
      }' "$template")
    # Second pass: replace SKILL_ALLOWS placeholder with multi-line skill entries
    while IFS= read -r line; do
      if [[ "$line" == *'{{SKILL_ALLOWS}}'* ]]; then
        # Replace the placeholder line with the skill allow entries (trailing comma is fine)
        if [[ -n "$skill_allows" ]]; then
          printf '%s' "$skill_allows"
        fi
      else
        printf '%s\n' "$line"
      fi
    done <<< "$intermediate"
  fi
}

# --- Skill symlinks ---

legacy_skill_replacement() {
  case "$1" in
    group-meeting)        echo "core-meeting + supervisor-meeting/student-meeting/research-staff-meeting" ;;
    kanban-ops)           echo "core-kanban" ;;
    literature-survey)    echo "student-literature" ;;
    experiment-design)    echo "student-experiment-design" ;;
    run-experiment)       echo "student-run-experiment" ;;
    write-paper)          echo "student-write-paper" ;;
    review-critique)      echo "paper-reviewer-critique" ;;
    *)                    echo "" ;;
  esac
}

clear_backend_runtime_files() {
  local agent_dir="$1"
  rm -f "$agent_dir/CLAUDE.md" "$agent_dir/AGENTS.md" "$agent_dir/GEMINI.md"
  rm -rf "$agent_dir/.claude/skills" "$agent_dir/.agents/skills" "$agent_dir/.codex" "$agent_dir/.gemini"
}

setup_skills() {
  local agent_dir="$1" role="$2" backend="${3:-claude-code}"
  local skills_str
  skills_str=$(role_field "$role" "skills")
  # Parse [skill1, skill2, ...] format
  skills_str="${skills_str#\[}"
  skills_str="${skills_str%\]}"

  # Validate all skill names first
  local validated_skills=()
  IFS=',' read -ra skills <<< "$skills_str"
  for skill in "${skills[@]}"; do
    skill=$(echo "$skill" | tr -d ' ')
    [[ -n "$skill" ]] || continue
    if [[ "$skill" == *".."* || "$skill" == *"/"* ]]; then
      err "Invalid skill name (path traversal): $skill"
    fi
    if [[ ! "$skill" =~ ^[a-zA-Z][a-zA-Z0-9_-]*$ ]]; then
      err "Invalid skill name: $skill"
    fi
    local replacement
    replacement=$(legacy_skill_replacement "$skill")
    if [[ -n "$replacement" ]]; then
      err "legacy skill '$skill' is not supported in prototype mode
use: $replacement"
    fi
    local src="$SKILLS_DIR/$skill"
    if [[ ! -d "$src" ]]; then
      err "Skill directory not found: $src"
    fi
    validated_skills+=("$skill")
  done

  case "$backend" in
    claude-code)
      # Claude Code: symlinks in .claude/skills/
      local claude_skills_dir="$agent_dir/.claude/skills"
      rm -rf "$claude_skills_dir"
      mkdir -p "$claude_skills_dir"
      for skill in "${validated_skills[@]}"; do
        local skill_target link_target
        skill_target="$SKILLS_DIR/$skill"
        link_target=$(portable_symlink_target "$claude_skills_dir/$skill" "$skill_target" "$AGORA_PROJECT_DIR")
        ln -sfn "$link_target" "$claude_skills_dir/$skill"
      done
      ;;
    codex)
      # Codex CLI: symlinks in .agents/skills/ + .codex/config.toml for hard restriction
      local codex_skills_dir="$agent_dir/.agents/skills"
      rm -rf "$codex_skills_dir"
      mkdir -p "$codex_skills_dir"
      for skill in "${validated_skills[@]}"; do
        local skill_target link_target
        skill_target="$SKILLS_DIR/$skill"
        link_target=$(portable_symlink_target "$codex_skills_dir/$skill" "$skill_target" "$AGORA_PROJECT_DIR")
        ln -sfn "$link_target" "$codex_skills_dir/$skill"
      done
      # Generate .codex/config.toml with per-skill enable list
      local codex_cfg_dir="$agent_dir/.codex"
      mkdir -p "$codex_cfg_dir"
      {
        printf '# Codex agent skill configuration (auto-generated by agora)\n'
        printf '# Only the skills listed below are enabled for this agent.\n\n'
        for skill in "${validated_skills[@]}"; do
          printf '[[skills.config]]\n'
          printf 'path = ".agents/skills/%s/SKILL.md"\n' "$skill"
          printf 'enabled = true\n\n'
        done
      } > "$codex_cfg_dir/config.toml"
      ;;
    copilot)
      # Copilot reads .claude/skills/ natively — use same symlinks as Claude Code
      local copilot_skills_dir="$agent_dir/.claude/skills"
      rm -rf "$copilot_skills_dir"
      mkdir -p "$copilot_skills_dir"
      for skill in "${validated_skills[@]}"; do
        local skill_target link_target
        skill_target="$SKILLS_DIR/$skill"
        link_target=$(portable_symlink_target "$copilot_skills_dir/$skill" "$skill_target" "$AGORA_PROJECT_DIR")
        ln -sfn "$link_target" "$copilot_skills_dir/$skill"
      done
      ;;
    gemini)
      # Gemini CLI: no skill directory — content inlined into GEMINI.md by setup_instruction_files()
      ;;
  esac
}

# Generate backend-specific instruction files
setup_instruction_files() {
  local agent_dir="$1" name="$2" role="$3" backend="$4" template_path="$5"

  # Always generate the rendered template content
  local rendered
  rendered=$(render_template "$template_path" "$name" "$role")

  # Build skill restriction notice (soft constraint for backends without hard enforcement)
  local skill_notice=""
  if [[ "$backend" == "copilot" ]]; then
    local skills_str
    skills_str=$(role_field "$role" "skills")
    skills_str="${skills_str#\[}"
    skills_str="${skills_str%\]}"
    local skill_list=""
    IFS=',' read -ra skills <<< "$skills_str"
    for skill in "${skills[@]}"; do
      skill=$(echo "$skill" | tr -d ' ')
      [[ -n "$skill" ]] || continue
      skill_list+="- ${skill}"$'\n'
    done
    if [[ -n "$skill_list" ]]; then
      skill_notice=$(printf '\n---\n\n## Skill Restrictions\n\nYou MUST only use the following skills. Do not invoke any other skills.\n\n%s' "$skill_list")
    fi
  fi

  # Build inlined skill content for Gemini (no skill directory support)
  local inlined_skills=""
  if [[ "$backend" == "gemini" ]]; then
    local skills_str
    skills_str=$(role_field "$role" "skills")
    skills_str="${skills_str#\[}"
    skills_str="${skills_str%\]}"
    IFS=',' read -ra skills <<< "$skills_str"
    for skill in "${skills[@]}"; do
      skill=$(echo "$skill" | tr -d ' ')
      [[ -n "$skill" ]] || continue
      local skill_md="$SKILLS_DIR/$skill/SKILL.md"
      [[ -f "$skill_md" ]] || continue
      # Extract body (everything after second ---)
      local body
      body=$(awk 'BEGIN{n=0} /^---/{n++; next} n>=2{print}' "$skill_md")
      [[ -n "$body" ]] || continue
      inlined_skills+=$'\n---\n\n'
      inlined_skills+="## Skill: ${skill}"$'\n\n'
      inlined_skills+="$body"$'\n'
    done
  fi

  case "$backend" in
    claude-code)
      # Claude Code reads CLAUDE.md (skill restrictions enforced via settings.json)
      printf '%s\n' "$rendered" > "$agent_dir/CLAUDE.md"
      ;;
    codex)
      # Codex reads AGENTS.md (skill restrictions enforced via .codex/config.toml)
      printf '%s\n' "$rendered" > "$agent_dir/AGENTS.md"
      ;;
    copilot)
      # Copilot reads AGENTS.md (soft skill constraint — no hard enforcement mechanism)
      printf '%s\n%s\n' "$rendered" "$skill_notice" > "$agent_dir/AGENTS.md"
      ;;
    gemini)
      # Gemini CLI reads GEMINI.md with all skill content inlined
      printf '%s\n%s\n' "$rendered" "$inlined_skills" > "$agent_dir/GEMINI.md"
      # Configure Gemini settings
      local gemini_dir="$agent_dir/.gemini"
      mkdir -p "$gemini_dir"
      if [[ ! -f "$gemini_dir/settings.json" ]]; then
        cat > "$gemini_dir/settings.json" <<'GSETTINGS'
{
  "context": {
    "fileName": ["GEMINI.md"]
  }
}
GSETTINGS
      fi
      ;;
  esac
}

# --- Operations ---

do_add() {
  require_mutation_runtime
  local name="" role="" backend="" model="" direction=""
  local persona_preset="" mbti="" background="" notable_results=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -name)
        [[ $# -ge 2 ]] || err "Missing value for -name"
        name="$2"; shift 2 ;;
      -role)
        [[ $# -ge 2 ]] || err "Missing value for -role"
        role="$2"; shift 2 ;;
      -backend)
        [[ $# -ge 2 ]] || err "Missing value for -backend"
        backend="$2"; shift 2 ;;
      -model)
        [[ $# -ge 2 ]] || err "Missing value for -model"
        model="$2"; shift 2 ;;
      -direction)
        [[ $# -ge 2 ]] || err "Missing value for -direction"
        direction="$2"; shift 2 ;;
      -preset|-persona-preset)
        [[ $# -ge 2 ]] || err "Missing value for -preset"
        persona_preset="$2"; shift 2 ;;
      -mbti)
        [[ $# -ge 2 ]] || err "Missing value for -mbti"
        mbti="$2"; shift 2 ;;
      -background)
        [[ $# -ge 2 ]] || err "Missing value for -background"
        background="$2"; shift 2 ;;
      -results|-notable-results)
        [[ $# -ge 2 ]] || err "Missing value for -results"
        notable_results="$2"; shift 2 ;;
      *) err "Unknown option for -add: $1" ;;
    esac
  done
  [[ -n "$name" ]] || err "Missing -name"
  [[ -n "$role" ]] || err "Missing -role"

  # Validate agent name
  validate_agent_name "$name"

  if [[ "$role" == "reviewer" ]]; then
    err $'role '\''reviewer'\'' is no longer supported\nuse: paper-reviewer'
  fi

  # Validate role exists
  local template_file
  template_file=$(role_field "$role" "template")
  [[ -n "$template_file" ]] || err "Unknown role: $role"
  # Validate template filename: no path traversal
  if [[ "$template_file" == *".."* || "$template_file" == *"/"* ]]; then
    err "Invalid template filename: $template_file"
  fi
  local template_path="$TEMPLATES_DIR/$template_file"
  [[ -f "$template_path" ]] || err "Template not found: $template_path"
  # Verify template is actually within templates dir
  local real_template real_templates_dir
  real_template=$(resolve_path "$template_path")
  real_templates_dir=$(resolve_path "$TEMPLATES_DIR")
  if [[ "$real_template" != "$real_templates_dir/"* ]]; then
    err "Template path escapes templates directory: $template_path"
  fi

  yaml_lock

  # Enforce max_instances (inside lock to prevent TOCTOU race)
  local max_instances
  max_instances=$(role_field "$role" "max_instances")
  if [[ -n "$max_instances" && "$max_instances" != "0" ]]; then
    local current_count
    current_count=$(count_agents_by_role "$role")
    if [[ "$current_count" -ge "$max_instances" ]]; then
      yaml_unlock
      err "Cannot add another '$role': max_instances=$max_instances, current=$current_count"
    fi
  fi

  # Check if agent already exists
  [[ -z "$(agent_exists "$name")" ]] || err "Agent '$name' already exists"

  # Default backend/model from role
  [[ -n "$backend" ]] || backend=$(role_field "$role" "default_backend")
  [[ -n "$model" ]] || model=$(role_field "$role" "default_model")
  [[ -n "$backend" ]] || err "No default backend configured for role '$role'"
  backend=$(canonicalize_backend "$backend" 2>/dev/null) || err "Unsupported backend '$backend'. Valid options: claude-code, codex, copilot, gemini."

  if [[ -n "$model" && ! "$model" =~ ^[a-zA-Z0-9._:-]+$ ]]; then
    err "Invalid model name: $model"
  fi

  # Create agent directory
  local agent_dir="$AGENTS_DIR/$name"
  # Check if directory already exists (prevent overwriting existing agent)
  if [[ -d "$agent_dir" ]]; then
    err "Agent directory '$agent_dir' already exists. Remove it first or choose a different name."
  fi
  # Ensure path doesn't traverse through symlinks
  if [[ -L "$agent_dir" ]]; then
    err "Agent path '$agent_dir' is a symlink. Refusing to create."
  fi
  mkdir -p "$agent_dir/workspace"
  mkdir -p "$agent_dir/.claude"

  # Register in lab.yaml FIRST (so render_template can read research_direction)
  # Sanitize direction for safe YAML embedding
  if [[ -n "$direction" ]]; then
    direction=$(sanitize_direction "$direction")
  fi
  if [[ -n "$persona_preset" ]]; then
    [[ "$persona_preset" =~ ^[a-zA-Z][a-zA-Z0-9_-]*$ ]] || err "Invalid preset id: $persona_preset"
  else
    persona_preset=$(derived_persona_preset "$role" "$name" 2>/dev/null || true)
  fi
  [[ -n "$persona_preset" ]] || persona_preset=$(persona_default_field "$role" "persona_preset" 2>/dev/null || true)
  if [[ -n "$persona_preset" ]] && ! persona_preset_exists "$role" "$persona_preset"; then
    err "Unknown preset '$persona_preset' for role '$role'"
  fi

  if [[ -n "$mbti" ]]; then
    mbti=$(normalize_mbti "$mbti")
  else
    mbti=$(persona_catalog_value "$role" "$persona_preset" "mbti" 2>/dev/null || true)
    [[ -n "$mbti" ]] || mbti=$(persona_default_field "$role" "mbti" 2>/dev/null || true)
  fi

  if [[ -n "$background" ]]; then
    background=$(sanitize_yaml_scalar "$background" "Background")
  else
    background=$(persona_catalog_value "$role" "$persona_preset" "background" 2>/dev/null || true)
    [[ -n "$background" ]] || background=$(persona_default_field "$role" "background" 2>/dev/null || true)
    background=$(sanitize_yaml_scalar "$background" "Background")
  fi

  if [[ -n "$notable_results" ]]; then
    notable_results=$(sanitize_yaml_scalar "$notable_results" "Notable results")
  else
    notable_results=$(persona_catalog_value "$role" "$persona_preset" "notable_results" 2>/dev/null || true)
    [[ -n "$notable_results" ]] || notable_results=$(persona_default_field "$role" "notable_results" 2>/dev/null || true)
    notable_results=$(sanitize_yaml_scalar "$notable_results" "Notable results")
  fi

  yaml_add_agent "$name" "$role" "$backend" "$model" "$direction" "$persona_preset" "$mbti" "$background" "$notable_results"

  # Rollback on failure: remove yaml entry and agent directory
  local _add_rollback_needed=1
  _add_cleanup() {
    if [[ "$_add_rollback_needed" -eq 1 ]]; then
      warn "Rolling back agent '$name' due to setup failure"
      yaml_remove_agent "$name" 2>/dev/null || true
      rm -rf "$agent_dir" 2>/dev/null || true
      rm -rf "${ARTIFACTS_DIR:?}/$name" 2>/dev/null || true
    fi
  }
  trap '_add_cleanup; yaml_cleanup' EXIT

  # Render backend-specific instruction files (CLAUDE.md, AGENTS.md, GEMINI.md)
  setup_instruction_files "$agent_dir" "$name" "$role" "$backend" "$template_path"

  # Render settings.json (role-specific if template exists)
  render_settings "$name" "$role" > "$agent_dir/.claude/settings.json"

  # Create memory.md
  cat > "$agent_dir/memory.md" <<EOF
# ${name} — Memory

Record important context here for persistence across sessions.
EOF

  # Setup skills (backend-specific paths and formats)
  setup_skills "$agent_dir" "$role" "$backend"

  # Create artifact directory
  mkdir -p "$ARTIFACTS_DIR/$name"

  yaml_unlock

  # All steps succeeded — disable rollback
  _add_rollback_needed=0
  trap 'yaml_cleanup' EXIT

  info "Added agent '${name}' (role=${role}, backend=${backend}, model=${model:-default})"
  [[ -n "$direction" ]] && info "  Research direction: $direction"
  info "  Persona: ${persona_preset:-derived} (${mbti:-unknown})"
  info "  Background: $(compact_text "$background" 100)"
  info "  Strongest result: $(compact_text "$(first_delimited_segment "$notable_results")" 100)"
  info "  Directory: agents/${name}/"
  info "  Skills: $(role_field "$role" "skills")"
}

do_remove() {
  require_mutation_runtime
  local name=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -name)
        [[ $# -ge 2 ]] || err "Missing value for -name"
        name="$2"; shift 2 ;;
      *) err "Unknown option for -remove: $1" ;;
    esac
  done
  [[ -n "$name" ]] || err "Missing -name"
  [[ "$name" != "supervisor" ]] || err "Cannot remove supervisor"

  # Validate name before using in rm -rf
  validate_agent_name "$name"

  # Check that the agent actually exists
  [[ -n "$(agent_exists "$name")" ]] || err "Agent '$name' not found"

  yaml_lock

  # Kill tmux session if running (after lock to ensure atomicity)
  local session
  session=$(tmux_session_name "$name")
  if tmux has-session -t "=$session" 2>/dev/null; then
    tmux kill-session -t "=$session"
    info "Killed tmux session '$session'"
  fi

  # Remove from lab.yaml
  yaml_remove_agent "$name"

  yaml_unlock

  # Remove directory (keep artifacts in shared/)
  local agent_dir="$AGENTS_DIR/$name"
  if [[ -d "$agent_dir" ]]; then
    # Safety: verify path is under agents/ (use realpath without -m for portability)
    local real_dir real_agents
    real_dir=$(cd "$agent_dir" && pwd -P 2>/dev/null) || real_dir="$agent_dir"
    real_agents=$(cd "$AGENTS_DIR" && pwd -P 2>/dev/null) || real_agents="$AGENTS_DIR"
    if [[ "$real_dir" == "$real_agents/"* ]]; then
      rm -rf "$agent_dir"
    else
      err "Refusing to remove directory outside agents/: $agent_dir"
    fi
  fi

  info "Removed agent '${name}'"
}

do_init() {
  local name=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -name)
        [[ $# -ge 2 ]] || err "Missing value for -name"
        name="$2"; shift 2 ;;
      *) err "Unknown option for -init: $1" ;;
    esac
  done
  [[ -n "$name" ]] || err "Missing -name"
  validate_agent_name "$name"

  local agent_dir="$AGENTS_DIR/$name"
  [[ -d "$agent_dir" ]] || err "Agent directory not found: $agent_dir"

  local backend
  backend=$(effective_agent_backend "$name" 2>/dev/null || true)
  local role
  role=$(agent_field "$name" "role")
  local model
  model=$(agent_field "$name" "model")

  [[ -n "$backend" ]] || err "No valid backend configured for agent '$name'"
  [[ -n "$role" ]] || err "No role configured for agent '$name'"

  # Validate model doesn't contain shell metacharacters
  if [[ -n "$model" && ! "$model" =~ ^[a-zA-Z0-9._:-]+$ ]]; then
    err "Invalid model name: $model"
  fi

  assert_backend_launch_allowed "$backend"
  refresh_agent_runtime_files "$name"

  # Create tmux session if not exists (exact match with = prefix)
  local session
  session=$(tmux_session_name "$name")
  if tmux has-session -t "=$session" 2>/dev/null; then
    err "tmux session '$session' already exists. Use -wake to resume or kill it first."
  fi
  tmux new-session -d -s "$session" -c "$agent_dir"
  info "Created tmux session '$session' in $agent_dir"

  export_runtime_env "$session" "$name" "$role" "$backend"

  local cmd
  cmd=$(build_backend_command "$backend" "$model")
  # Use -- to prevent send-keys from interpreting command as flags
  tmux send-keys -t "$(tmux_pane_target "$session")" -- "$cmd" Enter
  info "Launched '$cmd' in tmux session '$session'"
}

do_init_all() {
  # Parse all agent names from lab.yaml
  local agents
  agents=$(awk '/^agents:/{found=1; next} found && /^[^ ]/{exit} found && /^  [a-zA-Z]/{gsub(/:.*/, ""); gsub(/^  /, ""); print}' "$LAB_YAML")

  for agent in $agents; do
    info "--- Initializing $agent ---"
    do_init -name "$agent"
  done
}

do_send() {
  local name="" message="" from="supervisor"
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -name)
        [[ $# -ge 2 ]] || err "Missing value for -name"
        name="$2"; shift 2 ;;
      -message)
        [[ $# -ge 2 ]] || err "Missing value for -message"
        message="$2"; shift 2 ;;
      -from)
        [[ $# -ge 2 ]] || err "Missing value for -from"
        from="$2"; shift 2 ;;
      *) err "Unknown option for -send: $1" ;;
    esac
  done
  [[ -n "$name" ]] || err "Missing -name"
  [[ -n "$message" ]] || err "Missing -message"
  validate_agent_name "$name"
  validate_agent_name "$from"

  local session
  session=$(tmux_session_name "$name")
  if agent_cli_running "$name"; then
    # Use -l for literal mode to prevent interpretation of special characters
    tmux send-keys -t "$(tmux_pane_target "$session")" -l -- "$message"
    tmux send-keys -t "$(tmux_pane_target "$session")" Enter
    info "Sent message to '$name'"
  else
    local msg_file
    msg_file=$(write_message_file "$from" "$name" "instruction" "Instruction" "$message")
    info "Queued message for '$name' at ${msg_file#"$AGORA_PROJECT_DIR"/}"
  fi
}

refresh_agent_runtime_files() {
  local name="$1"
  validate_agent_name "$name"
  require_mutation_runtime

  local agent_dir="$AGENTS_DIR/$name"
  [[ -d "$agent_dir" ]] || err "Agent directory not found: $agent_dir"

  local role backend template_file template_path
  role=$(agent_field "$name" "role")
  [[ -n "$role" ]] || err "No role configured for agent '$name'"
  backend=$(effective_agent_backend "$name" 2>/dev/null || true)
  [[ -n "$backend" ]] || err "No valid backend configured for agent '$name'"

  template_file=$(role_field "$role" "template")
  [[ -n "$template_file" ]] || err "Unknown role: $role"
  if [[ "$template_file" == *".."* || "$template_file" == *"/"* ]]; then
    err "Invalid template filename: $template_file"
  fi
  template_path="$TEMPLATES_DIR/$template_file"
  [[ -f "$template_path" ]] || err "Template not found: $template_path"

  mkdir -p "$agent_dir/.claude"
  clear_backend_runtime_files "$agent_dir"
  setup_instruction_files "$agent_dir" "$name" "$role" "$backend" "$template_path"
  render_settings "$name" "$role" > "$agent_dir/.claude/settings.json"
  setup_skills "$agent_dir" "$role" "$backend"
}

do_list() {
  printf "%-24s %-12s %-14s %-12s %-8s\n" "NAME" "ROLE" "BACKEND" "MODEL" "SESSION" >&2
  printf "%-24s %-12s %-14s %-12s %-8s\n" "----" "----" "-------" "-----" "-------" >&2

  local agents
  agents=$(awk '/^agents:/{found=1; next} found && /^[^ ]/{exit} found && /^  [a-zA-Z]/{gsub(/:.*/, ""); gsub(/^  /, ""); print}' "$LAB_YAML")

  for agent in $agents; do
    local role backend model session_status
    local persona_preset mbti background lens strongest_result
    role=$(agent_field "$agent" "role")
    backend=$(effective_agent_backend "$agent" 2>/dev/null || agent_field "$agent" "backend")
    model=$(agent_field "$agent" "model")
    persona_preset=$(resolve_agent_persona_preset "$agent" "$role")
    mbti=$(resolve_agent_persona_value "$agent" "$role" "mbti")
    background=$(resolve_agent_persona_value "$agent" "$role" "background")
    lens=$(resolve_agent_persona_value "$agent" "$role" "persona_lens")
    strongest_result=$(agent_primary_notable_result "$agent" "$role")
    local agent_session
    agent_session=$(tmux_session_name "$agent")
    if tmux has-session -t "=$agent_session" 2>/dev/null; then
      session_status="active"
    else
      session_status="—"
    fi
    printf "%-24s %-12s %-14s %-12s %-8s\n" "$agent" "$role" "$backend" "${model:-—}" "$session_status" >&2
    printf "  %-22s profile: %s | %s | %s\n" "" "${mbti:-—}" "${persona_preset:-derived}" "$(compact_text "$lens" 60)" >&2
    printf "  %-22s background: %s\n" "" "$(compact_text "$background" 88)" >&2
    printf "  %-22s strongest result: %s\n" "" "$(compact_text "$strongest_result" 88)" >&2
  done
}

do_status() {
  do_list
}

do_wake() {
  local name=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -name)
        [[ $# -ge 2 ]] || err "Missing value for -name"
        name="$2"; shift 2 ;;
      *) err "Unknown option for -wake: $1" ;;
    esac
  done
  [[ -n "$name" ]] || err "Missing -name"
  validate_agent_name "$name"

  local session
  session=$(tmux_session_name "$name")
  if tmux has-session -t "=$session" 2>/dev/null; then
    if agent_cli_running "$name"; then
      err "tmux session '$session' already has a running CLI. Use -poll or attach instead of -wake."
    fi

    # Session exists — try to resume
    local backend
    backend=$(effective_agent_backend "$name" 2>/dev/null || true)
    local role
    role=$(agent_field "$name" "role")
    local model
    model=$(agent_field "$name" "model")

    # Validate model
    if [[ -n "$model" && ! "$model" =~ ^[a-zA-Z0-9._:-]+$ ]]; then
      err "Invalid model name: $model"
    fi

    [[ -n "$backend" ]] || err "No valid backend configured for agent '$name'"
    [[ -n "$role" ]] || err "No role configured for agent '$name'"

    assert_backend_launch_allowed "$backend"
    refresh_agent_runtime_files "$name"

    local cmd
    cmd=$(build_resume_command "$backend" "$model")
    [[ -n "$cmd" ]] || err "Cannot determine wake command for backend '$backend'"
    export_runtime_env "$session" "$name" "$role" "$backend"
    tmux send-keys -t "$(tmux_pane_target "$session")" -- "$cmd" Enter
    info "Resumed agent '$name' with: $cmd"
    sleep 1
    inject_pending_items "$name"
  else
    # No session — full init
    do_init -name "$name"
  fi
}

do_health() {
  local agents
  agents=$(awk '/^agents:/{found=1; next} found && /^[^ ]/{exit} found && /^  [a-zA-Z]/{gsub(/:.*/, ""); gsub(/^  /, ""); print}' "$LAB_YAML")

  local total=0 alive=0 dead=0
  printf "%-24s %-12s %-10s %-20s\n" "AGENT" "ROLE" "STATUS" "DETAILS" >&2
  printf "%-24s %-12s %-10s %-20s\n" "-----" "----" "------" "-------" >&2

  for agent in $agents; do
    total=$((total + 1))
    local role
    role=$(agent_field "$agent" "role")
    local status details
    local agent_session
    agent_session=$(tmux_session_name "$agent")

    if tmux has-session -t "=$agent_session" 2>/dev/null; then
      # Session exists — check if the CLI process is actually running
      local pane_pid
      pane_pid=$(tmux list-panes -t "=$agent_session" -F '#{pane_pid}' 2>/dev/null | head -1)
      if [[ -n "$pane_pid" ]]; then
        # Check if there are child processes (the actual CLI)
        local children
        children=$(pgrep -P "$pane_pid" 2>/dev/null | wc -l || echo 0)
        if [[ "$children" -gt 0 ]]; then
          status="alive"
          details="tmux+cli running"
          alive=$((alive + 1))
        else
          status="idle"
          details="tmux ok, cli exited"
          dead=$((dead + 1))
        fi
      else
        status="alive"
        details="tmux session exists"
        alive=$((alive + 1))
      fi
    else
      # No tmux session at all
      if [[ -d "$AGENTS_DIR/$agent" ]]; then
        status="dead"
        details="no tmux session"
        dead=$((dead + 1))
      else
        status="missing"
        details="no directory"
        dead=$((dead + 1))
      fi
    fi

    printf "%-24s %-12s %-10s %-20s\n" "$agent" "$role" "$status" "$details" >&2
  done

  info ""
  info "Total: ${total}, Alive: ${alive}, Dead/Idle: ${dead}"

  # Return non-zero if any agents are dead
  [[ $dead -eq 0 ]]
}

# --- Heartbeat ---

write_heartbeat() {
  local name="$1"
  local hb_file="$AGENTS_DIR/$name/.heartbeat"
  [[ -d "$AGENTS_DIR/$name" ]] || return 1
  date -u +"%Y-%m-%dT%H:%M:%SZ" > "$hb_file"
}

check_heartbeat() {
  local name="$1" max_age="${2:-120}"
  local hb_file="$AGENTS_DIR/$name/.heartbeat"
  [[ -f "$hb_file" ]] || return 1
  local hb_time now_epoch hb_epoch
  hb_time=$(cat "$hb_file" 2>/dev/null) || return 1
  now_epoch=$(date -u +%s)
  # GNU coreutils date (Linux)
  if date -d "$hb_time" +%s &>/dev/null; then
    hb_epoch=$(date -d "$hb_time" +%s)
  else
    # macOS fallback
    hb_epoch=$(date -jf "%Y-%m-%dT%H:%M:%SZ" "$hb_time" +%s 2>/dev/null) || return 1
  fi
  local age=$((now_epoch - hb_epoch))
  [[ $age -le $max_age ]]
}

do_heartbeat() {
  local name=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -name) [[ $# -ge 2 ]] || err "Missing value for -name"; name="$2"; shift 2 ;;
      *) err "Unknown option for -heartbeat: $1" ;;
    esac
  done
  [[ -n "$name" ]] || err "Missing -name for -heartbeat"
  validate_agent_name "$name"
  write_heartbeat "$name"
  info "Wrote heartbeat for '$name'"
}

do_check_heartbeat() {
  local name="" max_age=120
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -name) [[ $# -ge 2 ]] || err "Missing value for -name"; name="$2"; shift 2 ;;
      -max-age) [[ $# -ge 2 ]] || err "Missing value for -max-age"; max_age="$2"; shift 2 ;;
      *) err "Unknown option for -check-heartbeat: $1" ;;
    esac
  done
  [[ -n "$name" ]] || err "Missing -name for -check-heartbeat"
  validate_agent_name "$name"
  if check_heartbeat "$name" "$max_age"; then
    info "Agent '$name' heartbeat is fresh (max age: ${max_age}s)"
  else
    warn "Agent '$name' heartbeat is stale or missing (max age: ${max_age}s)"
    return 1
  fi
}

do_watchdog() {
  local interval=60  # seconds between health checks
  local auto_wake=1  # auto-wake dead agents by default
  local max_cycles=0 # 0 = run forever (until Ctrl+C)

  while [[ $# -gt 0 ]]; do
    case "$1" in
      -interval)
        [[ $# -ge 2 ]] || err "Missing value for -interval"
        interval="$2"; shift 2 ;;
      -no-wake)
        auto_wake=0; shift ;;
      -cycles)
        [[ $# -ge 2 ]] || err "Missing value for -cycles"
        max_cycles="$2"; shift 2 ;;
      *) err "Unknown option for -watchdog: $1" ;;
    esac
  done

  if [[ ! "$interval" =~ ^[0-9]+$ ]] || [[ "$interval" -lt 10 ]]; then
    err "-interval must be >= 10 (seconds)"
  fi

  info "=== Watchdog started ==="
  info "Check interval: ${interval}s, auto-wake: $([ $auto_wake -eq 1 ] && echo yes || echo no)"
  info "Press Ctrl+C to stop"
  info ""

  local cycle=0
  while true; do
    cycle=$((cycle + 1))
    info "--- Health check #${cycle} ($(date -u +"%H:%M:%S UTC")) ---"

    local agents
    agents=$(awk '/^agents:/{found=1; next} found && /^[^ ]/{exit} found && /^  [a-zA-Z]/{gsub(/:.*/, ""); gsub(/^  /, ""); print}' "$LAB_YAML")

    for agent in $agents; do
      local agent_session
      agent_session=$(tmux_session_name "$agent")
      if ! tmux has-session -t "=$agent_session" 2>/dev/null; then
        if [[ -d "$AGENTS_DIR/$agent" ]]; then
          warn "Agent '$agent' has no tmux session"
          if [[ $auto_wake -eq 1 ]]; then
            info "Auto-waking '$agent'..."
            do_wake -name "$agent" 2>&1 || warn "Failed to wake '$agent'"
            # Give the CLI a moment to start
            sleep 2
            inject_pending_items "$agent"
          fi
        fi
      else
        # Check if the CLI is still alive inside tmux
        local pane_pid
        pane_pid=$(tmux list-panes -t "=$agent_session" -F '#{pane_pid}' 2>/dev/null | head -1)
        if [[ -n "$pane_pid" ]]; then
          local children
          children=$(pgrep -P "$pane_pid" 2>/dev/null | wc -l || echo 0)
          if [[ "$children" -eq 0 ]]; then
            warn "Agent '$agent' tmux session exists but CLI has exited"
            if [[ $auto_wake -eq 1 ]]; then
              info "Re-launching CLI for '$agent'..."
              local backend role model cmd
              backend=$(effective_agent_backend "$agent" 2>/dev/null || true)
              role=$(agent_field "$agent" "role")
              model=$(agent_field "$agent" "model")
              if [[ -n "$model" && ! "$model" =~ ^[a-zA-Z0-9._:-]+$ ]]; then
                warn "Invalid model for '$agent', skipping wake"
                continue
              fi
              if [[ -z "$backend" || -z "$role" ]]; then
                warn "Missing valid backend/role for '$agent', skipping wake"
                continue
              fi
              if backend_is_unsafe "$backend" && ! unsafe_backends_allowed; then
                warn "Unsafe backend for '$agent' is disabled by policy"
                continue
              fi
              cmd=$(build_resume_command "$backend" "$model")
              export_runtime_env "$agent_session" "$agent" "$role" "$backend"
              tmux send-keys -t "$(tmux_pane_target "$agent_session")" -- "$cmd" Enter
              info "Re-launched '$cmd' for '$agent'"
              sleep 1
              inject_pending_items "$agent"
            fi
          fi
        fi
      fi
      # Write heartbeat only for agents with an active CLI, not just an idle shell.
      if agent_cli_running "$agent"; then
        write_heartbeat "$agent"
      fi
    done

    if [[ $max_cycles -gt 0 && $cycle -ge $max_cycles ]]; then
      info "Completed $max_cycles cycles, exiting watchdog"
      break
    fi

    sleep "$interval"
  done
}

do_poll() {
  local name=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -name)
        [[ $# -ge 2 ]] || err "Missing value for -name"
        name="$2"; shift 2 ;;
      *) err "Unknown option for -poll: $1" ;;
    esac
  done
  [[ -n "$name" ]] || err "Missing -name"
  validate_agent_name "$name"

  local poll_sh="$SCRIPT_DIR/lab-poll.sh"
  [[ -f "$poll_sh" ]] || err "lab-poll.sh not found"

  # Get poll output (non-quiet mode)
  local poll_output
  poll_output=$(AGORA_HOME="$AGORA_HOME" AGORA_PROJECT_DIR="$AGORA_PROJECT_DIR" bash "$poll_sh" "$name" 2>/dev/null) || true

  if [[ -z "$poll_output" ]]; then
    info "No pending items for '$name'"
    return 0
  fi

  # If agent has an active tmux session, inject the poll output
  local session
  session=$(tmux_session_name "$name")
  if agent_cli_running "$name"; then
    # Send as a comment/prompt that the agent CLI will see
    # For claude-code: use /user-prompt via stdin isn't possible,
    # so we paste the poll summary as typed text
    tmux send-keys -t "$(tmux_pane_target "$session")" -l -- "$poll_output"
    tmux send-keys -t "$(tmux_pane_target "$session")" Enter
    info "Polled '$name' — injected pending items into tmux session"
  else
    # No tmux session — just print
    echo "$poll_output"
  fi
}

do_poll_all() {
  local agents
  agents=$(awk '/^agents:/{found=1; next} found && /^[^ ]/{exit} found && /^  [a-zA-Z]/{gsub(/:.*/, ""); gsub(/^  /, ""); print}' "$LAB_YAML")

  local poll_sh="$SCRIPT_DIR/lab-poll.sh"
  [[ -f "$poll_sh" ]] || err "lab-poll.sh not found"

  for agent in $agents; do
    # Only poll agents with active tmux sessions
    local agent_session
    agent_session=$(tmux_session_name "$agent")
    if agent_cli_running "$agent"; then
      local poll_output
      poll_output=$(AGORA_HOME="$AGORA_HOME" AGORA_PROJECT_DIR="$AGORA_PROJECT_DIR" bash "$poll_sh" "$agent" 2>/dev/null) || true
      if [[ -n "$poll_output" ]]; then
        tmux send-keys -t "$(tmux_pane_target "$agent_session")" -l -- "$poll_output"
        tmux send-keys -t "$(tmux_pane_target "$agent_session")" Enter
        info "Polled '$agent' — has pending items"
      fi
    fi
  done
}

do_notify() {
  local name="" message=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -name)
        [[ $# -ge 2 ]] || err "Missing value for -name"
        name="$2"; shift 2 ;;
      -message)
        [[ $# -ge 2 ]] || err "Missing value for -message"
        message="$2"; shift 2 ;;
      *) err "Unknown option for -notify: $1" ;;
    esac
  done
  [[ -n "$name" ]] || err "Missing -name"
  [[ -n "$message" ]] || err "Missing -message"
  validate_agent_name "$name"

  # Notify via tmux if session exists, otherwise write message file
  local session
  session=$(tmux_session_name "$name")
  if agent_cli_running "$name"; then
    local formatted
    formatted=$(printf '\n=== Notification for %s (%s) ===\n%s\n===================================\n' \
      "$name" "$(date -u +"%H:%M:%S UTC")" "$message")
    tmux send-keys -t "$(tmux_pane_target "$session")" -l -- "$formatted"
    tmux send-keys -t "$(tmux_pane_target "$session")" Enter
    info "Notified '$name' via tmux"
  else
    local msg_file
    msg_file=$(write_message_file "system" "$name" "notification" "Notification" "$message")
    info "Queued notification for '$name' at ${msg_file#"$AGORA_PROJECT_DIR"/}"
  fi
}

# --- Main ---
usage() {
  cat <<'EOF'
Usage: lab-agent.sh <operation> [options]

Operations:
  -add       -name <n> -role <role> [-backend <cli>] [-model <m>] [-direction "..."]
             [-preset <id>] [-mbti <type>] [-background "..."] [-results "..."]
  -remove    -name <n>
  -init      -name <n>          Launch agent in tmux session
  -init-all                     Launch all registered agents
  -send      -name <n> -message "..." [-from <sender>]
  -list                         List all agents with status
  -status                       Same as -list
  -wake      -name <n>          Resume crashed agent session
  -health                       Check health of all agent sessions
  -watchdog                     Background health monitor with auto-wake
              [-interval <secs>] [-no-wake] [-cycles <n>]
  -heartbeat -name <n>          Write heartbeat timestamp for an agent
  -check-heartbeat -name <n>    Check if agent heartbeat is fresh
              [-max-age <secs>]   Max age in seconds (default: 120)
  -poll      -name <n>          Check + deliver pending items to agent
  -poll-all                     Poll all agents with active sessions
  -notify    -name <n> -message "..."   Send immediate notification to agent
EOF
  exit 1
}

[[ $# -ge 1 ]] || usage

op="$1"; shift
case "$op" in
  -add)       do_add "$@" ;;
  -remove)    do_remove "$@" ;;
  -init)      do_init "$@" ;;
  -init-all)  do_init_all ;;
  -send)      do_send "$@" ;;
  -list)      do_list ;;
  -status)    do_status ;;
  -wake)      do_wake "$@" ;;
  -health)    do_health ;;
  -watchdog)  do_watchdog "$@" ;;
  -heartbeat) do_heartbeat "$@" ;;
  -check-heartbeat) do_check_heartbeat "$@" ;;
  -poll)      do_poll "$@" ;;
  -poll-all)  do_poll_all ;;
  -notify)    do_notify "$@" ;;
  *)          usage ;;
esac
