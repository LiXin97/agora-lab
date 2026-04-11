# student-a critique of student-b

## Concerns

1. **Missing modern work**: The survey covers 2020-2023 literature well but omits the 2024 wave of learnable sparse attention. Only one routing-based paper (MoA) is covered. Switch-Head, attention sinks, and dynamic sparse patterns are absent.

2. **Benchmarking overlap**: Your proposed evaluation (sparse vs linear on retrieval) substantially overlaps with my proposed benchmark. We should coordinate on a shared protocol rather than running parallel experiments with overlapping compute costs.

3. **No wall-clock analysis**: The survey lists asymptotic complexities but does not analyze practical throughput. O(n log n) vs O(n) is less meaningful than actual tokens-per-second on real hardware -- especially given that sparse attention patterns often have poor memory access patterns.

4. **LongNet overcredited**: The 1B-token scaling claim is presented as a strength without qualification. The actual experiments only go to 1M tokens on synthetic data. This needs clarification to avoid building on a misleading premise.

## Suggested Improvements

- Add 2024-2025 learnable sparsity papers (at least 2-3 more)
- Propose a joint benchmark protocol so we share infrastructure and avoid wasted compute
- Include throughput measurements alongside asymptotic complexity
- Clearly separate theoretical claims from empirical evidence
