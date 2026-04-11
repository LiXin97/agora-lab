---
name: core-meeting
description: Shared group-meeting protocol covering phases, artifact locations, and readiness rules.
---

# Core Meeting

Meetings follow the lab's 5-phase protocol:

1. PREPARE
2. CROSS-READ
3. CHALLENGE
4. RESPOND
5. DECISION

## Status Command

```bash
bash ../../scripts/lab-meeting.sh -caller <your-name> -status
```

## Shared Rules

- always check the canonical shared meeting directory from your AGENTS/CLAUDE instructions and `bash ../../scripts/lab-meeting.sh -caller <name> -status`
- write phase outputs to the exact phase directory
- do not skip the cross-read acknowledgement
- treat meeting artifacts as evidence, not chat logs

## Phase Artifact Map

- PREPARE -> `{meeting_dir}/{meeting_id}/perspectives/{your-name}.md` or `{meeting_dir}/{meeting_id}/reviews/{your-name}.md`, where `{meeting_dir}` is the canonical shared meeting directory from your AGENTS/CLAUDE instructions
- CROSS-READ -> no new artifact, but requires `-ack-read`
- CHALLENGE -> `{meeting_dir}/{meeting_id}/critiques/{your-name}_on_{target}.md` or `{meeting_dir}/{meeting_id}/critiques/{your-name}_on_all.md`
- RESPOND -> `{meeting_dir}/{meeting_id}/responses/{your-name}_response.md`
- DECISION -> `{meeting_dir}/{meeting_id}/decision.md`

## Shared Formats

### Critique

```markdown
## Critique of {agent-name}'s work

### Strengths
1. ...

### Weaknesses
1. ...

### Questions
1. ...

### Suggestions
1. ...
```

### Response

```markdown
## Response to critiques

### Re: {critic-name}'s critique
- Point 1: [response]

### Revisions planned
1. ...
```
