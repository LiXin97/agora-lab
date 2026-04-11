---
author: student-a
type: literature-survey
topic: Linear attention variants for long-context LLMs
created: 2026-04-10T14:30:00Z
status: draft
---

# Literature Survey: Linear Attention Variants

## 1. Overview

Traditional softmax attention scales as O(n^2) in sequence length, making it prohibitively expensive for contexts beyond 8-32K tokens. Several families of linear-time alternatives have emerged that replace the softmax kernel with alternative formulations.

## 2. Key Papers

### 2.1 Mamba (Gu & Dao, 2024)
- **Core idea**: Selective state space model with input-dependent gating
- **Complexity**: O(n) time, O(1) per-step recurrent state
- **Strengths**: Strong language modeling perplexity; hardware-efficient selective scan
- **Weaknesses**: No explicit pairwise token interaction; struggles on tasks requiring precise retrieval from long contexts
- **Key result**: Matches Transformer perplexity at 1.4B scale with 5x inference speedup

### 2.2 RWKV (Peng et al., 2023)
- **Core idea**: Linear attention via time-decay weighting in an RNN-like formulation (WKV operator)
- **Complexity**: O(n) time; parallelizable during training via chunk-wise computation
- **Strengths**: Competitive LM perplexity at low cost; active open-source community (RWKV-5/6)
- **Weaknesses**: Exponential decay mechanism limits very-long-range recall; channel mixing is less expressive than full attention
- **Key result**: RWKV-6 at 7B competitive with similarly-sized Transformers on standard LM benchmarks

### 2.3 RetNet (Sun et al., 2023)
- **Core idea**: Retention mechanism combining recurrent and parallel representations with exponential decay
- **Complexity**: O(n) recurrent mode; O(n^2) parallel mode for training
- **Strengths**: Dual-form enables fast inference and parallel training; group retention adds expressiveness
- **Weaknesses**: Fixed decay rate per head limits flexibility; parallel training mode still quadratic
- **Key result**: Comparable perplexity to Transformer at 6.7B with 8.4x inference speedup

### 2.4 Griffin / Hawk (De et al., 2024)
- **Core idea**: Gated linear recurrence (real-valued diagonal RNN) mixed with local attention
- **Complexity**: O(n) for recurrence; O(n*w) for local attention windows
- **Strengths**: Hybrid design captures both local and global patterns; strong on downstream tasks
- **Weaknesses**: Local attention window adds back some quadratic cost; limited public reproduction
- **Key result**: Hawk matches Mamba at 1.4B; Griffin with local attention outperforms at 7B

## 3. Comparison Table

| Model | Year | Complexity | Training | Inference | Perplexity (1.4B, PG-19) | Retrieval (NIAH 128K) |
|---|---|---|---|---|---|---|
| Transformer | — | O(n^2) | Parallel | KV cache | 13.2 (baseline) | 99% |
| Mamba | 2024 | O(n) | Parallel (scan) | Recurrent | 13.5 | ~60% |
| RWKV-6 | 2024 | O(n) | Chunk-parallel | Recurrent | 13.8 | ~55% |
| RetNet | 2023 | O(n)/O(n^2) | Parallel | Recurrent | 13.6 | ~65% |
| Griffin | 2024 | O(n) + O(nw) | Parallel | Hybrid | 13.1 | ~85% |

## 4. Identified Gaps

1. **No controlled head-to-head benchmark**: Published results use different training data, tokenizers, and evaluation suites, making comparison unreliable
2. **Retrieval failure modes**: Linear models consistently underperform on needle-in-a-haystack at 128K+, but the failure modes are poorly characterized
3. **Hybrid architectures underexplored**: Griffin's local attention + linear recurrence shows promise, but the design space (window size, attention ratio, placement) is largely unexplored

## 5. Proposed Next Step

Design a controlled benchmark comparing Mamba, RWKV-6, RetNet, and Griffin on identical long-context tasks (32K/64K/128K) with both perplexity and retrieval metrics, using a fixed compute budget of 8xA100 for 48 hours.
