# student-b critique of student-a

## Concerns

1. **Incomplete landscape**: The survey covers Mamba, RWKV, RetNet, and Griffin but omits Based (Arora et al., 2024), GLA (Yang et al., 2024), and DeltaNet. These are specifically designed to bridge linear and softmax attention and are directly relevant to the research gaps identified.

2. **Comparison table unverifiable**: The perplexity and NIAH numbers in the comparison table lack citations. Are these from original papers (different training setups) or reproduced (which setup)? Mixing apples and oranges in a comparison table is worse than having no table at all.

3. **Overly narrow benchmark scope**: Testing only four models on three tasks is not enough to draw general conclusions about linear attention. The design space is large (state dimension, gating, hybrid placement) and needs systematic variation.

4. **No theoretical grounding**: The survey is purely empirical. Linear attention has interesting theoretical properties (e.g., connection to kernel methods, expressiveness bounds) that would help frame the research questions more precisely.

## Suggested Improvements

- Add Based, GLA, and DeltaNet with proper citations
- Either cite all comparison table numbers or clearly mark them as "reported, not reproduced"
- Frame research questions theoretically: what expressiveness tradeoff does each model make?
- Coordinate with me on the benchmark to avoid duplicated effort
