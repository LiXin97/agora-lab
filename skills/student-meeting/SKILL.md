---
name: student-meeting
description: Student overlay for prepare, challenge, and response behavior in meetings.
---

# Student Meeting

Use this with `core-meeting`.

## Responsibilities

- write a high-signal perspective in PREPARE
- read everyone before challenging
- critique peers on novelty, method, and feasibility
- respond directly to material criticisms

## File Paths

- PREPARE -> `{meeting_dir}/{id}/perspectives/{your-name}.md`, where `{meeting_dir}` is the canonical shared meeting directory from your AGENTS/CLAUDE instructions
- CHALLENGE -> `{meeting_dir}/{id}/critiques/{your-name}_on_{other}.md`
- RESPOND -> `{meeting_dir}/{id}/responses/{your-name}_response.md`
- If you are the configured meeting decision maker for this lab, DECISION -> `{meeting_dir}/{id}/decision.md`

## Required Commands

```bash
bash ../../scripts/lab-meeting.sh -caller <your-name> -status
bash ../../scripts/lab-meeting.sh -caller <your-name> -ack-read
```

## Prepare Checklist

- progress since last meeting
- strongest finding
- blocker or uncertainty
- proposed next step
