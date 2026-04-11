# research-staff-1 -- Systematic Critique

## student-a: Linear Attention Survey

### Scores (1-10)
- **Completeness**: 5 -- Missing Based, GLA, DeltaNet; comparison table has unverified numbers
- **Rigor**: 6 -- Claims generally supported but citations needed for quantitative claims
- **Clarity**: 7 -- Well-structured, consistent format per paper
- **Actionability**: 5 -- Benchmark proposal too vague to execute (no model sizes, no hyperparameters, no baselines)

### Key Issues
1. Survey omits 2024-2025 linear attention work that directly addresses identified gaps
2. Comparison table numbers lack source citations -- cannot verify or compare
3. Griffin analysis is thin; the local attention design choices are the most interesting research angle
4. "Identified gaps" are valid but generic; need quantitative hypotheses

### Verdict: REVISE -- good skeleton, needs depth and rigor

---

## student-b: Sparse Attention Survey

### Scores (1-10)
- **Completeness**: 5 -- Good on classics, thin on 2024-2025 developments
- **Rigor**: 6 -- LongNet 1B-token claim presented without sufficient qualification
- **Clarity**: 7 -- Clean structure with useful taxonomy table
- **Actionability**: 5 -- Benchmark proposal overlaps with student-a without coordination

### Key Issues
1. Learnable sparsity section covers only one paper -- needs at least 2-3 more
2. LongNet section overcredits theoretical scaling without noting limited empirical evidence
3. No throughput or memory analysis -- asymptotic complexity alone is insufficient
4. No coordination with student-a on overlapping benchmark proposals

### Verdict: REVISE -- extend coverage and coordinate on shared evaluation

---

## Cross-Cutting Recommendations

1. Both students must agree on a shared evaluation protocol before designing experiments separately
2. Define explicit compute budget and model sizes
3. Add cited comparison tables in both surveys
4. Address the overlap: linear vs sparse attention should be compared head-to-head, not in isolation
