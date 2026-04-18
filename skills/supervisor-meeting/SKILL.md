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

## Phase Advancement Rule (IMPORTANT)

You own phase advancement. Do not wait for anyone to ask. Advance the moment the current phase's artifact set is complete:

- **PREPARE done** when every participant has a file in `perspectives/`. Then advance to CROSS-READ.
- **CROSS-READ done** when every participant has ack-read (or you've waited a reasonable window after posting ack reminders). Then advance to CHALLENGE.
- **CHALLENGE done** when every participant who intends to critique has filed in `critiques/`. You do not need a critique from every participant on every other participant — a quorum of non-trivial critiques (typically ≥ N-1 files) is enough. Then advance to RESPOND.
- **RESPOND done** when each critiqued participant has either filed a `responses/*_response.md` or explicitly declined via message. Then advance to DECISION.
- **DECISION**: you write `decision.md` and `-complete` the meeting.

Judgments (`judgments/`) are written by staff and you *throughout* the meeting; they are not a phase-gate. Do not hold a phase waiting for peer judgments.

If you find yourself thinking "I'm waiting for X before I advance," check whether X is actually a phase-gate above. If not, advance now.

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
