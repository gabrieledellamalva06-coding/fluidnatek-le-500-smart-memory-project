# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Fluidnatek LE-500 Smart Memory" — a Google AI Studio applet for managing **electrospinning** experiments on the Fluidnatek LE-500 machine. It ingests historical Excel run logs, displays live/simulated telemetry, and produces AI-assisted process-parameter suggestions (voltage, flow rate, emitter distance, temperature, humidity).

The primary UI language is **Italian**. User-facing strings, AI prompts, and error messages are Italian; `it`/`en`/`es` translations live in `src/lib/translations.ts`.

## Commands

```bash
npm install            # install deps
npm run dev            # start dev server (Express + Vite middleware) on :3000
npm run build          # vite build + esbuild-bundle server.ts -> dist/server.cjs
npm run start          # run production build (NODE_ENV=production node dist/server.cjs)
npm run lint           # type-check only (tsc --noEmit) — there is no ESLint or test runner
npm run clean          # rm -rf dist
```

There is **no test framework** configured. `npm run lint` (type-check) is the only automated check. Note this is a Windows environment; `npm run clean` uses `rm -rf` (works via the Bash tool / Git Bash, not PowerShell).

Requires `GEMINI_API_KEY` in `.env` (or `.env.local`) for AI features — see "AI layer" below for fallback behavior when it's absent.

## Architecture

**Single-process full-stack app.** `server.ts` is the entry point for both API and frontend:
- In dev (`NODE_ENV !== production`), it mounts Vite as Express middleware in the same process — one server on port 3000 serves the React SPA and the `/api/*` routes together.
- In prod, it serves the static `dist/` build and falls back to `dist/index.html` for SPA routing.

**Frontend** (`src/`) is React 19 + Vite + Tailwind CSS v4 (via `@tailwindcss/vite`, not a PostCSS config). Entry: `index.html` → `src/main.tsx` → `src/App.tsx`. The `@/` import alias resolves to the repo root (`tsconfig.json` + `vite.config.ts`).

**State lives in the browser, not the server.** `App.tsx` is the single source of truth: `projects`, `formulations`, `experiments`, and `selectedExpId` are React state, seeded from `src/seedData.ts` and persisted to **localStorage** (keys prefixed `fluidnatek_`). All CRUD, cascade deletes, and telemetry generation happen client-side in `App.tsx`. There is no server-side persistence of experiments.

**Firebase/Firestore is a secondary, partially-wired store.** `src/lib/firebase.ts` initializes Firestore against a specific named database (`firebaseConfig.firestoreDatabaseId`, not the default). Currently only `AIOptimizationWidget.tsx` reads from it (`projects/{projectId}/experiments`) to pass historical runs into AI suggestions. The Firestore schema (`Project` → `experiments` → `telemetry` subcollections) is declared in `firebase-blueprint.json`, and `firestore.rules` is fully open (`allow read, write: if true`) — dev/prototype posture. The main app flow does not depend on Firestore.

**AI layer** — three server endpoints in `server.ts`, all calling Gemini (`@google/genai`, model `gemini-3.5-flash`) with structured-JSON `responseSchema`:
- `POST /api/suggest` — recommends process parameters for a formulation. **Has a full deterministic physics/rule-based fallback** (polymer-specific heuristics for Nylon/PVDF/PCL, viscosity/conductivity rules) that runs when no valid `GEMINI_API_KEY` is set, so the endpoint always returns a usable result.
- `POST /api/ai/analyze-telemetry` — analyzes recent telemetry points (last 50) for adjustments; degrades to a static message without a key.
- `POST /api/ai/chat` — chatbot; requires a key (500s without one).

`getGeminiClient()` lazily inits the client and treats the placeholder `"MY_GEMINI_API_KEY"` / empty string as "no key." `withRetry()` wraps calls: retries 503s with exponential backoff, converts 429 quota errors into a user-facing Italian message.

## Data model caveats (important)

`src/types.ts` is **out of sync** with the shapes the app actually uses. The runtime `Experiment` (see `App.tsx`, `seedData.ts`) has `formulationId`, `telemetryData`, `machineModel`, `injectorType`, `collectorType`, `distanceMm`, `jetStabilityGrade`, etc., and there is a `Formulation` type imported across the app — but `types.ts` declares a *different* `Experiment` (with `projectId`, `hvPosKv`, `flowRateMlH`, …) and **does not export `Formulation` at all**. When touching types, prefer the field set actually used by `App.tsx`/`seedData.ts`/components and reconcile `types.ts` rather than trusting it.

`src/utils/excelParser.ts` is likewise partial: header detection expects Spanish/Italian column names (`fórmula`, `caudal`, `procesabilidad`, `comentarios`, `Q1`, `HV+/HV-`), and the row-based parse path produces results with empty `telemetryData`. Excel parsing here is heuristic and locale-tolerant (comma decimals → dot via `cleanAndParseFloat`); expect to extend the column-matching predicates rather than assume a fixed schema.

## Conventions

- **Telemetry is synthesized**, not measured. New experiments and mock imports generate sine/cosine + noise curves (`App.tsx handleAddExperiment`, `seedData.ts generateTelemetry`) to render realistic charts. When "live" data is needed, follow these generators.
- IDs are generated client-side with `Date.now()`/`Math.random()`/`crypto.randomUUID()` prefixed by kind (`PRJ-`, `FORM-`, `EXP-`).
- Charts use `recharts`; PDF export uses `jspdf` + `html2canvas` (`src/utils/pdfExport.ts`); Excel via `xlsx`; fuzzy search via `fuse.js`; animations via `motion`; icons via `lucide-react`.
- New user-facing text must be added to all three locales in `src/lib/translations.ts` and accessed via the `lang` prop threaded down from `App.tsx`.
- Dark theme throughout (base background `#0a0a0b`), Tailwind utility classes inline.

## Config notes

- `firebase-applet-config.json` contains committed Firebase web config (apiKey, projectId `warm-bridge-f666p`) — this is AI Studio's applet config, imported directly by `src/lib/firebase.ts`.
- Vite HMR/file-watching is gated on `DISABLE_HMR` (AI Studio sets this to reduce flicker during agent edits) — see `vite.config.ts`; leave that logic intact.
