import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Loader2, Sparkles, Zap, Droplet, Ruler, AlertTriangle, RotateCw, Copy, Check } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Formulation, AISuggestion } from '../types';
import { TRANSLATIONS, Language } from '../lib/translations';

interface AIOptimizationWidgetProps {
  currentFormulation: Formulation | null;
  projectId: string;
  lang: Language;
}

type ChatMessage = { sender: 'user' | 'ai'; text: string };

export const AIOptimizationWidget: React.FC<AIOptimizationWidgetProps> = ({ currentFormulation, projectId, lang }) => {
  const t = TRANSLATIONS[lang];
  const [optimization, setOptimization] = useState<AISuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleCopy = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(prev => (prev === idx ? null : prev)), 1500);
    } catch {
      // Clipboard non disponibile (es. contesto non sicuro): ignora silenziosamente.
    }
  };

  // FIX 429: la dipendenza è l'ID (identità stabile), non l'oggetto inline
  // che cambiava reference ad ogni render scatenando chiamate a raffica.
  useEffect(() => {
    if (currentFormulation?.id) {
      handleOptimize();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFormulation?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  const handleOptimize = async () => {
    if (!currentFormulation) return;
    setLoading(true);
    setError(null);
    try {
      // Lo storico da Firestore è un "nice to have": un suo fallimento NON
      // deve bloccare il suggerimento AI.
      let historicalRuns: any[] = [];
      if (projectId) {
        try {
          const expRef = collection(db, 'projects', projectId, 'experiments');
          const snapshot = await getDocs(expRef);
          historicalRuns = snapshot.docs.map(doc => doc.data());
        } catch (fireErr) {
          console.warn('Firestore non raggiungibile, procedo senza storico:', fireErr);
        }
      }

      const response = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...currentFormulation, historicalRuns, lang })
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data || data.error) {
        if (response.status === 429 || data?.code === 'QUOTA_EXCEEDED') {
          throw new Error(t.aiQuotaError);
        }
        throw new Error(data?.error || t.aiOptError);
      }
      setOptimization(data);
    } catch (e: any) {
      setError(e.message || t.aiOptError);
    } finally {
      setLoading(false);
    }
  };

  const handleChat = async () => {
    if (!input.trim() || chatLoading) return;
    const userMsg = input.trim();
    const nextHistory: ChatMessage[] = [...messages, { sender: 'user', text: userMsg }];
    setMessages(nextHistory);
    setInput('');
    setChatLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, history: messages, lang })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data || data.error) {
        throw new Error(
          response.status === 429 || data?.code === 'QUOTA_EXCEEDED' ? t.aiQuotaError : (data?.error || t.aiChatError)
        );
      }
      setMessages(prev => [...prev, { sender: 'ai', text: data.response }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { sender: 'ai', text: `⚠️ ${e.message || t.aiChatError}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="bg-[#0a0a0b] border border-zinc-800/50 p-4 rounded-lg">
      <style>{`
        @keyframes fnk-shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
        @keyframes fnk-glow { 0%,100% { opacity: .35; transform: scale(1); } 50% { opacity: .9; transform: scale(1.12); } }
        @keyframes fnk-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .fnk-shimmer { background: linear-gradient(90deg, #18181b 0%, #232327 40%, #18181b 80%); background-size: 800px 100%; animation: fnk-shimmer 1.6s infinite linear; }
        .fnk-rise { animation: fnk-rise .45s cubic-bezier(.22,1,.36,1) both; }
      `}</style>

      {/* Header */}
      <div className="relative flex items-center gap-3 mb-5">
        <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-teal-400/10 ring-1 ring-teal-400/30">
          <span className="absolute inset-0 rounded-xl bg-teal-400/20" style={{ animation: 'fnk-glow 2.4s ease-in-out infinite' }} />
          <Sparkles className="relative h-4.5 w-4.5 text-teal-300" size={18} />
        </span>
        <h2 className="text-sm font-bold tracking-wide uppercase text-zinc-100">{t.aiOptTitle}</h2>
      </div>

      {/* Corpo: loading / error / result / empty */}
      <div className="relative min-h-[92px]">
        {loading ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-medium text-teal-300/80">
              <Loader2 className="animate-spin" size={14} />
              {t.aiOptAnalyzing}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map(i => (
                <div key={i} className="fnk-shimmer h-14 rounded-lg" />
              ))}
            </div>
            <div className="fnk-shimmer h-10 rounded-lg" />
          </div>
        ) : error ? (
          <div className="fnk-rise flex flex-col gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <div className="flex items-start gap-2 text-sm text-red-300">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={handleOptimize}
              className="group flex w-fit items-center gap-2 self-start rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-1.5 text-xs font-semibold text-red-200 transition-all hover:bg-red-400/20 active:scale-95"
            >
              <RotateCw size={13} className="transition-transform group-hover:rotate-180 duration-500" />
              {t.aiRetry}
            </button>
          </div>
        ) : optimization ? (
          <div className="fnk-rise space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <ParamCard icon={<Zap size={14} />} label={t.aiOptVoltage} value={`${optimization.voltageKv} kV`} />
              <ParamCard icon={<Droplet size={14} />} label={t.aiOptFlow} value={`${optimization.flowRateMlH} mL/h`} />
              <ParamCard icon={<Ruler size={14} />} label={t.aiOptDistance} value={`${optimization.distanceMm} mm`} />
            </div>
            {optimization.reasoning && (
              <p className="rounded-xl border border-[#27272a] bg-[#0a0a0b]/60 p-3 text-xs leading-relaxed text-zinc-400">
                {optimization.reasoning}
              </p>
            )}
          </div>
        ) : (
          <div className="flex h-[92px] items-center justify-center rounded-xl border border-dashed border-[#27272a] text-xs text-zinc-500">
            {t.aiOptSelectFormulation}
          </div>
        )}
      </div>

      {/* Divisore luminoso */}
      <div className="my-5 h-px w-full bg-gradient-to-r from-transparent via-[#27272a] to-transparent" />

      {/* Chatbot */}
      <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-zinc-300">
        <Bot size={15} className="text-teal-300" /> {t.aiChatTitle}
      </h3>

      <div className="mb-3 h-40 space-y-2 overflow-y-auto rounded-xl border border-[#27272a] bg-[#0a0a0b]/60 p-3">
        {messages.length === 0 && !chatLoading ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-[11px] text-zinc-600">
            {t.aiChatEmpty}
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`group/msg fnk-rise relative max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-teal-500/15 text-teal-100 ring-1 ring-teal-400/20'
                    : 'bg-[#18181b] text-zinc-300 ring-1 ring-[#27272a]'
                }`}
              >
                {m.text}
                {m.sender === 'ai' && (
                  <button
                    onClick={() => handleCopy(m.text, i)}
                    title={t.aiCopy}
                    aria-label={t.aiCopy}
                    className="absolute -bottom-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full border border-[#27272a] bg-[#0a0a0b] text-zinc-400 opacity-0 transition-all hover:text-teal-300 group-hover/msg:opacity-100 active:scale-90"
                  >
                    {copiedIdx === i ? <Check size={12} className="text-teal-400" /> : <Copy size={12} />}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
        {chatLoading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl bg-[#18181b] px-3 py-2.5 ring-1 ring-[#27272a]">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-teal-300"
                  style={{ animation: 'fnk-glow 1s ease-in-out infinite', animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleChat()}
          disabled={chatLoading}
          className="flex-1 rounded-xl border border-[#27272a] bg-[#0a0a0b] px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 outline-none transition-all focus:border-teal-400/40 focus:ring-2 focus:ring-teal-400/20 disabled:opacity-50"
          placeholder={t.aiChatPlaceholder}
        />
        <button
          onClick={handleChat}
          disabled={chatLoading || !input.trim()}
          className="group flex items-center justify-center rounded-xl bg-teal-500/90 px-3.5 text-black shadow-[0_0_20px_-6px_rgba(45,212,191,0.6)] transition-all hover:bg-teal-400 active:scale-90 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-500 disabled:shadow-none"
        >
          {chatLoading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} className="transition-transform group-hover:translate-x-0.5" />}
        </button>
      </div>
    </div>
  );
};

const ParamCard: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="group rounded-xl border border-[#27272a] bg-[#0a0a0b]/60 p-3 transition-all hover:border-teal-400/30 hover:bg-teal-400/5">
    <div className="mb-1 flex items-center gap-1.5 text-teal-300/70 transition-colors group-hover:text-teal-300">
      {icon}
      <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 group-hover:text-zinc-400">{label}</span>
    </div>
    <p className="font-mono text-sm font-bold text-white">{value}</p>
  </div>
);
