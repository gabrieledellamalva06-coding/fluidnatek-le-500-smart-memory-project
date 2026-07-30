# Changelog

## Tutor Release — 2026-07-30

### Added

- Firestore-backed project, formulation and experiment services
- Canonical formulation, setup, experiment and process-record models
- Atomic Firestore batch creation for experiment-related entities
- Shared Firebase authentication initialization
- Firestore audit script
- Historical Section A migration
- Adaptive Excel ingestion pipeline modules
- AI parameter recommendations
- AI telemetry analysis
- AI technical chat
- Gemini request cache, concurrency limiter and retry strategy
- Multilingual UI
- Parameter learning panel hidden when no learned data exists
- Compact premium sidebar
- Compact telemetry dashboard
- Human-readable labels for numeric legacy run identifiers
- Motion-based navigation micro-interactions

### Fixed

- Firebase authentication initialization race
- Partial writes during experiment creation
- Repeated Gemini calls caused by unstable React dependencies
- Empty parameter-learning panel displayed with incompatible white styling
- Oversized sidebar and dashboard spacing at 100% browser zoom
- Historical characterization lookup fallback by formulation ID
- Multiple solvent rendering support
- Corrupted visual hierarchy in the dashboard

### Verified

- TypeScript validation passes with zero errors
- Firestore smoke test persisted successfully
- Experiment, process-record and setup relationships are written
- Existing Firestore data remains available after reload
- Dashboard operates at 100% browser zoom

### Known Data Quality Issue

Some historical records have numeric `operationIdentifier` values such as `1` and `2`. These are source-data identifiers, not duplicated Firestore documents. The UI now presents readable labels without destroying the original traceability value.
