// Tipi allineati alle forme realmente usate da App.tsx / seedData.ts / componenti.
// Enterprise Domain Model v2
// Compatibile con l'architettura attuale e pronto per Firestore.

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  country: string;
  contact?: string;
}

export interface RawMaterial {
  id: string;
  supplierId: string;

  name: string;
  category: string;

  manufacturer?: string;

  datasheet?: string;
}

export interface MaterialBatch {
  id: string;

  materialId: string;

  batchNumber: string;

  receivedDate: string;

  expiryDate?: string;

  notes?: string;
}

export interface Formulation {
  id: string;
  projectId: string;

  /** Human readable formulation name/code. */
  name?: string;

  polymerName: string;
  polymerMaterialId?: string;
  polymerConcentrationPct?: number;

  /** Legacy combined solvent description, kept for compatibility. */
  solvent: string;

  solvent1Name?: string;
  solvent1MaterialId?: string;
  solvent1RatioPct?: number;

  solvent2Name?: string;
  solvent2MaterialId?: string;
  solvent2RatioPct?: number;

  notes?: string;

  solidsContentPct: number;
  viscosityMpas: number;
  conductivityUsCm: number;
  densityGcm3: number;

  materialBatchIds: string[];
}

export interface TelemetryRecord {
  id?: string;
  experimentId?: string;

  timestampSec: number;

  voltageKv: number;
  collectorVoltageKv?: number;
  flowRateMlH: number;

  temperatureC?: number;
  humidityPct?: number;

  distanceMm: number;
  drumSpeedRpm?: number;
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

  metadata?: Record<string, string>;
}

// ==========================================
// AI
// ==========================================

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

export interface TelemetryAnalysis {
  suggestion: string;
  reasoning: string;
  code?: string;
}

// ==========================================
// ENTERPRISE DOMAIN MODEL (v2)
// ==========================================

export interface Company {
  id: string;
  name: string;
  country?: string;
  createdAt: string;
}

export type UserRole =
  | "admin"
  | "technician"
  | "operator";

export interface User {
  id: string;

  companyId: string;

  firstName: string;
  lastName: string;

  email: string;

  role: UserRole;

  createdAt: string;
}

export interface Characterization {
  id: string;

  formulationId: string;

  viscosityMpas: number;

  conductivityUsCm: number;

  densityGcm3: number;

  surfaceTensionMnM?: number;

  ph?: number;

  measuredAt: string;

  notes?: string;
}

export interface ProcessSetup {
  id: string;

  projectId: string;

  machineModel: string;

  injectorType: string;

  collectorType: string;

  needleGauge?: string;

  needleCount?: number;

  voltageKv: number;

  flowRateMlH: number;

  distanceMm: number;

  temperatureC: number;

  humidityPct: number;

  createdAt: string;
}

export type ExperimentalRunStatus =
  | "draft"
  | "running"
  | "completed"
  | "failed";

export interface ExperimentalRun {
  id: string;

  projectId: string;

  formulationId: string;

  characterizationId: string;

  setupId: string;

  operatorId?: string;

  runNumber: string;

  status: ExperimentalRunStatus;

  startedAt: string;

  finishedAt?: string;

  notes?: string;
}

export interface AIAnalysis {
  id: string;

  runId: string;

  summary: string;

  recommendations: string[];

  confidence: number;

  createdAt: string;
}

export interface Report {
  id: string;

  runId: string;

  title: string;

  createdAt: string;

  pdfUrl?: string;
}
