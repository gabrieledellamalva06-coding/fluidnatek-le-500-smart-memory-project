import React, { useMemo, useRef, useState } from "react";
import Fuse from "fuse.js";
import {
  FileSpreadsheet,
  HelpCircle,
  Loader,
  Search,
  UploadCloud,
} from "lucide-react";
import { parseElectrospinningExcel, type ParsedExcelResult } from "../utils/excelParser";
import type { Formulation, Project } from "../types";
import type { Language } from "../lib/translations";

interface ExcelImportProps {
  projects: Project[];
  formulations: Formulation[];
  onImportExperiment: (parsedList: ParsedExcelResult[], targetProjectId: string) => void;
  lang: Language;
}

export default function ExcelImport({ projects, onImportExperiment }: ExcelImportProps) {
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ParsedExcelResult[]>([]);
  const [search, setSearch] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fuse = useMemo(() => new Fuse(results, { keys: ["sourceFile", "operationIdentifier"], threshold: 0.3 }), [results]);
  const filtered = useMemo(() => search.trim() ? fuse.search(search).map((item) => item.item) : results, [search, results, fuse]);

  const processFiles = async (files: FileList) => {
    if (!selectedProjectId) {
      setError("Choose the project that should receive the imported historical runs.");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      const parsed: ParsedExcelResult[] = [];
      for (const file of Array.from(files)) {
        parsed.push(...(await parseElectrospinningExcel(file)));
      }
      setResults((previous) => [...previous, ...parsed]);
      onImportExperiment(parsed, selectedProjectId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to parse the selected file.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto bg-slate-100 p-6 lg:p-8 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Data & History</p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold text-slate-950"><FileSpreadsheet className="h-7 w-7 text-teal-600" /> Historical Data Import</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">Use this page only for legacy or externally generated Excel files. New experiments belong in the Experimental Run workflow.</p>
          </div>
          <button type="button" onClick={() => setShowGuide((value) => !value)} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600"><HelpCircle className="h-4 w-4" /> Excel Format Guide</button>
        </div>

        {showGuide && (
          <section className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900">
            <p className="font-bold">Import in three steps</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-blue-800">
              <li>Choose the project that owns the historical runs.</li>
              <li>Upload one or more Fluidnatek Excel files.</li>
              <li>Review the detected runs below before using them as historical memory.</li>
            </ol>
          </section>
        )}

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Associate Historical Runs to Project</span>
            <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100">
              <option value="">Choose a project</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </label>

          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files) void processFiles(e.dataTransfer.files); }}
            onClick={() => fileInputRef.current?.click()}
            className={`mt-5 cursor-pointer rounded-3xl border-2 border-dashed p-10 text-center transition ${isDragging ? "border-teal-500 bg-teal-50" : "border-slate-300 bg-slate-50 hover:border-teal-400 hover:bg-teal-50/40"}`}
          >
            <input ref={fileInputRef} type="file" multiple accept=".xlsx,.xlsm,.xls" className="hidden" onChange={(e) => e.target.files && void processFiles(e.target.files)} />
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-teal-600 shadow-sm">
              {isLoading ? <Loader className="h-7 w-7 animate-spin" /> : <UploadCloud className="h-7 w-7" />}
            </div>
            <h2 className="mt-4 font-bold text-slate-900">Drop Excel files here or click to upload</h2>
            <p className="mt-1 text-xs text-slate-500">Supported: .xlsx, .xlsm, .xls</p>
          </div>

          {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        </section>

        {results.length > 0 && (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-lg font-bold text-slate-950">Imported File Review</h2><p className="text-xs text-slate-500">{results.length} parsed historical runs</p></div></div>
            <div className="relative mt-4"><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search imported runs..." style={{ paddingLeft: "2.8rem" }} className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none" /></div>
            <div className="mt-4 space-y-2">{filtered.slice(0, 30).map((item) => <div key={item.id} className="rounded-xl bg-slate-50 px-4 py-3 text-sm"><p className="font-semibold text-slate-800">{item.operationIdentifier || "Historical Run"}</p><p className="mt-1 text-xs text-slate-500">{item.sourceFile}</p></div>)}</div>
          </section>
        )}
      </div>
    </main>
  );
}
