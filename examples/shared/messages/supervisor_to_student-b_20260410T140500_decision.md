---
from: supervisor
to: student-b
type: decision
timestamp: 2026-04-10T14:05:00Z
status: read
---

# Research Direction Assignment

You are assigned to explore **sparse attention and local-global hybrid patterns** for long-context LLMs.

## Scope

Focus on attention patterns that reduce cost by restricting which token pairs attend:
- Longformer (sliding window + global tokens)
- BigBird (local + global + random)
- LongNet (dilated attention)
- Learnable sparsity and routing-based approaches

## Deliverables

1. Literature survey in `shared/artifacts/student-b/literature_sparse_attention.md`
2. Taxonomy of sparse attention families with tradeoffs
3. Identified research gaps and proposed experiments

## Timeline

Complete the initial survey before the first group meeting.
