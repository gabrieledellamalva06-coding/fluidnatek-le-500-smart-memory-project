export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

export interface TelemetryRecord {
  id: string;
  experimentId: string;
  timestampSec: number;
  voltageKv: number;
  flowRateMlH: number;
  temperatureC: number;
  humidityPct: number;
  distanceMm: number;
}

export interface Experiment {
  id: string;
  projectId: string;
  operationIdentifier: string; // From 'Formula'
  setup: string;
  ingestedAt: string;
  operatorComments: string;
  processingGrade: number; // From 'Grado de Procesabilidad'
  hvPosKv: number;
  hvNegKv: number;
  flowRateMlH: number; // From 'Q1'
  sourceFile: string;
}

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
