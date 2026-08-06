import {
  Activity,
  Database,
  FlaskConical,
  FolderKanban,
  Globe,
  Layers3,
  Settings,
  SlidersHorizontal,
} from "lucide-react";
import { motion } from "motion/react";

import FluidnatekLogo from "./FluidnatekLogo";
import type { Language } from "../lib/translations";

export type MainView =
  | "DATABASE_MANAGEMENT"
  | "PROJECTS"
  | "FORMULATIONS_CHARACTERIZATION"
  | "SETUPS"
  | "LIVE_TELEMETRY";

interface SidebarProps {
  currentView: MainView;
  onViewChange: (view: MainView) => void;
  projectsCount: number;
  experimentsCount: number;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
}

interface MenuItem {
  id: MainView;
  label: string;
  description: string;
  icon: typeof Database;
  badge?: string;
}

export default function Sidebar({
  currentView,
  onViewChange,
  projectsCount,
  experimentsCount,
  lang,
  onLanguageChange,
}: SidebarProps) {
  const menuItems: MenuItem[] = [
    {
      id: "DATABASE_MANAGEMENT",
      label: "Database Management",
      description: "Import and data quality",
      icon: Database,
    },
    {
      id: "PROJECTS",
      label: "Projects",
      description: "Active project context",
      icon: FolderKanban,
      badge:
        projectsCount > 0
          ? String(projectsCount)
          : undefined,
    },
    {
      id: "FORMULATIONS_CHARACTERIZATION",
      label: "Formulations & Characterization",
      description: "Composition and measurements",
      icon: FlaskConical,
    },
    {
      id: "SETUPS",
      label: "Setups",
      description: "Reusable machine configurations",
      icon: SlidersHorizontal,
    },
    {
      id: "LIVE_TELEMETRY",
      label: "Live Telemetry & Smart Memory",
      description: "Recommendations and run execution",
      icon: Activity,
      badge:
        experimentsCount > 0
          ? String(experimentsCount)
          : undefined,
    },
  ];

  return (
    <aside
      id="app-sidebar"
      className="flex h-screen w-[268px] shrink-0 select-none flex-col border-r border-slate-200 bg-white text-slate-900"
    >
      <header className="border-b border-slate-200 px-5 py-5">
        <FluidnatekLogo
          variant="horizontal"
          className="h-8"
        />

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Active system
            </span>

            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              ONLINE
            </span>
          </div>

          <p className="mt-1 text-xs font-semibold text-slate-700">
            Fluidnatek LE-500
          </p>
        </div>
      </header>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <p className="mb-3 px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
          Experimental workflow
        </p>

        <div className="space-y-1.5">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive =
              currentView === item.id;

            return (
              <motion.button
                key={item.id}
                id={`sidebar-nav-${item.id.toLowerCase()}`}
                type="button"
                onClick={() =>
                  onViewChange(item.id)
                }
                whileTap={{ scale: 0.985 }}
                className={`relative flex w-full items-start gap-3 rounded-2xl border px-3.5 py-3 text-left transition ${
                  isActive
                    ? "border-blue-200 bg-blue-50 shadow-sm"
                    : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    isActive
                      ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[12px] font-bold leading-tight ${
                        isActive
                          ? "text-blue-950"
                          : "text-slate-700"
                      }`}
                    >
                      {item.label}
                    </span>

                    {item.badge && (
                      <span
                        className={`rounded-md px-1.5 py-0.5 font-mono text-[9px] font-bold ${
                          isActive
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                    {item.description}
                  </p>
                </div>

                <span
                  className={`absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full ${
                    isActive
                      ? "bg-blue-600"
                      : "bg-transparent"
                  }`}
                />

                <span className="sr-only">
                  Step {index + 1}
                </span>
              </motion.button>
            );
          })}
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2">
            <Layers3 className="h-4 w-4 text-blue-600" />

            <p className="text-[11px] font-bold text-slate-700">
              Current workflow
            </p>
          </div>

          <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
            Project → Formulation → Characterization
            → Setup → Run → Historical Memory
          </p>
        </div>
      </nav>

      <div className="border-t border-slate-200 px-4 py-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <Globe className="h-3.5 w-3.5 text-blue-500" />
            Language
          </div>

          <span className="font-mono text-[9px] font-bold uppercase text-slate-400">
            {lang}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
          {(
            ["it", "en", "es"] as const
          ).map((language) => {
            const isActive =
              lang === language;

            return (
              <button
                key={language}
                id={`lang-btn-${language}`}
                type="button"
                onClick={() =>
                  onLanguageChange(language)
                }
                className={`rounded-lg py-1.5 text-[10px] font-bold transition ${
                  isActive
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-400 hover:text-slate-700"
                }`}
              >
                {language.toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>

      <footer className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-[9px] text-slate-400">
        <span className="flex items-center gap-1">
          <Settings className="h-3 w-3" />
          Platform settings
        </span>

        <span>v3.1</span>
      </footer>
    </aside>
  );
}