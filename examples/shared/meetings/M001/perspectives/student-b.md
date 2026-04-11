# student-b -- Meeting M001 Perspective

## Progress Summary

Completed literature survey of sparse attention patterns covering Longformer, BigBird, LongNet, and learnable routing approaches. Created a taxonomy of sparse attention families.

## Key Findings

- Fixed-pattern sparse attention (Longformer, BigBird) works well for classification/QA but is underexplored for generation
- Learnable sparsity via routing is promising but training is unstable
- No cross-family comparison exists between sparse attention and linear attention

## Open Questions

1. Should we compare sparse attention against linear attention directly, or treat them as separate research directions?
2. How do we define "generation quality" for sparse attention -- perplexity alone, or also human evaluation?
3. Are 64K-256K contexts realistic for sparse attention benchmarks given current hardware?

## Proposed Next Steps

Benchmark sparse patterns (Longformer-style, BigBird-style, routed) against linear attention baselines on needle-in-a-haystack, PG-19 perplexity, and SCROLLS at 64K-256K context.
