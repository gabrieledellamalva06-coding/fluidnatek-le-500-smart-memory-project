import React, { useState } from 'react';
import { Brain, Zap, Loader2, AlertCircle } from 'lucide-react';
import { TelemetryRecord } from '../types';

interface AIInsightsProps {
  telemetryData: TelemetryRecord[];
}

export const AIInsights: React.FC<AIInsightsProps> = ({ telemetryData }) => {
  const [analysis, setAnalysis] = useState<{suggestion: string, reasoning: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!telemetryData || telemetryData.length === 0) return;
    
    setLoading(true);
    setError(null);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout
    
    try {
      const response = await fetch('/api/ai/analyze-telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telemetryData }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      const responseText = await response.text();
      
      if (!response.ok) {
        throw new Error(`Errore server (${response.status}): ${responseText}`);
      }
      
      const data = JSON.parse(responseText);
      if (data.error) throw new Error(data.error);
      setAnalysis(data);
    } catch (e: any) {
      if (e.message.includes("limite giornaliero")) {
        setError("Hai raggiunto il limite giornaliero di richieste AI. Per favore, riprova domani.");
      } else {
        setError(e.name === 'AbortError' ? 'La richiesta ha superato il tempo massimo (60s).' : e.message);
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
        <Brain className="text-blue-600" size={20}/> AI Insights
      </h2>
      
      <button 
        onClick={handleAnalyze} 
        disabled={loading || telemetryData.length === 0}
        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-sm font-medium transition-colors"
      >
        {loading ? <Loader2 className="animate-spin" size={16}/> : <Zap size={16}/>}
        Analizza Telemetria
      </button>

      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md flex items-center gap-2 text-sm">
          <AlertCircle size={16}/>
          {error}
        </div>
      )}

      {analysis && !error && (
        <div className="mt-4 space-y-3 text-sm text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-100">
            <div>
                <p className="font-semibold text-gray-900">Suggerimento AI:</p>
                <p className="mt-1">{analysis.suggestion}</p>
            </div>
            <div>
                <p className="font-semibold text-gray-900">Ragionamento Scientifico:</p>
                <p className="mt-1 text-gray-600 italic">{analysis.reasoning}</p>
            </div>
        </div>
      )}
    </div>
  );
};
