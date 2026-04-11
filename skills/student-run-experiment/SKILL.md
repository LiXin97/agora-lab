---
name: student-run-experiment
description: Execute experiments reproducibly and publish usable results instead of private logs.
---

# Student Run Experiment

## Student-specific extensions

- Record artifact destinations before the run starts.
- Separate observations from interpretation in the results write-up.
- Summarize failures, not just wins.
- Update the Research task board task with the real artifact list after publishing results.

## Purpose

Execute an experiment according to a published experiment plan, ensuring reproducibility and proper logging.

## Workflow

1. **Read plan**: Load the experiment plan from your canonical shared artifact directory: `{artifact_dir}/{student}/experiment_plan_{id}.md`
2. **Set up environment**: Install dependencies, configure GPU, set seeds
3. **Implement**: Write code in `workspace/`
4. **Execute**: Run training/evaluation with full logging
5. **Collect results**: Gather metrics, generate figures
6. **Publish**: Write results to your canonical shared artifact directory: `{artifact_dir}/{your-name}/experiment_results_{id}.md`
7. **Export reviewable evidence**: Copy logs, figures, and any code/config snapshot needed for review into `{artifact_dir}/{your-name}/support/{id}/`
8. **Update the Research task board**: `bash ../../scripts/lab-kanban.sh -caller <your-name> -submit -id <ID> -artifacts "..."`

## Reproducibility Checklist

Before running, verify:
- [ ] Random seeds are fixed (Python, NumPy, PyTorch/TF)
- [ ] Dependencies are locked (`requirements.txt` or `environment.yml`)
- [ ] Hyperparameters are logged (config file or command-line args)
- [ ] Data loading is deterministic
- [ ] Git hash of code is recorded
- [ ] GPU/hardware info is logged

## Results Format

```markdown
# Experiment Results: {title}

## Setup
- **Plan**: {artifact_dir}/{student}/experiment_plan_{id}.md
- **Code snapshot**: {artifact_dir}/{your-name}/support/{id}/code/
- **Environment**: Python X.Y, PyTorch X.Y, CUDA X.Y
- **Hardware**: GPU type, count
- **Seeds**: [42, 123, 456]
- **Git hash**: ...

## Results

### Main Results
| Method | Metric1 | Metric2 | Metric3 |
|---|---|---|---|

### Ablation Results
| Variant | Metric1 | Metric2 |
|---|---|---|

## Analysis
Key observations and interpretation.

## Figures
- `figures/main_comparison.png`
- `figures/ablation.png`

## Logs
- `{artifact_dir}/{your-name}/support/{id}/run_001.log`

## Issues
Any problems encountered during execution.
```

## Error Handling

- If an experiment fails, log the error and notify the requesting student via the canonical shared message directory from your AGENTS/CLAUDE instructions
- Partial results are valuable — publish what you have with clear notes on what's missing
- If resource limits are hit, report to supervisor with a message of type `question`
