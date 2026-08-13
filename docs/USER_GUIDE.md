# User guide

## Start the application

```powershell
npm install
npm run dev
```

Open the local URL printed by the terminal (normally `http://localhost:3000`). The interface is English-only.

## Main workflow

1. Create or select a project.
2. Create/select a formulation and characterization.
3. Create/select a machine setup.
4. Open **Live Telemetry & Smart Memory**.
5. Enter operator setpoints. DataHub telemetry is clearly marked unavailable until a real connector is implemented.
6. Use **Analyze Similar Historical Runs** to inspect deterministic historical evidence.
7. Record observed processability and save the experiment.

Use the button at the bottom of the sidebar to collapse it and maximize the workspace.

## Historical experiments

Open **Historical Experiments** to search the loaded experiments. Filters can be combined by project, formulation, polymer, solvent, setup, grade and process parameters. Missing legacy fields are shown as unavailable.

## Excel import

Open **Historical Data Import**, select the destination project, then upload `.xlsx`, `.xlsm` or `.xls`. The adaptive reader detects sheets and headers without requiring a fixed template. HV+ and HV− remain separate. A formulation can be created as new only when its referenced polymer and solvent are recognized; ambiguous data must be reviewed.

The original source file, sheet/row metadata and validation state are retained for traceability. Import persistence requires the configured Firestore connection and an approved valid row.

## Firestore data layout

The default tenant uses:

```text
companies/default/projects
companies/default/materials
companies/default/formulations
companies/default/setups
companies/default/experiments
companies/default/processRecords
```

Repository writes use stable logical IDs and preserve compatibility with legacy documents. Do not edit production data manually without a backup and a reviewed migration.

## Verification commands

```powershell
npm run lint
npm test -- --run
npm run build
```

`npm test -- --run` is one-shot and non-interactive.
