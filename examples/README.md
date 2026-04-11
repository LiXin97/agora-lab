# Example Research Session

This directory contains a hand-written example of what Agora Lab produces during a research cycle. The snapshot reflects the **current** workflow split:

- **research-staff** participates in regular meetings as an internal judge
- **paper-reviewer** appears only in the separate paper-review loop

**Research topic**: Efficient attention mechanisms for long-context LLMs

## What's Inside

```text
examples/
├── lab.yaml                                          # Lab config (2 students, 1 research staff, 1 paper reviewer)
└── shared/
    ├── KANBAN.md                                     # Task board mid-session
    ├── artifacts/
    │   ├── student-a/
    │   │   └── literature_linear_attention.md
    │   ├── student-b/
    │   │   └── literature_sparse_attention.md
    │   └── research-staff-1/
    │       └── judgment_literature_linear_attention.md
    ├── messages/
    │   ├── supervisor_to_student-a_..._decision.md
    │   └── supervisor_to_student-b_..._decision.md
    ├── meetings/
    │   └── M001/
    │       ├── agenda.md
    │       ├── perspectives/
    │       │   ├── student-a.md
    │       │   └── student-b.md
    │       ├── judgments/
    │       │   └── research-staff-1.md
    │       ├── critiques/
    │       │   ├── student-a_on_student-b.md
    │       │   ├── student-b_on_student-a.md
    │       │   └── research-staff-1_on_all.md
    │       ├── responses/
    │       │   ├── student-a_response.md
    │       │   └── student-b_response.md
    │       └── decision.md
    └── paper-reviews/
        └── P001/
            ├── meta.yaml
            ├── packet.md
            └── rounds/R1/
                ├── packet.md
                ├── reviews/
                │   └── paper-reviewer-1.md
                └── supervisor-resolution.md
```

## How to Read This

Start with `lab.yaml` to see the configured roles, then follow this path:

1. `shared/messages/` — supervisor assigns directions to students
2. `shared/artifacts/student-*/` — students produce the first-pass literature surveys
3. `shared/artifacts/research-staff-1/` — research staff writes a structured internal judgment
4. `shared/meetings/M001/` — regular 5-phase research meeting with judgments, critiques, responses, and the supervisor decision
5. `shared/paper-reviews/P001/` — separate paper-review case showing how paper reviewers engage only after the work is paper-ready

This example keeps the regular meeting loop and the paper-review loop separate on purpose; paper reviewers do **not** appear in `shared/meetings/M001/`.

For the full walkthrough, see the [tutorial](../docs/tutorial.md).
