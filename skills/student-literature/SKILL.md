---
name: student-literature
description: Build a strong literature map with baselines, gaps, and concrete research opportunities.
---

# Student Literature

## Student-specific extensions

- End with `Recommended Baselines` that names the first baseline to implement.
- Add `Reviewer concerns to pre-empt` with the two highest-risk objections.
- Check `shared-references/citation-discipline.md` before publishing.

## Purpose

Survey existing work on a given topic to establish baselines, identify gaps, and inform hypothesis formulation.

## Workflow

1. **Define scope**: What specific question or area are you surveying?
2. **Search**: Use web search to find relevant papers, blog posts, and codebases
3. **Read and summarize**: Extract key contributions, methods, results, and limitations
4. **Synthesize**: Identify themes, gaps, and opportunities
5. **Publish**: Write structured output to your canonical shared artifact directory: `{artifact_dir}/{your-name}/literature_{topic}.md`

## Output Format

```markdown
# Literature Survey: {topic}

## Scope
What question this survey answers.

## Key Papers

### {Paper Title} ({Year})
- **Authors**: ...
- **Method**: ...
- **Key Result**: ...
- **Limitation**: ...
- **Relevance**: Why this matters to our research

### {Paper Title} ({Year})
...

## Themes
1. ...

## Gaps & Opportunities
1. ...

## Recommended Baselines
Methods we should compare against:
1. ...

## Reviewer concerns to pre-empt
1. ...
2. ...

## References
- [1] ...
```

## Tips

- Focus on papers from the last 3 years for ML/AI topics
- Always note the evaluation metrics used — we'll need to match them
- Flag any available open-source implementations
- Note dataset availability for reproducibility
