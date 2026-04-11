# paper-reviewer-1 — Review for P001 / R1

## Summary

The draft is promising and the narrative is coherent, but it is not yet submission-ready. The core empirical story depends on a shared evaluation harness, yet several fairness and evidence issues still weaken the causal claims.

## Strengths

1. Clear framing of the linear-vs-sparse comparison problem.
2. Good separation between research-loop judgments and paper-review evidence.
3. Useful claim structure around retrieval, perplexity, and efficiency trade-offs.

## Weaknesses

1. The strongest claim about "closing the retrieval gap" is supported by too few ablations.
2. Baseline tuning fairness is under-documented for the sparse-attention models.
3. The discussion of negative results is too shallow; it reads as selective emphasis rather than balanced evidence.

## Required Changes

1. Add at least one controlled ablation isolating routing/local-window effects from parameter count.
2. Document identical training budget and tuning budget across the compared families.
3. Tighten the main claims so they match the evidence actually shown in the current tables.

## Verdict

Major revision before submission.
