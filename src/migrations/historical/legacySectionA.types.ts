/**
 * ============================================================================
 * FLUIDNATEK SMART MEMORY
 * Historical Section A - Legacy Types
 *
 * These interfaces describe the source format produced by the
 * fluidnatek-ai-process-assistant repository.
 *
 * They are migration-only types.
 * They MUST NOT become application domain models.
 * ============================================================================
 */

export interface LegacyProject {
  project_id: string;
  project_code: string;
  beas_code: string;
  client: string;
  rd_leader: string;
  year: number | null;
}

export interface LegacyMaterial {
  material_id: string;
  material_name: string;
  material_type: string;
  molecular_weight: string;
  supplier: string;
  article_number: string;
  batch_number: string;
  notes: string;

  /** Optional fields exported from Santiago's Lista_materiales sheets. */
  short_name?: string;
  polymer_family?: string;
  solvent_family?: string;
  available?: string;
}

export interface LegacyFormulation {
  formulation_id: string;
  project_id: string;

  /** Human-readable FORMULA value from Santiago's workbook. */
  formulation_name?: string;

  polymer_concentration: number | null;
  notes: string;
}

export interface LegacyFormulationComponent {
  formulation_component_id: string;
  formulation_id: string;
  material_id: string;
  component_role: string;
  concentration: number | null;
  ratio: number | null;
}

export interface LegacySetup {
  setup_id: string;
  name: string;
  machine: string;
  injector_model_id: string;
  collector_model_id: string;
  number_of_needles: number | null;
  needle_gauge: string;
  platform: string;
  custom_configuration: Record<string, unknown>;
  notes: string;
}

export interface LegacyRun {
  run_id: string;
  sample_code: string;

  project_id: string;
  formulation_id: string;
  setup_id: string;

  date: string;
  purpose: string;

  flow_rate: number | null;
  flow_rate_raw?: string;

  injector_voltage: number | null;
  injector_voltage_raw?: string;

  collector_voltage: number | null;
  collector_voltage_raw?: string;

  relative_humidity: number | null;
  relative_humidity_raw?: string;

  temperature: number | null;
  temperature_raw?: string;

  drum_speed: number | null;

  working_distance: number | null;
  working_distance_raw?: string;

  processability_score: number | null;

  process_comments: string;

  is_incomplete: boolean;
}

export interface LegacyCharacterization {
  characterization_id: string;
  formulation_id: string;

  measurement_date: string;

  viscosity: number | null;
  conductivity: number | null;
  surface_tension: number | null;
  solid_content: number | null;
  density?: number | null;
  ph?: number | null;

  notes: string;
}

export interface LegacyResult {
  result_id: string;
  run_id: string;

  sem_morphology: string;
  filtration_performance: string;

  notes: string;
}

export interface LegacySectionADataset {
  projects: LegacyProject[];
  materials: LegacyMaterial[];
  formulations: LegacyFormulation[];
  formulationComponents: LegacyFormulationComponent[];
  setups: LegacySetup[];
  runs: LegacyRun[];
  characterizations: LegacyCharacterization[];
  results: LegacyResult[];
}