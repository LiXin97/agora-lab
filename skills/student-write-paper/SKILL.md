---
name: student-write-paper
description: Draft paper sections that stay aligned with the actual evidence and do not overclaim.
---

# Student Write Paper

## Student-specific extensions

Write around a claim-evidence structure:

- claim
- evidence
- limitation
- next question

Every draft should contain:

- contribution bullets
- explicit limitations
- no result statement without a matching artifact or citation

Do not write a stronger story than the experiments can defend.

## Purpose

Draft paper sections for eventual publication, following standard ML/AI conference format.

## Paper Structure

```
{artifact_dir}/{your-name}/
├── paper_draft_v1.md
├── paper_draft_v2.md    (revised after review)
└── figures/
    ├── main_results.png
    └── architecture.png
```

## Standard Sections

### 1. Abstract
- Problem statement (1-2 sentences)
- Approach (1-2 sentences)
- Key results (1-2 sentences)
- Significance (1 sentence)

### 2. Introduction
- Motivation and problem context
- Limitations of existing approaches
- Our contribution (bulleted list)
- Paper organization

### 3. Related Work
- Organized by theme, not chronologically
- Position our work relative to prior art
- Note what we borrow vs. what is novel

### 4. Method
- Formal problem definition
- Proposed approach with mathematical notation
- Algorithm pseudocode if applicable
- Complexity analysis

### 5. Experiments
- Experimental setup (datasets, baselines, metrics, implementation details)
- Main results table
- Ablation studies
- Analysis and discussion

### 6. Conclusion
- Summary of contributions
- Limitations
- Future work

## Writing Rules

- Use precise language — avoid vague claims ("significantly better" → "3.2% improvement in F1")
- Every claim must be supported by evidence (experiments or citations)
- Define all notation on first use
- Tables and figures must be self-contained (readable without main text)
- Use consistent notation throughout

## Versioning

- Save each major revision as a new version: `paper_draft_v1.md`, `paper_draft_v2.md`
- After reviewer feedback, create a new version addressing all comments
- Include a changelog at the top of each new version

## Submission Checklist

- [ ] All experiments are reproducible (seeds, configs logged)
- [ ] Baselines are fair and up-to-date
- [ ] Error bars or confidence intervals included
- [ ] Limitations section is honest
- [ ] All figures are high-resolution
- [ ] References are complete and properly formatted
