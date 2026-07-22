export const DEFAULT_COMPANY_ID = "default";

export const CollectionPaths = {
  projects: (companyId = DEFAULT_COMPANY_ID) =>
    `companies/${companyId}/projects`,

  formulations: (companyId = DEFAULT_COMPANY_ID) =>
    `companies/${companyId}/formulations`,

  experiments: (companyId = DEFAULT_COMPANY_ID) =>
    `companies/${companyId}/experiments`,

  telemetry: (companyId = DEFAULT_COMPANY_ID) =>
    `companies/${companyId}/telemetry`,
};