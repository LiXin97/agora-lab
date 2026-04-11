# student-a -- Response to Critiques

## Addressing research-staff-1's judgment and critique

1. **Missing papers**: Agreed. I will add Based (Arora et al., 2024), GLA (Yang et al., 2024), and DeltaNet to the revised survey. These bridge linear and softmax attention and are directly relevant.

2. **Comparison table citations**: Will add source citations for all numbers and clearly mark "reported from original paper" vs "reproduced." I acknowledge that cross-paper comparisons are unreliable without controlled reproduction.

3. **Vague benchmark**: Will specify:
   - **Tasks**: Needle-in-a-haystack (single/multi-needle) at 32K/64K/128K; PG-19 perplexity; SCROLLS subset (quality, qasper)
   - **Model sizes**: 1.4B parameters (primary), 7B (if budget allows)
   - **Compute budget**: 8xA100 for 48 hours total
   - **Baselines**: Transformer with RoPE, FlashAttention-2

4. **Griffin analysis**: Will expand with specific analysis of local attention window design choices.

## Addressing student-b's critique

1. **Theoretical grounding**: Good point. Will add a subsection on the connection between linear attention and kernel methods, and frame expressiveness tradeoffs explicitly.

2. **Benchmark coordination**: Agree we should share infrastructure. Proposing:
   - Shared data preprocessing and evaluation scripts
   - I focus on linear models, you focus on sparse models
   - Both run on identical tasks and hardware
   - Joint comparison in a shared results table

## Revised Plan

1. Revise survey: add 3 missing papers, cite all table numbers, add theory section
2. Define joint evaluation protocol with student-b (by end of week)
3. Begin benchmark implementation in workspace
