# Fluidnatek LE-500 Smart Memory — AI Sync

## Project Status

- Project: Fluidnatek LE-500 Smart Memory
- Product type: Industrial SaaS
- Stack: React, Vite, TypeScript, Firebase, Firestore, Google Gemini
- TypeScript mode: Strict
- Definitive persistence: Firestore
- Current development area: Core Excel Import Engine
- Current phase: Extractor integration
- Last synchronization date: 2026-07-23

---

## Source of Truth

Before proposing or implementing changes, consult:

1. `docs/AI_SYNC.md`
2. `docs/ARCHITECTURE.md`
3. `docs/DECISIONS.md`
4. The current repository implementation

The repository represents the actual technical state.

If documentation and code differ:

- identify the inconsistency;
- avoid destructive refactoring;
- preserve compatibility;
- update documentation after the technical change.

---

## Current Objective

Build an auto-adaptive Excel ingestion engine capable of:

- reading workbooks with different structures;
- avoiding fixed header positions;
- avoiding fixed worksheet names;
- avoiding fixed column positions;
- avoiding rigid templates;
- recognizing columns and values semantically;
- normalizing raw data into canonical domain models;
- calculating confidence levels;
- learning new aliases, materials and templates;
- persisting learned knowledge to Firestore.

---

## Core Architecture

```text
src/core/
├─ extractor/
├─ resolver/
├─ normalizer/
├─ validator/
├─ dictionaries/
├─ learning/
├─ confidence/
├─ pipeline/
├─ report/
└─ types/
```


---

## Latest Change


### Header Detector V2

Updated:

```text
src/core/extractor/headerDetector.ts
```
