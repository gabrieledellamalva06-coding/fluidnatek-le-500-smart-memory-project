/**
 * ============================================================================
 * FLUIDNATEK SMART MEMORY
 * Canonical Fields
 *
 * Tutti i parser, resolver, AI e database utilizzano ESCLUSIVAMENTE
 * questi identificatori.
 *
 * Nessuna parte del software deve lavorare direttamente con stringhe
 * provenienti dagli Excel.
 * ============================================================================
 */

export const CanonicalFields = {

  // -------------------------------------------------------------------------
  // PROJECT
  // -------------------------------------------------------------------------

  PROJECT_ID: "project.id",
  PROJECT_NAME: "project.name",
  PROJECT_DESCRIPTION: "project.description",
  PROJECT_CUSTOMER: "project.customer",
  PROJECT_DATE: "project.date",

  // -------------------------------------------------------------------------
  // MATERIALS
  // -------------------------------------------------------------------------

  POLYMER: "material.polymer",
  SOLVENT: "material.solvent",
  ADDITIVE: "material.additive",

  POLYMER_CODE: "material.polymer.code",
  SOLVENT_CODE: "material.solvent.code",
  ADDITIVE_CODE: "material.additive.code",

  POLYMER_CONCENTRATION: "formulation.polymer.concentration",
  SOLVENT_RATIO: "formulation.solvent.ratio",

  // -------------------------------------------------------------------------
  // FORMULATION
  // -------------------------------------------------------------------------

  FORMULATION_ID: "formulation.id",

  // -------------------------------------------------------------------------
  // SETUP
  // -------------------------------------------------------------------------

  SETUP_ID: "setup.id",

  // -------------------------------------------------------------------------
  // PROCESS PARAMETERS
  // -------------------------------------------------------------------------

  FLOW_RATE: "process.flowRate",

  HV_POSITIVE: "process.hvPositive",

  HV_NEGATIVE: "process.hvNegative",

  DISTANCE: "process.distance",

  TEMPERATURE: "process.temperature",

  HUMIDITY: "process.humidity",

  PROCESSABILITY: "process.processability",

  PROCESS_COMMENTS: "process.comments",

  // -------------------------------------------------------------------------
  // SAMPLE
  // -------------------------------------------------------------------------

  SAMPLE_CODE: "sample.code",

  // -------------------------------------------------------------------------
  // RESULTS
  // -------------------------------------------------------------------------

  SEM_MORPHOLOGY: "result.semMorphology",

  FIBER_DIAMETER: "result.fiberDiameter",

  // -------------------------------------------------------------------------
  // SOLUTION PROPERTIES
  // -------------------------------------------------------------------------

  VISCOSITY: "solution.viscosity",

  CONDUCTIVITY: "solution.conductivity",

  SURFACE_TENSION: "solution.surfaceTension",

  DENSITY: "solution.density",

} as const;

export type CanonicalField =
    typeof CanonicalFields[keyof typeof CanonicalFields];