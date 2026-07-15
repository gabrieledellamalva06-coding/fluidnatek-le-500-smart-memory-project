import React from "react";
import {
  LayoutDashboard,
  Beaker,
  Activity,
  FileSpreadsheet,
  Layers,
  Settings,
  Globe
} from "lucide-react";
import FluidnatekLogo from "./FluidnatekLogo";
import { TRANSLATIONS, Language } from "../lib/translations";

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
  onLanguageChange
}: SidebarProps) {
  const t = TRANSLATIONS[lang];

  // LE500_CONSOLE removed as requested
  const menuItems = [
    {
      id: "DASHBOARD",
      label: t.dashboard,
      icon: LayoutDashboard,
      badge: experimentsCount > 0 ? String(experimentsCount) : undefined
    },
    {
      id: "FORMULATIONS",
      label: t.formulations,
      icon: Beaker,
      badge: projectsCount > 0 ? String(projectsCount) : undefined
    },
    {
      id: "RUN_CONFIG",
      label: t.runConfig,
      icon: Activity,
      badge: "AI"
    },
    {
      id: "EXCEL_IMPORT",
      label: t.excelImport,
      icon: FileSpreadsheet
    }
  ];

  return (
    <div id="app-sidebar" className="w-80 bg-[#0d0d0f] border-r border-[#27272a] flex flex-col h-screen text-[#f4f4f5] shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-[#27272a]">
        <FluidnatekLogo variant="horizontal" className="h-10" />
        <div className="mt-3 flex items-center justify-between bg-[#18181b] rounded-lg px-2.5 py-1.5 border border-[#27272a]">
          <span className="text-[9px] text-zinc-500 font-mono font-bold uppercase tracking-widest">{t.enclosureModel}</span>
          <span className="text-[10px] text-teal-400 font-bold font-mono animate-pulse">{t.activeChamber}</span>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        <div className="text-[10px] font-semibold text-zinc-500 tracking-wider uppercase px-3 mb-2">
          SISTEMA DI CONTROLLO
        </div>
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              id={`sidebar-nav-${item.id.toLowerCase()}`}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-200 group text-left ${
                isActive
                  ? "bg-teal-500/10 text-teal-400 font-medium border border-teal-500/20 pl-3"
                  : "text-zinc-400 hover:bg-[#18181b] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <IconComponent
                  className={`w-5 h-5 transition-colors ${
                    isActive ? "text-teal-400" : "text-zinc-400 group-hover:text-white"
                  }`}
                />
                <span className="text-sm tracking-wide">{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                    isActive
                      ? "bg-teal-500/20 text-teal-300"
                      : "bg-[#18181b] text-zinc-400 group-hover:bg-[#27272a]"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Language Selector Selector Component */}
      <div className="px-6 py-3 border-t border-[#27272a] bg-[#0d0d0f]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-semibold">
            <Globe className="w-3.5 h-3.5 text-teal-400" />
            <span>{t.chooseLanguage}</span>
          </div>
          <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
            {lang}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 bg-[#18181b] p-1 rounded-lg border border-[#27272a]">
          {(["it", "en", "es"] as Language[]).map((l) => {
            const isActive = lang === l;
            const labels = { it: "IT", en: "EN", es: "ES" };
            return (
              <button
                key={l}
                id={`lang-btn-${l}`}
                onClick={() => onLanguageChange(l)}
                className={`py-1 rounded text-xs font-bold transition-all ${
                  isActive
                    ? "bg-teal-500 text-black shadow-md shadow-black/30"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-[#27272a]/50"
                }`}
              >
                {labels[l]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Platform Status Card */}
      <div className="p-4 m-4 bg-[#18181b]/60 rounded-xl border border-[#27272a]">
        <div className="flex items-start gap-2.5">
          <Layers className="w-4 h-4 text-teal-400 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-zinc-300">Stato Piattaforma</h4>
            <div className="space-y-1 text-[10px] font-mono text-zinc-500">
              <div className="flex justify-between gap-2">
                <span>In-Situ Node:</span>
                <span className="text-teal-400 font-bold">ONLINE</span>
              </div>
              <div className="flex justify-between gap-2">
                <span>Elettrodo AT:</span>
                <span>Fluidnatek-HV</span>
              </div>
              <div className="flex justify-between gap-2">
                <span>Versione SW:</span>
                <span>v3.0.0</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-[#27272a] flex items-center justify-between text-xs text-zinc-600">
        <div className="flex items-center gap-1">
          <Settings className="w-3.5 h-3.5" />
          <span>Configurazione</span>
        </div>
        <span>Bioinicia SL © 2026</span>
      </div>
    </div>
  );
}
