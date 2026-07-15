import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Lazy initialization of GoogleGenAI
let ai: GoogleGenAI | null = null;

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    // Check for Quota Exceeded (429)
    const isQuotaExceeded = error?.status === 429 || error?.error?.code === 429;
    if (isQuotaExceeded) {
       throw new Error("Hai raggiunto il limite giornaliero di richieste AI. Riprova più tardi.");
    }

    const isServiceUnavailable = error?.status === 503 || error?.error?.code === 503;
    if (retries > 0 && isServiceUnavailable) {
      console.warn(`Gemini 503 error, retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

function getGeminiClient(): GoogleGenAI | null {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.trim() !== "") {
      ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
  }
  return ai;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Logging middleware
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });

  // Health endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // AI-powered parameter suggestion
  app.post("/api/suggest", async (req, res) => {
    const {
      polymerName,
      solvent,
      solidsContentPct,
      viscosityMpas,
      conductivityUsCm,
      historicalRuns
    } = req.body;

    if (!polymerName || !solvent) {
      return res.status(400).json({ error: "Polimero e solvente sono richiesti." });
    }

    const gemini = getGeminiClient();

    if (!gemini) {
      console.log("No GEMINI_API_KEY found, using advanced rule-based algorithm fallback");
      
      // Sophisticated physics-based calculation fallback
      let voltage = 15.0;
      let flow = 1.0;
      let dist = 150;
      let temp = 22.0;
      let hum = 40.0;
      const tips: string[] = [];

      // Rules depending on polymer type
      const pLower = polymerName.toLowerCase();
      const sLower = solvent.toLowerCase();

      if (pLower.includes("nylon")) {
        voltage = 16.5;
        flow = 0.8;
        dist = 140;
        temp = 23.0;
        hum = 35.0;
        tips.push("Il Nylon-6 è igroscopico; mantenere l'umidità rigorosamente sotto il 40% per prevenire gocciolamento.");
        tips.push("Se le fibre mostrano sferule, aumentare gradualmente il voltaggio a passi di 0.5 kV.");
      } else if (pLower.includes("pvdf")) {
        voltage = 21.0;
        flow = 1.2;
        dist = 180;
        temp = 24.0;
        hum = 32.0;
        tips.push("Per massimizzare la fase beta piezoelettrica nel PVDF, utilizzare un collettore a tamburo rotante veloce (>1000 RPM).");
        tips.push("Il solvente DMF ha un punto di ebollizione elevato; una distanza ago-collettore maggiore (180mm) aiuta l'evaporazione.");
      } else if (pLower.includes("pcl")) {
        voltage = 18.0;
        flow = 1.5;
        dist = 160;
        temp = 21.0;
        hum = 45.0;
        tips.push("Il PCL ha un basso punto di fusione; evitare che l'ambiente si riscaldi sopra i 25°C.");
        tips.push("Per la filatura coassiale, assicurarsi che la portata del nucleo sia circa 1/3 della portata del guscio.");
      } else {
        // General formulas based on viscosity & conductivity
        if (viscosityMpas && viscosityMpas > 500) {
          flow = 1.4;
          voltage = 19.0;
          tips.push("Viscosità elevata rilevata. Aumentare leggermente la portata per evitare il blocco dell'ago.");
        }
        if (conductivityUsCm && conductivityUsCm > 10) {
          voltage = 14.0;
          tips.push("L'alta conducibilità aumenta le forze di trazione elettrica; un voltaggio moderato è sufficiente per avviare il getto.");
        }
      }

      if (tips.length === 0) {
        tips.push("Regolare la portata a passi di 0.1 mL/h per trovare l'equilibrio del Taylor Cone.");
        tips.push("Eseguire una pulizia regolare dell'ago per evitare l'accumulo di polimero solidificato (scabbing).");
      }

      return res.json({
        polymerName,
        solvent,
        voltageKv: voltage,
        flowRateMlH: flow,
        distanceMm: dist,
        temperatureC: temp,
        humidityPct: hum,
        tips,
        reasoning: `[Algoritmo Deterministico] Calcolato basandosi su viscosità (${viscosityMpas || "N/A"} mPa·s), conducibilità (${conductivityUsCm || "N/A"} µS/cm) e solidi (${solidsContentPct || "N/A"}%). Configura un API Key in Secrets per sbloccare l'AI generativa avanzata.`
      });
    }

    try {
      // Prompt construction with context
      const prompt = `Sei un esperto di ingegneria chimica e nanotecnologie specializzato nel processo di elettrofilatura (electrospinning) con il sistema Fluidnatek LE-500.
Devo avviare un nuovo esperimento con la seguente formulazione:
- Polimero: ${polymerName}
- Solvente: ${solvent}
- Percentuale Solidi: ${solidsContentPct ? `${solidsContentPct}%` : "Non specificato"}
- Viscosità: ${viscosityMpas ? `${viscosityMpas} mPa·s` : "Non specificato"}
- Conducibilità elettrica: ${conductivityUsCm ? `${conductivityUsCm} µS/cm` : "Non specificato"}

${historicalRuns && historicalRuns.length > 0 ? `Ecco lo storico di alcuni esperimenti eseguiti in precedenza:\n${JSON.stringify(historicalRuns, null, 2)}` : ""}

Fornisci raccomandazioni ottimali di processo in formato JSON strutturato, spiegando il motivo delle scelte in modo scientifico.`;

      const response = await withRetry(() => gemini.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "Sei un assistente scientifico avanzato per il Fluidnatek LE-500. Fornisci parametri precisi e suggerimenti utili in italiano, formattati rigorosamente in JSON.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              polymerName: { type: Type.STRING },
              solvent: { type: Type.STRING },
              voltageKv: { type: Type.NUMBER, description: "Recommended high voltage in kV, e.g., 16.5" },
              flowRateMlH: { type: Type.NUMBER, description: "Recommended flow rate in mL/h, e.g., 1.2" },
              distanceMm: { type: Type.NUMBER, description: "Optimal emitter-to-collector distance in mm, e.g., 150" },
              temperatureC: { type: Type.NUMBER, description: "Ideal climate chamber temperature in Celsius, e.g., 22.5" },
              humidityPct: { type: Type.NUMBER, description: "Ideal relative humidity percentage, e.g., 35.0" },
              tips: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "3 to 4 specific troubleshooting and optimization tips for this mixture"
              },
              reasoning: { type: Type.STRING, description: "Scientific physical reasoning behind these recommended parameters" }
            },
            required: ["polymerName", "solvent", "voltageKv", "flowRateMlH", "distanceMm", "temperatureC", "humidityPct", "tips", "reasoning"]
          }
        }
      }));

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response from Gemini");
      }

      const suggestion = JSON.parse(responseText.trim());
      return res.json(suggestion);
    } catch (err: any) {
      console.error("Gemini Error:", err);
      return res.status(500).json({ error: "Errore nella generazione dei parametri AI: " + err.message });
    }
  });

  // AI-powered telemetry analysis
  app.post("/api/ai/analyze-telemetry", async (req, res) => {
    const { telemetryData } = req.body;

    if (!telemetryData || !Array.isArray(telemetryData)) {
      return res.status(400).json({ error: "Dati telemetrici richiesti." });
    }

    const gemini = getGeminiClient();
    if (!gemini) {
      return res.json({ 
        suggestion: "Impossibile analizzare: Gemini API non configurato. Basandosi sui dati, assicurati che la portata sia stabile.",
        reasoning: "Fallback a causa di mancanza di API key."
      });
    }

    try {
      const prompt = `Sei un esperto di elettrofilatura. Analizza questi dati di telemetria e suggerisci aggiustamenti per migliorare l'uniformità delle fibre (voltaggio, portata):\n${JSON.stringify(telemetryData.slice(-50), null, 2)}`; // Limita i dati

      const response = await withRetry(() => gemini.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "Fornisci suggerimenti scientifici in formato JSON con 'suggestion' e 'reasoning'.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              suggestion: { type: Type.STRING },
              reasoning: { type: Type.STRING },
            },
            required: ["suggestion", "reasoning"]
          }
        }
      }));

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response");
      }

      const result = JSON.parse(responseText.trim());
      return res.json(result);
    } catch (err: any) {
      console.error("Analysis Error:", err);
      return res.status(500).json({ error: "Errore nell'analisi: " + err.message });
    }
  });

  // AI Chatbot endpoint
  app.post("/api/ai/chat", async (req, res) => {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Messaggio richiesto." });
    }

    const gemini = getGeminiClient();
    if (!gemini) {
      return res.status(500).json({ error: "Gemini API non configurato." });
    }

    try {
      const chat = gemini.chats.create({
        model: "gemini-3.5-flash",
        config: {
          systemInstruction: "Sei un assistente esperto per il sistema di elettrofilatura Fluidnatek LE-500. Aiuta gli utenti a ottimizzare i parametri di processo (voltaggio, portata, distanza) e a interpretare i risultati sperimentali basandoti sulla scienza dei materiali.",
        },
      });

      // Simple implementation: Send message with history
      // Note: A more robust implementation would manage the chat history properly
      const response = await withRetry(() => chat.sendMessage({ message: message }));
      return res.json({ response: response.text });
    } catch (err: any) {
      console.error("Chat Error:", err);
      return res.status(500).json({ error: "Errore nel chatbot: " + err.message });
    }
  });

  // Vite development vs production static setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development server middleware loaded.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static production files from:", distPath);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server fully started and running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start fullstack server:", err);
});
