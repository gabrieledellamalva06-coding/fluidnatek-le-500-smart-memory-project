# Fluidnatek LE-500 Smart Memory — Demo Runbook

## Purpose

This runbook defines one short, repeatable demonstration using realistic historical data. It does not create or delete Firestore records.

## Fixed demo context

- Project: `1_2021_CROXX_Nov`
- Recommended formulation: select `NVR_OVA+TBP_3b` or the closest available formulation shown for this project.
- Setup: select a setup belonging to the current project. Do not use a global or test setup.
- Historical evidence: use only experiments whose status is active/validated and whose source project is `1_2021_CROXX_Nov`.
- Characterization: select an existing characterization linked to the selected formulation, if available.
- SEM result: show only an existing real link/result. Do not create a placeholder SEM record for the presentation.

## Pre-demo checks

1. Start the app with `npm run dev`.
2. Open the local URL and perform `Ctrl+F5`.
3. Confirm the banner reports the shared Firestore project.
4. Confirm that test/demo projects are not listed.
5. Confirm that `1_2021_CROXX_Nov` is visible.
6. Confirm that at least one formulation, setup and historical run are available for the project.
7. If a characterization or SEM result is unavailable, state `No data available`; never invent a value.

## Demonstration path

### 1. Current Project

Select `1_2021_CROXX_Nov`.

Explain: the project is the context that links formulation, setup and experiments.

### 2. Formulation

Select `NVR_OVA+TBP_3b` (or the first realistic formulation available for the project).

Show polymer, molecular weight/grade when available, concentration, solvents and ratios.

Explain: the formulation is structured data; the display name is not the only source of information.

### 3. Setup

Select a setup belonging to the current project.

Show machine/platform, injector, collector, needle count and distance where available.

Explain: setup data is reusable hardware context and is kept separate from variable process parameters.

### 4. Historical evidence

Open Historical Experiments and filter by:

- Project: `1_2021_CROXX_Nov`;
- the selected polymer or formulation;
- one process condition, such as Flow Rate;
- a valid processability grade when available.

Open one result and show its source, parameters, grade and comments.

Explain: the result is historical evidence, not an automatically generated machine setting.

### 5. Live Telemetry & Smart Memory

Open the operational screen and show:

- selected formulation;
- selected setup;
- current operator-entered parameters;
- separate HV+ and HV−;
- Smart Starting Point, if sufficient validated evidence exists;
- source experiment count and confidence;
- telemetry status.

If telemetry is unavailable, say so explicitly.

### 6. New formulation with insufficient evidence

Use the formulation creation flow to enter a temporary unsaved variation, for example a concentration not present in the selected project history.

Expected result:

- no fabricated numeric recommendation;
- `Insufficient data` or equivalent status;
- explanation of missing evidence;
- ability to save the formulation as a new record only if the operator confirms.

Do not save a fake experiment merely for the demo.

### 7. Characterization comparison

Open the characterization area for the selected formulation.

Show current values and any historical characterization values. If no linked historical characterization exists, show `No data` and explain that this is a traceability limitation to be completed.

### 8. Optional SEM result

Show an existing SEM result only if it has a real source link, sample/run code and measurement metadata. Otherwise present this as a planned feature.

## Closing message

The application reduces time spent searching and interpreting heterogeneous Excel files. It standardizes the experiment record, preserves historical evidence and explicitly reports when the data is insufficient. It does not invent scientific parameters.

## Do not demonstrate

- test/demo projects;
- unvalidated records as recommendations;
- invented SEM values or images;
- real-time telemetry if the machine is not connected;
- destructive deletion from Firestore;
- editing historical records.
