export type SupportedLanguage = "it" | "en" | "es";

export interface HttpRequest { method?: string; body?: unknown; }
export interface HttpResponse {
  status(code: number): HttpResponse;
  json(payload: unknown): void;
  setHeader(name: string, value: string): void;
}
export interface ApiErrorPayload {
  error: string;
  code?: "INVALID_REQUEST" | "AI_UNAVAILABLE";
}
interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { message?: string };
}

export function allowPostOnly(request: HttpRequest, response: HttpResponse): boolean {
  response.setHeader("Allow", "POST");
  if (request.method === "POST") return true;
  response.status(405).json({ error: "Metodo non consentito.", code: "INVALID_REQUEST" } satisfies ApiErrorPayload);
  return false;
}
export function normalizeLanguage(value: unknown): SupportedLanguage {
  return value === "en" || value === "es" ? value : "it";
}
function languageInstruction(language: SupportedLanguage): string {
  if (language === "en") return "Respond exclusively in English.";
  if (language === "es") return "Responde exclusivamente en español.";
  return "Rispondi esclusivamente in italiano.";
}
export async function callGemini(prompt: string, language: SupportedLanguage): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY non configurata.");

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: `Sei un assistente scientifico Fluidnatek LE-500. ${languageInstruction(language)}` }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 }
    })
  });

  const payload = await response.json() as GeminiResponse;
  if (!response.ok) throw new Error(payload.error?.message || `Gemini API error ${response.status}`);

  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error("Gemini ha restituito una risposta vuota.");
  return text;
}
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Errore AI non identificato.";
}
