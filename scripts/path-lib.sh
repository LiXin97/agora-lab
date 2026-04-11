#!/usr/bin/env bash

# Shared helpers for resolving configurable lab paths from lab.yaml.
# This file is sourced by runtime scripts, hooks, and the top-level CLI.

yaml_scalar_from_file() {
  local file="$1" key="$2"
  [[ -f "$file" ]] || return 0
  awk -v key="$key" '
    $0 ~ "^[[:space:]]*" key ":[[:space:]]*" {
      val = substr($0, index($0, ":") + 1)
      gsub(/^[[:space:]]+/, "", val)
      if (val ~ /^"/) { sub(/^"/, "", val); sub(/"[[:space:]]*(#.*)?$/, "", val) }
      else if (val ~ /^'\''/) { sub(/^'\''/, "", val); sub(/'\''[[:space:]]*(#.*)?$/, "", val) }
      else { sub(/[[:space:]]*#.*$/, "", val) }
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", val)
      print val
      exit
    }
  ' "$file"
}

lab_config_error() {
  printf 'ERROR: %s\n' "$1" >&2
  exit 1
}

lab_config_value() {
  local key="$1" default_value="$2"
  local value=""
  if [[ -n "${LAB_YAML:-}" && -f "$LAB_YAML" ]]; then
    value=$(yaml_scalar_from_file "$LAB_YAML" "$key")
  fi
  [[ -n "$value" ]] || value="$default_value"
  printf '%s\n' "$value"
}

lab_agent_registered() {
  local agent_name="$1"
  [[ -n "${LAB_YAML:-}" && -f "$LAB_YAML" ]] || return 1
  awk -v agent="$agent_name" '
    /^agents:/ { in_agents=1; next }
    in_agents && /^[^ ]/ { in_agents=0 }
    in_agents && /^  / {
      line = $0
      sub(/^  /, "", line)
      sub(/:.*/, "", line)
      if (line == agent) {
        found = 1
        exit
      }
    }
    END { exit found ? 0 : 1 }
  ' "$LAB_YAML"
}

_lab_trim_rel_path() {
  local path="$1"
  path="${path#./}"
  path="${path#/}"
  printf '%s\n' "$path"
}

_lab_validate_project_rel_path() {
  local key="$1" raw_value="$2"
  [[ "$raw_value" != /* ]] || lab_config_error "communication.${key} must be a project-relative path, not an absolute path"
  case "/$raw_value/" in
    */../*)
      lab_config_error "communication.${key} must stay within the lab root and cannot contain '..' segments"
      ;;
  esac
}

lab_rel_dir() {
  local key="$1" default_value="$2"
  local value
  value=$(lab_config_value "$key" "$default_value")
  _lab_validate_project_rel_path "$key" "$value"
  value=$(_lab_trim_rel_path "$value")
  value="${value%/}"
  printf '%s/\n' "$value"
}

lab_rel_file() {
  local key="$1" default_value="$2"
  local value
  value=$(lab_config_value "$key" "$default_value")
  _lab_validate_project_rel_path "$key" "$value"
  value=$(_lab_trim_rel_path "$value")
  value="${value%/}"
  printf '%s\n' "$value"
}

project_path_from_rel() {
  local rel="$1"
  local path
  rel=$(_lab_trim_rel_path "$rel")
  if [[ -z "$rel" ]]; then
    path="$AGORA_PROJECT_DIR"
  else
    path=$(printf '%s/%s\n' "$AGORA_PROJECT_DIR" "$rel" | sed 's#//*#/#g')
  fi
  _lab_validate_project_scoped_path "$path"
  printf '%s\n' "$path"
}

lab_message_rel() { lab_rel_dir "message_dir" "shared/messages/"; }
lab_meeting_rel() { lab_rel_dir "meeting_dir" "shared/meetings/"; }
lab_artifact_rel() { lab_rel_dir "artifact_dir" "shared/artifacts/"; }
lab_paper_review_rel() { lab_rel_dir "paper_review_dir" "shared/paper-reviews/"; }
lab_kanban_rel() { lab_rel_file "kanban_file" "shared/KANBAN.md"; }

lab_message_dir() { project_path_from_rel "$(lab_message_rel)"; }
lab_meeting_dir() { project_path_from_rel "$(lab_meeting_rel)"; }
lab_artifact_dir() { project_path_from_rel "$(lab_artifact_rel)"; }
lab_paper_review_dir() { project_path_from_rel "$(lab_paper_review_rel)"; }
lab_kanban_file() { project_path_from_rel "$(lab_kanban_rel)"; }

lab_message_agent_rel() { printf '../../%s\n' "$(lab_message_rel)"; }
lab_meeting_agent_rel() { printf '../../%s\n' "$(lab_meeting_rel)"; }
lab_artifact_agent_rel() { printf '../../%s\n' "$(lab_artifact_rel)"; }
lab_paper_review_agent_rel() { printf '../../%s\n' "$(lab_paper_review_rel)"; }
lab_kanban_agent_rel() { printf '../../%s\n' "$(lab_kanban_rel)"; }

lab_decision_maker() {
  local value
  value=$(lab_config_value "decision_maker" "supervisor")
  if [[ -n "${LAB_YAML:-}" && -f "$LAB_YAML" ]] && ! lab_agent_registered "$value"; then
    lab_config_error "meeting.decision_maker '$value' is not registered under agents:"
  fi
  if [[ "$value" != "supervisor" ]]; then
    lab_config_error "meeting.decision_maker is currently restricted to supervisor"
  fi
  printf '%s\n' "$value"
}

lab_project_runtime_present() {
  local project_dir="${1:-}"
  [[ -n "$project_dir" ]] || return 1
  [[ -d "$project_dir/templates" && ! -L "$project_dir/templates" ]] && return 0
  [[ -d "$project_dir/skills" && ! -L "$project_dir/skills" ]] && return 0
  [[ -d "$project_dir/scripts" && ! -L "$project_dir/scripts" ]] && return 0
  [[ -d "$project_dir/hooks" && ! -L "$project_dir/hooks" ]] && return 0
  return 1
}

lab_project_runtime_missing_entries() {
  local project_dir="${1:-}"
  [[ -n "$project_dir" ]] || return 1
  lab_project_runtime_present "$project_dir" || return 1

  local missing=()
  local required_entries=(
    "scripts/lab-init.sh"
    "scripts/lab-agent.sh"
    "scripts/lab-meeting.sh"
    "scripts/lab-paper-review.sh"
    "scripts/lab-kanban.sh"
    "scripts/lab-poll.sh"
    "scripts/kanban-schema.sh"
    "scripts/path-lib.sh"
    "scripts/persona-lib.sh"
    "hooks/workspace-guard.sh"
    "hooks/kanban-guard.sh"
    "hooks/meeting-inject.sh"
    "templates/supervisor.claude.md"
    "templates/student.claude.md"
    "templates/research-staff.claude.md"
    "templates/paper-reviewer.claude.md"
    "templates/settings.json.tmpl"
    "templates/settings.student.json.tmpl"
    "templates/settings.supervisor.json.tmpl"
    "templates/settings.research-staff.json.tmpl"
    "templates/settings.paper-reviewer.json.tmpl"
  )
  local entry
  for entry in "${required_entries[@]}"; do
    [[ -e "$project_dir/$entry" ]] || missing+=("$entry")
  done
  [[ -d "$project_dir/templates" ]] || missing+=("templates/")
  [[ -d "$project_dir/skills" ]] || missing+=("skills/")
  [[ -d "$project_dir/hooks" ]] || missing+=("hooks/")

  if [[ ${#missing[@]} -gt 0 ]]; then
    local IFS=', '
    printf '%s\n' "${missing[*]}"
    return 0
  fi
  return 1
}

lab_project_runtime_home() {
  local project_dir="${1:-}"
  [[ -n "$project_dir" ]] || return 1
  lab_project_runtime_present "$project_dir" || return 1
  lab_project_runtime_missing_entries "$project_dir" >/dev/null && return 1
  printf '%s\n' "$project_dir"
}

lab_require_script_runtime() {
  local script_dir="$1" project_dir="${2:-${AGORA_PROJECT_DIR:-}}"
  [[ -n "$project_dir" ]] || return 0

  local missing_entries="" project_runtime="" script_home="" resolved_runtime=""
  missing_entries=$(lab_project_runtime_missing_entries "$project_dir" || true)
  [[ -z "$missing_entries" ]] || lab_config_error "This lab has an incomplete project-local runtime (missing: $missing_entries). Reinstall Agora or reinitialize the project runtime."

  project_runtime=$(lab_project_runtime_home "$project_dir" || true)
  if [[ -n "$project_runtime" ]]; then
    script_home=$(path_resolve "$script_dir/..")
    resolved_runtime=$(path_resolve "$project_runtime")
    if [[ "$script_home" != "$resolved_runtime" ]]; then
      lab_config_error "This lab carries a project-local copied runtime. Re-run this command from the project runtime under $project_dir/scripts so state is mutated by the project runtime."
    fi
  fi
}

lab_find_project_dir_from_cwd() {
  local dir
  dir="$(pwd -P)"
  while true; do
    if [[ -f "$dir/lab.yaml" && -d "$dir/agents" ]]; then
      printf '%s\n' "$dir"
      return 0
    fi
    if [[ -f "$dir/.agora/lab.yaml" && -d "$dir/.agora/agents" ]]; then
      printf '%s\n' "$dir/.agora"
      return 0
    fi
    [[ "$dir" == "/" ]] && return 1
    dir="$(dirname "$dir")"
  done
}

lab_bound_agent_from_cwd() {
  local project_dir="${1:-${AGORA_PROJECT_DIR:-}}"
  [[ -n "$project_dir" ]] || return 1

  local cwd agents_dir rel
  cwd="$(pwd -P)"
  agents_dir="$(path_resolve "$project_dir/agents")"

  case "$cwd" in
    "$agents_dir") return 1 ;;
    "$agents_dir"/*)
      rel="${cwd#"$agents_dir"/}"
      printf '%s\n' "${rel%%/*}"
      return 0
      ;;
  esac
  return 1
}

path_normalize_lexically() {
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

path_resolve() {
  local path="$1"
  if command -v realpath &>/dev/null && realpath -m / >/dev/null 2>&1; then
    realpath -m "$path" 2>/dev/null || path_normalize_lexically "$path"
    return
  fi

  local normalized
  normalized=$(path_normalize_lexically "$path")
  local dir base
  dir=$(dirname "$normalized")
  base=$(basename "$normalized")
  if [[ -d "$dir" ]]; then
    printf '%s/%s\n' "$(cd "$dir" && pwd -P)" "$base" | sed 's#//*#/#g'
  else
    printf '%s\n' "$normalized"
  fi
}

_lab_validate_project_scoped_path() {
  local path="$1"
  local resolved_path resolved_root resolved_agents
  resolved_path=$(path_resolve "$path")
  resolved_root=$(path_resolve "$AGORA_PROJECT_DIR")
  resolved_agents=$(path_resolve "$AGORA_PROJECT_DIR/agents")

  case "$resolved_path" in
    "$resolved_root"|"$resolved_root"/*) ;;
    *)
      lab_config_error "configured communication paths must stay within the lab root ($AGORA_PROJECT_DIR)"
      ;;
  esac

  case "$resolved_path" in
    "$resolved_agents"|"$resolved_agents"/*)
      lab_config_error "configured communication paths cannot point inside agents/"
      ;;
  esac
}

path_relative_to() {
  local from_dir="$1" target_path="$2"
  local from_abs target_abs
  from_abs=$(path_resolve "$from_dir")
  target_abs=$(path_resolve "$target_path")

  local from_trim="${from_abs#/}" target_trim="${target_abs#/}"
  local IFS='/'
  local -a from_parts=() target_parts=()
  read -r -a from_parts <<< "$from_trim"
  read -r -a target_parts <<< "$target_trim"

  local i=0
  while [[ $i -lt ${#from_parts[@]} && $i -lt ${#target_parts[@]} && "${from_parts[$i]}" == "${target_parts[$i]}" ]]; do
    i=$((i + 1))
  done

  local rel="" j
  for ((j=i; j<${#from_parts[@]}; j++)); do
    [[ -n "${from_parts[$j]}" ]] && rel+="../"
  done
  for ((j=i; j<${#target_parts[@]}; j++)); do
    rel+="${target_parts[$j]}"
    if [[ $j -lt $((${#target_parts[@]} - 1)) ]]; then
      rel+="/"
    fi
  done

  [[ -n "$rel" ]] || rel="."
  printf '%s\n' "$rel"
}

path_relative_lexically_to() {
  local from_dir="$1" target_path="$2"
  local from_abs target_abs
  from_abs=$(path_normalize_lexically "$from_dir")
  target_abs=$(path_normalize_lexically "$target_path")

  local from_trim="${from_abs#/}" target_trim="${target_abs#/}"
  local IFS='/'
  local -a from_parts=() target_parts=()
  read -r -a from_parts <<< "$from_trim"
  read -r -a target_parts <<< "$target_trim"

  local i=0
  while [[ $i -lt ${#from_parts[@]} && $i -lt ${#target_parts[@]} && "${from_parts[$i]}" == "${target_parts[$i]}" ]]; do
    i=$((i + 1))
  done

  local rel="" j
  for ((j=i; j<${#from_parts[@]}; j++)); do
    [[ -n "${from_parts[$j]}" ]] && rel+="../"
  done
  for ((j=i; j<${#target_parts[@]}; j++)); do
    rel+="${target_parts[$j]}"
    if [[ $j -lt $((${#target_parts[@]} - 1)) ]]; then
      rel+="/"
    fi
  done

  [[ -n "$rel" ]] || rel="."
  printf '%s\n' "$rel"
}

portable_symlink_target() {
  local link_path="$1" target_path="$2" base_root="$3"
  local lexical_target lexical_base real_target real_base
  lexical_target=$(path_normalize_lexically "$target_path")
  lexical_base=$(path_normalize_lexically "$base_root")

  case "$lexical_target" in
    "$lexical_base"|"$lexical_base"/*)
      path_relative_lexically_to "$(dirname "$link_path")" "$lexical_target"
      return
      ;;
  esac

  real_target=$(path_resolve "$target_path")
  real_base=$(path_resolve "$base_root")

  case "$real_target" in
    "$real_base"|"$real_base"/*)
      path_relative_to "$(dirname "$link_path")" "$real_target"
      ;;
    *)
      printf '%s\n' "$target_path"
      ;;
  esac
}
