---
author: student-b
type: literature-survey
topic: Sparse attention and local-global hybrid patterns
created: 2026-04-10T14:45:00Z
status: draft
---

# Literature Survey: Sparse Attention Patterns

## 1. Overview

Sparse attention reduces the O(n^2) cost of full attention by restricting which token pairs participate in the attention computation. The main families are fixed-pattern, learnable, and local-global hybrids.

## 2. Key Papers

### 2.1 Longformer (Beltagy et al., 2020)
- **Core idea**: Sliding-window local attention combined with task-specific global tokens
- **Complexity**: O(n * w) where w = window size
- **Strengths**: Drop-in replacement for pretrained Transformers; well-tested on NLP classification and QA
- **Weaknesses**: Global token placement is task-specific and not end-to-end learned; performance degrades on generation tasks
- **Key result**: Enables 4K-16K context processing where BERT is limited to 512

### 2.2 BigBird (Zaheer et al., 2020)
- **Core idea**: Combines local sliding window, global tokens, and random attention connections
- **Complexity**: O(n) with constant factors depending on window + global + random counts
- **Strengths**: Theoretical Turing completeness proof; strong results on long-document QA
- **Weaknesses**: Random connections add noise; pattern tuning is fragile across tasks
- **Key result**: State-of-the-art on TriviaQA and Natural Questions with 4096 context

### 2.3 LongNet (Ding et al., 2023)
- **Core idea**: Dilated attention with exponentially increasing dilation rates across segments
- **Complexity**: O(n * log n) effective cost
- **Strengths**: Simple implementation; theoretically scales to 1B+ tokens
- **Weaknesses**: Empirical validation limited to synthetic and small-scale experiments; 1B token claim is theoretical
- **Key result**: Demonstrated scaling curves up to 1M tokens on synthetic retrieval

### 2.4 Mixture of Attention Heads (Zhang et al., 2024)
- **Core idea**: Each attention head dynamically selects between local, global, and strided patterns via a learned router
- **Complexity**: O(n * k) where k varies per head based on routing decisions
- **Strengths**: End-to-end learned sparsity; adapts pattern to input content
- **Weaknesses**: Router training instability; sparse communication between heads
- **Key result**: Outperforms fixed-pattern baselines on long-range arena with comparable FLOPs

## 3. Taxonomy

| Family | Examples | Pattern | Learned? | Generation Quality |
|---|---|---|---|---|
| Fixed local | Longformer, local attention | Sliding window | No | Good for local coherence |
| Fixed hybrid | BigBird | Local + global + random | No | Good for QA, weaker for generation |
| Dilated | LongNet | Exponential dilation | No | Undertested |
| Routed | MoA, Switch-Head | Dynamic per head | Yes | Promising but fragile |

## 4. Identified Gaps

1. **Generation quality**: Sparse patterns are mostly benchmarked on classification/QA, not autoregressive generation perplexity
2. **Cross-family comparison**: No study compares sparse attention directly against linear attention (Mamba, RWKV) on identical tasks
3. **Learnable sparsity**: Routing-based approaches show promise but lack rigorous ablation studies
4. **Scaling behavior**: Most sparse methods tested at <7B parameters; scaling properties unknown

## 5. Proposed Next Step

Benchmark sparse hybrid patterns (Longformer-style, BigBird-style) and routed sparsity against linear attention baselines on matched tasks: needle-in-a-haystack retrieval, PG-19 perplexity, and SCROLLS QA, at 64K-256K context lengths.
