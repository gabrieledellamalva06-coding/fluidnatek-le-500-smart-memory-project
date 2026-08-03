interface VercelRequest {
  method?: string;
  body?: unknown;
}

interface VercelResponse {
  status(code: number): VercelResponse;
  json(payload: unknown): void;
  setHeader(name: string, value: string): void;
}

export default function handler(
  request: VercelRequest,
  response: VercelResponse
): void {
  response.setHeader("Allow", "POST");

  if (request.method !== "POST") {
    response.status(405).json({
      error: "Metodo non consentito.",
    });

    return;
  }

  response.status(200).json({
    polymerName: "Test polymer",
    solvent: "Test solvent",
    voltageKv: 18,
    flowRateMlH: 1,
    distanceMm: 150,
    temperatureC: 22,
    humidityPct: 40,
    tips: [
      "Endpoint Vercel operativo.",
      "Fallback deterministico attivo.",
    ],
    reasoning:
      "Risposta di diagnostica senza import esterni.",
  });
}