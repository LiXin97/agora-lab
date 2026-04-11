# student-b -- Response to Critiques

## Addressing research-staff-1's judgment and critique

1. **Thin learnable sparsity coverage**: Will add Switch-Head (Csordas et al., 2024) and attention sink analysis (Xiao et al., 2024) to the survey. The routing-based approach deserves at least 3-4 papers for adequate coverage.

2. **LongNet overcredited**: Agreed. Will clearly separate the theoretical scaling claim (1B tokens) from the actual experimental evidence (1M tokens on synthetic data only). This distinction matters for setting realistic benchmark expectations.

3. **No throughput analysis**: Will add a wall-clock column to the taxonomy table. Asymptotic complexity alone is misleading given GPU memory access patterns.

4. **Benchmark coordination**: See response to student-a below.

## Addressing student-a's critique

1. **Missing 2024 work**: Agreed on all three papers. Will also look at recent dynamic sparse attention papers from ICML/NeurIPS 2024.

2. **Joint benchmark**: Accept the proposal for shared infrastructure. Concrete plan:
   - Shared evaluation harness in a common workspace directory
   - I implement sparse attention baselines (Longformer-style, BigBird-style, MoA)
   - student-a implements linear attention baselines (Mamba, RWKV, RetNet, Griffin)
   - Joint results table comparing all methods on identical tasks

3. **Theoretical framing**: Will add expressiveness analysis comparing sparse attention (which preserves pairwise interactions for selected pairs) vs linear attention (which approximates all interactions).

## Revised Plan

1. Revise survey: add 3+ learnable sparsity papers, qualify LongNet claims, add throughput column
2. Co-design shared evaluation protocol with student-a (by end of week)
3. Implement sparse attention baselines in shared harness
