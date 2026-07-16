import React, { useState } from 'react';
import { Brain, Zap, Loader2, AlertTriangle, Lightbulb, FlaskConical } from 'lucide-react';
import { TelemetryRecord, TelemetryAnalysis } from '../types';
import { TRANSLATIONS, Language } from '../lib/translations';

interface AIInsightsProps {
  telemetryData: TelemetryRecord[];
  lang: Language;
}

export const AIInsights: React.FC<AIInsightsProps> = ({ telemetryData, lang }) => {
  const t = TRANSLATIONS[lang];
  const [analysis, setAnalysis] = useState<TelemetryAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasData = telemetryData && telemetryData.length > 0;

  const handleAnalyze = async () => {
    if (!hasData) return;
    setLoading(true);
    setError(null);
    setAnalysis(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch('/api/ai/analyze-telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telemetryData, lang }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await response.json().catch(() => null);

      if (!response.ok || !data || data.error) {
        if (response.status === 429 || data?.code === 'QUOTA_EXCEEDED') {
          throw new Error(t.aiQuotaError);
        }
        throw new Error(data?.error || t.aiOptError);
      }
      setAnalysis(data);
    } catch (e: any) {
      setError(e.name === 'AbortError' ? t.aiTimeoutError : (e.message || t.aiOptError));
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0a0a0b] border border-zinc-800/50 p-4 rounded-lg">
      <style>{`
        @keyframes fnk-rise2 { from { opacity: 0; transform: translateY(8px);} to { opacity:1; transform: translateY(0);} }
        @keyframes fnk-sweep { 0% { transform: translateX(-120%);} 100% { transform: translateX(120%);} }
        .fnk-rise2 { animation: fnk-rise2 .45s cubic-bezier(.22,1,.36,1) both; }
      `}</style>

      <div className="relative mb-5 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-400/10 ring-1 ring-indigo-400/30">
          <Brain className="text-indigo-300" size={18} />
        </span>
        <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-100">{t.aiInsightsTitle}</h2>
      </div>

      {/* Pulsante Analizza — micro-interazione premium */}
      <button
        onClick={handleAnalyze}
        disabled={loading || !hasData}
        className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-500 to-teal-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_24px_-8px_rgba(99,102,241,0.7)] transition-all hover:shadow-[0_0_28px_-6px_rgba(99,102,241,0.9)] active:scale-[0.98] disabled:cursor-not-allowed disabled:from-zinc-700 disabled:to-zinc-700 disabled:text-zinc-500 disabled:shadow-none"
      >
        {/* riflesso animato che attraversa il pulsante */}
        {!loading && hasData && (
          <span className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-20deg] bg-white/20 opacity-0 group-hover:opacity-100" style={{ animation: 'fnk-sweep 1.1s ease-in-out infinite' }} />
        )}
        {loading ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} className="transition-transform group-hover:scale-110" />}
        {loading ? t.aiAnalyzing : t.aiAnalyzeTelemetry}
      </button>

      {!hasData && (
        <p className="mt-3 text-center text-[11px] text-zinc-600">{t.aiNoTelemetry}</p>
      )}

      {error && (
        <div className="fnk-rise2 mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-300">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {analysis && !error && (
        <div className="fnk-rise2 mt-4 space-y-3">
          <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-4">
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-teal-300">
              <Lightbulb size={13} /> {t.aiSuggestionLabel}
            </p>
            <p className="text-sm leading-relaxed text-zinc-200">{analysis.suggestion}</p>
          </div>
          <div className="rounded-xl border border-[#27272a] bg-[#0a0a0b]/60 p-4">
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              <FlaskConical size={13} /> {t.aiReasoningLabel}
            </p>
            <p className="text-xs italic leading-relaxed text-zinc-500">{analysis.reasoning}</p>
          </div>
        </div>
      )}
    </div>
  );
};
