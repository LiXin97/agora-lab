# student-a -- Meeting M001 Perspective

## Progress Summary

Completed initial literature survey of linear attention variants covering Mamba, RWKV, RetNet, and Griffin/Hawk. Produced a comparison table and identified three key research gaps.

## Key Findings

- Mamba achieves the best perplexity-to-cost ratio but has significant retrieval blind spots at 128K+ context
- Griffin's hybrid approach (linear recurrence + local attention) outperforms pure linear models on downstream tasks
- No existing work provides a controlled head-to-head comparison on identical training data and tasks

## Open Questions

1. Should we include hybrid architectures (partial softmax + linear) like Griffin in the benchmark, or focus purely on linear-only models?
2. What is the right set of retrieval tasks -- needle-in-a-haystack alone, or also multi-hop reasoning?
3. How do we handle the training data mismatch across published results?

## Proposed Next Steps

Design a controlled benchmark: Mamba vs RWKV-6 vs RetNet vs Griffin on 32K/64K/128K context tasks measuring both perplexity (PG-19) and retrieval accuracy (NIAH, SCROLLS).
