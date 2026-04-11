#!/usr/bin/env bash
# lab-paper-review.sh — Manage paper review cases and review rounds
# Usage: lab-paper-review.sh -new|-round|-status|-complete-round [options]

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
PAPER_REVIEWS_DIR="$(lab_paper_review_dir)"
PAPER_REVIEW_REL="$(lab_paper_review_rel)"

err() { printf 'ERROR: %s\n' "$1" >&2; exit 1; }
info() { printf '%s\n' "$1"; }

require_mutation_runtime() {
  lab_require_script_runtime "$SCRIPT_DIR" "$AGORA_PROJECT_DIR"
}

validate_agent_name() {
  local name="$1"
  [[ "$name" =~ ^[a-zA-Z][a-zA-Z0-9_-]*$ ]] || err "Invalid agent name: '$name'"
}

validate_case_id() {
  local case_id="$1"
  [[ "$case_id" =~ ^P[0-9]{3,}$ ]] || err "Invalid case ID format: '$case_id' (expected P###)"
}

validate_round_id() {
  local round_id="$1"
  [[ "$round_id" =~ ^R[0-9]+$ ]] || err "Invalid round ID format: '$round_id' (expected R#)"
}

agent_role() {
  local agent="$1"
  [[ -f "$LAB_YAML" ]] || return 0
  awk -v agent="$agent" '
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

require_registered_agent() {
  local agent="$1"
  validate_agent_name "$agent"
  lab_agent_registered "$agent" || err "Unknown agent '$agent' — register it in lab.yaml first"
}

yaml_scalar() {
  local file="$1" key="$2"
  awk -v key="$key" '
    $0 ~ "^" key ":[[:space:]]*" {
      sub(/^[^:]+:[[:space:]]*/, "")
      gsub(/[[:space:]]*#.*/, "")
      print
      exit
    }
  ' "$file" 2>/dev/null || true
}

meta_list() {
  local file="$1" section="$2"
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
  ' "$file" 2>/dev/null || true
}

case_meta_file() {
  local case_id="$1"
  printf '%s/%s/meta.yaml\n' "$PAPER_REVIEWS_DIR" "$case_id"
}

round_number() {
  local round_id="$1"
  validate_round_id "$round_id"
  printf '%d\n' "$((10#${round_id#R}))"
}

next_round_id() {
  local round_id="$1"
  printf 'R%d\n' "$(( $(round_number "$round_id") + 1 ))"
}

LOCK_FILE="$PAPER_REVIEWS_DIR/.paper-review.lock"
LOCK_TIMEOUT=10
lock_fd=""
_tmp_files=()

cleanup() {
  local f
  for f in "${_tmp_files[@]}"; do
    rm -f "$f" 2>/dev/null || true
  done
  if [[ -n "$lock_fd" ]]; then
    exec {lock_fd}<&- || true
    lock_fd=""
  fi
}
trap cleanup EXIT

make_tmp() {
  mkdir -p "$PAPER_REVIEWS_DIR"
  local t
  t=$(mktemp "$PAPER_REVIEWS_DIR/.paper-review.tmp.XXXXXX")
  _tmp_files+=("$t")
  printf '%s\n' "$t"
}

acquire_lock() {
  mkdir -p "$PAPER_REVIEWS_DIR"
  touch "$LOCK_FILE"
  exec {lock_fd}< "$LOCK_FILE" || err "Cannot open paper review lock file"
  flock -x -w "$LOCK_TIMEOUT" "$lock_fd" || err "Cannot acquire paper review lock (timeout ${LOCK_TIMEOUT}s)"
}

parse_reviewers() {
  local raw="$1"
  [[ -n "$raw" ]] || err "Missing reviewers list"

  local normalized
  normalized=$(printf '%s' "$raw" | tr ',' ' ')
  local -a parsed=()
  local reviewer
  for reviewer in $normalized; do
    validate_agent_name "$reviewer"
    parsed+=("$reviewer")
  done
  [[ ${#parsed[@]} -gt 0 ]] || err "No valid reviewers were provided"

  local -A seen=()
  local -a unique=()
  for reviewer in "${parsed[@]}"; do
    if [[ -z "${seen[$reviewer]:-}" ]]; then
      seen["$reviewer"]=1
      unique+=("$reviewer")
    fi
  done
  printf '%s\n' "${unique[@]}"
}

generate_case_id() {
  local next=1
  local d num
  mkdir -p "$PAPER_REVIEWS_DIR"
  for d in "$PAPER_REVIEWS_DIR"/P*/; do
    [[ -d "$d" ]] || continue
    num=$(basename "$d" | sed 's/^P0*//')
    if [[ -n "$num" && "$num" =~ ^[0-9]+$ && $num -ge $next ]]; then
      next=$((num + 1))
    fi
  done

  local attempt=0 case_id
  while [[ $attempt -lt 100 ]]; do
    case_id=$(printf 'P%03d' "$next")
    if mkdir "$PAPER_REVIEWS_DIR/$case_id" 2>/dev/null; then
      printf '%s\n' "$case_id"
      return 0
    fi
    next=$((next + 1))
    attempt=$((attempt + 1))
  done
  err "Failed to allocate a unique paper review case ID"
}

write_case_meta() {
  local case_dir="$1" case_id="$2" paper_id="$3" owner="$4" status="$5" active_round="$6"
  shift 6
  local reviewers=("$@")
  local tmp_file now created_at reviewer
  tmp_file=$(make_tmp)
  now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  if [[ -f "$case_dir/meta.yaml" ]]; then
    created_at=$(yaml_scalar "$case_dir/meta.yaml" "created_at")
  fi
  [[ -n "${created_at:-}" ]] || created_at="$now"
  {
    printf 'case_id: %s\n' "$case_id"
    printf 'paper_id: %s\n' "$paper_id"
    printf 'owner: %s\n' "$owner"
    printf 'status: %s\n' "$status"
    printf 'active_round: %s\n' "$active_round"
    printf 'created_at: %s\n' "$created_at"
    printf 'updated_at: %s\n' "$now"
    printf 'assigned_reviewers:\n'
    for reviewer in "${reviewers[@]}"; do
      printf '  - %s\n' "$reviewer"
    done
  } > "$tmp_file"
  mv "$tmp_file" "$case_dir/meta.yaml"
}

update_case_meta() {
  local case_id="$1" new_status="$2" new_active_round="$3"
  local meta case_dir paper_id owner
  local -a reviewers=()
  meta=$(case_meta_file "$case_id")
  [[ -f "$meta" ]] || err "Case metadata not found for $case_id"
  case_dir=$(dirname "$meta")
  paper_id=$(yaml_scalar "$meta" "paper_id")
  owner=$(yaml_scalar "$meta" "owner")
  while IFS= read -r reviewer; do
    [[ -n "$reviewer" ]] && reviewers+=("$reviewer")
  done < <(meta_list "$meta" "assigned_reviewers")
  [[ ${#reviewers[@]} -gt 0 ]] || err "Case $case_id has no assigned_reviewers in meta.yaml"
  write_case_meta "$case_dir" "$case_id" "$paper_id" "$owner" "$new_status" "$new_active_round" "${reviewers[@]}"
}

write_case_packet() {
  local case_dir="$1" case_id="$2" paper_id="$3" owner="$4"
  local packet="$case_dir/packet.md"
  [[ -f "$packet" ]] && return 0
  cat > "$packet" <<EOF
# Paper Review Case ${case_id}

- **Paper ID:** ${paper_id}
- **Owner:** ${owner}
- **Case directory:** ${PAPER_REVIEW_REL}${case_id}/

Use this packet for shared context that applies across all review rounds.
EOF
}

write_round_packet() {
  local case_dir="$1" case_id="$2" round_id="$3" previous_round="${4:-}"
  local round_dir="$case_dir/rounds/$round_id"
  local packet="$round_dir/packet.md"
  [[ -f "$packet" ]] && return 0
  cat > "$packet" <<EOF
# Paper Review ${case_id} — ${round_id}

- **Case:** ${case_id}
- **Round:** ${round_id}
- **Shared packet:** ${PAPER_REVIEW_REL}${case_id}/packet.md
EOF
  if [[ -n "$previous_round" ]]; then
    cat >> "$packet" <<EOF
- **Previous round:** ${PAPER_REVIEW_REL}${case_id}/rounds/${previous_round}/
- **Supervisor resolution:** ${PAPER_REVIEW_REL}${case_id}/rounds/${previous_round}/supervisor-resolution.md
EOF
  fi
  cat >> "$packet" <<'EOF'

Reviewers should place their reviews in `reviews/<reviewer>.md`.
Supervisor should place the gate decision in `supervisor-resolution.md`.
Use the exact marker line `Outcome: submission-ready` only when the paper is ready to close.
Any other resolution keeps the case ready for the next round.
EOF
}

create_round_structure() {
  local case_dir="$1" case_id="$2" round_id="$3" previous_round="${4:-}"
  mkdir -p "$case_dir/rounds/$round_id/reviews"
  write_round_packet "$case_dir" "$case_id" "$round_id" "$previous_round"
}

review_progress() {
  local case_id="$1"
  local meta round_id round_dir reviewer
  local -a reviewers=()
  local total=0 present=0
  meta=$(case_meta_file "$case_id")
  round_id=$(yaml_scalar "$meta" "active_round")
  round_dir="$PAPER_REVIEWS_DIR/$case_id/rounds/$round_id"
  while IFS= read -r reviewer; do
    [[ -n "$reviewer" ]] || continue
    reviewers+=("$reviewer")
  done < <(meta_list "$meta" "assigned_reviewers")
  total=${#reviewers[@]}
  for reviewer in "${reviewers[@]}"; do
    [[ -s "$round_dir/reviews/${reviewer}.md" ]] && present=$((present + 1))
  done
  printf '%d %d\n' "$present" "$total"
}

supervisor_resolution_is_submission_ready() {
  local resolution_file="$1"
  grep -qiE '^[[:space:]]*([-*][[:space:]]*)?outcome[[:space:]]*:[[:space:]]*submission-ready[[:space:]]*$' "$resolution_file"
}

do_new() {
  require_mutation_runtime
  [[ $# -eq 3 ]] || err "Usage: lab-paper-review.sh -new <paper-id> <owner> <reviewers>"
  local paper_id="$1" owner="$2" reviewer_arg="$3"
  [[ -n "$paper_id" ]] || err "Missing <paper-id>"
  require_registered_agent "$owner"

  local -a reviewers=()
  while IFS= read -r reviewer; do
    [[ -n "$reviewer" ]] || continue
    require_registered_agent "$reviewer"
    [[ "$(agent_role "$reviewer")" == "paper-reviewer" ]] || err "Assigned reviewer '$reviewer' must have role paper-reviewer"
    reviewers+=("$reviewer")
  done < <(parse_reviewers "$reviewer_arg")

  acquire_lock
  local case_id case_dir round_id
  case_id=$(generate_case_id)
  case_dir="$PAPER_REVIEWS_DIR/$case_id"
  round_id="R1"
  create_round_structure "$case_dir" "$case_id" "$round_id"
  write_case_packet "$case_dir" "$case_id" "$paper_id" "$owner"
  write_case_meta "$case_dir" "$case_id" "$paper_id" "$owner" "active" "$round_id" "${reviewers[@]}"
  cleanup
  trap - EXIT
  info "Created paper review case ${case_id} for paper '${paper_id}'"
  info "Round ${round_id}: ${PAPER_REVIEW_REL}${case_id}/rounds/${round_id}/"
}

do_round() {
  require_mutation_runtime
  [[ $# -eq 1 ]] || err "Usage: lab-paper-review.sh -round <case-id>"
  local case_id="$1"
  validate_case_id "$case_id"

  local meta
  meta=$(case_meta_file "$case_id")

  acquire_lock
  [[ -f "$meta" ]] || err "Case $case_id not found"
  local case_dir status current_round next_round
  case_dir="$PAPER_REVIEWS_DIR/$case_id"
  status=$(yaml_scalar "$meta" "status")
  current_round=$(yaml_scalar "$meta" "active_round")
  [[ -n "$current_round" ]] || err "Case $case_id is missing active_round in meta.yaml"
  if [[ "$status" == "closed" ]]; then
    err "Case $case_id is already closed"
  fi
  if [[ "$status" != "ready-for-next-round" ]]; then
    err "Case $case_id is not ready for a new round (current status: ${status:-unknown})"
  fi

  next_round=$(next_round_id "$current_round")
  [[ ! -e "$case_dir/rounds/$next_round" ]] || err "Round $next_round already exists for case $case_id"
  create_round_structure "$case_dir" "$case_id" "$next_round" "$current_round"
  update_case_meta "$case_id" "active" "$next_round"
  cleanup
  trap - EXIT
  info "Opened ${next_round} for case ${case_id}"
}

do_complete_round() {
  require_mutation_runtime
  [[ $# -eq 1 ]] || err "Usage: lab-paper-review.sh -complete-round <case-id>"
  local case_id="$1"
  validate_case_id "$case_id"

  local meta
  meta=$(case_meta_file "$case_id")

  acquire_lock
  [[ -f "$meta" ]] || err "Case $case_id not found"
  local case_dir status active_round resolution_file next_status progress present total
  case_dir="$PAPER_REVIEWS_DIR/$case_id"
  status=$(yaml_scalar "$meta" "status")
  active_round=$(yaml_scalar "$meta" "active_round")
  [[ -n "$active_round" ]] || err "Case $case_id is missing active_round in meta.yaml"

  if [[ "$status" == "closed" ]]; then
    err "Case $case_id is already closed"
  fi
  if [[ "$status" != "active" ]]; then
    err "Case $case_id does not have an active round to complete (current status: ${status:-unknown})"
  fi

  resolution_file="$case_dir/rounds/$active_round/supervisor-resolution.md"
  [[ -f "$resolution_file" && -s "$resolution_file" ]] || err "Missing required supervisor resolution: ${PAPER_REVIEW_REL}${case_id}/rounds/${active_round}/supervisor-resolution.md"
  progress=$(review_progress "$case_id")
  read -r present total <<< "$progress"
  [[ "$total" -gt 0 ]] || err "Case $case_id has no assigned reviewers"
  [[ "$present" -eq "$total" ]] || err "Cannot complete ${active_round} for case $case_id: ${present}/${total} assigned reviews are present"

  if supervisor_resolution_is_submission_ready "$resolution_file"; then
    next_status="closed"
  else
    next_status="ready-for-next-round"
  fi
  update_case_meta "$case_id" "$next_status" "$active_round"
  cleanup
  trap - EXIT
  info "Completed ${active_round} for case ${case_id} -> status: ${next_status}"
}

do_status() {
  mkdir -p "$PAPER_REVIEWS_DIR"
  local found=0 meta case_id paper_id owner status active_round resolution_file progress present total reviewer
  for meta in "$PAPER_REVIEWS_DIR"/P*/meta.yaml; do
    [[ -f "$meta" ]] || continue
    found=1
    case_id=$(yaml_scalar "$meta" "case_id")
    paper_id=$(yaml_scalar "$meta" "paper_id")
    owner=$(yaml_scalar "$meta" "owner")
    status=$(yaml_scalar "$meta" "status")
    active_round=$(yaml_scalar "$meta" "active_round")
    progress=$(review_progress "$case_id")
    present=${progress%% *}
    total=${progress##* }
    resolution_file="$PAPER_REVIEWS_DIR/$case_id/rounds/$active_round/supervisor-resolution.md"
    info "Case ${case_id} — paper ${paper_id}"
    info "  Owner: ${owner}"
    info "  Status: ${status}"
    info "  Active round: ${active_round}"
    printf '  Assigned reviewers:'
    local first=1
    while IFS= read -r reviewer; do
      [[ -n "$reviewer" ]] || continue
      if [[ $first -eq 1 ]]; then
        printf ' %s' "$reviewer"
        first=0
      else
        printf ', %s' "$reviewer"
      fi
    done < <(meta_list "$meta" "assigned_reviewers")
    printf '\n'
    info "  Round progress: ${present}/${total} reviews, supervisor resolution $( [[ -s "$resolution_file" ]] && printf 'present' || printf 'pending' )"
    info ""
  done
  [[ $found -eq 1 ]] || info "No paper review cases."
}

usage() {
  cat <<'EOF'
Usage: lab-paper-review.sh [-caller <name>] <operation> [options]

Operations:
  -new <paper-id> <owner> <reviewers>     Create a new paper review case and round R1
  -round <case-id>                        Open the next round for a ready-for-next-round case
  -complete-round <case-id>               Complete the active round using supervisor-resolution.md
  -status                                 Show all paper review cases
EOF
  exit 1
}

[[ $# -ge 1 ]] || usage

CALLER=""
if [[ "${1:-}" == "-caller" ]]; then
  [[ $# -ge 3 ]] || usage
  CALLER="$2"
  require_registered_agent "$CALLER"
  shift 2
fi

[[ $# -ge 1 ]] || usage

op="$1"
shift
case "$op" in
  -new)            do_new "$@" ;;
  -round)          do_round "$@" ;;
  -complete-round) do_complete_round "$@" ;;
  -status)         do_status "$@" ;;
  *)               usage ;;
esac
