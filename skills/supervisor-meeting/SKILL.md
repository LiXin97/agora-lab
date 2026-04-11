---
name: supervisor-meeting
description: Supervisor overlay for calling, steering, and closing meetings.
---

# Supervisor Meeting

Use this with `core-meeting`.

## Responsibilities

- create the meeting
- keep discussion focused on decision-relevant evidence
- advance phases only when the current one is truly ready
- write `decision.md`
- convert decisions into concrete next tasks
- set agenda framing in `agenda.md`

## Required Commands

```bash
bash ../../scripts/lab-meeting.sh -caller <your-name> -new
bash ../../scripts/lab-meeting.sh -caller <your-name> -phase <phase-name>
bash ../../scripts/lab-meeting.sh -caller <your-name> -auto
bash ../../scripts/lab-meeting.sh -caller <your-name> -auto-advance [-timeout 1800] [-interval 30]
bash ../../scripts/lab-meeting.sh -caller <your-name> -check-ready
bash ../../scripts/lab-meeting.sh -caller <your-name> -ack-read
bash ../../scripts/lab-meeting.sh -caller <your-name> -complete
```

## Decision Output

Write `{meeting_dir}/{meeting_id}/decision.md` with the canonical shared meeting directory from your AGENTS/CLAUDE instructions:

- per-student direction: `CONTINUE | PIVOT | MERGE | SPLIT`
- concrete next tasks
- next meeting trigger
