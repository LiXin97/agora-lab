#!/usr/bin/env bash

persona_catalog_path() {
  local role="$1"
  printf '%s/personas/%s.tsv\n' "$TEMPLATES_DIR" "$role"
}

persona_catalog_value() {
  local role="$1" preset="$2" field="$3"
  local catalog
  catalog=$(persona_catalog_path "$role")
  [[ -f "$catalog" ]] || return 1
  awk -F'\t' -v preset="$preset" -v field="$field" '
    NR == 1 {
      for (i = 1; i <= NF; i++) {
        idx[$i] = i
      }
      next
    }
    $1 == preset {
      if (field in idx) {
        print $(idx[field])
      }
      exit
    }
  ' "$catalog"
}

persona_preset_exists() {
  local role="$1" preset="$2"
  [[ -n "$preset" ]] || return 1
  [[ -n "$(persona_catalog_value "$role" "$preset" "preset_id" 2>/dev/null || true)" ]]
}

derived_persona_preset() {
  local role="$1" name="$2"
  local catalog checksum
  catalog=$(persona_catalog_path "$role")
  [[ -f "$catalog" ]] || return 1
  checksum=$(printf '%s' "${role}:${name}" | cksum | awk '{print $1}')
  awk -F'\t' -v pick="$checksum" '
    NR == 1 { next }
    $1 == "" || $1 ~ /^#/ { next }
    { rows[++count] = $1 }
    END {
      if (count > 0) {
        print rows[(pick % count) + 1]
      }
    }
  ' "$catalog"
}

persona_default_field() {
  local role="$1" field="$2"
  case "${role}:${field}" in
    supervisor:persona_preset) printf 'supervisor-visionary-architect\n' ;;
    supervisor:mbti) printf 'ENTJ\n' ;;
    supervisor:lens) printf 'Optimizes the lab as a portfolio of ambitious bets, forcing crisp priorities and execution discipline.\n' ;;
    supervisor:background) printf 'A field-shaping research leader with a track record of launching influential agendas, building exceptional teams, and connecting bold ideas to execution.\n' ;;
    supervisor:notable_results) printf 'Led multiple top-tier research programs to landmark publications | Mentored researchers into premier fellowships and faculty positions | Built a research platform adopted across academia and industry\n' ;;
    student:persona_preset) printf 'student-systems-prodigy\n' ;;
    student:mbti) printf 'ENTP\n' ;;
    student:lens) printf 'Pushes on hidden bottlenecks and reframes problems into sharper, more scalable systems questions.\n' ;;
    student:background) printf 'A fellowship-caliber doctoral researcher who combines deep technical range with unusually strong execution and research taste.\n' ;;
    student:notable_results) printf 'First-author paper at a top venue | Built a reusable research system adopted by multiple teams | Set a strong benchmark on a competitive problem\n' ;;
    research-staff:persona_preset) printf 'research-staff-rigorous-mentor\n' ;;
    research-staff:mbti) printf 'INTJ\n' ;;
    research-staff:lens) printf 'Applies tough but constructive scientific judgment during meetings.\n' ;;
    research-staff:background) printf 'A senior postdoc with a record of turning half-formed student ideas into publication-ready research through disciplined critique.\n' ;;
    research-staff:notable_results) printf 'Co-led multiple top-tier papers | Mentored students into strong first-author publications\n' ;;
    paper-reviewer:persona_preset) printf 'paper-reviewer-methods-hawk\n' ;;
    paper-reviewer:mbti) printf 'INTJ\n' ;;
    paper-reviewer:lens) printf 'Interrogates every claim through methodology, evidence quality, and failure modes before granting confidence.\n' ;;
    paper-reviewer:background) printf 'A top-tier evaluator with sharp methodological instincts, broad literature command, and the confidence to challenge fashionable but weak claims.\n' ;;
    paper-reviewer:notable_results) printf 'Outstanding reviewer awards at major venues | Influential critiques that improved prominent papers | Recognized authority on rigorous evaluation design\n' ;;
    *) return 1 ;;
  esac
}

sanitize_yaml_scalar() {
  local value="$1" label="${2:-Value}"
  if [[ "$value" == *$'\n'* ]]; then
    err "${label} cannot contain newlines"
  fi
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  printf '%s' "$value"
}

normalize_mbti() {
  local value="$1"
  value=$(printf '%s' "$value" | tr '[:lower:]' '[:upper:]')
  if [[ ! "$value" =~ ^[EI][SN][TF][JP]$ ]]; then
    err "Invalid MBTI '${1}'. Expected a 4-letter type like ENTP or ISTJ."
  fi
  printf '%s\n' "$value"
}

first_delimited_segment() {
  local value="$1"
  IFS='|' read -r value _ <<< "$value"
  printf '%s\n' "$value" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//'
}

compact_text() {
  local text="$1" max_len="${2:-80}"
  text=$(printf '%s' "$text" | tr '\n' ' ' | sed 's/[[:space:]]\+/ /g; s/^ //; s/ $//')
  if [[ ${#text} -le $max_len ]]; then
    printf '%s\n' "$text"
  else
    printf '%s...\n' "${text:0:$((max_len - 3))}"
  fi
}
