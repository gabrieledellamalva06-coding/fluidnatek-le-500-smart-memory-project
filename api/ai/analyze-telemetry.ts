import {
  allowPostOnly, callGemini, normalizeLanguage,
  type ApiErrorPayload, type HttpRequest, type HttpResponse
} from "../_lib/geminiRest";

interface TelemetryRecord { voltageKv?: number; flowRateMlH?: number; }
interface AnalyzeBody { telemetryData?: unknown; lang?: unknown; }
interface Analysis { suggestion: string; reasoning: string; }

export default async function handler(request: HttpRequest, response: HttpResponse): Promise<void> {
  if (!allowPostOnly(request, response)) return;

  const body = typeof request.body === "object" && request.body !== null ? request.body as AnalyzeBody : {};
  const telemetry = Array.isArray(body.telemetryData)
    ? body.telemetryData.filter((item): item is TelemetryRecord => typeof item === "object" && item !== null)
    : [];

  if (telemetry.length === 0) {
    response.status(400).json({ error: "Dati telemetrici richiesti.", code: "INVALID_REQUEST" } satisfies ApiErrorPayload);
    return;
  }

  const fallback: Analysis = {
    suggestion: "La telemetria è stata analizzata con il motore deterministico.",
    reasoning: "Fallback disponibile anche senza Gemini."
  };

  try {
    const text = await callGemini(
      `Restituisci esclusivamente JSON con suggestion e reasoning. Telemetria: ${JSON.stringify(telemetry.slice(-50))}`,
      normalizeLanguage(body.lang)
    );
    const parsed = JSON.parse(text) as Partial<Analysis>;
    if (typeof parsed.suggestion !== "string" || typeof parsed.reasoning !== "string") throw new Error("Formato non valido.");
    response.status(200).json(parsed);
  } catch {
    response.status(200).json(fallback);
  }
}
