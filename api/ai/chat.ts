import {
  allowPostOnly, callGemini, normalizeLanguage,
  type ApiErrorPayload, type HttpRequest, type HttpResponse
} from "../_lib/geminiRest";

interface ChatBody { message?: unknown; lang?: unknown; }

export default async function handler(request: HttpRequest, response: HttpResponse): Promise<void> {
  if (!allowPostOnly(request, response)) return;

  const body = typeof request.body === "object" && request.body !== null ? request.body as ChatBody : {};
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!message) {
    response.status(400).json({ error: "Messaggio richiesto.", code: "INVALID_REQUEST" } satisfies ApiErrorPayload);
    return;
  }

  try {
    const text = await callGemini(
      `Restituisci esclusivamente JSON nel formato {"response":"..."}. Domanda: ${message}`,
      normalizeLanguage(body.lang)
    );
    const parsed = JSON.parse(text) as { response?: unknown };
    response.status(200).json({
      response: typeof parsed.response === "string" ? parsed.response : text
    });
  } catch {
    response.status(200).json({
      response: "Gemini non è disponibile. Smart Memory e Firestore restano operativi."
    });
  }
}
