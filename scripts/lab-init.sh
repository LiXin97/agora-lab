#!/usr/bin/env bash
# lab-init.sh — Initialize the virtual research lab
# Usage: lab-init.sh --topic "..." [--students N] [--staff N] [--paper-reviewers N]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Support both new env-based layout and legacy single-directory layout.
# New layout: AGORA_HOME = global install (~/.agora), AGORA_PROJECT_DIR = per-project (.agora/)
# Legacy: everything lives under $SCRIPT_DIR/..
AGORA_HOME="${AGORA_HOME:-$(cd "$SCRIPT_DIR/.." && pwd)}"
AGORA_PROJECT_DIR="${AGORA_PROJECT_DIR:-$AGORA_HOME}"
FRAMEWORK_SOURCE_HOME="$AGORA_HOME"
export AGORA_HOME AGORA_PROJECT_DIR
SKILLS_DIR="$AGORA_HOME/skills"
PATH_LIB="$SCRIPT_DIR/path-lib.sh"
if [[ ! -f "$PATH_LIB" ]]; then
  echo "ERROR: path-lib.sh not found at $PATH_LIB. Reinstall Agora or reinitialize the project runtime." >&2
  exit 1
fi
# shellcheck source=/dev/null
source "$PATH_LIB"

err() { echo "ERROR: $1" >&2; exit 1; }
info() { echo "$1"; }
warn() { echo "WARN: $1" >&2; }

PERSONA_LIB="$SCRIPT_DIR/persona-lib.sh"
[[ -f "$PERSONA_LIB" ]] || err "persona-lib.sh not found at $PERSONA_LIB"
# shellcheck source=/dev/null
source "$PERSONA_LIB"

