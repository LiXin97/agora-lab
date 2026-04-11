---
name: core-handoff
description: Shared handoff protocol for cross-agent requests, artifact transfer, blockers, and escalation.
---

# Core Handoff

Every cross-agent request should include:

1. the artifact or file path
2. the exact request
3. the success condition
4. the blocking question, if any
5. the downstream dependency, if any

## Message Pattern

Use the canonical shared message directory from your AGENTS/CLAUDE instructions when one agent needs another to:

- review an artifact
- unblock a decision
- inspect a result
- take over a next step

Name the file `{from}_to_{recipient}_{timestamp}_{type}.md` and include frontmatter with:

```yaml
---
from: <sender>
to: <recipient|all>
type: <instruction|question|review|notification>
timestamp: <ISO 8601>
status: unread
---
```

Keep the request narrow enough that the receiver can act without re-deriving the objective.
