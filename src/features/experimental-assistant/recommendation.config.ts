export interface ScientificParameterLimit {
  minimum: number;
  maximum: number;
}

export const RECOMMENDATION_CONFIG = {
  minimumReliableExperiments: 3,
  minimumSimilarity: 30,
  maximumSourceExperiments: 12,
  lowConfidenceThreshold: 0.65,
  robustLowerQuantile: 0.25,
  robustUpperQuantile: 0.75,
  limits: {
    flowRateMlH: { minimum: 0, maximum: 100 },
    voltageKv: { minimum: 0, maximum: 100 },
    hvNegativeKv: { minimum: -100, maximum: 0 },
    temperatureC: { minimum: -20, maximum: 100 },
    humidityPct: { minimum: 0, maximum: 100 },
    distanceMm: { minimum: 1, maximum: 1000 },
  },
} as const;