# --- Parse arguments ---
TOPIC=""
NUM_STUDENTS=0
NUM_STAFF=0
NUM_PAPER_REVIEWERS=0
LAB_NAME="ML Research Lab"
FORCE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --topic)
      [[ $# -ge 2 ]] || err "Missing value for --topic"
      TOPIC="$2"; shift 2 ;;
    --students)
      [[ $# -ge 2 ]] || err "Missing value for --students"
      NUM_STUDENTS="$2"; shift 2 ;;
    --staff)
      [[ $# -ge 2 ]] || err "Missing value for --staff"
      NUM_STAFF="$2"; shift 2 ;;
    --paper-reviewers)
      [[ $# -ge 2 ]] || err "Missing value for --paper-reviewers"
      NUM_PAPER_REVIEWERS="$2"; shift 2 ;;
    --reviewers)
      err $'--reviewers is no longer supported\nuse: --paper-reviewers' ;;
    --name)
      [[ $# -ge 2 ]] || err "Missing value for --name"
      LAB_NAME="$2"; shift 2 ;;
    --force)
      FORCE=1; shift ;;
    --help|-h)
      cat <<'EOF'
Usage: lab-init.sh --topic "Research topic" [options]

Options:
  --topic            Research topic (required)
  --name             Lab name (default: "ML Research Lab")
  --students         Number of students to create (default: 0, add later with lab-agent.sh)
  --staff            Number of research staff to create (default: 0)
  --paper-reviewers  Number of paper reviewers to create (default: 0)
  --force            Overwrite existing lab directory

Examples:
  # Minimal init — just creates structure + supervisor
  lab-init.sh --topic "Efficient attention mechanisms for long-context LLMs"

  # Full init with agents
  lab-init.sh --topic "Neural architecture search" --students 3 --staff 2 --paper-reviewers 1
EOF
      exit 0
      ;;
    *) err "Unknown option: $1" ;;
  esac
done

[[ -n "$TOPIC" ]] || err "Missing --topic"

# Validate numeric args
validate_non_negative() {
  local flag="$1" value="$2"
  if [[ ! "$value" =~ ^[0-9]+$ ]]; then
    err "$flag must be a non-negative integer"
  fi
}

validate_non_negative "--students" "$NUM_STUDENTS"
validate_non_negative "--staff" "$NUM_STAFF"
validate_non_negative "--paper-reviewers" "$NUM_PAPER_REVIEWERS"

# Cap student count at 26 (a-z)
if [[ $NUM_STUDENTS -gt 26 ]]; then
  err "--students max is 26 (a-z naming)"
fi
if [[ $NUM_STAFF -gt 26 ]]; then
  err "--staff max is 26 (a-z naming)"
fi

# --- Re-init guard ---
if [[ -f "$AGORA_PROJECT_DIR/lab.yaml" ]]; then
  if [[ $FORCE -eq 0 ]]; then
    if [[ -t 0 ]]; then
      warn "lab.yaml already exists. This will overwrite the existing lab configuration."
      printf "Continue? [y/N] " >&2
      read -r answer || answer="n"
      if [[ "$answer" != "y" && "$answer" != "Y" ]]; then
        info "Aborted. Use --force to skip this prompt."
        exit 0
      fi
    else
      err "lab.yaml already exists. Use --force to overwrite in non-interactive mode."
    fi
  fi
fi

info "Initializing research lab: ${LAB_NAME}"
info "Research topic: ${TOPIC}"
info ""

# --- Create directory structure ---
info "Creating directory structure..."
mkdir -p "$AGORA_PROJECT_DIR"/{shared/{artifacts,messages,meetings,paper-reviews,research-wiki},agents}

# --- Create lab.yaml (use awk-safe quoting — no sed on user input) ---
info "Creating lab.yaml..."
# Escape backslash first, then double-quote, to prevent awk -v injection
# awk -v interprets \n, \t, \\, etc. so we must escape backslashes
safe_lab_name=$(printf '%s' "$LAB_NAME" | sed 's/\\/\\\\/g; s/"/\\"/g')
safe_topic=$(printf '%s' "$TOPIC" | sed 's/\\/\\\\/g; s/"/\\"/g')
# Reject newlines in values (prevents YAML injection)
if [[ "$LAB_NAME" == *$'\n'* ]]; then
  err "--name cannot contain newlines"
fi
if [[ "$TOPIC" == *$'\n'* ]]; then
  err "--topic cannot contain newlines"
fi
# Reject double quotes — they produce invalid YAML through the awk -v pipeline
if [[ "$LAB_NAME" == *'"'* ]]; then
  err "--name cannot contain double quotes"
fi
if [[ "$TOPIC" == *'"'* ]]; then
  err "--topic cannot contain double quotes"
fi

supervisor_preset=$(derived_persona_preset "supervisor" "supervisor" 2>/dev/null || true)
[[ -n "$supervisor_preset" ]] || supervisor_preset=$(persona_default_field "supervisor" "persona_preset" 2>/dev/null || true)
supervisor_mbti=$(persona_catalog_value "supervisor" "$supervisor_preset" "mbti" 2>/dev/null || true)
[[ -n "$supervisor_mbti" ]] || supervisor_mbti=$(persona_default_field "supervisor" "mbti" 2>/dev/null || true)
supervisor_background=$(persona_catalog_value "supervisor" "$supervisor_preset" "background" 2>/dev/null || true)
[[ -n "$supervisor_background" ]] || supervisor_background=$(persona_default_field "supervisor" "background" 2>/dev/null || true)
supervisor_results=$(persona_catalog_value "supervisor" "$supervisor_preset" "notable_results" 2>/dev/null || true)
[[ -n "$supervisor_results" ]] || supervisor_results=$(persona_default_field "supervisor" "notable_results" 2>/dev/null || true)
supervisor_lens=$(persona_catalog_value "supervisor" "$supervisor_preset" "lens" 2>/dev/null || true)
[[ -n "$supervisor_lens" ]] || supervisor_lens=$(persona_default_field "supervisor" "lens" 2>/dev/null || true)

safe_supervisor_background=$(sanitize_yaml_scalar "$supervisor_background" "Supervisor background")
safe_supervisor_results=$(sanitize_yaml_scalar "$supervisor_results" "Supervisor notable results")

awk -v lab_name="$safe_lab_name" -v topic="$safe_topic" \
    -v supervisor_preset="$supervisor_preset" -v supervisor_mbti="$supervisor_mbti" \
    -v supervisor_background="$safe_supervisor_background" -v supervisor_results="$safe_supervisor_results" 'BEGIN {
  print "lab_name: \"" lab_name "\""
  print "research_topic: \"" topic "\""
  print ""
  print "roles:"
  print "  supervisor:"
  print "    template: supervisor.claude.md"
  print "    default_backend: claude-code      # claude-code | codex | copilot | gemini"
  print "    default_model: opus"
  print "    skills: [shared-references, core-kanban, core-meeting, core-handoff, supervisor-planning, supervisor-tasking, supervisor-meeting, supervisor-decision, supervisor-integration]"
  print "    can_assign_tasks: true"
  print "    can_make_decisions: true"
  print "    max_instances: 1"
  print ""
  print "  student:"
  print "    template: student.claude.md"
  print "    default_backend: claude-code      # claude-code | codex | copilot | gemini"
  print "    default_model: \"\""
  print "    skills: [shared-references, core-kanban, core-meeting, core-handoff, student-literature, student-idea-refine, student-experiment-design, student-run-experiment, student-analyze-results, student-write-paper, student-meeting]"
  print "    max_instances: 0"
  print ""
  print "  research-staff:"
  print "    template: research-staff.claude.md"
  print "    default_backend: claude-code      # claude-code | codex | copilot | gemini"
  print "    default_model: \"\""
  print "    skills: [shared-references, core-kanban, core-meeting, core-handoff, research-staff-judgment, research-staff-meeting]"
  print "    max_instances: 0"
  print ""
  print "  paper-reviewer:"
  print "    template: paper-reviewer.claude.md"
  print "    default_backend: claude-code      # claude-code | codex | copilot | gemini"
  print "    default_model: \"\""
  print "    skills: [shared-references, core-kanban, core-handoff, paper-reviewer-critique, paper-reviewer-novelty-check, paper-reviewer-results-to-claims, paper-reviewer-evidence-audit]"
  print "    max_instances: 0"
  print ""
  print "agents:"
  print "  supervisor:"
  print "    role: supervisor"
  print "    backend: claude-code"
  print "    model: opus"
  print "    persona_preset: " supervisor_preset
  print "    mbti: " supervisor_mbti
  print "    background: \"" supervisor_background "\""
  print "    notable_results: \"" supervisor_results "\""
  print ""
  print "meeting:"
  print "  trigger: manual"
  print "  min_participants: 3"
  print "  decision_maker: supervisor   # currently fixed to supervisor"
  print "  require_all_read: true"
  print ""
  print "security:"
  print "  allow_unsafe_backends: false"
  print ""
  print "communication:"
  print "  method: file"
  print "  message_dir: shared/messages/"
  print "  meeting_dir: shared/meetings/"
  print "  kanban_file: shared/KANBAN.md"
  print "  artifact_dir: shared/artifacts/"
  print "  paper_review_dir: shared/paper-reviews/"
}' /dev/null > "$AGORA_PROJECT_DIR/lab.yaml"

# --- Create KANBAN.md ---
info "Creating KANBAN.md..."
KANBAN_SCHEMA="$SCRIPT_DIR/kanban-schema.sh"
if [[ -f "$KANBAN_SCHEMA" ]]; then
  # shellcheck source=/dev/null
  source "$KANBAN_SCHEMA"
  kanban_template > "$AGORA_PROJECT_DIR/shared/KANBAN.md"
else
  # Fallback: inline template (for bootstrapping without schema file)
  cat > "$AGORA_PROJECT_DIR/shared/KANBAN.md" <<'EOF'
# Research Kanban

> Managed by `scripts/lab-kanban.sh`. Do not edit this file directly.

## Backlog

| ID | Title | Assigned | Created | Priority | Description |
|---|---|---|---|---|---|

## In Progress

| ID | Title | Assigned | Status | Started | Description |
|---|---|---|---|---|---|

## Review

| ID | Title | Assigned | Status | Submitted | Artifacts |
|---|---|---|---|---|---|

## Done

| ID | Title | Completed | Summary | Artifacts |
|---|---|---|---|---|
EOF
fi

# --- Materialize framework helpers so relative paths (../../scripts/, ../../hooks/) resolve ---
# Agents run with cwd = .agora/agents/{name}/, so ../../scripts/ = .agora/scripts/
# By default we symlink back to the framework home. In containerized init-only flows,
# callers can set AGORA_COPY_FRAMEWORK=1 to copy the runtime into the project instead
# of creating symlinks that would point at ephemeral container paths.
copy_framework="${AGORA_COPY_FRAMEWORK:-0}"
project_root="$(cd "$AGORA_PROJECT_DIR" && pwd -P)"
framework_root="$(cd "$AGORA_HOME" && pwd -P)"
if [[ "$project_root" == "$framework_root" ]]; then
  info "Using in-place framework directories..."
else
  rm -rf "$AGORA_PROJECT_DIR/scripts" "$AGORA_PROJECT_DIR/hooks" \
         "$AGORA_PROJECT_DIR/templates" "$AGORA_PROJECT_DIR/skills"
  if [[ "$copy_framework" == "1" ]]; then
    info "Copying framework runtime into project..."
    mkdir -p "$AGORA_PROJECT_DIR/scripts" "$AGORA_PROJECT_DIR/hooks" \
             "$AGORA_PROJECT_DIR/templates" "$AGORA_PROJECT_DIR/skills"
    cp -R "$FRAMEWORK_SOURCE_HOME/scripts/." "$AGORA_PROJECT_DIR/scripts/"
    cp -R "$FRAMEWORK_SOURCE_HOME/hooks/." "$AGORA_PROJECT_DIR/hooks/"
    cp -R "$FRAMEWORK_SOURCE_HOME/templates/." "$AGORA_PROJECT_DIR/templates/"
    cp -R "$FRAMEWORK_SOURCE_HOME/skills/." "$AGORA_PROJECT_DIR/skills/"
    AGORA_HOME="$AGORA_PROJECT_DIR"
  else
    info "Creating framework symlinks..."
    ln -sfn "$FRAMEWORK_SOURCE_HOME/scripts" "$AGORA_PROJECT_DIR/scripts"
    ln -sfn "$FRAMEWORK_SOURCE_HOME/hooks" "$AGORA_PROJECT_DIR/hooks"
    ln -sfn "$FRAMEWORK_SOURCE_HOME/templates" "$AGORA_PROJECT_DIR/templates"
    ln -sfn "$FRAMEWORK_SOURCE_HOME/skills" "$AGORA_PROJECT_DIR/skills"
  fi
fi
export AGORA_HOME
SKILLS_DIR="$AGORA_PROJECT_DIR/skills"

# --- Create supervisor agent ---
info "Creating supervisor agent..."
local_agent_sh="$AGORA_HOME/scripts/lab-agent.sh"
if [[ -f "$local_agent_sh" ]]; then
  # Supervisor is pre-registered in lab.yaml, so lab-agent.sh -add would fail.
  # Instead, manually create the supervisor directory using the same logic.
  local_sup_dir="$AGORA_PROJECT_DIR/agents/supervisor"
  # When --force, clean up existing supervisor directory for a fresh start
  if [[ $FORCE -eq 1 && -d "$local_sup_dir" ]]; then
    rm -rf "$local_sup_dir"
  fi
  mkdir -p "$local_sup_dir/workspace"
  mkdir -p "$local_sup_dir/.claude"
  mkdir -p "$AGORA_PROJECT_DIR/shared/artifacts/supervisor"

  if [[ -f "$AGORA_HOME/templates/supervisor.claude.md" ]]; then
    # Escape & and \ in values for awk gsub safety
    local_safe_name="supervisor"
    local_safe_lab=$(printf '%s' "$safe_lab_name" | sed 's/[&\\]/\\\\&/g')
    local_safe_topic=$(printf '%s' "$safe_topic" | sed 's/[&\\]/\\\\&/g')
    local_safe_backend="claude-code"
    local_safe_model="opus"
    local_safe_preset=$(printf '%s' "$supervisor_preset" | sed 's/[&\\]/\\\\&/g')
    local_safe_mbti=$(printf '%s' "$supervisor_mbti" | sed 's/[&\\]/\\\\&/g')
    local_safe_background=$(printf '%s' "$supervisor_background" | sed 's/[&\\]/\\\\&/g')
    local_safe_results=$(printf '%s' "$supervisor_results" | sed 's/[&\\]/\\\\&/g')
    local_safe_lens=$(printf '%s' "$supervisor_lens" | sed 's/[&\\]/\\\\&/g')
    local_safe_kanban_rel=$(printf '%s' "$(lab_kanban_agent_rel)" | sed 's/[&\\]/\\\\&/g')
    local_safe_message_rel=$(printf '%s' "$(lab_message_agent_rel)" | sed 's/[&\\]/\\\\&/g')
    local_safe_meeting_rel=$(printf '%s' "$(lab_meeting_agent_rel)" | sed 's/[&\\]/\\\\&/g')
    local_safe_artifact_rel=$(printf '%s' "$(lab_artifact_agent_rel)" | sed 's/[&\\]/\\\\&/g')
    awk -v name="$local_safe_name" -v lab_name="$local_safe_lab" -v topic="$local_safe_topic" \
        -v backend="$local_safe_backend" -v model="$local_safe_model" \
        -v persona_preset="$local_safe_preset" -v mbti="$local_safe_mbti" \
        -v background="$local_safe_background" -v notable_results="$local_safe_results" \
        -v persona_lens="$local_safe_lens" -v kanban_rel="$local_safe_kanban_rel" \
        -v message_rel="$local_safe_message_rel" -v meeting_rel="$local_safe_meeting_rel" \
        -v artifact_rel="$local_safe_artifact_rel" '
    {
      gsub(/\{\{NAME\}\}/, name)
      gsub(/\{\{LAB_NAME\}\}/, lab_name)
      gsub(/\{\{RESEARCH_TOPIC\}\}/, topic)
      gsub(/\{\{BACKEND\}\}/, backend)
      gsub(/\{\{MODEL\}\}/, model)
      gsub(/\{\{PERSONA_PRESET\}\}/, persona_preset)
      gsub(/\{\{MBTI\}\}/, mbti)
      gsub(/\{\{BACKGROUND\}\}/, background)
      gsub(/\{\{NOTABLE_RESULTS\}\}/, notable_results)
      gsub(/\{\{PERSONA_LENS\}\}/, persona_lens)
      gsub(/\{\{RESEARCH_DIRECTION\}\}/, "Lab strategy")
      gsub(/\{\{KANBAN_FILE_REL\}\}/, kanban_rel)
      gsub(/\{\{MESSAGE_DIR_REL\}\}/, message_rel)
      gsub(/\{\{MEETING_DIR_REL\}\}/, meeting_rel)
      gsub(/\{\{ARTIFACT_DIR_REL\}\}/, artifact_rel)
      print
    }
    ' "$AGORA_HOME/templates/supervisor.claude.md" > "$local_sup_dir/CLAUDE.md"
    cp "$local_sup_dir/CLAUDE.md" "$local_sup_dir/AGENTS.md"
  fi

  cat > "$local_sup_dir/memory.md" <<'MEMEOF'
# supervisor — Memory

Record important decisions, observations, and context here for persistence across sessions.
MEMEOF

  # Render supervisor settings.json from template (expanding {{AGENT_NAME}} and {{SKILL_ALLOWS}})
  local_settings_tmpl=""
  if [[ -f "$AGORA_HOME/templates/settings.supervisor.json.tmpl" ]]; then
    local_settings_tmpl="$AGORA_HOME/templates/settings.supervisor.json.tmpl"
  elif [[ -f "$AGORA_HOME/templates/settings.json.tmpl" ]]; then
    local_settings_tmpl="$AGORA_HOME/templates/settings.json.tmpl"
  fi
  if [[ -n "$local_settings_tmpl" ]]; then
    # Build Skill allow entries for supervisor role
    local_skill_allows=""
    for skill in shared-references core-kanban core-meeting core-handoff supervisor-planning supervisor-tasking supervisor-meeting supervisor-decision supervisor-integration; do
      local_skill_allows+="      \"Skill(${skill} *)\","$'\n'
    done
    local_safe_kanban_rel=$(printf '%s' "$(lab_kanban_agent_rel)" | sed 's/[&\\]/\\\\&/g')
    local_safe_message_rel=$(printf '%s' "$(lab_message_agent_rel)" | sed 's/[&\\]/\\\\&/g')
    local_safe_meeting_rel=$(printf '%s' "$(lab_meeting_agent_rel)" | sed 's/[&\\]/\\\\&/g')
    local_safe_artifact_rel=$(printf '%s' "$(lab_artifact_agent_rel)" | sed 's/[&\\]/\\\\&/g')
    # Pass 1: replace path and identity placeholders via awk
    local_intermediate=$(awk \
      -v agent_name="supervisor" \
      -v kanban_rel="$local_safe_kanban_rel" \
      -v message_rel="$local_safe_message_rel" \
      -v meeting_rel="$local_safe_meeting_rel" \
      -v artifact_rel="$local_safe_artifact_rel" '
      {
        gsub(/\{\{AGENT_NAME\}\}/, agent_name)
        gsub(/\{\{KANBAN_FILE_REL\}\}/, kanban_rel)
        gsub(/\{\{MESSAGE_DIR_REL\}\}/, message_rel)
        gsub(/\{\{MEETING_DIR_REL\}\}/, meeting_rel)
        gsub(/\{\{ARTIFACT_DIR_REL\}\}/, artifact_rel)
        print
      }
    ' "$local_settings_tmpl")
    # Pass 2: replace {{SKILL_ALLOWS}} placeholder with skill allow entries
    {
      while IFS= read -r line; do
        if [[ "$line" == *'{{SKILL_ALLOWS}}'* ]]; then
          if [[ -n "$local_skill_allows" ]]; then
            printf '%s' "$local_skill_allows"
          fi
        else
          printf '%s\n' "$line"
        fi
      done <<< "$local_intermediate"
    } > "$local_sup_dir/.claude/settings.json"
  fi

  # Setup skill symlinks for supervisor.
  # Pass 1: validate every required skill directory exists before touching the filesystem.
  local_claude_skills="$local_sup_dir/.claude/skills"
  for skill in shared-references core-kanban core-meeting core-handoff supervisor-planning supervisor-tasking supervisor-meeting supervisor-decision supervisor-integration; do
    if [[ ! -d "$SKILLS_DIR/$skill" ]]; then
      err "Required skill directory not found during lab init: $SKILLS_DIR/$skill"
    fi
  done
  # Pass 2: all directories confirmed present — now create symlinks atomically.
  mkdir -p "$local_claude_skills"
  for skill in shared-references core-kanban core-meeting core-handoff supervisor-planning supervisor-tasking supervisor-meeting supervisor-decision supervisor-integration; do
    skill_target=$(portable_symlink_target "$local_claude_skills/$skill" "$SKILLS_DIR/$skill" "$AGORA_PROJECT_DIR")
    ln -sfn "$skill_target" "$local_claude_skills/$skill"
  done
fi

# --- Create initial task for supervisor ---
info "Creating initial kanban task..."
local_kanban_sh="$AGORA_HOME/scripts/lab-kanban.sh"
if [[ -f "$local_kanban_sh" ]]; then
  bash "$local_kanban_sh" -caller supervisor -new \
    -title "Define research directions and assign to students" \
    -assign supervisor \
    -priority P0 \
    -desc "Survey the research topic, identify 2-3 promising directions, and assign them to students" \
    2>/dev/null || warn "Failed to create initial kanban task"
fi

# --- Create MEETING_LOG.md ---
cat > "$AGORA_PROJECT_DIR/shared/MEETING_LOG.md" <<'EOF'
# Meeting Log

| ID | Date | Phase | Status |
|---|---|---|---|
EOF

# --- Batch create agents if counts specified ---
if [[ $NUM_STUDENTS -gt 0 || $NUM_STAFF -gt 0 || $NUM_PAPER_REVIEWERS -gt 0 ]]; then
  info ""
  info "Creating agents..."

  local_letters=(a b c d e f g h i j k l m n o p q r s t u v w x y z)
  for ((i=1; i<=NUM_STUDENTS; i++)); do
    local_name="student-${local_letters[$((i-1))]}"
    # When --force, remove existing agent dir so -add does not fail
    if [[ $FORCE -eq 1 && -d "$AGORA_PROJECT_DIR/agents/$local_name" ]]; then
      info "  Removing existing ${local_name} (--force)..."
      rm -rf "$AGORA_PROJECT_DIR/agents/$local_name"
    fi
    info "  Adding ${local_name}..."
    bash "$local_agent_sh" -add -name "$local_name" -role student
  done

  for ((i=1; i<=NUM_STAFF; i++)); do
    local_name="staff-${local_letters[$((i-1))]}"
    if [[ $FORCE -eq 1 && -d "$AGORA_PROJECT_DIR/agents/$local_name" ]]; then
      info "  Removing existing ${local_name} (--force)..."
      rm -rf "$AGORA_PROJECT_DIR/agents/$local_name"
    fi
    info "  Adding ${local_name}..."
    bash "$local_agent_sh" -add -name "$local_name" -role research-staff
  done

  for ((i=1; i<=NUM_PAPER_REVIEWERS; i++)); do
    local_name="paper-reviewer-${i}"
    if [[ $FORCE -eq 1 && -d "$AGORA_PROJECT_DIR/agents/$local_name" ]]; then
      info "  Removing existing ${local_name} (--force)..."
      rm -rf "$AGORA_PROJECT_DIR/agents/$local_name"
    fi
    info "  Adding ${local_name}..."
    bash "$local_agent_sh" -add -name "$local_name" -role paper-reviewer
  done
fi

# --- Make our scripts executable ---
for f in "$AGORA_HOME/scripts/lab-init.sh" "$AGORA_HOME/scripts/lab-agent.sh" \
         "$AGORA_HOME/scripts/lab-meeting.sh" "$AGORA_HOME/scripts/lab-paper-review.sh" \
         "$AGORA_HOME/scripts/lab-kanban.sh" \
         "$AGORA_HOME/scripts/lab-poll.sh" \
         "$AGORA_HOME/hooks/workspace-guard.sh" "$AGORA_HOME/hooks/kanban-guard.sh" \
         "$AGORA_HOME/hooks/meeting-inject.sh"; do
  [[ -f "$f" ]] && chmod +x "$f"
done

# --- Auto-append to .gitignore ---
# The project root is the parent of $AGORA_PROJECT_DIR (which is .agora/)
local_project_root=$(dirname "$AGORA_PROJECT_DIR")
local_gitignore="$local_project_root/.gitignore"
for entry in ".agora/agents/" ".agora/shared/" ".agora/scripts" ".agora/hooks" ".agora/templates" ".agora/skills"; do
  grep -qxF "$entry" "$local_gitignore" 2>/dev/null || echo "$entry" >> "$local_gitignore"
done

info ""
info "=== Lab initialized successfully ==="
info ""
info "Directory: $AGORA_PROJECT_DIR"
info "Topic: ${TOPIC}"
info ""
info "Next steps:"
if [[ $NUM_STUDENTS -eq 0 && $NUM_STAFF -eq 0 && $NUM_PAPER_REVIEWERS -eq 0 ]]; then
  info "  1. Add agents:    agora add student-a student -direction \"...\""
  info "  2. Launch agents: agora start"
  info "  3. Start work:    Supervisor defines research directions via kanban"
  info "  4. Call meeting:  agora meeting"
else
  info "  1. Launch agents: agora start"
  info "  2. Start work:    Supervisor defines research directions via kanban"
  info "  3. Call meeting:  agora meeting"
fi
