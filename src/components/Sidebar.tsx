import {
  Activity,
  Beaker,
  FileSpreadsheet,
  Globe,
  Layers,
  LayoutDashboard,
  Settings,
} from "lucide-react";
import { motion } from "motion/react";

import FluidnatekLogo from "./FluidnatekLogo";
import {
  TRANSLATIONS,
  type Language,
} from "../lib/translations";

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  projectsCount: number;
  experimentsCount: number;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
}

export default function Sidebar({
  currentView,
  onViewChange,
  projectsCount,
  experimentsCount,
  lang,
  onLanguageChange,
}: SidebarProps) {
  const t = TRANSLATIONS[lang];

  const menuItems = [
    { id: "DASHBOARD", label: t.dashboard, icon: LayoutDashboard, badge: experimentsCount > 0 ? String(experimentsCount) : undefined },
    { id: "FORMULATIONS", label: t.formulations, icon: Beaker, badge: projectsCount > 0 ? String(projectsCount) : undefined },
    { id: "RUN_CONFIG", label: t.runConfig, icon: Activity, badge: "AI" },
    { id: "EXCEL_IMPORT", label: t.excelImport, icon: FileSpreadsheet },
  ];

  return (
    <aside id="app-sidebar" className="flex h-screen w-[228px] shrink-0 select-none flex-col border-r border-white/[0.07] bg-[#0b0d11] text-zinc-100">
      <div className="border-b border-white/[0.06] px-4 py-4">
        <FluidnatekLogo variant="horizontal" className="h-8" />
        <div className="mt-3 flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.025] px-2.5 py-1.5">
          <span className="font-mono text-[8px] font-semibold uppercase tracking-[0.18em] text-zinc-600">{t.enclosureModel}</span>
          <span className="font-mono text-[9px] font-semibold text-cyan-300">{t.activeChamber}</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-600">Control system</p>
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <motion.button
                key={item.id}
                id={`sidebar-nav-${item.id.toLowerCase()}`}
                onClick={() => onViewChange(item.id)}
                whileTap={{ scale: 0.985 }}
                className={`relative flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors ${isActive ? "bg-cyan-400/[0.09] text-cyan-200" : "text-zinc-500 hover:bg-white/[0.035] hover:text-zinc-200"}`}
              >
                {isActive && (
                  <motion.span
                    layoutId="active-sidebar-item"
                    className="absolute inset-0 rounded-xl border border-cyan-400/20"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}

                <span className="relative flex min-w-0 items-center gap-2.5">
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-cyan-300" : "text-zinc-600"}`} />
                  <span className="truncate text-[12px] font-medium">{item.label}</span>
                </span>

                {item.badge && (
                  <span className={`relative rounded-md px-1.5 py-0.5 font-mono text-[9px] font-semibold ${isActive ? "bg-cyan-300/10 text-cyan-200" : "bg-white/[0.04] text-zinc-600"}`}>{item.badge}</span>
                )}
              </motion.button>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-white/[0.06] px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500">
            <Globe className="h-3.5 w-3.5 text-cyan-400" />
            <span>{t.chooseLanguage}</span>
          </div>
          <span className="font-mono text-[8px] uppercase tracking-widest text-zinc-600">{lang}</span>
        </div>

        <div className="grid grid-cols-3 gap-1 rounded-lg border border-white/[0.06] bg-white/[0.025] p-1">
          {(["it", "en", "es"] as Language[]).map((language) => {
            const isActive = lang === language;
            return (
              <button
                key={language}
                id={`lang-btn-${language}`}
                onClick={() => onLanguageChange(language)}
                className={`rounded-md py-1 text-[10px] font-semibold transition-colors ${isActive ? "bg-cyan-400 text-[#071012]" : "text-zinc-600 hover:bg-white/[0.04] hover:text-zinc-300"}`}
              >
                {language.toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mx-3 mb-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
        <div className="flex items-start gap-2">
          <Layers className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold text-zinc-300">Platform status</p>
            <div className="mt-2 space-y-1 font-mono text-[8px] text-zinc-600">
              <div className="flex justify-between gap-2"><span>In-Situ Node</span><span className="text-emerald-400">ONLINE</span></div>
              <div className="flex justify-between gap-2"><span>HV electrode</span><span>Fluidnatek-HV</span></div>
              <div className="flex justify-between gap-2"><span>Software</span><span>v3.0.0</span></div>
            </div>
          </div>
        </div>
      </div>

      <footer className="flex items-center justify-between border-t border-white/[0.06] px-4 py-2.5 text-[9px] text-zinc-700">
        <span className="flex items-center gap-1"><Settings className="h-3 w-3" />Config</span>
        <span>Bioinicia · 2026</span>
      </footer>
    </aside>
  );
}
