import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  Bot,
  Check,
  ChevronDown,
  Copy,
  Droplet,
  Loader2,
  RotateCw,
  Ruler,
  Send,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
} from "motion/react";
import {
  collection,
  getDocs,
} from "firebase/firestore";

import { db } from "../lib/firebase";
import type {
  AISuggestion,
  Formulation,
} from "../types";
import {
  TRANSLATIONS,
  type Language,
} from "../lib/translations";

interface AIOptimizationWidgetProps {
  currentFormulation:
    | Formulation
    | null;
  projectId: string;
  lang: Language;
}

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
}

interface ApiErrorPayload {
  error?: string;
  code?: string;
}

interface ChatPayload {
  response?: string;
  error?: string;
  code?: string;
}

type HistoricalRun =
  Record<string, unknown>;

const QUICK_ACTIONS = [
  "Explain the main process risk",
  "Compare voltage and flow balance",
  "Suggest the next controlled test",
] as const;

export function AIOptimizationWidget({
  currentFormulation,
  projectId,
  lang,
}: AIOptimizationWidgetProps) {
  const t = TRANSLATIONS[lang];

  const [
    optimization,
    setOptimization,
  ] = useState<AISuggestion | null>(
    null
  );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [messages, setMessages] =
    useState<ChatMessage[]>([]);

  const [input, setInput] =
    useState("");

  const [chatLoading, setChatLoading] =
    useState(false);

  const [chatOpen, setChatOpen] =
    useState(false);

  const [copiedIndex, setCopiedIndex] =
    useState<number | null>(null);

  const chatEndRef =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentFormulation?.id) {
      setOptimization(null);
      return;
    }

    void handleOptimize();
  }, [currentFormulation?.id]);

  useEffect(() => {
    if (chatOpen) {
      chatEndRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }
  }, [
    messages,
    chatLoading,
    chatOpen,
  ]);

  async function handleCopy(
    text: string,
    index: number
  ): Promise<void> {
    try {
      await navigator.clipboard.writeText(
        text
      );

      setCopiedIndex(index);

      window.setTimeout(() => {
        setCopiedIndex((current) =>
          current === index
            ? null
            : current
        );
      }, 1_500);
    } catch {
      // Clipboard access can fail in an insecure context.
    }
  }

  async function loadHistoricalRuns(): Promise<
    HistoricalRun[]
  > {
    if (!projectId) {
      return [];
    }

    try {
      const experimentReference =
        collection(
          db,
          "projects",
          projectId,
          "experiments"
        );

      const snapshot =
        await getDocs(
          experimentReference
        );

      return snapshot.docs.map(
        (documentSnapshot) =>
          documentSnapshot.data()
      );
    } catch (caughtError: unknown) {
      console.warn(
        "Historical run lookup unavailable; AI recommendation will continue without legacy context.",
        caughtError
      );

      return [];
    }
  }

  async function handleOptimize(): Promise<void> {
    if (!currentFormulation) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const historicalRuns =
        await loadHistoricalRuns();

      const response = await fetch(
        "/api/suggest",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            ...currentFormulation,
            historicalRuns,
            lang,
          }),
        }
      );

      const payload =
        (await response
          .json()
          .catch(
            (): ApiErrorPayload | null =>
              null
          )) as
          | AISuggestion
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
        "polymerName" in payload &&
        "solvent" in payload &&
        "voltageKv" in payload &&
        "flowRateMlH" in payload &&
        "distanceMm" in payload &&
        "temperatureC" in payload &&
        "humidityPct" in payload &&
        "tips" in payload &&
        "reasoning" in payload
      ) {
        setOptimization(payload);
        return;
      }

      throw new Error(t.aiOptError);
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : t.aiOptError
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleChat(
    explicitMessage?: string
  ): Promise<void> {
    const message =
      (
        explicitMessage ??
        input
      ).trim();

    if (!message || chatLoading) {
      return;
    }

    const nextHistory: ChatMessage[] = [
      ...messages,
      {
        sender: "user",
        text: message,
      },
    ];

    setMessages(nextHistory);
    setInput("");
    setChatLoading(true);
    setChatOpen(true);

    try {
      const response = await fetch(
        "/api/ai/chat",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            message,
            history: messages,
            lang,
          }),
        }
      );

      const payload =
        (await response
          .json()
          .catch(
            (): ChatPayload | null =>
              null
          )) as ChatPayload | null;

      if (
        !response.ok ||
        !payload ||
        payload.error ||
        !payload.response
      ) {
        const messageText =
          response.status === 429 ||
          payload?.code ===
            "QUOTA_EXCEEDED"
            ? t.aiQuotaError
            : payload?.error ??
              t.aiChatError;

        throw new Error(messageText);
      }

      setMessages((current) => [
        ...current,
        {
          sender: "ai",
          text: payload.response ?? "",
        },
      ]);
    } catch (caughtError: unknown) {
      const messageText =
        caughtError instanceof Error
          ? caughtError.message
          : t.aiChatError;

      setMessages((current) => [
        ...current,
        {
          sender: "ai",
          text: `⚠ ${messageText}`,
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0d1015]">
      <header className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.08]">
            <Sparkles className="h-4 w-4 text-cyan-300" />
          </span>

          <div className="min-w-0">
            <h2 className="truncate text-[12px] font-semibold text-zinc-100">
              {t.aiOptTitle}
            </h2>

            <p className="mt-0.5 text-[10px] text-zinc-600">
              Gemini-powered process guidance
            </p>
          </div>
        </div>

        <span className="rounded-md border border-cyan-400/15 bg-cyan-400/[0.06] px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-cyan-300">
          Co-pilot
        </span>
      </header>

      <div className="p-3">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-3 gap-2"
            >
              {[0, 1, 2].map(
                (index) => (
                  <div
                    key={index}
                    className="h-14 animate-pulse rounded-xl border border-white/[0.05] bg-white/[0.025]"
                  />
                )
              )}
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
              className="flex items-center justify-between gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.05] p-3"
            >
              <div className="flex items-start gap-2 text-[11px] text-red-300">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>

              <button
                type="button"
                onClick={() =>
                  void handleOptimize()
                }
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-red-400/20 bg-red-400/[0.08] px-2.5 py-1.5 text-[10px] font-semibold text-red-200 transition-colors hover:bg-red-400/[0.13]"
              >
                <RotateCw className="h-3 w-3" />
                {t.aiRetry}
              </button>
            </motion.div>
          ) : optimization ? (
            <motion.div
              key="result"
              initial={{
                opacity: 0,
                y: 8,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <div className="grid grid-cols-3 gap-2">
                <ParameterCard
                  icon={<Zap className="h-3.5 w-3.5" />}
                  label={t.aiOptVoltage}
                  value={`${optimization.voltageKv} kV`}
                />

                <ParameterCard
                  icon={<Droplet className="h-3.5 w-3.5" />}
                  label={t.aiOptFlow}
                  value={`${optimization.flowRateMlH} mL/h`}
                />

                <ParameterCard
                  icon={<Ruler className="h-3.5 w-3.5" />}
                  label={t.aiOptDistance}
                  value={`${optimization.distanceMm} mm`}
                />
              </div>

              {optimization.reasoning && (
                <p className="line-clamp-3 rounded-xl border border-white/[0.06] bg-black/20 p-3 text-[11px] leading-relaxed text-zinc-500">
                  {optimization.reasoning}
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-16 items-center justify-center rounded-xl border border-dashed border-white/[0.08] text-[11px] text-zinc-600"
            >
              {t.aiOptSelectFormulation}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {QUICK_ACTIONS.map(
            (action) => (
              <button
                key={action}
                type="button"
                onClick={() =>
                  void handleChat(action)
                }
                disabled={chatLoading}
                className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 text-left text-[10px] leading-snug text-zinc-500 transition-all hover:border-cyan-400/15 hover:bg-cyan-400/[0.035] hover:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {action}
              </button>
            )
          )}
        </div>
      </div>

      <div className="border-t border-white/[0.06]">
        <button
          type="button"
          onClick={() =>
            setChatOpen(
              (current) => !current
            )
          }
          className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-white/[0.02]"
        >
          <span className="flex items-center gap-2 text-[11px] font-semibold text-zinc-300">
            <Bot className="h-3.5 w-3.5 text-cyan-300" />
            {t.aiChatTitle}
          </span>

          <ChevronDown
            className={`h-3.5 w-3.5 text-zinc-600 transition-transform ${
              chatOpen
                ? "rotate-180"
                : ""
            }`}
          />
        </button>

        <AnimatePresence initial={false}>
          {chatOpen && (
            <motion.div
              initial={{
                height: 0,
                opacity: 0,
              }}
              animate={{
                height: "auto",
                opacity: 1,
              }}
              exit={{
                height: 0,
                opacity: 0,
              }}
              transition={{
                duration: 0.24,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="overflow-hidden"
            >
              <div className="border-t border-white/[0.06] p-3">
                <div className="mb-2 max-h-44 min-h-24 space-y-2 overflow-y-auto rounded-xl border border-white/[0.06] bg-black/20 p-3">
                  {messages.length === 0 &&
                  !chatLoading ? (
                    <div className="flex min-h-20 items-center justify-center px-4 text-center text-[10px] text-zinc-600">
                      {t.aiChatEmpty}
                    </div>
                  ) : (
                    messages.map(
                      (message, index) => (
                        <div
                          key={`${message.sender}-${index}`}
                          className={`flex ${
                            message.sender ===
                            "user"
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <div
                            className={`group/message relative max-w-[88%] rounded-xl px-3 py-2 text-[11px] leading-relaxed ${
                              message.sender ===
                              "user"
                                ? "border border-cyan-400/15 bg-cyan-400/[0.07] text-cyan-100"
                                : "border border-white/[0.06] bg-white/[0.025] text-zinc-300"
                            }`}
                          >
                            {message.text}

                            {message.sender ===
                              "ai" && (
                              <button
                                type="button"
                                onClick={() =>
                                  void handleCopy(
                                    message.text,
                                    index
                                  )
                                }
                                title={t.aiCopy}
                                aria-label={
                                  t.aiCopy
                                }
                                className="absolute -bottom-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full border border-white/[0.07] bg-[#0b0d11] text-zinc-500 opacity-0 transition-all hover:text-cyan-300 group-hover/message:opacity-100"
                              >
                                {copiedIndex ===
                                index ? (
                                  <Check className="h-3 w-3 text-cyan-300" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    )
                  )}

                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2.5">
                        {[0, 1, 2].map(
                          (index) => (
                            <span
                              key={index}
                              className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300"
                              style={{
                                animationDelay: `${index * 140}ms`,
                              }}
                            />
                          )
                        )}
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                <div className="flex gap-2">
                  <input
                    value={input}
                    onChange={(event) =>
                      setInput(
                        event.target.value
                      )
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key ===
                        "Enter"
                      ) {
                        void handleChat();
                      }
                    }}
                    disabled={chatLoading}
                    className="fnk-input min-w-0 flex-1 px-3 py-2 text-[11px]"
                    placeholder={
                      t.aiChatPlaceholder
                    }
                  />

                  <button
                    type="button"
                    onClick={() =>
                      void handleChat()
                    }
                    disabled={
                      chatLoading ||
                      !input.trim()
                    }
                    className="flex h-8 w-9 items-center justify-center rounded-lg bg-cyan-400 text-[#071012] transition-all hover:bg-cyan-300 active:scale-95 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600"
                  >
                    {chatLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

interface ParameterCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function ParameterCard({
  icon,
  label,
  value,
}: ParameterCardProps) {
  return (
    <article className="rounded-xl border border-white/[0.06] bg-black/20 p-3 transition-colors hover:border-cyan-400/15 hover:bg-cyan-400/[0.025]">
      <div className="mb-1 flex items-center gap-1.5 text-cyan-300/80">
        {icon}

        <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-zinc-600">
          {label}
        </span>
      </div>

      <p className="font-mono text-[13px] font-semibold text-zinc-100">
        {value}
      </p>
    </article>
  );
}
