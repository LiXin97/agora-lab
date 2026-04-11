---
meeting_id: "M001"
decision_by: supervisor
timestamp: 2026-04-10T18:00:00Z
---

# Meeting M001 -- Decision

## Summary

Both students have laid solid initial groundwork, but the surveys need significant revision before we can design credible experiments. The research-staff judgment correctly identified three critical gaps: incomplete 2024-2025 coverage, unverifiable comparison numbers, and overlapping benchmarks with no coordination. Both students have accepted the critiques constructively and proposed concrete revisions.

## Per-Student Directions

### student-a: CONTINUE with modifications
- **Action 1**: Revise literature survey to include Based, GLA, DeltaNet, and expand Griffin analysis
- **Action 2**: Cite all comparison table numbers or clearly mark as "reported, not reproduced"
- **Action 3**: Add theoretical framing (kernel methods connection, expressiveness bounds)
- **Action 4**: Co-design shared evaluation protocol with student-b
- **Deadline**: Before next group meeting

### student-b: CONTINUE with modifications
- **Action 1**: Extend sparse attention survey with 3+ learnable sparsity papers (Switch-Head, attention sinks)
- **Action 2**: Qualify LongNet scaling claims (theoretical vs empirical)
- **Action 3**: Add throughput column to taxonomy table
- **Action 4**: Co-design shared evaluation protocol with student-a
- **Deadline**: Before next group meeting

## Shared Actions

- **MERGE evaluation infrastructure**: Both students will co-design a single evaluation harness with:
  - Agreed tasks: needle-in-a-haystack (single/multi-needle), PG-19 perplexity, SCROLLS subset
  - Context lengths: 32K, 64K, 128K
  - Model size: 1.4B primary, 7B stretch
  - Compute budget: 8xA100, 48hr total
  - Baselines: Transformer with RoPE + FlashAttention-2
  - student-a implements linear attention models; student-b implements sparse attention models

- I will create new task board entries for the revised surveys, the joint evaluation protocol, and the baseline implementations.

## Quality Assessment

The adversarial process worked as intended. The research-staff critique surfaced real gaps (missing papers, unverifiable numbers, no coordination) and both students' cross-critiques identified the benchmark overlap that neither had addressed. The responses show genuine engagement rather than defensive minimization.

## Next Meeting Trigger

When both revised surveys AND the joint evaluation protocol document are submitted for review on the task board.
