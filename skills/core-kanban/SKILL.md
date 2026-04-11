---
name: core-kanban
description: Shared Research task board protocol for task state, review gates, artifact linkage, and escalation.
---

# Core Research Task Board

Use `bash ../../scripts/lab-kanban.sh` for all Research task board movement. Do not edit the Research task board file directly; use the canonical kanban path from your AGENTS/CLAUDE instructions.

## Required State Discipline

1. Read the task before starting.
2. Move `Backlog -> In Progress` only when you are actively working on it.
3. Publish artifact paths when submitting for review.
4. Do not treat `Done` as "I think it is fine." Treat it as "reviewed and accepted."

## Required Inputs For Every Submission

- task ID
- artifact paths
- short summary of what changed
- any remaining risk or uncertainty

## Escalate Instead Of Guessing

If the task definition is underspecified, use `core-handoff` to ask for clarification before inventing your own goal.
