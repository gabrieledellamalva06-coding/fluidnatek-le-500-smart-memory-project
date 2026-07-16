// Tipi allineati alle forme realmente usate da App.tsx / seedData.ts / componenti.
// (Precedentemente questo file era disallineato: mancava `Formulation` e le
//  interfacce Experiment/TelemetryRecord non corrispondevano al runtime.)

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

export interface Formulation {
  id: string;
  projectId: string;
  polymerName: string;
  solvent: string;
  solidsContentPct: number;
  viscosityMpas: number;
  conductivityUsCm: number;
  densityGcm3: number;
}

export interface TelemetryRecord {
  // id / experimentId sono opzionali: la telemetria sintetizzata
  // (seedData.ts, App.tsx) non li popola.
  id?: string;
  experimentId?: string;
  timestampSec: number;
  voltageKv: number;
  flowRateMlH: number;
  temperatureC: number;
  humidityPct: number;
  distanceMm: number;
}

export interface Experiment {
  id: string;
  formulationId: string;
  operationIdentifier: string;
  machineModel: string;
  injectorType: string;
  collectorType: string;
  distanceMm: number;
  jetStabilityGrade: number;
  operatorComments: string;
  sourceFile: string;
  ingestedAt: string;
  telemetryData: TelemetryRecord[];
  // Metadati grezzi estratti dall'ingestione Excel (assenti per le run manuali/seed).
  metadata?: Record<string, string>;
}

// Risposta di /api/suggest
export interface AISuggestion {
  polymerName: string;
  solvent: string;
  voltageKv: number;
  flowRateMlH: number;
  distanceMm: number;
  temperatureC: number;
  humidityPct: number;
  tips: string[];
  reasoning: string;
}

// Risposta di /api/ai/analyze-telemetry
export interface TelemetryAnalysis {
  suggestion: string;
  reasoning: string;
  code?: string;
}
