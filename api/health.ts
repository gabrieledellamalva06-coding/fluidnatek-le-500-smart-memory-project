interface HttpResponse { status(code: number): HttpResponse; json(payload: unknown): void; }

export default function handler(_request: unknown, response: HttpResponse): void {
  response.status(200).json({
    status: "ok",
    service: "fluidnatek-smart-memory",
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim())
  });
}
