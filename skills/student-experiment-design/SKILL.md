---
name: student-experiment-design
description: Design experiments with variables, baselines, ablations, resources, and success criteria.
---

# Student Experiment Design

## Student-specific extensions

- Add the exact artifact path where the plan will be published.
- Add `Reviewer-facing risks` after `## Risks`.
- The plan is incomplete if it cannot tell a reviewer what outcome would falsify the idea.

## Purpose

Translate a research hypothesis into a concrete, executable experiment plan.

## Workflow

1. **State hypothesis**: What specific claim are you testing?
2. **Define variables**: Independent (what you change), dependent (what you measure), controlled (what stays fixed)
3. **Choose baselines**: What are you comparing against?
4. **Design protocol**: Steps to execute, datasets, evaluation metrics
5. **Resource estimation**: Compute, time, data requirements
6. **Publish**: Write to your canonical shared artifact directory: `{artifact_dir}/{your-name}/experiment_plan_{id}.md`

## Output Format

```markdown
# Experiment Plan: {title}

## Hypothesis
{Specific, testable claim}

## Variables
- **Independent**: What we vary (e.g., attention mechanism type)
- **Dependent**: What we measure (e.g., perplexity, latency)
- **Controlled**: What stays fixed (e.g., model size, dataset, training steps)

## Baselines
1. {Baseline method} — why it's relevant
2. ...

## Datasets
| Dataset | Size | Purpose | Source |
|---|---|---|---|

## Metrics
| Metric | Purpose | Expected Direction |
|---|---|---|

## Protocol
1. Step-by-step execution plan
2. ...

## Ablations
What variations to test:
1. ...

## Resource Estimate
- GPU hours: ...
- Storage: ...
- Expected runtime: ...

## Success Criteria
What results would support/refute the hypothesis.

## Risks
What could go wrong and mitigation strategies.

## Reviewer-facing risks
The objections a reviewer is most likely to raise and how the plan addresses them.
```

## Rules

- Every experiment must have at least one baseline comparison
- Always include ablation studies to isolate the contribution
- Fix random seeds and log all hyperparameters
- Plan for at least 3 runs with different seeds for statistical significance
