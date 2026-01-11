# Dual-Stream Reasoning & Retroactive Correction Architecture

## 1. Executive Summary

This document outlines an architectural evolution for "The Pulse" to move beyond linear streaming. The objective is to decouple **Input Understanding** (Recognition) from **Cognitive Output** (Suggestion). This separation allows for "stabilization" of the user's intent before generating advice, and enables a retroactive correction mechanism where changes to the understanding layer automatically invalidate and regenerate the advisory layer.

## 2. Core Concepts

### 2.1. The Split-Stream Model

Instead of a single `User Audio -> Model Text` pipeline, we define two distinct asynchronous processes:

1.  **The Recognition Stream (The "Anchor")**:
    *   **Input**: Raw audio / Stream-of-consciousness text.
    *   **Process**: ASR (Speech-to-Text) + NLP Normalization.
    *   **Output**: "Formalized Context" – A structured, grammatical, and canonical representation of what the user *meant*.
    *   **Properties**: Mutable, Editable by User, High-speed.

2.  **The Advisory Stream (The "Insight")**:
    *   **Input**: The "Formalized Context" from Stream 1.
    *   **Process**: Strategic reasoning, fact-checking, querying.
    *   **Output**: Actionable advice or insights.
    *   **Properties**: Dependent, High-latency allowed, Reactive.

### 2.2. The Cognitive Block (Data Structure)

We transition from a flat list of `TranscriptItem` to a linked graph of `CognitiveBlock` objects.

```typescript
interface CognitiveBlock {
  id: string;
  timestamp: number;
  
  // Stream 1: Recognition (Mutable)
  rawInput: string;          // "I want... no I need apple"
  formalizedContext: string; // "User needs an apple." (Editable)
  isLocked: boolean;         // True once user moves to next topic or confirms
  
  // Stream 2: Advisory (Reactive)
  insight: string | null;    // "Apples are high in fiber."
  insightStatus: 'computing' | 'stable' | 'stale' | 'invalidated';
}
```

## 3. Detailed Process Flow

### 3.1. Phase 1: Ingestion & Formalization
As the user speaks, the system accumulates a "Draft Block".
*   **System Prompt instruction**: "Output a JSON object containing `transcription_raw` and `formalized_intent`. The `formalized_intent` must remove disfluencies and apply corrections."
*   **UI Behavior**: The user sees their raw speech appearing, but simultaneously sees a "Cleaned" version forming below it.

### 3.2. Phase 2: Speculative Inference
The Model begins generating the `insight` based on the *current* state of `formalized_intent`.
*   This is "Speculative" because the user hasn't finished speaking.
*   **UI Behavior**: Faint/Ghost text appears in the Advisory column.

### 3.3. Phase 3: Manual Correction & Retroactive Logic
This is the critical differentiator.

**Scenario**:
1. User says: "Revenue was 50 million."
2. `FormalizedContext`: "Revenue: $50M".
3. `Insight`: "This is a 10% YoY increase."

**The Correction Event**:
1. User taps the `FormalizedContext` and edits "$50M" to "$15M" (or speaks "Correction, fifteen million").
2. **Dependency Trigger**:
   *   The system detects a change in the Anchor (Stream 1).
   *   The dependent `Insight` (Stream 2) is marked as `stale`.
3. **Regeneration**:
   *   The system sends a specific re-inference request: "Context updated to '$15M'. Recompute insight for Block #123."
   *   `Insight` updates to: "This is a significant drop from last year."

## 4. Technical Architecture

### 4.1. State Management (The "Cognitive Graph")
A local state store (e.g., Redux or a complex `useReducer`) is required to maintain the relationships between blocks.

*   **Action**: `UPDATE_CONTEXT(blockId, newText)`
*   **Effect**: 
    1. Update `blocks[id].formalizedContext`.
    2. Set `blocks[id].insightStatus = 'stale'`.
    3. Trigger debounce timer to call API for new insight.

### 4.2. API Interaction Design
Since Gemini Live is a continuous socket, we need a protocol to handle "Edit events" without breaking the session.

**Protocol Strategy**:
We treat "Edits" as a specific type of System Event sent to the model.

*   **Standard Flow**: Audio chunks -> Model.
*   **Edit Flow**: 
    *   Client sends Text Message: `[SYSTEM_EVENT: EDIT_BLOCK id=123 content="Revenue is $15M"]`
    *   Model Instruction: "When receiving a SYSTEM_EVENT, stop current generation. Locate memory of Block 123. Update internal context. Regenerate insight for Block 123."

### 4.3. UI/UX Layout

The interface splits into two interactive columns:

| **Understanding Stream** (Left) | **Advisory Stream** (Right) |
| :--- | :--- |
| **[Block A]** | **[Insight A]** |
| *Input:* "Revenue 50M" | *Output:* "Good growth." |
| *Status:* **Editable** | *Status:* **Stable** |
| | |
| **[Block B]** | **[Insight B]** |
| *Input:* "Cost high..." | *Output:* Computing... |
| *Status:* **Recording** | *Status:* **Pending** |

*   **Interaction**: Clicking "Revenue 50M" turns it into an input field.
*   **Visual Cue**: When Block A is edited, Insight A flashes "Refreshing..." or turns amber to indicate staleness.

## 5. Implementation Roadmap

### Step 1: Prompt Engineering (Structure)
Modify `systemInstruction` to force the model to separate "What I heard" (Understanding) from "What I think" (Advice) in its output structure.

### Step 2: Client-Side Graph
Implement the `CognitiveBlock` data structure and the logic to invalidate children when parents change.

### Step 3: The "Edit" Loop
Implement the UI for clicking transcript items and the logic to send the `[SYSTEM_EVENT]` message back to Gemini to force a context update.
