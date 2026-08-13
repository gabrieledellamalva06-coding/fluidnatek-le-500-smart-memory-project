import {
  Activity,
  Database,
  FlaskConical,
  FolderKanban,
  PanelLeftClose,
  PanelLeftOpen,
  SlidersHorizontal,
} from "lucide-react";
import { motion } from "motion/react";
import FluidnatekLogo from "./FluidnatekLogo";

export type MainView =
  | "PROJECTS"
  | "FORMULATIONS_CHARACTERIZATION"
  | "SETUPS"
  | "LIVE_TELEMETRY"
  | "HISTORICAL_EXPERIMENTS"
  | "DATABASE_MANAGEMENT";

interface SidebarProps {
  currentView: MainView;
  onViewChange: (view: MainView) => void;
  projectsCount: number;
  experimentsCount: number;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  activeProjectSelected?: boolean;
  formulationSelected?: boolean;
  setupSelected?: boolean;
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
  collapsed,
  onToggleCollapsed,
}: SidebarProps) {
  const workflowItems: MenuItem[] = [
    {
      id: "PROJECTS",
      label: "1. Current Project",
      description: "Choose or create a research project",
      icon: FolderKanban,
      badge: projectsCount > 0 ? String(projectsCount) : undefined,
    },
    {
      id: "FORMULATIONS_CHARACTERIZATION",
      label: "2–3. Formulation & Characterization",
      description: "Browse compositions and solution measurements",
      icon: FlaskConical,
    },
    {
      id: "SETUPS",
      label: "4. Machine Setup",
      description: "Choose machine and reusable hardware",
      icon: SlidersHorizontal,
    },
    {
      id: "LIVE_TELEMETRY",
      label: "5–8. Experimental Run",
      description: "Parameters, historical analysis, evaluation and save",
      icon: Activity,
      badge: experimentsCount > 0 ? String(experimentsCount) : undefined,
    },
  ];

  const renderItem = (item: MenuItem) => {
    const Icon = item.icon;
    const active = currentView === item.id;

    return (
      <motion.button
        key={item.id}
        type="button"
        onClick={() => onViewChange(item.id)}
        whileTap={{ scale: 0.985 }}
        className={`relative flex w-full items-start gap-3 rounded-2xl border px-3.5 py-3 text-left transition ${
          active
            ? "border-blue-200 bg-blue-50 shadow-sm"
            : "border-transparent hover:border-slate-200 hover:bg-slate-50"
        }`}
      >
        <div
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className={`text-[12px] font-bold leading-tight ${active ? "text-blue-950" : "text-slate-700"}`}>
              {item.label}
            </span>
            {item.badge && (
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] font-bold text-slate-500">
                {item.badge}
              </span>
            )}
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-slate-400">{item.description}</p>
        </div>
        {active && <span className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-blue-600" />}
      </motion.button>
    );
  };

  return (
    <aside className={`relative flex h-screen shrink-0 select-none flex-col border-r border-slate-200 bg-white text-slate-900 transition-all duration-200 ${collapsed ? "w-[72px]" : "w-[290px]"}`}>
      <header className="border-b border-slate-200 px-5 py-5">
        {collapsed ? <FluidnatekLogo variant="symbol" className="h-10" lightMode /> : <FluidnatekLogo variant="horizontal" className="h-12" lightMode />}
      </header>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
        {!collapsed && <p className="mb-3 px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Experiment Workflow</p>}
        <div className="space-y-1.5">{workflowItems.map(renderItem)}</div>

        <div className="sticky bottom-0 mt-7 border-t border-slate-100 bg-white pt-4">
          {!collapsed && <p className="mb-3 px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Data & History</p>}
          <div className="space-y-1.5">
            {renderItem({
              id: "HISTORICAL_EXPERIMENTS",
              label: "Historical Experiments",
              description: "Search and inspect saved experimental runs",
              icon: Activity,
              badge: experimentsCount > 0 ? String(experimentsCount) : undefined,
            })}
            {renderItem({
              id: "DATABASE_MANAGEMENT",
              label: "Historical Data Import",
              description: "Import legacy or external files",
              icon: Database,
            })}
          </div>
        </div>
      </nav>

      <footer className="border-t border-slate-200 px-3 py-3">
        <button type="button" onClick={onToggleCollapsed} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} className="flex w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600 hover:bg-slate-100">
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </footer>
    </aside>
  );
}
