import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";
import {
  Search,
  Zap,
  Droplet,
  Thermometer,
  CloudLightning,
  AlertCircle,
  FileSpreadsheet,
  Gauge,
  CheckCircle,
  Clock,
  Filter,
  Eye,
  Trash2,
  Edit2,
  Printer
} from "lucide-react";
import { Experiment, Formulation, Project } from "../types";
import { TRANSLATIONS, Language } from "../lib/translations";
import ExperimentEditor from "./ExperimentEditor";
import { AIOptimizationWidget } from "./AIOptimizationWidget";
import { AIInsights } from "./AIInsights";
import Fuse from "fuse.js";
import {
  getExperimentsForFormulation,
  getAverageVoltage,
  getAverageFlowRate
} from "../utils/knowledgeEngine";

interface DashboardProps {
  projects: Project[];
  formulations: Formulation[];
  experiments: Experiment[];
  selectedExp: Experiment | null;
  onSelectExp: (exp: Experiment) => void;
  onDeleteExp?: (id: string) => void;
  onUpdateExp: (exp: Experiment) => void;
  lang: Language;
}

export default function Dashboard({
  projects,
  formulations,
  experiments,
  selectedExp,
  onSelectExp,
  onDeleteExp,
  onUpdateExp,
  lang
}: DashboardProps) {
  const t = TRANSLATIONS[lang];

  const [searchTerm, setSearchTerm] = useState("");
  const [polymerFilter, setPolymerFilter] = useState("ALL");
  const [stabilityFilter, setStabilityFilter] = useState("ALL");
  const [editingExp, setEditingExp] = useState<Experiment | null>(null);
  const [selectedExpIds, setSelectedExpIds] = useState<Set<string>>(new Set());

  // Toggle selection
  const toggleSelection = (id: string) => {
    const next = new Set(selectedExpIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedExpIds(next);
  };

  // Get formulation for an experiment
  const getExpFormulation = (exp: Experiment): Formulation | undefined => {
    return formulations.find((f) => f.id === exp.formulationId);
  };

  // Get project for a formulation
  const getFormProject = (form: Formulation): Project | undefined => {
    return projects.find((p) => p.id === form.projectId);
  };

  // Formulazione della run attiva, memoizzata: reference stabile finché non
  // cambia l'esperimento selezionato → evita che il widget AI rilanci
  // chiamate a Gemini (429) ad ogni render.
  const activeFormulation = useMemo(
    () => (selectedExp ? formulations.find((f) => f.id === selectedExp.formulationId) ?? null : null),
    [selectedExp, formulations]
  );

  const formulationExperiments = useMemo(() => {
  if (!activeFormulation) return [];

  return getExperimentsForFormulation(
    activeFormulation.id,
    experiments
  );
}, [activeFormulation, experiments]);

const averageVoltage = useMemo(
  () => getAverageVoltage(formulationExperiments),
  [formulationExperiments]
);

const averageFlowRate = useMemo(
  () => getAverageFlowRate(formulationExperiments),
  [formulationExperiments]
);

  // Extract all unique polymer names for filter dropdown
  const uniquePolymers = useMemo(() => {
    const polys = new Set<string>();
    formulations.forEach((f) => {
      if (f.polymerName) polys.add(f.polymerName);
    });
    return Array.from(polys);
  }, [formulations]);

  // Filter experiments based on search and filters
  const filteredExperiments = useMemo(() => {
    let baseList = experiments;
    
    // Apply fuzzy search if searchTerm exists
    if (searchTerm.trim() !== "") {
      const fuse = new Fuse(experiments, {
        keys: [
          "operationIdentifier",
          "operatorComments",
          // We can't directly search nested objects in the same way, so we might need a derived list
        ],
        threshold: 0.3
      });
      baseList = fuse.search(searchTerm).map(result => result.item);
    }

    return baseList.filter((exp) => {
      const form = getExpFormulation(exp);
      const proj = form ? getFormProject(form) : undefined;
      
      // We already filtered by operationIdentifier/comments via Fuse
      // Now filter by polymers, projects, etc. if needed
      
      const matchesPolymer =
        polymerFilter === "ALL" || (form && form.polymerName === polymerFilter);

      const matchesStability =
        stabilityFilter === "ALL" || exp.jetStabilityGrade === parseInt(stabilityFilter);

      return matchesPolymer && matchesStability;
    });
  }, [experiments, searchTerm, polymerFilter, stabilityFilter, formulations, projects]);

  // Computed live averages for active run
  const activeStats = useMemo(() => {
    if (!selectedExp || selectedExp.telemetryData.length === 0) return null;
    const data = selectedExp.telemetryData;
    const avgVoltage = data.reduce((acc, r) => acc + r.voltageKv, 0) / data.length;
    const avgFlow = data.reduce((acc, r) => acc + r.flowRateMlH, 0) / data.length;
    const avgTemp = data.reduce((acc, r) => acc + r.temperatureC, 0) / data.length;
    const avgHum = data.reduce((acc, r) => acc + r.humidityPct, 0) / data.length;
    const maxVoltage = Math.max(...data.map(r => r.voltageKv));
    const minFlow = Math.min(...data.map(r => r.flowRateMlH));

    return {
      avgVoltage: parseFloat(avgVoltage.toFixed(1)),
      avgFlow: parseFloat(avgFlow.toFixed(3)),
      avgTemp: parseFloat(avgTemp.toFixed(1)),
      avgHum: parseFloat(avgHum.toFixed(1)),
      maxVoltage: parseFloat(maxVoltage.toFixed(1)),
      minFlow: parseFloat(minFlow.toFixed(3))
    };
  }, [selectedExp]);

  // Is environment optimal?
  const envStatus = useMemo(() => {
    if (!selectedExp || !activeStats) return { optimal: true, message: t.monitored };
    const form = getExpFormulation(selectedExp);
    if (!form) return { optimal: true, message: t.monitored };

    const polymer = form.polymerName.toLowerCase();
    const temp = activeStats.avgTemp;
    const hum = activeStats.avgHum;

    if (polymer.includes("nylon")) {
      if (hum > 40) {
        return {
          optimal: false,
          message: lang === "it"
            ? "Umidità critica per Nylon-6 (>40% RH). Rischio di micro-gocce!"
            : lang === "es"
            ? "¡Humedad crítica para Nylon-6 (>40% RH). Riesgo de microgotas!"
            : "Critical humidity for Nylon-6 (>40% RH). Risk of micro-droplets!"
        };
      }
    } else if (polymer.includes("pvdf")) {
      if (hum > 35) {
        return {
          optimal: false,
          message: lang === "it"
            ? "Umidità elevata per PVDF. Può influire sulla polarizzazione piezoelettrica beta."
            : lang === "es"
            ? "Humedad elevada para PVDF. Puede influir en la polarización piezoeléctrica beta."
            : "High humidity for PVDF. May affect piezoelectric beta polarization."
        };
      }
    } else if (polymer.includes("pcl")) {
      if (temp > 25) {
        return {
          optimal: false,
          message: lang === "it"
            ? "Temperatura eccessiva per PCL (Fusione ~60°C). Rischio di incollaggio termico!"
            : lang === "es"
            ? "¡Temperatura excesiva para PCL (Fusión ~60°C). Riesgo de unión térmica!"
            : "Excessive temperature for PCL (Melting ~60°C). Risk of thermal bonding!"
        };
      }
    }

    // Default general check
    if (temp < 18 || temp > 28) {
      return { optimal: false, message: t.nonOptimalEnv };
    }
    if (hum < 20 || hum > 55) {
      return { optimal: true, message: t.nonOptimalEnv };
    }

    return { optimal: true, message: t.optimalEnv };
  }, [selectedExp, activeStats, formulations, lang, t]);

  return (
    <div id="dashboard-view" className="flex-1 overflow-y-auto bg-[#0a0a0b] p-8 text-[#f4f4f5] flex flex-col space-y-6 select-none">
      
      {/* Search and Filters Header bar */}
      <div className="bg-[#18181b] border border-[#27272a] p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <Gauge className="w-6 h-6 text-teal-400" />
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">{t.dbTitle}</h2>
            <p className="text-xs text-zinc-400">{t.dbSubtitle}</p>
          </div>
        </div>

        {/* Realtime Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
          <input
            id="search-experiments-bar"
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0a0a0b] text-[#f4f4f5] placeholder-zinc-600 text-sm pl-10 pr-4 py-2.5 rounded-xl border border-[#27272a] focus:outline-none focus:border-teal-400 transition"
          />
        </div>

        {/* Dropdowns Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-[#0a0a0b] px-3 py-1.5 rounded-xl border border-[#27272a]">
            <Filter className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-xs text-zinc-400">{t.filterPolymer}</span>
            <select
              id="filter-polymer-select"
              value={polymerFilter}
              onChange={(e) => setPolymerFilter(e.target.value)}
              className="bg-transparent text-xs text-white border-none focus:ring-0 cursor-pointer outline-none"
            >
              <option value="ALL" className="bg-[#18181b] text-white">{t.allPolymers}</option>
              {uniquePolymers.map((p) => (
                <option key={p} value={p} className="bg-[#18181b] text-white">{p}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-[#0a0a0b] px-3 py-1.5 rounded-xl border border-[#27272a]">
            <Clock className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-xs text-zinc-400">{t.filterStability}</span>
            <select
              id="filter-stability-select"
              value={stabilityFilter}
              onChange={(e) => setStabilityFilter(e.target.value)}
              className="bg-transparent text-xs text-white border-none focus:ring-0 cursor-pointer outline-none"
            >
              <option value="ALL" className="bg-[#18181b] text-white">{t.allStabilities}</option>
              <option value="5" className="bg-[#18181b] text-white">5 - {lang === "it" ? "Perfetto" : lang === "es" ? "Perfecto" : "Perfect"}</option>
              <option value="4" className="bg-[#18181b] text-white">4 - {lang === "it" ? "Stabile" : lang === "es" ? "Estable" : "Stable"}</option>
              <option value="3" className="bg-[#18181b] text-white">3 - {lang === "it" ? "Accettabile" : lang === "es" ? "Aceptable" : "Acceptable"}</option>
              <option value="2" className="bg-[#18181b] text-white">2 - {lang === "it" ? "Instabile" : lang === "es" ? "Inestable" : "Unstable"}</option>
              <option value="1" className="bg-[#18181b] text-white">1 - {lang === "it" ? "Molto instabile" : lang === "es" ? "Muy inestable" : "Highly unstable"}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {activeFormulation && (
  <div className="lg:col-span-3 bg-[#18181b] border border-teal-500/20 rounded-2xl p-5 mb-2">

    <div className="flex items-center gap-2 mb-4">
      <Zap className="w-5 h-5 text-teal-400" />
      <h3 className="text-sm font-bold uppercase tracking-wider text-teal-400">
        Smart Knowledge
      </h3>
    </div>

    <div className="grid grid-cols-4 gap-4">

      <div>
        <div className="text-xs text-zinc-500">
          Polymer
        </div>
        <div className="text-white font-semibold">
          {activeFormulation.polymerName}
        </div>
      </div>

      <div>
        <div className="text-xs text-zinc-500">
          Experiments
        </div>
        <div className="text-white font-semibold">
          {formulationExperiments.length}
        </div>
      </div>

      <div>
        <div className="text-xs text-zinc-500">
          Avg Voltage
        </div>
        <div className="text-teal-400 font-bold">
          {averageVoltage?.toFixed(2) ?? "--"} kV
        </div>
      </div>

      <div>
        <div className="text-xs text-zinc-500">
          Avg Flow
        </div>
        <div className="text-teal-400 font-bold">
          {averageFlowRate?.toFixed(2) ?? "--"} mL/h
        </div>
      </div>

    </div>

  </div>
)}
        
        {/* Left Column: Experiments list */}
        <div className="lg:col-span-1 bg-[#18181b] border border-[#27272a] rounded-2xl p-5 flex flex-col space-y-4 max-h-[800px] overflow-hidden">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold tracking-wider uppercase text-zinc-400 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-teal-400" />
              {t.filteredExperiments} ({filteredExperiments.length})
            </h3>
            {selectedExpIds.size > 0 && (
              <button
                onClick={async () => {
                  const { exportToPDF } = await import("../utils/pdfExport");
                  const exps = experiments.filter(e => selectedExpIds.has(e.id));
                  exportToPDF(exps);
                }}
                className="text-xs bg-teal-500/10 text-teal-400 px-2 py-1 rounded-lg flex items-center gap-1 hover:bg-teal-500/20"
              >
                <Printer className="w-3 h-3" /> PDF
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {filteredExperiments.length === 0 ? (
              <div className="text-center py-10 text-zinc-500 text-sm">
                {t.noExperiments}
              </div>
            ) : (
              filteredExperiments.map((exp) => {
                const form = getExpFormulation(exp);
                const isSelected = selectedExp?.id === exp.id;
                const isChecked = selectedExpIds.has(exp.id);
                return (
                  <div
                    key={exp.id}
                    id={`exp-card-${exp.id}`}
                    onClick={() => onSelectExp(exp)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer group flex justify-between items-start ${
                      isSelected
                        ? "bg-teal-500/10 border-teal-500/30 shadow-md shadow-black/20"
                        : "bg-[#0a0a0b]/40 border-[#27272a] hover:border-zinc-700"
                    }`}
                  >
                    <input 
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleSelection(exp.id);
                      }}
                      className="mr-3 accent-teal-500 mt-1"
                    />
                    <div className="space-y-1.5 flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded">
                          {exp.operationIdentifier}
                        </span>
                        {exp.sourceFile !== "Manual Input" && (
                          <span className="text-[10px] text-teal-400 flex items-center gap-1 font-mono">
                            <CheckCircle className="w-2.5 h-2.5" /> XLS
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-semibold text-white truncate">
                        {form ? form.polymerName : "Polimero non definito"}
                      </div>
                      <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                        <span className="bg-zinc-800/60 px-1.5 py-0.5 rounded truncate">
                          {form ? form.solvent : "Solvente non definito"}
                        </span>
                        <span className="shrink-0 text-zinc-600">•</span>
                        <span>{t.filterStability} {exp.jetStabilityGrade}/5</span>
                      </div>
                      <p className="text-xs text-zinc-500 line-clamp-1 italic">
                        {exp.operatorComments}
                      </p>
                    </div>
                    
                    <div className="flex flex-col items-end justify-between h-full space-y-3">
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingExp(exp);
                          }}
                          className="text-zinc-600 hover:text-teal-400 p-1 rounded-lg hover:bg-[#27272a] transition"
                          title="Modifica run"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onDeleteExp) onDeleteExp(exp.id);
                          }}
                          className="text-zinc-600 hover:text-red-400 p-1 rounded-lg hover:bg-[#27272a] transition"
                          title="Elimina run"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <Eye className="w-4 h-4 text-zinc-500 group-hover:text-teal-400 transition" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Columns: Telemetry and Details */}
        <div className="lg:col-span-2 flex flex-col space-y-6">
          {selectedExp && activeStats ? (
            <>
              {/* Telemetry KPIs Card */}
              <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div>
                    <span className="text-xs font-mono text-teal-400 bg-teal-400/10 px-2 py-0.5 rounded font-bold">
                      {t.activeRun}: {selectedExp.operationIdentifier}
                    </span>
                    <h3 className="text-lg font-bold text-white mt-1.5 font-sans">
                      {getExpFormulation(selectedExp)?.polymerName} ({getExpFormulation(selectedExp)?.solidsContentPct}% solids)
                    </h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-zinc-400 mr-2">{lang === "it" ? "Jet:" : lang === "es" ? "Chorro:" : "Jet:"}</span>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span
                        key={s}
                        className={`text-base ${
                          s <= selectedExp.jetStabilityGrade ? "text-teal-400" : "text-zinc-700"
                        }`}
                      >
                        ★
                      </span>
                    ))}
                    <span className="text-xs font-mono font-bold bg-[#0a0a0b] text-zinc-300 px-2 py-0.5 rounded-md ml-1 border border-[#27272a]">
                      {selectedExp.jetStabilityGrade}/5
                    </span>
                  </div>
                </div>

                {/* 4 Metrics grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-[#0a0a0b] p-4 rounded-xl border border-[#27272a] flex items-center gap-3">
                    <Zap className="w-8 h-8 text-amber-500 bg-amber-500/10 p-1.5 rounded-lg shrink-0" />
                    <div>
                      <p className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">{t.avgVoltage}</p>
                      <p className="text-xl font-bold font-mono text-white">{activeStats.avgVoltage} kV</p>
                      <p className="text-[10px] text-zinc-500">Max: {activeStats.maxVoltage} kV</p>
                    </div>
                  </div>

                  <div className="bg-[#0a0a0b] p-4 rounded-xl border border-[#27272a] flex items-center gap-3">
                    <Droplet className="w-8 h-8 text-blue-400 bg-blue-500/10 p-1.5 rounded-lg shrink-0" />
                    <div>
                      <p className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">{t.avgFlow}</p>
                      <p className="text-xl font-bold font-mono text-white">{activeStats.avgFlow} mL/h</p>
                      <p className="text-[10px] text-zinc-500">Min: {activeStats.minFlow} mL/h</p>
                    </div>
                  </div>

                  <div className="bg-[#0a0a0b] p-4 rounded-xl border border-[#27272a] flex items-center gap-3">
                    <Thermometer className="w-8 h-8 text-red-400 bg-red-400/10 p-1.5 rounded-lg shrink-0" />
                    <div>
                      <p className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">{t.tempLabel}</p>
                      <p className="text-xl font-bold font-mono text-white">{activeStats.avgTemp} °C</p>
                      <p className="text-[10px] text-zinc-500">{t.tempOptimal}</p>
                    </div>
                  </div>

                  <div className="bg-[#0a0a0b] p-4 rounded-xl border border-[#27272a] flex items-center gap-3">
                    <CloudLightning className="w-8 h-8 text-teal-400 bg-teal-400/10 p-1.5 rounded-lg shrink-0" />
                    <div>
                      <p className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">{t.humidityLabel}</p>
                      <p className="text-xl font-bold font-mono text-white">{activeStats.avgHum} %</p>
                      <p className="text-[10px] text-zinc-500">{t.humidityOptimal}</p>
                    </div>
                  </div>
                </div>

                {/* Climatic Warning Banner */}
                <div className={`mt-4 p-3 rounded-xl border flex items-center gap-3 ${
                  envStatus.optimal
                    ? "bg-teal-500/5 border-teal-500/20 text-teal-400"
                    : "bg-amber-500/5 border-amber-500/20 text-amber-400"
                }`}>
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span className="text-xs font-medium">{envStatus.message}</span>
                </div>
                <div className="mt-6 space-y-6">
                    <AIOptimizationWidget
                      currentFormulation={activeFormulation}
                      projectId={activeFormulation?.projectId || ""}
                      lang={lang}
                    />
                    <AIInsights telemetryData={selectedExp.telemetryData} lang={lang} />
                  </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Voltage Chart */}
                <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-5">
                  <h4 className="text-xs font-bold tracking-wider uppercase text-zinc-400 mb-4 flex items-center justify-between">
                    <span>{t.voltageProfile}</span>
                    <span className="text-[10px] font-mono font-semibold text-teal-400">{t.monitored}</span>
                  </h4>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={selectedExp.telemetryData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="voltageGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15}/>
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis dataKey="timestampSec" stroke="#71717a" fontSize={10} unit="s" />
                        <YAxis stroke="#71717a" fontSize={10} domain={['auto', 'auto']} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#0d0d0f", border: "1px solid #27272a", borderRadius: "8px" }}
                          labelStyle={{ color: "#a1a1aa", fontSize: "11px" }}
                          itemStyle={{ color: "#f59e0b", fontSize: "12px" }}
                          formatter={(value) => [`${value} kV`, "Tensione"]}
                        />
                        <Area type="monotone" dataKey="voltageKv" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#voltageGradient)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Flow Rate Chart */}
                <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-5">
                  <h4 className="text-xs font-bold tracking-wider uppercase text-zinc-400 mb-4 flex items-center justify-between">
                    <span>{t.flowStability}</span>
                    <span className="text-[10px] font-mono font-semibold text-teal-400">{t.feedSensor}</span>
                  </h4>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={selectedExp.telemetryData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis dataKey="timestampSec" stroke="#71717a" fontSize={10} unit="s" />
                        <YAxis stroke="#71717a" fontSize={10} domain={['auto', 'auto']} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#0d0d0f", border: "1px solid #27272a", borderRadius: "8px" }}
                          labelStyle={{ color: "#a1a1aa", fontSize: "11px" }}
                          itemStyle={{ color: "#38bdf8", fontSize: "12px" }}
                          formatter={(value) => [`${value} mL/h`, "Portata"]}
                        />
                        <Line type="monotone" dataKey="flowRateMlH" stroke="#38bdf8" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Hardware Details & Operator Comments */}
              <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">{t.hwConfig}</p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between border-b border-[#27272a] pb-1">
                      <span className="text-zinc-400">{t.device}</span>
                      <span className="text-white font-mono">{selectedExp.machineModel}</span>
                    </div>
                    <div className="flex justify-between border-b border-[#27272a] pb-1">
                      <span className="text-zinc-400">{t.injectorType}</span>
                      <span className="text-white font-semibold">{selectedExp.injectorType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">{t.collector}</span>
                      <span className="text-white font-semibold">{selectedExp.collectorType}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">{t.processMetadata}</p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between border-b border-[#27272a] pb-1">
                      <span className="text-zinc-400">{t.emitterDistance}</span>
                      <span className="text-white font-mono">{selectedExp.distanceMm} mm</span>
                    </div>
                    <div className="flex justify-between border-b border-[#27272a] pb-1">
                      <span className="text-zinc-400">{t.dataSource}</span>
                      <span className="text-teal-400 truncate max-w-[140px]" title={selectedExp.sourceFile}>{selectedExp.sourceFile}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">{t.importedOn}</span>
                      <span className="text-white font-mono">{new Date(selectedExp.ingestedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">{t.operatorNotes}</p>
                  <div className="bg-[#0a0a0b] p-3 rounded-xl border border-[#27272a] h-24 overflow-y-auto text-xs text-zinc-300 italic leading-relaxed">
                    "{selectedExp.operatorComments}"
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-[#18181b] border border-[#27272a] rounded-3xl p-16 text-center text-zinc-400 flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[#0a0a0b] flex items-center justify-center border border-[#27272a] text-teal-400">
                <Gauge className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">{t.noRunSelectedTitle}</h3>
              <p className="text-sm text-zinc-500 max-w-sm">
                {t.noRunSelectedBody}
              </p>
            </div>
          )}
        </div>

      </div>

      {editingExp && (
        <ExperimentEditor
          experiment={editingExp}
          onSave={(exp) => {
            onUpdateExp(exp);
            setEditingExp(null);
          }}
          onClose={() => setEditingExp(null)}
          lang={lang}
        />
      )}
    </div>
  );
}
