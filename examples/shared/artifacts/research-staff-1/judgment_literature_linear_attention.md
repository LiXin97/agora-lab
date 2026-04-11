---
research_staff: research-staff-1
artifact: shared/artifacts/student-a/literature_linear_attention.md
timestamp: 2026-04-10T16:30:00Z
---

## Summary

A solid first-pass survey of linear attention variants that covers the major models but has notable gaps in recent literature and lacks sufficient depth for grounding experiments.

## Scores (1-10)
- **Novelty**: 4 -- Survey, not novel research; value depends on completeness
- **Rigor**: 6 -- Claims are mostly supported but some need citations; comparison table has gaps
- **Clarity**: 7 -- Well-structured, easy to follow
- **Significance**: 5 -- Useful for internal direction-setting; not publication-ready
- **Reproducibility**: 5 -- Comparison table numbers need source citations
- **Overall**: 5

## Strengths
1. Clean structure with consistent per-paper format
2. Comparison table is a good start for grounding discussions
3. Identified gaps are relevant and actionable

## Weaknesses
1. Missing important 2024 work: Based (Arora et al., 2024), GLA (Yang et al., 2024), DeltaNet
2. Comparison table numbers lack citations -- where do perplexity and NIAH numbers come from?
3. Griffin coverage is thin; the local attention design choices are the most interesting part
4. No discussion of training data or tokenizer differences across reported results
5. "Proposed next step" lacks specifics: which NIAH variant? what baseline hyperparameters?

## Questions for Authors
1. Are the comparison table numbers from the original papers or reproduced? If original, they are not comparable across different training setups.
2. Why exclude Based and GLA, which are specifically designed to bridge linear attention and softmax attention?
3. What is the proposed compute budget and how was it chosen?

## Suggestions
1. Add Based, GLA, and DeltaNet to complete the 2024 landscape
2. Cite all numbers in the comparison table or mark as "reported (not reproduced)"
3. Expand Griffin analysis -- the local attention window design space is the most promising gap
4. Define the benchmark protocol precisely: model sizes, training data, evaluation tasks, metrics, compute budget

## Judgment
REVISE BEFORE EXPERIMENT DESIGN
