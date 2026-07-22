export interface DiscoveredParameter {
  parameter: string;
  originalHeader: string;
  confidence: number;
}

export function renderDetectedParameters(
  parameters: DiscoveredParameter[]
): string[] {
  if (!parameters || parameters.length === 0) {
    return [];
  }

  return parameters.map((p) => {
    const confidence = Math.round(p.confidence * 100);

    return `${p.parameter} (${confidence}%)`;
  });
}