import {
  BrainCircuit,
  Database,
  Sparkles,
} from "lucide-react";
import { motion } from "motion/react";

import { getRegistryStatistics } from "../utils/parameterRegistry";

export default function ParameterLearningPanel() {
  const statistics = getRegistryStatistics();

  if (statistics.length === 0) {
    return null;
  }

  const totalSamples = statistics.reduce(
    (total, item) => total + item.samples,
    0
  );

  const averageConfidence =
    statistics.reduce(
      (total, item) =>
        total +
        item.averageConfidence * item.samples,
      0
    ) / Math.max(totalSamples, 1);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#111318]"
    >
      <header className="flex items-center justify-between gap-4 border-b border-white/[0.06] px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.08]">
            <BrainCircuit
              className="h-4 w-4 text-cyan-300"
              aria-hidden="true"
            />
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-zinc-100">
              Learned Process Intelligence
            </h2>

            <p className="mt-0.5 text-[11px] text-zinc-500">
              Knowledge extracted from confirmed mappings
              and historical imports
            </p>
          </div>
        </div>

        <div className="hidden items-center gap-4 sm:flex">
          <Metric
            label="Samples"
            value={String(totalSamples)}
            icon={
              <Database
                className="h-3.5 w-3.5"
                aria-hidden="true"
              />
            }
          />

          <Metric
            label="Confidence"
            value={`${Math.round(
              averageConfidence * 100
            )}%`}
            icon={
              <Sparkles
                className="h-3.5 w-3.5"
                aria-hidden="true"
              />
            }
          />
        </div>
      </header>

      <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
        {statistics.map((item, index) => (
          <motion.article
            key={item.parameter}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: index * 0.035,
              duration: 0.28,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="rounded-xl border border-white/[0.06] bg-black/20 p-4 transition-colors hover:border-cyan-400/20 hover:bg-cyan-400/[0.025]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-xs font-semibold text-zinc-200">
                  {item.parameter}
                </h3>

                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-600">
                  Canonical parameter
                </p>
              </div>

              <span className="shrink-0 rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-1 font-mono text-[10px] text-zinc-400">
                {item.samples} samples
              </span>
            </div>

            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-[10px]">
                <span className="uppercase tracking-wider text-zinc-600">
                  Confidence
                </span>

                <span className="font-mono font-semibold text-cyan-300">
                  {(
                    item.averageConfidence * 100
                  ).toFixed(1)}
                  %
                </span>
              </div>

              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min(
                      item.averageConfidence * 100,
                      100
                    )}%`,
                  }}
                  transition={{
                    delay: 0.15 + index * 0.035,
                    duration: 0.55,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                />
              </div>
            </div>

            {item.aliases.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {item.aliases
                  .slice(0, 5)
                  .map((alias) => (
                    <span
                      key={alias}
                      className="max-w-full truncate rounded-md border border-white/[0.06] bg-white/[0.025] px-2 py-1 text-[10px] text-zinc-500"
                    >
                      {alias}
                    </span>
                  ))}

                {item.aliases.length > 5 && (
                  <span className="rounded-md border border-white/[0.06] px-2 py-1 font-mono text-[10px] text-zinc-600">
                    +{item.aliases.length - 5}
                  </span>
                )}
              </div>
            )}
          </motion.article>
        ))}
      </div>
    </motion.section>
  );
}

interface MetricProps {
  label: string;
  value: string;
  icon: React.ReactNode;
}

function Metric({
  label,
  value,
  icon,
}: MetricProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-zinc-600">
        {icon}
      </span>

      <div>
        <p className="font-mono text-[10px] font-semibold text-zinc-300">
          {value}
        </p>

        <p className="text-[9px] uppercase tracking-wider text-zinc-600">
          {label}
        </p>
      </div>
    </div>
  );
}