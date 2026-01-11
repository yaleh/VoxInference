# Project Roadmap: The Pulse (Three-Secretary Architecture)

This document outlines the development phases to evolve "The Pulse" from a linear real-time transcription app into a robust, three-tiered cognitive assistant.

**Core Philosophy:** Decoupling Input (Transcription), Processing (Understanding), and Output (Advisory) to handle stream-of-consciousness speech with intelligent self-correction and analysis.

---

## Phase 1: Foundation & "Transcription Secretary" Isolation
**Goal:** Stabilize the raw audio ingestion and prepare the architecture for multi-model orchestration.

- [ ] **Infrastructure Setup**
    - [ ] Install required dependencies: `diff`, `fastest-levenshtein`, `react-markdown`, `remark-gfm`, `@uiw/react-md-editor`.
    - [ ] Refactor `GeminiLiveService` to focus *strictly* on Audio-In/Text-Out (Transcription Only).
        - [ ] Disable model audio output in config (pure transcription mode).
        - [ ] Ensure `inputAudioTranscription` is optimized for speed.
    - [ ] Implement a **Raw Transcript Buffer** in the state store.
        - [ ] Accumulate partial transcripts from Gemini Live.
        - [ ] Handle buffer flushing mechanisms (e.g., on silence detection or max buffer size).

- [ ] **UI Preparation**
    - [ ] Create a "Debug Mode" toggle to visualize the raw incoming stream from the Transcription Secretary.
    - [ ] Refactor the main layout to a 3-column grid (hidden raw stream / Understanding / Advisory).

- [ ] **Automated Testing Strategy**
    - [ ] **Scenario Generation (LLM)**: Use an LLM to generate diverse text corpora reflecting realistic speech patterns (e.g., self-corrections like "revenue is 5... no 6 million", heavy filler words, fast-paced data entry, interruptions).
    - [ ] **Audio Synthesis (Google TTS)**: Utilize Google Text-to-Speech services to convert these text scenarios into high-quality audio files.
    - [ ] **Sequence Composition**: Assemble these audio files into structured test sequences (e.g., "Financial Report Correction Sequence", "Brainstorming Pause Sequence").
    - [ ] **Unit Testing Implementation**:
        - [ ] Create a mock audio provider to inject synthetic audio sequences into `GeminiLiveService` (bypassing the physical microphone).
        - [ ] Verify transcription accuracy, buffer accumulation logic, and event emission stability against these controlled audio inputs.

---

## Phase 2: The "Understanding Secretary" (Structured Knowledge)
**Goal:** Convert chaotic spoken text into clean, structured Markdown "Work Records".

- [ ] **Batch Processing Engine**
    - [ ] Implement a timer-based trigger (e.g., every 3s) to process the `Raw Transcript Buffer`.
    - [ ] Integrate a separate LLM call (e.g., Gemini Flash via REST API, distinct from the Live socket) to process raw text.
    - [ ] **Prompt Engineering**:
        - [ ] Instruction: "Aggressive line breaking", "Last-write-wins" for corrections.
        - [ ] Format: Structured Markdown (Lists, Headers).

- [ ] **Diff & State Management**
    - [ ] Implement **Diff Logic** using the `diff` library.
        - [ ] Calculate `diffLines` between the previous Understanding state and the new LLM output.
    - [ ] Implement **UI Incremental Rendering**:
        - [ ] Render Markdown using `react-markdown`.
        - [ ] Apply visual cues for changes (Green fade-in for additions, Red strikethrough/fade-out for deletions).
    - [ ] **Heuristics**:
        - [ ] Implement "Correction Detection" (e.g., identifying "No, wait...", "I mean...") to preemptively grey out text in the Raw Buffer before the LLM processes it (optional latency optimization).

---

## Phase 3: The "Advisory Secretary" (Intelligence Layer)
**Goal:** Provide reactive insights and analysis based on the Structured Knowledge.

- [ ] **Dependency Logic**
    - [ ] Implement "Substantial Change Detection".
        - [ ] Use `fastest-levenshtein` to check if the Understanding text changed significantly enough to warrant a new analysis.
    - [ ] Implement a **Debounce Mechanism** (e.g., 2s) to prevent Advisory jitter.

- [ ] **Advisory LLM Integration**
    - [ ] Setup a third distinct LLM context/call.
    - [ ] Input: The full "Understanding" text.
    - [ ] Output: Structured Analysis (Analysis, Suggestions, Risks, Action Items).
    - [ ] **Prompt Engineering**:
        - [ ] Instruction: "Based on the *current* understanding, identify risks or suggestions. If the understanding changes, update the advice."

- [ ] **UI Integration**
    - [ ] Render the Advisory column alongside the Understanding column.
    - [ ] Visual indication of "Thinking..." or "Outdated" when Understanding changes but Advisory hasn't updated yet.

---

## Phase 4: Robustness & "Three-Layer Diff"
**Goal:** Ensure the system handles complex edits and LLM hallucinations gracefully.

- [ ] **Advanced Diff Application Strategy**
    - [ ] **Layer 1 (Strict)**: Try applying the standard patch.
    - [ ] **Layer 2 (Fuzzy)**: If strict fails, use `fastest-levenshtein` to find the closest matching lines (threshold > 70%) and apply changes.
    - [ ] **Layer 3 (LLM Repair)**: If fuzzy fails, send the broken chunk + context to a small, fast model (Gemini Flash) to generate a valid patch.

- [ ] **Manual Intervention**
    - [ ] Integrate `@uiw/react-md-editor` for the Understanding column.
    - [ ] **Edit Flow**:
        - [ ] User clicks "Edit".
        - [ ] Voice input pauses.
        - [ ] User modifies text manually.
        - [ ] On save: Update state, clear Raw Buffer, force-trigger Advisory update.

---

## Phase 5: Polish & Optimization
**Goal:** Production-readiness.

- [ ] **Performance Tuning**
    - [ ] Implement `Web Worker` for diff calculations to keep the UI thread buttery smooth.
    - [ ] Optimize LLM context window usage (sliding window for long sessions).
    - [ ] Virtual scrolling for long transcript histories.

- [ ] **History & Undo**
    - [ ] Implement a Snapshot system.
    - [ ] UI for "Time Travel" (scrolling back to see the state of Understanding/Advisory at T-minus-X minutes).

- [ ] **Aesthetics**
    - [ ] Refine animations (CSS Transitions for list items).
    - [ ] Cyberpunk styling polish (scrollbar, neon accents, typography).

## Tech Stack Summary

| Component | Library/Tool | Purpose |
| :--- | :--- | :--- |
| **Transcription** | Gemini Live API | Real-time ASR (Audio-in/Text-out) |
| **Understanding** | Gemini Flash (REST) | Raw -> Structured Markdown conversion |
| **Advisory** | Gemini Pro (REST) | Deep analysis & suggestions |
| **Diff Engine** | `diff` (npm) | Calculating text changes |
| **Fuzzy Match** | `fastest-levenshtein` | Robust diff application |
| **Rendering** | `react-markdown` | Displaying structured content |
| **Editing** | `@uiw/react-md-editor` | Manual user corrections |
