# Verified implementation status

## Runtime architecture

```text
React/Vite UI -> application services -> typed repositories -> Firestore
Excel -> extractor -> resolver -> normalizer -> validator -> confidence/learning -> report
Historical data -> context builder -> deterministic similarity -> robust recommendation
```

The current runtime is local-first: it uses the local persistence adapter and browser
`localStorage`, then falls back to the existing Firestore collections when a local
collection is empty. This keeps the 118 historical records visible without making
Firestore the only application adapter.
Projects, materials, formulations, setups, experiments and process records keep typed
repository contracts and logical IDs. Firestore remains an isolated future adapter,
not a runtime dependency of the local application.

## Implemented and verified

- Historical Experiments adapts the single application data load and filters locally.
  Client-side filtering avoids a combinatorial set of Firestore composite indexes and
  does not issue repeated queries. Missing legacy fields are normalized as unavailable.
- Setup hardware stores machine, injector model, collector model, needle count/gauge,
  emitter count and platform configuration separately from run process parameters.
- HV+ (`voltageKv`) and HV− (`collectorVoltageKv`) are distinct in manual input,
  process records, historical views, similarity and Excel fixtures.
- Recommendations use only similar Grade 4 historical records. The default minimum is
  three source experiments. Parameter windows are the 25th–75th percentiles; the point
  recommendation is the median. Confidence combines sample coverage, similarity and
  parameter completeness. Limits are centralized in `recommendation.config.ts`.
- Live Telemetry & Smart Memory identifies all entered values as operator setpoints.
  DataHub machine telemetry is explicitly unavailable; no real connection is simulated.

## Current limitations

- Excel persistence remains review-only in the UI. The legacy parser and Core pipeline
  coexist, but Core output is diagnostic and no automatic Firestore write is performed.
  This prevents unvalidated or duplicate records from being committed. Production
  persistence still needs an approved canonical mapping and deduplication transaction.
- Historical combined filters run in memory after the one-time Firestore load. For very
  large tenants, server-side pagination and a reviewed index strategy will be required.
- Existing Firestore documents may omit setup or quality fields. Readers preserve this
  compatibility and display unavailable values rather than migrating data destructively.
- DataHub signal mapping and transport are not implemented. Voltage, current, flow,
  temperature, humidity, collector speed, state and alarms remain future interfaces.
- The deterministic recommendation is decision support derived from historical data;
  it is not a scientific validation or a safety guarantee.

## Local verification

```powershell
npm run lint
npm test
npm run build
npm run dev
```
