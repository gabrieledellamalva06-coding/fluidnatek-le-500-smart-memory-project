import { Project, Formulation, Experiment, TelemetryRecord } from "./types";

export const AVAILABLE_POLYMERS = [
  "Cellulose Acetate",
  "PAN (Polyacrylonitrile)",
  "PCL (Polycaprolactone)",
  "PVDF (Polyvinylidene fluoride)",
  "PEO (Polyethylene oxide)",
  "Nylon-6",
  "Chitosan",
  "PLA (Polylactic acid)",
  "PMMA (Polymethyl methacrylate)"
];

export const AVAILABLE_SOLVENTS = [
  "DMF (Dimethylformamide)",
  "THF (Tetrahydrofuran)",
  "Acetone",
  "Water (MilliQ)",
  "Acetic Acid",
  "DCM (Dichloromethane)",
  "Ethanol",
  "DMSO (Dimethyl sulfoxide)",
  "Chloroform",
  "TFA (Trifluoroacetic acid)"
];

// Helper to generate realistic telemetry
function generateTelemetry(
  baseVoltage: number,
  baseFlow: number,
  baseTemp: number,
  baseHum: number,
  pointsCount = 40,
  unstableStart = true
): TelemetryRecord[] {
  const telemetry: TelemetryRecord[] = [];
  for (let i = 0; i < pointsCount; i++) {
    const time = i * 5; // Every 5 seconds
    // Simulating voltage adjustment / stabilization
    let voltage = baseVoltage;
    if (unstableStart && i < 8) {
      // Start slightly lower and ramp up/overshoot
      voltage = baseVoltage * (0.7 + (i / 8) * 0.35) + Math.sin(i) * 0.5;
    } else {
      // Small sensor noise
      voltage = baseVoltage + Math.sin(i * 0.4) * 0.15 + (Math.random() - 0.5) * 0.1;
    }

    // Simulating flow rate stabilization
    let flowRate = baseFlow;
    if (i < 5) {
      flowRate = baseFlow * 1.3 - (i / 5) * baseFlow * 0.3; // Flush effect
    } else {
      flowRate = baseFlow + Math.cos(i * 0.3) * (baseFlow * 0.02) + (Math.random() - 0.5) * 0.005;
    }

    // Environmental fluctuation
    const temp = baseTemp + Math.sin(i * 0.1) * 0.2 + (Math.random() - 0.5) * 0.05;
    const hum = baseHum + Math.cos(i * 0.1) * 0.4 + (Math.random() - 0.5) * 0.1;

    telemetry.push({
      timestampSec: time,
      voltageKv: parseFloat(voltage.toFixed(2)),
      flowRateMlH: parseFloat(flowRate.toFixed(3)),
      temperatureC: parseFloat(temp.toFixed(1)),
      humidityPct: parseFloat(hum.toFixed(1)),
      distanceMm: 150
    });
  }
  return telemetry;
}

export const SEED_PROJECTS: Project[] = [
  {
    id: "PRJ-NYLON",
    name: "PRJ-2026-NylonScaffold",
    description: "Sviluppo di membrane nanofibrose in Nylon-6 per filtrazione ad alta efficienza energetica.",
    createdAt: "2026-06-15T10:00:00Z"
  },
  {
    id: "PRJ-PVDF",
    name: "PRJ-2026-PVDFSensor",
    description: "Fabbricazione di sensori piezoelettrici flessibili tramite elettrofilatura orientata su collettore a tamburo.",
    createdAt: "2026-06-20T14:30:00Z"
  },
  {
    id: "PRJ-PCL",
    name: "PRJ-2026-PCLBio",
    description: "Creazione di scaffold biodegradabili in PCL caricati con principi attivi per rigenerazione tissutale.",
    createdAt: "2026-06-28T09:15:00Z"
  }
];

export const SEED_FORMULATIONS: Formulation[] = [
  {
    id: "FORM-NYLON-1",
    projectId: "PRJ-NYLON",
    polymerName: "Nylon-6",
    solvent: "Acetic Acid",
    solidsContentPct: 15.0,
    viscosityMpas: 450,
    conductivityUsCm: 12.4,
    densityGcm3: 1.08
  },
  {
    id: "FORM-PVDF-1",
    projectId: "PRJ-PVDF",
    polymerName: "PVDF (Polyvinylidene fluoride)",
    solvent: "DMF (Dimethylformamide)",
    solidsContentPct: 18.0,
    viscosityMpas: 680,
    conductivityUsCm: 8.2,
    densityGcm3: 1.15
  },
  {
    id: "FORM-PCL-1",
    projectId: "PRJ-PCL",
    polymerName: "PCL (Polycaprolactone)",
    solvent: "Chloroform",
    solidsContentPct: 10.0,
    viscosityMpas: 320,
    conductivityUsCm: 1.1,
    densityGcm3: 1.22
  }
];

export const SEED_EXPERIMENTS: Experiment[] = [
  {
    id: "EXP-NYLON-01",
    formulationId: "FORM-NYLON-1",
    operationIdentifier: "RUN-NYLON-15KV-01",
    machineModel: "Fluidnatek LE-500",
    injectorType: "Single Emitter",
    collectorType: "Flat Plate",
    distanceMm: 140,
    jetStabilityGrade: 4,
    operatorComments: "Nanofibre molto omogenee rilevate al SEM. Taylor cone stabile a 15.2 kV. Minimo allineamento ma ottima densità spaziale. Umidità controllata ottimale.",
    sourceFile: "Manual Input",
    ingestedAt: "2026-06-16T11:45:00Z",
    telemetryData: generateTelemetry(15.2, 0.85, 22.4, 38.5, 40, true)
  },
  {
    id: "EXP-PVDF-01",
    formulationId: "FORM-PVDF-1",
    operationIdentifier: "RUN-PVDF-ROT-02",
    machineModel: "Fluidnatek LE-500",
    injectorType: "Multi-emitter (x4)",
    collectorType: "Rotating Drum",
    distanceMm: 180,
    jetStabilityGrade: 5,
    operatorComments: "Configurazione tamburo rotante a 1500 RPM per l'allineamento delle fibre piezoelettriche. Ottima stabilità del getto a 22.0 kV. Struttura cristallina beta massimizzata.",
    sourceFile: "PVDF_Run_Tamburo_Optimized.xlsx",
    ingestedAt: "2026-06-21T16:20:00Z",
    telemetryData: generateTelemetry(22.0, 1.45, 23.1, 35.2, 40, false)
  },
  {
    id: "EXP-PCL-01",
    formulationId: "FORM-PCL-1",
    operationIdentifier: "RUN-PCL-COAX-03",
    machineModel: "Fluidnatek LE-500",
    injectorType: "Coaxial",
    collectorType: "Mandrel",
    distanceMm: 160,
    jetStabilityGrade: 3,
    operatorComments: "Elettrofilatura coassiale eseguita per incapsulare il farmaco nel nucleo di PCL. Qualche gocciolamento iniziale all'ugello risolto aumentando la tensione a 18.5 kV.",
    sourceFile: "PCL_Coaxial_S1_03.xlsx",
    ingestedAt: "2026-06-29T10:10:00Z",
    telemetryData: generateTelemetry(18.5, 1.10, 21.8, 42.1, 40, true)
  }
];
