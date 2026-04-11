---
name: student-analyze-results
description: Convert metrics into supported claims, anomalies, and next-step decisions.
---

# Student Analyze Results

## Purpose

Turn raw metrics into honest claims and a credible next experiment.

## Workflow

1. Read the experiment plan and the result artifact together.
2. Compare against the intended baselines and ablations.
3. Separate fair comparisons from noisy or compromised ones.
4. Identify stable gains, fragile gains, and outright failures.
5. Publish to your canonical shared artifact directory: `{artifact_dir}/{your-name}/analysis_{experiment_id}.md`

## Output Format

```markdown
# Result Analysis: {title}

## Inputs
- **Plan**: ...
- **Results**: ...

## Headline Findings
1. ...

## Comparison Table
| Comparison | Fair? | Outcome | Notes |
|---|---|---|---|

## Supported Claims
1. ...

## Unsupported but tempting claims
1. ...

## Anomalies and Failure Modes
1. ...

## Recommended Next Experiment
1. ...
```

## Rules

- Every claim must point back to a concrete result artifact.
- If the baseline comparison is unfair or noisy, say so explicitly.
- Always include one section called `Unsupported but tempting claims`.
