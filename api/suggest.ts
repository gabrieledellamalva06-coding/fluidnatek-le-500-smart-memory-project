import {
  allowPostOnly, callGemini, getErrorMessage, normalizeLanguage,
  type ApiErrorPayload, type HttpRequest, type HttpResponse
} from "./_lib/geminiRest";

interface Suggestion {
  polymerName: string; solvent: string; voltageKv: number; flowRateMlH: number;
  distanceMm: number; temperatureC: number; humidityPct: number;
  tips: string[]; reasoning: string;
}
interface SuggestBody {
  polymerName?: unknown; solvent?: unknown; solidsContentPct?: unknown;
  viscosityMpas?: unknown; conductivityUsCm?: unknown; historicalRuns?: unknown; lang?: unknown;
}

export default async function handler(request: HttpRequest, response: HttpResponse): Promise<void> {
  if (!allowPostOnly(request, response)) return;
  const body = typeof request.body === "object" && request.body !== null ? request.body as SuggestBody : {};
  const polymerName = typeof body.polymerName === "string" ? body.polymerName.trim() : "";
  const solvent = typeof body.solvent === "string" ? body.solvent.trim() : "";
  const language = normalizeLanguage(body.lang);

  if (!polymerName || !solvent) {
    response.status(400).json({ error: "Polimero e solvente sono richiesti.", code: "INVALID_REQUEST" } satisfies ApiErrorPayload);
    return;
  }

  const fallback = createFallback(polymerName, solvent, language);

  try {
    const prompt = [
      "Restituisci esclusivamente JSON valido con queste proprietà:",
      "polymerName, solvent, voltageKv, flowRateMlH, distanceMm, temperatureC, humidityPct, tips, reasoning.",
      `Polimero: ${polymerName}`,
      `Solvente: ${solvent}`,
      `Solidi: ${String(body.solidsContentPct ?? "non specificato")}`,
      `Viscosità: ${String(body.viscosityMpas ?? "non specificata")}`,
      `Conducibilità: ${String(body.conductivityUsCm ?? "non specificata")}`,
      Array.isArray(body.historicalRuns) ? `Evidenze: ${JSON.stringify(body.historicalRuns.slice(0, 5))}` : "Nessuna evidenza."
    ].join("\n");

    const text = await callGemini(prompt, language);
    const parsed = JSON.parse(text) as Partial<Suggestion>;

    if (
      typeof parsed.polymerName !== "string" ||
      typeof parsed.solvent !== "string" ||
      typeof parsed.voltageKv !== "number" ||
      typeof parsed.flowRateMlH !== "number" ||
      typeof parsed.distanceMm !== "number" ||
      typeof parsed.temperatureC !== "number" ||
      typeof parsed.humidityPct !== "number" ||
      !Array.isArray(parsed.tips) ||
      typeof parsed.reasoning !== "string"
    ) {
      throw new Error("Formato Gemini non valido.");
    }

    response.status(200).json(parsed);
  } catch (error: unknown) {
    console.error("suggest fallback:", getErrorMessage(error));
    response.status(200).json(fallback);
  }
}

function createFallback(polymerName: string, solvent: string, language: "it" | "en" | "es"): Suggestion {
  const p = polymerName.toLowerCase();
  let voltageKv = 15, flowRateMlH = 1, distanceMm = 150, temperatureC = 22, humidityPct = 40;
  const tips: string[] = ["Validare la configurazione con una prova controllata."];

  if (p.includes("pcl")) { voltageKv = 18; flowRateMlH = 1.5; distanceMm = 160; temperatureC = 21; humidityPct = 45; }
  if (p.includes("pvdf")) { voltageKv = 21; flowRateMlH = 1.2; distanceMm = 180; temperatureC = 24; humidityPct = 32; }
  if (p.includes("nylon")) { voltageKv = 16.5; flowRateMlH = 0.8; distanceMm = 140; temperatureC = 23; humidityPct = 35; }

  return {
    polymerName, solvent, voltageKv, flowRateMlH, distanceMm, temperatureC, humidityPct, tips,
    reasoning: language === "en"
      ? "Deterministic fallback based on available formulation data."
      : language === "es"
        ? "Alternativa determinista basada en los datos disponibles."
        : "Fallback deterministico basato sui dati disponibili."
  };
}
