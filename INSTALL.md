# Vercel API package

Copy the `api` folder into the root of the React project.

Then add `GEMINI_API_KEY` to Vercel Production environment variables and deploy again.

Routes:
- GET /api/health
- POST /api/suggest
- POST /api/ai/analyze-telemetry
- POST /api/ai/chat

The suggestion and telemetry endpoints include deterministic fallbacks, so the application continues working when Gemini is missing or quota-limited.
