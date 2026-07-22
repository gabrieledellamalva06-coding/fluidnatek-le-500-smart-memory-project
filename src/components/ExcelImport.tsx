import React, { useState, useRef, useMemo } from "react";
import Fuse from "fuse.js";
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Loader,
  HelpCircle,
  PlayCircle,
  Search,
  Info,
  X,
  Lightbulb
} from "lucide-react";
import { parseElectrospinningExcel, ParsedExcelResult } from "../utils/excelParser";
import { Formulation, Project } from "../types";
import { TRANSLATIONS, Language } from "../lib/translations";
import { db, auth } from "../lib/firebase";
import { collection, doc, setDoc } from "firebase/firestore";
import { renderDetectedParameters } from "../utils/renderDetectedParameters";


interface ExcelImportProps {
  projects: Project[];
  formulations: Formulation[];
  onImportExperiment: (
    parsedList: ParsedExcelResult[],
    targetProjectId: string
  ) => void;
  lang: Language;
}

export default function ExcelImport({
  projects,
  formulations,
  onImportExperiment,
  lang
}: ExcelImportProps) {
  const t = TRANSLATIONS[lang];

  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<{current: number; total: number; fileName: string} | null>(null);
  const [parsedResults, setParsedResults] = useState<ParsedExcelResult[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  // Onboarding + popup di aiuto contestuale (utente alle prime armi).
  const [showGuide, setShowGuide] = useState(true);
  const [helpTip, setHelpTip] = useState<null | "noProject" | "empty">(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fuse = useMemo(() => new Fuse(parsedResults, {
    keys: ['sourceFile', 'operationIdentifier'],
    threshold: 0.3
  }), [parsedResults]);

  const filteredResults = useMemo(() => {
    if (!searchQuery) return parsedResults;
    return fuse.search(searchQuery).map(result => result.item);
  }, [searchQuery, parsedResults, fuse]);

  const processFiles = async (files: FileList) => {
    if (!selectedProjectId) {
      setHelpTip("noProject");
      return;
    }
    setHelpTip(null);

    setIsLoading(true);
    setProgress({current: 0, total: files.length, fileName: ""});
    let allNewResults: ParsedExcelResult[] = [];
    
    // Simulate slight delay to ensure UI updates showing loading spinner
    await new Promise(resolve => setTimeout(resolve, 500));

    for (let i = 0; i < files.length; i++) {
      setProgress({current: i + 1, total: files.length, fileName: files[i].name});
      try {
        const parsedList = await parseElectrospinningExcel(files[i]);
        console.log("Parsed list from Excel:", parsedList);

        // Import LOCALE = fonte di verità dell'app. Sempre eseguito e NON
        // richiede il login. (Prima un utente Firebase mancante bloccava tutto
        // con "Devi effettuare l'accesso": rimosso.)
        allNewResults = [...allNewResults, ...parsedList];

        // Backup opzionale su Firestore: solo se c'è un utente autenticato e
        // senza mai bloccare/interrompere l'import locale se fallisce.
        if (auth.currentUser) {
          try {
            for (const experiment of parsedList) {
              const expRef = doc(db, "projects", selectedProjectId, "experiments", experiment.id);
              await setDoc(expRef, {
                id: experiment.id,
                projectId: selectedProjectId,
                operationIdentifier: experiment.operationIdentifier,
                ingestedAt: new Date().toISOString(),
                operatorComments: experiment.operatorComments
              });
              for (const telemetry of experiment.telemetryData) {
                const telRecord = { ...telemetry, experimentId: experiment.id };
                const telId = telRecord.id || crypto.randomUUID();
                const telRef = doc(db, "projects", selectedProjectId, "experiments", experiment.id, "telemetry", telId);
                await setDoc(telRef, telRecord);
              }
            }
          } catch (fireErr) {
            console.warn("Backup Firestore non riuscito: l'import locale viene mantenuto.", fireErr);
          }
        }
      } catch (err) {
        // DEBUG: logga l'oggetto errore completo, nessun messaggio generico.
        console.error(err);
      }
    }
    
    onImportExperiment(allNewResults, selectedProjectId);
    setParsedResults(prev => [...prev, ...allNewResults]);
    setIsLoading(false);
    setProgress(null);

    // Difficoltà rilevata: il file è stato letto ma senza telemetria reale
    // (curva sintetizzata) → spiega all'utente cosa controllare.
    if (allNewResults.some(r => r.telemetrySynthesized)) {
      setHelpTip("empty");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };


  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  // Pre-load simulator
  const handleLoadTestExcel = () => {
    if (!selectedProjectId) {
      setHelpTip("noProject");
      return;
    }
    setHelpTip(null);

    setIsLoading(true);

    // Simulate file parsing delay
    setTimeout(() => {
      const fakeResult: ParsedExcelResult = {
        id: crypto.randomUUID(),
        operationIdentifier: "RUN_TEST_EXCEL_IMPORTED",
        sourceFile: "Fluidnatek_LE500_PVDF_AutoRun_99.xlsx",
        operatorComments: lang === "it" 
          ? "File di test caricato automaticamente. Ottima omogeneità dei getti, nessuna alterazione climatica."
          : lang === "es"
          ? "Archivo de prueba cargado automáticamente. Excelente homogeneidad de los chorros, sin alteración climática."
          : "Automatically loaded test file. Excellent jet homogeneity, no climatic issues.",
        metadata: {
          "Tab_1_Polimero": "PVDF (Polyvinylidene fluoride)",
          "Tab_1_Solvente": "DMF (Dimethylformamide)",
          "Tab_1_Distanza": "160"
        },
        telemetryData: Array.from({ length: 35 }).map((_, i) => ({
          timestampSec: i * 5,
          voltageKv: parseFloat((19.5 + Math.sin(i * 0.4) * 0.3 + (Math.random() - 0.5) * 0.05).toFixed(2)),
          flowRateMlH: parseFloat((1.2 + Math.cos(i * 0.4) * 0.01 + (Math.random() - 0.5) * 0.005).toFixed(3)),
          temperatureC: parseFloat((22.8 + Math.sin(i * 0.1) * 0.1).toFixed(1)),
          humidityPct: parseFloat((34.5 + Math.cos(i * 0.1) * 0.2).toFixed(1)),
          distanceMm: 160
        })),
        polymerName: "PVDF (Polyvinylidene fluoride)",
        solventName: "DMF (Dimethylformamide)",
        discoveredParameters: [],
        telemetrySynthesized: false
      };

      onImportExperiment([fakeResult], selectedProjectId);
      setParsedResults(prev => [...prev, fakeResult]);
      setIsLoading(false);
    }, 1200);
  };


  return (
    <div id="excelimport-view" className="flex-1 overflow-y-auto bg-[#0a0a0b] p-8 text-[#f4f4f5] flex flex-col space-y-8 select-none animate-fadeIn">
      
      {/* Title Header */}
      <div className="flex items-center gap-3">
        <FileSpreadsheet className="w-8 h-8 text-teal-400" />
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">{t.excelImportTitle}</h2>
          <p className="text-xs text-zinc-400">{t.excelImportSubtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: File uploader and results */}
        <div className="lg:col-span-7 bg-[#18181b] border border-[#27272a] rounded-2xl p-6 shadow-xl flex flex-col space-y-6">
          
          {/* Guida rapida onboarding (utente alle prime armi) */}
          {showGuide && (
            <div className="relative rounded-xl border border-teal-500/20 bg-teal-500/5 p-4">
              <button
                onClick={() => setShowGuide(false)}
                aria-label={t.importGuideDismiss}
                className="absolute right-3 top-3 text-zinc-500 transition-colors hover:text-zinc-300"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="mb-2 flex items-center gap-2 text-teal-300">
                <Info className="h-4 w-4" />
                <h4 className="text-xs font-bold uppercase tracking-widest">{t.importGuideTitle}</h4>
              </div>
              <ul className="space-y-1 text-[11px] leading-relaxed text-zinc-300">
                <li>{t.importGuideStep1}</li>
                <li>{t.importGuideStep2}</li>
                <li>{t.importGuideStep3}</li>
              </ul>
            </div>
          )}

          {/* Popup di aiuto contestuale (difficoltà rilevata) */}
          {helpTip && (
            <div
              className={`relative flex items-start gap-2.5 rounded-xl border p-4 ${
                helpTip === "noProject"
                  ? "border-amber-500/25 bg-amber-500/5 text-amber-200"
                  : "border-indigo-500/25 bg-indigo-500/5 text-indigo-200"
              }`}
            >
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="pr-6">
                <h4 className="mb-0.5 text-xs font-bold">
                  {helpTip === "noProject" ? t.helpNoProjectTitle : t.helpEmptyTitle}
                </h4>
                <p className="text-[11px] leading-relaxed opacity-90">
                  {helpTip === "noProject" ? t.helpNoProjectBody : t.helpEmptyBody}
                </p>
              </div>
              <button
                onClick={() => setHelpTip(null)}
                aria-label={t.helpDismiss}
                className="absolute right-3 top-3 opacity-70 transition-opacity hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Step 1: Association project dropdown */}
          <div className="space-y-3 p-4 bg-[#0a0a0b]/80 border border-[#27272a] rounded-xl">
            <label className="block text-xs font-bold text-teal-400 uppercase tracking-widest">
              {t.associateRunsToProject}
            </label>
            <select
              id="import-project-association-select"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full bg-[#18181b] text-[#f4f4f5] text-sm px-3 py-2.5 rounded-lg border border-[#27272a] focus:outline-none focus:border-teal-400 cursor-pointer"
            >
              <option value="" className="text-zinc-500">{t.selectProjectPlaceholder}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#18181b]">{p.name}</option>
              ))}
            </select>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Cerca file importati..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0a0a0b] text-white text-sm pl-10 pr-4 py-3 rounded-lg border border-[#27272a] focus:outline-none focus:border-teal-400"
            />
          </div>

          {/* File Drag and Drop zone */}
          <div
            id="drag-and-drop-target"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-4 ${
              isDragging
                ? "border-teal-400 bg-teal-500/5"
                : "border-[#27272a] bg-[#0a0a0b]/40 hover:border-zinc-700 hover:bg-[#0a0a0b]/60"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.xlsm"
              className="hidden"
            />

            <div className="w-16 h-16 rounded-2xl bg-[#0a0a0b] flex items-center justify-center text-teal-400 border border-[#27272a] shadow-inner">
              {isLoading ? (
                <Loader className="w-8 h-8 animate-spin text-teal-400" />
              ) : (
                <UploadCloud className="w-8 h-8" />
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold text-white">{t.dropzoneTitle}</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                {t.dropzoneSubtitle}
              </p>
            </div>
          </div>

          {isLoading && progress && (
            <div className="mt-6 p-4 bg-[#0a0a0b] rounded-xl border border-[#27272a] space-y-3">
              <div className="flex justify-between text-xs text-zinc-400">
                <span>{t.parsingFile}</span>
                <span>{progress.current} / {progress.total}</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2">
                <div 
                  className="bg-teal-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                ></div>
              </div>
              <p className="text-xs text-zinc-500 truncate">{progress.fileName}</p>
            </div>
          )}

          {/* Demo test button */}
          <div className="flex justify-between items-center bg-[#0a0a0b]/50 p-4 rounded-xl border border-[#27272a]">
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-white">
                {lang === "it" ? "Non hai un foglio Excel pronto?" : lang === "es" ? "¿No tiene un archivo de Excel listo?" : "Don't have an Excel spreadsheet ready?"}
              </h4>
              <p className="text-[10px] text-zinc-500">
                {lang === "it" ? "Testa l'importazione istantanea con il nostro file preconfigurato." : lang === "es" ? "Pruebe la importación instantánea con nuestro archivo configurado." : "Test instant import using our preconfigured mock file."}
              </p>
            </div>
            <button
              id="import-test-excel-btn"
              type="button"
              onClick={handleLoadTestExcel}
              className="bg-[#0a0a0b] hover:bg-[#27272a] text-teal-400 border border-teal-500/10 hover:border-teal-500/20 text-xs font-bold py-2 px-3 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <PlayCircle className="w-4 h-4" />
              <span>{t.uploadButton}</span>
            </button>
          </div>

          {/* Parsed files list */}
          <div className="space-y-2 overflow-y-auto max-h-[400px]">
            {filteredResults.map((result, idx) => (
              <div key={idx} className="bg-[#0a0a0b] p-3 rounded-lg border border-[#27272a] flex items-center justify-between">
                <span className="text-sm text-white truncate">{result.sourceFile}</span>
                <span className="text-xs text-zinc-500">{result.telemetryData.length} recs</span>
              </div>
            ))}
          </div>

        </div>

        {/* Right Column: Spreadsheet format guide */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6 shadow-xl flex flex-col space-y-6 h-full">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-teal-400" />
              <h3 className="text-md font-bold text-white">
                {lang === "it" ? "Linee Guida Formattazione Excel" : lang === "es" ? "Pautas de Formateo de Excel" : "Excel Formatting Guidelines"}
              </h3>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              {lang === "it" 
                ? "Il parser supporta funzionalità intelligenti e non rigide. Riconosce automaticamente le intestazioni in Italiano, Inglese e Spagnolo seguendo questi criteri:"
                : lang === "es"
                ? "El analizador admite funciones inteligentes y flexibles. Reconoce automáticamente los encabezados en italiano, inglés y español según estos criterios:"
                : "The parser supports flexible, intelligent formatting. It automatically identifies headers in Italian, English, and Spanish based on these guidelines:"}
            </p>

            <div className="space-y-4">
              {/* Telemetry constraints */}
              <div className="p-4 bg-[#0a0a0b] rounded-xl border border-[#27272a] space-y-2">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                  {lang === "it" ? "Foglio Telemetria Temporale" : lang === "es" ? "Hoja de Telemetría Temporal" : "Time Telemetry Sheet"}
                </h4>
                <p className="text-[11px] text-[#f4f4f5]/80 leading-relaxed">
                  {lang === "it" 
                    ? "È sufficiente che un foglio contenga colonne di numeri con intestazioni come:"
                    : lang === "es"
                    ? "Es suficiente que una hoja contenga columnas numéricas con encabezados como:"
                    : "Simply ensure the sheet contains columns of numerical parameters with headers like:"}
                </p>
                <ul className="text-[10px] font-mono text-teal-400 space-y-1 list-disc pl-4">
                  <li><strong>{lang === "it" ? "Tensione" : lang === "es" ? "Voltaje" : "Voltage"}:</strong> "voltage", "kv", "tension", "v"</li>
                  <li><strong>{lang === "it" ? "Portata" : lang === "es" ? "Flujo" : "Flow Rate"}:</strong> "flow rate", "ml/h", "portata", "caudal"</li>
                  <li><strong>{lang === "it" ? "Tempo" : lang === "es" ? "Tiempo" : "Time"}:</strong> "time", "sec", "tempo", "tiempo"</li>
                  <li><strong>{lang === "it" ? "Ambiente" : lang === "es" ? "Clima" : "Climate"}:</strong> "temp", "humidity", "umidità", "pos"</li>
                </ul>
              </div>

              {/* Metadata constraints */}
              <div className="p-4 bg-[#0a0a0b] rounded-xl border border-[#27272a] space-y-2">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                  {lang === "it" ? "Foglio Metadati o Note" : lang === "es" ? "Hoja de Metadatos o Notas" : "Metadata or Notes Sheet"}
                </h4>
                <p className="text-[11px] text-[#f4f4f5]/80 leading-relaxed">
                  {lang === "it" 
                    ? "Il parser estrarrà automaticamente i parametri chimici della miscela leggendo le celle in formato chiave-valore (ad es. \"Polimero: Nylon-6\", \"Solvente: Acetic Acid\")."
                    : lang === "es"
                    ? "El analizador extraerá automáticamente los parámetros químicos de la mezcla leyendo celdas en formato clave-valor (p. ej. \"Polímero: Nylon-6\", \"Solvente: Acetic Acid\")."
                    : "The parser automatically extracts chemical mixture parameters by reading cells in key-value format (e.g. \"Polymer: Nylon-6\", \"Solvent: Acetic Acid\")."}
                </p>
                <p className="text-[11px] text-[#f4f4f5]/80 leading-relaxed">
                  {lang === "it"
                    ? "Le note dell'operatore o i commenti di laboratorio inseriti sotto diciture come \"Note\", \"Commenti\", o \"Osservazioni\" verranno uniti per popolare il campo note della run."
                    : lang === "es"
                    ? "Las notas del operador o comentarios de laboratorio bajo etiquetas como \"Note\", \"Commenti\" o \"Observaciones\" se fusionarán para poblar las notas de la corrida."
                    : "Operator notes or laboratory comments written under labels like \"Notes\", \"Comments\", or \"Observations\" will be merged to populate the run notes."}
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-500/5 border border-amber-500/15 text-amber-400 rounded-lg text-xs flex items-start gap-2.5 mt-auto">
              <AlertTriangle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
              <span>
                <strong>{lang === "it" ? "Attenzione:" : lang === "es" ? "Atención:" : "Warning:"}</strong> {lang === "it" ? "File protetti da password o crittografati non possono essere parsati localmente dal browser." : lang === "es" ? "Los archivos protegidos por contraseña o cifrados no se pueden analizar localmente por el navegador." : "Password-protected or encrypted files cannot be parsed locally by the browser."}
              </span>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
