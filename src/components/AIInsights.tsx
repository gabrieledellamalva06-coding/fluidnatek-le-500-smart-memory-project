import { useState } from "react";
import {
  AlertTriangle,
  Brain,
  FlaskConical,
  Lightbulb,
  Loader2,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import type {
  TelemetryAnalysis,
  TelemetryRecord,
} from "../types";
import {
  TRANSLATIONS,
  type Language,
} from "../lib/translations";

interface AIInsightsProps {
  telemetryData: TelemetryRecord[];
  lang: Language;
}

interface ApiErrorPayload {
  error?: string;
  code?: string;
}

export function AIInsights({
  telemetryData,
  lang,
}: AIInsightsProps) {
  const t = TRANSLATIONS[lang];

  const [analysis, setAnalysis] =
    useState<TelemetryAnalysis | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const hasData =
    telemetryData.length > 0;

  async function handleAnalyze(): Promise<void> {
    if (!hasData || loading) {
      return;
    }

    setLoading(true);
    setError(null);

    const controller =
      new AbortController();

    const timeoutId = window.setTimeout(
      () => controller.abort(),
      60_000
    );

    try {
      const response = await fetch(
        "/api/ai/analyze-telemetry",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            telemetryData,
            lang,
          }),
          signal: controller.signal,
        }
      );

      const payload =
        (await response
          .json()
          .catch(
            (): ApiErrorPayload | null =>
              null
          )) as
          | TelemetryAnalysis
          | ApiErrorPayload
          | null;

      if (
        !response.ok ||
        !payload ||
        "error" in payload
      ) {
        const errorPayload =
          payload &&
          "error" in payload
            ? payload
            : null;

        if (
          response.status === 429 ||
          errorPayload?.code ===
            "QUOTA_EXCEEDED"
        ) {
          throw new Error(
            t.aiQuotaError
          );
        }

        throw new Error(
          errorPayload?.error ??
            t.aiOptError
        );
      }

      if (
        "suggestion" in payload &&
        "reasoning" in payload
      ) {
        setAnalysis(payload);
        return;
      }

      throw new Error(t.aiOptError);
    } catch (caughtError: unknown) {
      const message =
        caughtError instanceof DOMException &&
        caughtError.name ===
          "AbortError"
          ? t.aiTimeoutError
          : caughtError instanceof Error
            ? caughtError.message
            : t.aiOptError;

      setError(message);
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0d1015]">
      <header className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-400/[0.08]">
            <Brain className="h-4 w-4 text-indigo-300" />
          </span>

          <div className="min-w-0">
            <h2 className="truncate text-[12px] font-semibold text-zinc-100">
              {t.aiInsightsTitle}
            </h2>

            <p className="mt-0.5 text-[10px] text-zinc-600">
              Telemetry-driven process review
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAnalyze}
          disabled={loading || !hasData}
          className="group flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-cyan-400/20 bg-cyan-400/[0.08] px-3 text-[11px] font-semibold text-cyan-200 transition-all hover:border-cyan-300/30 hover:bg-cyan-400/[0.12] active:scale-[0.98] disabled:cursor-not-allowed disabled:border-white/[0.06] disabled:bg-white/[0.025] disabled:text-zinc-600"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Zap className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
          )}

          {loading
            ? t.aiAnalyzing
            : t.aiAnalyzeTelemetry}
        </button>
      </header>

      <AnimatePresence mode="wait">
        {!hasData ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 py-4 text-[11px] text-zinc-600"
          >
            {t.aiNoTelemetry}
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={{
              opacity: 0,
              y: 6,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{ opacity: 0 }}
            className="m-3 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.05] p-3 text-[11px] text-red-300"
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </motion.div>
        ) : analysis ? (
          <motion.div
            key="analysis"
            initial={{
              opacity: 0,
              y: 8,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{ opacity: 0 }}
            className="grid gap-3 p-3 xl:grid-cols-[1.15fr_0.85fr]"
          >
            <article className="rounded-xl border border-cyan-400/15 bg-cyan-400/[0.04] p-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-300">
                <Lightbulb className="h-3 w-3" />
                {t.aiSuggestionLabel}
              </p>

              <p className="text-[12px] leading-relaxed text-zinc-200">
                {analysis.suggestion}
              </p>
            </article>

            <article className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                <FlaskConical className="h-3 w-3" />
                {t.aiReasoningLabel}
              </p>

              <p className="line-clamp-5 text-[11px] leading-relaxed text-zinc-500">
                {analysis.reasoning}
              </p>
            </article>
          </motion.div>
        ) : (
          <motion.div
            key="ready"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 py-4 text-[11px] text-zinc-600"
          >
            Run an analysis to extract actionable telemetry insights.
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
