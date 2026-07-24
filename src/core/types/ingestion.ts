// ============================================================================
// FLUIDNATEK SMART MEMORY
// Canonical Ingestion Types
// ============================================================================

export type MaterialType =
  | "polymer"
  | "solvent"
  | "additive"
  | "nanoparticle"
  | "surfactant"
  | "salt"
  | "other";

export type ConfidenceLevel =
  | "high"
  | "medium"
  | "low";

export type ImportStatus =
  | "success"
  | "warning"
  | "error";

  export interface CanonicalMaterial {

  id: string;

  type: MaterialType;

  canonicalName: string;

  originalName: string;

  code?: string;

  aliases: string[];

  supplier?: string;

  grade?: string;

  confidence: number;

}

export interface FormulationComponent {

  material: CanonicalMaterial;

  percentage?: number;

  concentration?: number;

  ratio?: number;

}

export interface CanonicalFormulation {

  id: string;

  components: FormulationComponent[];

}

export interface CanonicalSolution {

  viscosity?: number;

  conductivity?: number;

  surfaceTension?: number;

  density?: number;

}

export interface CanonicalSetup {

  id: string;

  name?: string;

  collector?: string;

  injector?: string;

  notes?: string;

}

export interface CanonicalProcess {

  flowRate?: number;

  hvPositive?: number;

  hvNegative?: number;

  distance?: number;

  temperature?: number;

  humidity?: number;

  collectorSpeed?: number;

  pressure?: number;

}

export interface CanonicalCharacterization {

  processability?: string;

  semMorphology?: string;

  fiberDiameter?: number;

  comments?: string;

}

export interface CanonicalProject {

  id: string;

  name: string;

  description?: string;

  customer?: string;

}

export interface CanonicalExperiment {

  id: string;

  sampleCode?: string;

  project: CanonicalProject;

  formulation: CanonicalFormulation;

  solution?: CanonicalSolution;

  setup?: CanonicalSetup;

  process: CanonicalProcess;

  characterization?: CanonicalCharacterization;

  operatorComments?: string;

  metadata: {

  sourceFile?: string;

  sourceSheet?: string;

  sourceRow?: number;

  originalHeaders?: string[];

  importedAt: string;

  parserVersion: string;

};

}

export interface ImportWarning {

  field: string;

  message: string;

}

export interface ImportError {

  field: string;

  message: string;

}

export interface ImportReport {

  warnings: ImportWarning[];

  errors: ImportError[];

  confidence: number;

}

export interface ImportResult {

    experiment: CanonicalExperiment;

    report: ImportReport;

    status: ImportStatus;

}

export interface IngestionResult {

    success: boolean;

    workbook: unknown;

    resolvedHeaders: unknown[];

    resolvedMaterials: unknown[];

    unknownHeaders: string[];

    warnings: ImportWarning[];

    errors: ImportError[];

    experiments?: ImportResult[];

}