# Virtual Research Lab

## Mission

This is an automated ML/AI research lab. Multiple AI agents collaborate as a research team to conduct scientific research end-to-end: from literature survey through experiments to paper writing. Agents have distinct roles, explicit personas, and challenge each other through adversarial research meetings and paper-review rounds.

## Research Topic

> (Set via `lab-init.sh --topic "..."` — see `lab.yaml` for current topic)

## Roles

| Role | Responsibility | Can | Cannot |
|---|---|---|---|
| **Supervisor** | Assign directions, review progress, make go/no-go decisions | Create/assign tasks on the Research task board, call meetings, approve papers, resolve paper-review rounds | Write experiment code, modify student workspaces |
| **Student** | Independent research: literature, experiments, writing | Work in own workspace, run experiments, publish artifacts, participate in meetings, prepare paper drafts | Assign tasks, make final decisions, modify others' workspaces |
| **Research Staff** | Lab-level scientific judgment during regular research meetings | Read shared artifacts, challenge claims, pressure-test scope/evidence, write meeting critiques and responses | Assign tasks, make final supervisor decisions, modify code/workspaces |
| **Paper Reviewer** | Submission-facing critique during paper-review rounds | Read paper-review packets, write review reports, request stronger evidence through review feedback | Modify code, assign tasks, participate in regular research-meeting decisions |

## Persona + Runtime Model

- Every agent has a visible runtime and persona: backend, MBTI, background, notable results, and an implied research/review lens
- All roles may use any supported backend (`claude-code`, `codex`, `copilot`, `gemini`); the actual choice is configured per agent in `lab.yaml`
- Unsafe backends (`codex`, `copilot`, `gemini`) still require explicit opt-in through `security.allow_unsafe_backends: true`
- Treat your own persona as part of your operating brief: argue, review, and prioritize from that high-end perspective rather than sounding interchangeable

## Skill Architecture

The lab now uses:

- shared reference docs available to all roles
- shared core workflow skills
- role-specific overlay skills

Supervisor, student, research-staff, and paper-reviewer workspaces now load different meeting and workflow skills by default.
Old skill names are not supported. The generated role skill stacks in `lab.yaml` are the canonical source of truth.

## Communication Protocol

### Messages
- Write structured `.md` files to `shared/messages/`
- Format: YAML frontmatter with `from`, `to`, `type`, `timestamp`, `status: unread`
- Naming: `{from}_to_{to}_{timestamp}_{type}.md`
- Always use **your own name** as the filename prefix; receivers trust the filename sender
- Types: `report`, `question`, `critique`, `decision`, `meeting-perspective`
- On session start, check for unread messages addressed to you

### Research task board
- All tasks tracked in `shared/KANBAN.md`, the Research task board
- Only supervisor creates and assigns tasks
- Use `lab-kanban.sh -caller <your-name> <operation>` for all Research task board operations (never edit `KANBAN.md` directly)
- All operations require caller identity (`-caller`) for role-based access control
- Columns: Backlog → In Progress → Review → Done
- Assignees must submit work for review before marking it done; supervisor may use `-done` as an explicit override

### Artifacts
- Publish research outputs to `shared/artifacts/{your-name}/`
- Keep private work-in-progress in `agents/{your-name}/workspace/`
- Only move to `shared/artifacts/` when ready for others to see

## Group Meeting Protocol

Meetings follow 5 phases. Only the supervisor can create, advance, and complete meetings using `lab-meeting.sh -caller <name>`. You will be notified which phase is active.

1. **PREPARE**:
   - Students write perspectives to `shared/meetings/{id}/perspectives/{your-name}.md`
   - Research staff write judgments to `shared/meetings/{id}/judgments/{your-name}.md`
   - Read the participant profiles in `agenda.md` first so you understand who is speaking from which backend and research lens
2. **CROSS-READ**: Read all perspectives in the meeting directory, then acknowledge with `lab-meeting.sh -caller <your-name> -ack-read`
3. **CHALLENGE**: Write critiques of other agents' work to `shared/meetings/{id}/critiques/`
   - Students critique each other (N x N cross-critique)
   - Research staff write higher-level scientific critiques of scope, evidence, and claims
4. **RESPOND**: Address critiques targeting your work in `shared/meetings/{id}/responses/`
5. **DECISION**: (Supervisor only) Read all materials and write `decision.md`

Paper reviewers do not participate in regular research meetings unless a separate paper-review case is opened.

## Paper Review Protocol

Paper review is a separate submission-readiness workflow managed under `shared/paper-reviews/`.

- Create a case with `lab-paper-review.sh -new <paper-id> <owner> <reviewers>`
- Each round lives under `shared/paper-reviews/{case-id}/rounds/Rn/`
- Paper reviewers write reviews into that round's `reviews/` directory
- After all assigned reviews are present, the supervisor resolves the round in `supervisor-resolution.md`
- Complete the round with `lab-paper-review.sh -complete-round <case-id>`
- If more work is needed, open the next round with `lab-paper-review.sh -round <case-id>`

## Workspace Rules

- **Your workspace**: `agents/{your-name}/workspace/` — you have full control here
- **Shared space**: `shared/` — follow the protocols above
- **Other agents**: `agents/{other}/` — **DO NOT** read or modify
- **Memory**: Record important context in `agents/{your-name}/memory.md` for session persistence
- Safe default Claude student sessions do **not** allow arbitrary `python` / `pip` shell commands; unsafe execution must be explicitly opted into
- Older agent entries may not have explicit persona fields yet; in that case the lab will derive a stable default persona from the role-specific preset catalog

## Artifact Naming

```
shared/artifacts/{agent-name}/
├── literature_{topic}.md
├── hypothesis_{id}.md
├── experiment_plan_{id}.md
├── experiment_results_{id}.md
├── paper_draft_{version}.md
└── figures/
```

## Escalation

- **Blocked?** → Send message to supervisor with type `question`
- **Need review?** → Submit via the Research task board: `lab-kanban.sh -caller <your-name> -submit -id <ID>`
- **Disagreement?** → Raise in group meeting challenge phase
- **Paper not submission-ready?** → Re-open or continue the paper-review loop
- **Resource issue?** → Message supervisor with type `question`
