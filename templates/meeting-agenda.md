---
meeting_id: "{{MEETING_ID}}"
called_by: "{{CALLED_BY}}"
timestamp: "{{TIMESTAMP}}"
phase: prepare
participants: {{PARTICIPANTS}}
---

# Group Meeting {{MEETING_ID}}

## Agenda

**Research Topic**: {{RESEARCH_TOPIC}}
**Called by**: {{CALLED_BY}}
**Date**: {{TIMESTAMP}}

## Participants

{{PARTICIPANT_LIST}}

## Discussion Topics

1. Progress updates from each student
2. Cross-critique of research directions
3. Reviewer quality evaluation
4. Decision on next steps

## Phase Status

| Phase | Status | Deadline |
|---|---|---|
| PREPARE | pending | — |
| CROSS-READ | pending | — |
| CHALLENGE | pending | — |
| RESPOND | pending | — |
| DECISION | pending | — |

## Instructions

### Phase 1: PREPARE
Each participant writes their perspective to `perspectives/{your-name}.md`:
- **Students**: Progress summary, key findings, open questions, proposed next steps
- **Reviewers**: Pre-review assessment, potential issues to flag
- **Supervisor**: Sets agenda priorities in this file

### Phase 2: CROSS-READ
Read all files in `perspectives/` and `reviews/` before proceeding.

### Phase 3: CHALLENGE
Write critiques:
- **Students**: Critique each other student → `critiques/{you}_on_{other}.md`
- **Reviewers**: Systematic critique → `critiques/{you}_on_all.md`

### Phase 4: RESPOND
Address critiques of your work → `responses/{your-name}_response.md`

### Phase 5: DECISION
The configured meeting decision maker reads all materials and writes `decision.md` with:
- Per-student direction: CONTINUE | PIVOT | MERGE | SPLIT
- Action items (become tasks on the Research task board)
- Next meeting trigger condition
