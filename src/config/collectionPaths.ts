export const DEFAULT_COMPANY_ID = "default";

export const CollectionPaths = {
  projects: (companyId = DEFAULT_COMPANY_ID): string =>
    `companies/${companyId}/projects`,

  materials: (companyId = DEFAULT_COMPANY_ID): string =>
    `companies/${companyId}/materials`,

  formulations: (companyId = DEFAULT_COMPANY_ID): string =>
    `companies/${companyId}/formulations`,

  setups: (companyId = DEFAULT_COMPANY_ID): string =>
    `companies/${companyId}/setups`,

  experiments: (companyId = DEFAULT_COMPANY_ID): string =>
    `companies/${companyId}/experiments`,

  processRecords: (companyId = DEFAULT_COMPANY_ID): string =>
    `companies/${companyId}/processRecords`,

  solutionCharacterizations: (
    companyId = DEFAULT_COMPANY_ID
  ): string =>
    `companies/${companyId}/solutionCharacterizations`,

  solutionCharacterizationRevisions: (
    characterizationId: string,
    companyId = DEFAULT_COMPANY_ID
  ): string =>
    `companies/${companyId}/solutionCharacterizations/${characterizationId}/revisions`,

  materialCharacterizations: (
    companyId = DEFAULT_COMPANY_ID
  ): string =>
    `companies/${companyId}/materialCharacterizations`,

  telemetry: (companyId = DEFAULT_COMPANY_ID): string =>
    `companies/${companyId}/telemetry`,
} as const;
