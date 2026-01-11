# 语义流修正 (Semantic Stream Correction - SSC) 设计与实施指南

本文档基于架构设计中的“推荐实施步骤”，整理了针对实时语音流中用户自我修正（Self-Correction）行为的轻量级处理方案。

## 1. 核心目标

在不引入复杂的后端撤回（Undo）逻辑的前提下，通过**提示词工程**和**轻量级前端渲染策略**，解决用户口语修正导致的上下文混乱和视觉干扰问题。

## 2. 实施方案

### 2.1 模型层：提示词增强 (Prompt Engineering)

**目标**：确保模型在逻辑推理时，能够自动丢弃被用户修正的错误信息，遵循“后修正优先”原则。

**实施位置**：
`constants.ts` -> `INITIAL_SYSTEM_INSTRUCTION`

**建议追加指令**：
```text
PROCESSING PROTOCOL FOR RAW SPEECH:
1. **Handle Self-Corrections**: Users often stumble or correct themselves (e.g., "The revenue is 5M... no, 50M").
2. **Last-Write-Wins**: When a correction is detected, specific facts in the correction OVERRIDE previous statements.
3. **No Meta-Commentary**: Do not say "I see you corrected yourself." Just process the final intended meaning.
```

### 2.2 UI 层：视觉降权 (Visual Deprioritization)

**目标**：在视觉上弱化被修正的文本，引导用户关注最终确认的信息。

**实施位置**：
`components/TranscriptStream.tsx`

**推荐逻辑**：
不依赖复杂的 NLP 库，而是使用基于规则的启发式算法（Heuristics）。

1. **关键词触发 (Trigger Phrases)**：
   检测常见的修正引导词：
   - *中文*："不对"、"是..."、"我是说"、"更正一下"、"抱歉"
   - *英文*："I mean", "no wait", "actually", "rather", "sorry"

2. **样式变更**：
   当检测到上述模式时，对触发词之前的一段文本应用“废弃样式”：
   - **Opacity**: 降低至 0.4 (`text-gray-600`)
   - **Decoration**: 添加删除线 (`line-through`)

**示例代码逻辑 (伪代码)**：
```typescript
// 在渲染 TranscriptItem 时
const text = item.text;
// 简单的正则匹配修正模式
const correctionRegex = /(?:不对|我是说|no wait|actually|sorry,)\s*(.*)/i;

if (text.match(correctionRegex)) {
    // 将前半部分渲染为灰色+删除线
    return (
        <span>
            <span className="text-gray-600 line-through decoration-gray-700">{partBeforeCorrection}</span>
            <span className="text-gray-500 mx-1">{correctionMarker}</span>
            <span className="text-white font-medium">{correctedContent}</span>
        </span>
    );
}
```

## 3. 预期交互体验

1. **用户说话**：“我正在看 Q3 的财报... 不对，是 Q4 的预测。”
2. **实时显示**：
   - *T0*: "我正在看 Q3 的财报..."
   - *T1*: "我正在看 ~~Q3 的财报~~... **不对，是 Q4 的预测**。"
3. **模型反应**：模型忽略 Q3 财报，直接基于 Q4 预测数据进行回答。

## 4. 后续优化方向 (Phase 2)

- **Diff 算法**：引入 Levenshtein Distance 比较连续句子的相似度，自动识别重复并修正的句子结构（例如：“Metacognition is... Metacognition implies...”）。
- **元数据通道**：利用 Gemini Function Calling 或特定的 JSON 输出模式，让模型明确告诉前端哪些词是错误并需要划掉的（高精度，但延迟稍高）。
