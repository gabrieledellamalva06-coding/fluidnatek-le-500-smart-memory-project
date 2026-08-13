  import {
  registerMaterial,
  findMaterial
} from "./materialRegistry";
  import * as XLSX from "xlsx";
  import type { WorkbookLike } from "../core/extractor/workbookExtractor";
import { runIngestionPipeline } from "../core/pipeline/ingestionPipeline";
  import { TelemetryRecord } from "../types";
  import { detectParameter } from "./parameterMatcher";
  import { registerParameter } from "./parameterRegistry";

  export interface ParsedExcelResult {
    id: string;
    operationIdentifier: string;
    sourceFile: string;
    operatorComments: string;
    metadata: Record<string, string>;
    telemetryData: TelemetryRecord[];
    polymerName?: string;
    solventName?: string;
    discoveredParameters: string[];
    // Parametri reali della run (quando presenti nel foglio), usati da App per
    // popolare l'esperimento invece dei default.
  distanceMm?: number;
  jetStabilityGrade?: number;
  injectorType?: string;
  collectorType?: string;
  // true quando la telemetria è stata sintetizzata perché il foglio non
  // conteneva NÉ una tabella di run NÉ una serie temporale leggibile.
  telemetrySynthesized: boolean;
}

// ---------------------------------------------------------------------------
// Helper numerici (tolleranti a decimali con virgola e a stringhe "sporche").
// ---------------------------------------------------------------------------
function cleanAndParseFloat(val: any, defaultVal: number = NaN): number {
  if (val === undefined || val === null) return defaultVal;
  if (typeof val === "number") return val;
  const str = String(val).trim();
  if (str === "") return defaultVal;
  const cleaned = str.replace(/,/, ".").replace(/[^\d.-]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? defaultVal : parsed;
}

// Primo numero presente in una cella (gestisce "18-18", "18/18", "48,7 (20s)").
function parseFirstNumber(val: any, defaultVal: number = NaN): number {
  if (val === undefined || val === null) return defaultVal;
  if (typeof val === "number") return val;
  const m = String(val).replace(/,/g, ".").match(/-?\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : defaultVal;
}

const cellStr = (v: any) => (v === undefined || v === null ? "" : String(v).trim());
const norm = (s: string) => s.trim().toUpperCase();

// Curva sintetizzata ATTORNO ai parametri reali della run: i valori scalari
// (voltaggio/portata/temp/umidità) sono reali, la fluttuazione è illustrativa.
function createMeasuredSnapshot(
  voltageKv: number,
  collectorVoltageKv: number,
  flowRateMlH: number,
  temperatureC: number,
  humidityPct: number,
  distanceMm: number
): TelemetryRecord[] {
  if (![voltageKv, flowRateMlH, temperatureC, humidityPct, distanceMm].every(Number.isFinite)) return [];
  return [{ timestampSec: 0, voltageKv,
    collectorVoltageKv: Number.isFinite(collectorVoltageKv) ? collectorVoltageKv : undefined,
    flowRateMlH, temperatureC, humidityPct, distanceMm }];
}

// ---------------------------------------------------------------------------
// Lettura di una tabella "chiave → riga" (fogli Soluciones_*, Setup): header
// alla prima riga, una riga per record, chiave nella colonna indicata.
// ---------------------------------------------------------------------------
function tableByKey(rows: any[], keySubstr: string): Record<string, Record<string, string>> {
  const map: Record<string, Record<string, string>> = {};
  if (!rows || rows.length === 0) return map;
  const header = (rows[0] as any[] || []).map(cellStr);
  const keyIdx = header.findIndex(h => h.toLowerCase().includes(keySubstr));
  if (keyIdx < 0) return map;
  for (let r = 1; r < rows.length; r++) {
    const row = (rows[r] as any[]) || [];
    const key = cellStr(row[keyIdx]);
    if (!key) continue;
    const nk = norm(key);
    if (!map[nk]) map[nk] = {}; // prima occorrenza vince
    header.forEach((h, idx) => {
      if (h && map[nk][h] === undefined) {
        const v = cellStr(row[idx]);
        if (v !== "") map[nk][h] = v;
      }
    });
  }
  return map;
}

// Cerca in un record un valore la cui chiave contiene una delle sottostringhe.
function pick(record: Record<string, string> | undefined, subs: string[]): string | undefined {
  if (!record) return undefined;
  for (const sub of subs) {
    for (const [k, v] of Object.entries(record)) {
      if (k.toLowerCase().includes(sub)) return v;
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// PATH 1 — Tabella di processo: una run per riga (formato reale Fluidnatek).
// ---------------------------------------------------------------------------
interface ProcCols { [k: string]: number | undefined; }

// Predicati di riconoscimento colonna (tolleranti a IT/EN/ES e a etichette varie).
// NB: "tensión/tension" da sola NON è voltaggio (in ES "tensión superficial" =
// tensione superficiale). Il voltaggio si riconosce da hv/kv/voltaje.
const isVolt = (h: string) => h.includes("hv+") || h.includes("kv") || h.includes("voltag") || h.includes("voltaje") || /(^|[^a-z])hv([^a-z]|$)/.test(h);
const isFlow = (h: string) => h.includes("q1") || h.includes("caudal") || h.includes("ml/h") || h.includes("flow") || h.includes("flujo") || h.includes("portata") || h.includes("rate") || /(^|[^a-z])q\d?([^a-z]|$)/.test(h);
const isTempH = (h: string) => h.startsWith("t (") || h.includes("temperatur") || h.includes("(ºc)") || h.includes("(°c)");
const isHumH = (h: string) => h.includes("rh") || h.includes("humedad") || h.includes("humidity") || h.includes("umidit") || h.includes("hr (");
const isDistH = (h: string) => h.includes("posicion y") || h.includes("posición y") || h.includes("distan") || h.includes("dz") || h.includes("gap");
const isGradeH = (h: string) => h.includes("procesabilidad") || h.includes("processab") || h.includes("grado") || h.includes("estabilidad") || h.includes("stability");
const isIdH = (h: string) => h.includes("formula") || h.includes("fórmula") || h.includes("muestra") || h.includes("codigo") || h.includes("código") || h.includes("nombre") || h.includes("sample") || h.includes("ensayo") || /(^|[^a-z])run([^a-z]|$)/.test(h);
const isTimeAxis = (h: string) => /(^|[^a-z])(timestamp|sec|seg)([^a-z]|$)/.test(h) || /\b(time|tiempo|tempo)\b[^)]*\(\s*s\s*\)/.test(h) || ["time", "tiempo", "tempo", "t (s)", "time (s)", "tiempo (s)", "tempo (s)"].includes(h);

function findProcessTable(rows: any[]): { headerIdx: number; col: ProcCols; headerOrig: string[] } | null {
  const maxScan = Math.min(rows.length, 15);
  for (let r = 0; r < maxScan; r++) {
    const row = (rows[r] as any[] || []).map(c => cellStr(c).toLowerCase());
    const hasVolt = row.some(isVolt);
    if (!hasVolt) continue;
    const hasId = row.some(isIdH);
    const otherParams = [row.some(isFlow), row.some(isTempH), row.some(isHumH), row.some(isDistH), row.some(isGradeH)].filter(Boolean).length;
    // È una tabella di run se ha voltaggio + (un identificatore OPPURE ≥2 altri parametri).
    if (!(hasId || otherParams >= 2)) continue;
    // Se ha un asse-tempo di campionamento e nessun identificatore → è una serie
    // temporale di UNA run, la gestisce PATH 2.
    if (row.some(isTimeAxis) && !hasId) continue;

    const col: ProcCols = {};
    const set = (k: string, idx: number) => { if (col[k] === undefined) col[k] = idx; };
    row.forEach((h, idx) => {
      if (h.includes("formula") || h.includes("fórmula")) set("formula", idx);
      else if (h.includes("muestra") || h.includes("codigo") || h.includes("código") || h.includes("nombre") || h.includes("sample") || /(^|[^a-z])run([^a-z]|$)/.test(h)) set("sample", idx);
      else if (isFlow(h)) set("flow", idx);
      else if (h.includes("hv-")) set("voltageNeg", idx);
      else if (isVolt(h)) set("voltage", idx);
      else if (isTempH(h)) set("temp", idx);
      else if (isHumH(h)) set("humidity", idx);
      else if (h.includes("posicion y") || h.includes("posición y") || h.includes("distan")) set("distance", idx);
      else if (h.includes("dz")) set("dz", idx);
      else if (isGradeH(h)) set("grade", idx);
      else if (h.includes("comentario") || h.includes("comment")) set("comments", idx);
      else if (h.includes("setup")) set("setup", idx);
      else if (h.includes("fecha") || h.includes("date")) set("date", idx);
      else if (h.includes("propósito") || h.includes("proposito") || h.includes("purpose")) set("purpose", idx);
      else if (h.includes("diameter") || h.includes("diámetro") || h.includes("diametro")) set("diameter", idx);
    });
    if (col.voltage !== undefined || col.voltageNeg !== undefined) {
      const headerOrig = (rows[r] as any[] || []).map(cellStr);
      return { headerIdx: r, col, headerOrig };
    }
  }
  return null;
}

function buildProcessRuns(
  wb: XLSX.WorkBook,
  fileName: string,
  procSheet: string,
  found: { headerIdx: number; col: ProcCols; headerOrig: string[] }
): ParsedExcelResult[] {
  const readSheet = (name: string) =>
    wb.SheetNames.includes(name)
      ? XLSX.utils.sheet_to_json<any>(wb.Sheets[name], { header: 1, blankrows: false })
      : [];

  // Join tables (nomi standard del template; se assenti, i join restano vuoti).
  const props = tableByKey(readSheet("Soluciones_propiedades"), "formula");
  const comp = tableByKey(readSheet("Soluciones_composicion"), "formula");
  const setup = tableByKey(readSheet("Setup"), "setup");

  const rows = XLSX.utils.sheet_to_json<any>(wb.Sheets[procSheet], { header: 1, blankrows: false });
  const { headerIdx, col, headerOrig } = found;
  const results: ParsedExcelResult[] = [];

  for (let r = headerIdx + 1; r < rows.length; r++) {
    const d = (rows[r] as any[]) || [];
    const formula = col.formula !== undefined ? cellStr(d[col.formula]) : "";
    const sample = col.sample !== undefined ? cellStr(d[col.sample]) : "";

    // Parametri di processo reali.
    const vNum = col.voltage !== undefined ? parseFirstNumber(d[col.voltage], NaN) : NaN;
    const fNum = col.flow !== undefined ? cleanAndParseFloat(d[col.flow], NaN) : NaN;
    // Riga valida come run solo se ha un parametro numerico o un identificatore.
    if (isNaN(vNum) && isNaN(fNum) && !formula && !sample) continue;

    const nf = formula ? norm(formula) : "";
    const propRec = nf ? props[nf] : undefined;
    const compRec = nf ? comp[nf] : undefined;
    const setupNum = col.setup !== undefined ? cellStr(d[col.setup]) : "";
    const setupRec = setupNum ? setup[norm(setupNum)] : undefined;

    const voltageKv = vNum;
    const collectorVoltageKv = col.voltageNeg !== undefined ? parseFirstNumber(d[col.voltageNeg], NaN) : NaN;
    const flowRateMlH = fNum;
    const temperatureC = col.temp !== undefined ? cleanAndParseFloat(d[col.temp], NaN) : NaN;
    const humidityPct = col.humidity !== undefined ? cleanAndParseFloat(d[col.humidity], NaN) : NaN;
    let distanceMm = col.distance !== undefined ? cleanAndParseFloat(d[col.distance], NaN) : NaN;
    if (isNaN(distanceMm) && col.dz !== undefined) distanceMm = cleanAndParseFloat(d[col.dz], NaN);
    const gradeRaw = col.grade !== undefined ? cleanAndParseFloat(d[col.grade], NaN) : NaN;
    const jetStabilityGrade = Number.isFinite(gradeRaw) && gradeRaw >= 1 && gradeRaw <= 4 ? Math.round(gradeRaw) : 0;
    const comments = col.comments !== undefined ? cellStr(d[col.comments]) : "";

    // Metadati: TUTTE le colonne della riga + proprietà + composizione (per la ricerca).
    const metadata: Record<string, string> = {};
    headerOrig.forEach((h, idx) => {
      const v = cellStr(d[idx]);
      if (h && v !== "") metadata[h] = v;
    });
    if (propRec) for (const [k, v] of Object.entries(propRec)) if (!metadata[k]) metadata[k] = v;
    if (setupRec) for (const [k, v] of Object.entries(setupRec)) if (!metadata[`Setup: ${k}`]) metadata[`Setup: ${k}`] = v;

    const polymerName = pick(compRec, ["polimero a", "polímero a", "polimero", "polym"]);
    const solventName = pick(compRec, ["disolvente a", "disolvente", "solvent"]);

    const injectorType = setupRec ? (pick(setupRec, ["inyector", "injector"]) || "Single Emitter") : "Single Emitter";
    const platform = setupRec ? pick(setupRec, ["plataforma", "drum", "tipo de drum"]) : undefined;
    const collectorType = platform ? (platform.toLowerCase().includes("rot") ? "Rotating Drum" : platform) : "Rotating Drum";

    const baseName = formula || sample || `Run ${results.length + 1}`;
    const identifier = `${baseName}${setupNum ? ` · setup${setupNum}` : ""}${formula && sample ? ` #${sample}` : ""}`;

    results.push({
      id: crypto.randomUUID(),
      operationIdentifier: identifier || `${fileName}-${r}`,
      sourceFile: fileName,
      operatorComments: comments,
      metadata,
      telemetryData: createMeasuredSnapshot(voltageKv, collectorVoltageKv, flowRateMlH, temperatureC, humidityPct, distanceMm),
      polymerName,
      solventName,
      discoveredParameters: Object.keys(metadata),
      distanceMm,
      jetStabilityGrade,
      injectorType,
      collectorType,
      telemetrySynthesized: false, // i parametri scalari sono reali
    });
  }

  return results;
}


// ---------------------------------------------------------------------------
// PATH 2 — Serie temporale: colonne di telemetria (voltaggio/portata nel tempo).
// ---------------------------------------------------------------------------
function classifyHeader(raw: string): keyof TelemetryRecord | null {

 const detected = detectParameter(raw);

if (detected.parameter) {
  registerParameter(
    detected.parameter,
    raw,
    detected.confidence
  );
}

switch (detected.parameter) {
  case "time":
    return "timestampSec";

  case "voltage":
    return "voltageKv";

  case "flow":
    return "flowRateMlH";

  case "temperature":
    return "temperatureC";

  case "humidity":
    return "humidityPct";

  case "distance":
    return "distanceMm";

  default:
    return null;
}

}

function extractTimeSeries(rows: any[]): TelemetryRecord[] {
  const maxScan = Math.min(rows.length, 25);
  for (let r = 0; r < maxScan; r++) {
    const headerRow = (rows[r] as any[]) || [];
    const colMap: Partial<Record<keyof TelemetryRecord, number>> = {};
    headerRow.forEach((cell, idx) => {
      const key = classifyHeader(cellStr(cell));
      if (key && colMap[key] === undefined) colMap[key] = idx;
    });
    if (colMap.voltageKv === undefined && colMap.flowRateMlH === undefined) continue;

    const records: TelemetryRecord[] = [];
    for (let dr = r + 1; dr < rows.length; dr++) {
      const dataRow = (rows[dr] as any[]) || [];
      if (dataRow.every(c => cellStr(c) === "")) continue;
      const v = colMap.voltageKv !== undefined ? cleanAndParseFloat(dataRow[colMap.voltageKv]) : NaN;
      const f = colMap.flowRateMlH !== undefined ? cleanAndParseFloat(dataRow[colMap.flowRateMlH]) : NaN;
      if (isNaN(v) && isNaN(f)) continue;
      records.push({
        timestampSec: colMap.timestampSec !== undefined ? cleanAndParseFloat(dataRow[colMap.timestampSec], records.length * 5) : records.length * 5,
        voltageKv: isNaN(v) ? 0 : v,
        flowRateMlH: isNaN(f) ? 0 : f,
        temperatureC: colMap.temperatureC !== undefined ? cleanAndParseFloat(dataRow[colMap.temperatureC], 22) : 22,
        humidityPct: colMap.humidityPct !== undefined ? cleanAndParseFloat(dataRow[colMap.humidityPct], 40) : 40,
        distanceMm: colMap.distanceMm !== undefined ? cleanAndParseFloat(dataRow[colMap.distanceMm], 150) : 150,
      });
    }
    if (records.length > 0) return records;
  }
  return [];
}

const COMMENT_KEYS = ["comment", "comentario", "nota", "note", "osserv", "observ"];

function extractMetadata(rows: any[], metadata: Record<string, string>, comments: string[]): void {
  rows.forEach(row => {
    const cells = (row as any[]) || [];
    if (cells.length === 1 && typeof cells[0] === "string" && cells[0].includes(":")) {
      const [k, ...rest] = cells[0].split(":");
      const v = rest.join(":").trim();
      if (k.trim() && v) addMeta(metadata, comments, k.trim(), v);
      return;
    }
    const nonEmpty = cells.filter(c => cellStr(c) !== "");
    if (nonEmpty.length === 2) {
      const k = cellStr(nonEmpty[0]);
      const v = cellStr(nonEmpty[1]);
      if (k && v && isNaN(Number(k)) && k.length < 40) addMeta(metadata, comments, k, v);
    }
  });
}

function addMeta(metadata: Record<string, string>, comments: string[], k: string, v: string): void {
  const kl = k.toLowerCase();
  if (COMMENT_KEYS.some(c => kl.includes(c))) comments.push(v);
  else metadata[k] = v;
}

// ---------------------------------------------------------------------------
// Orchestratore: prova process-table → serie temporale → solo-metadati.
// Funzione pura e testabile (senza FileReader).
// ---------------------------------------------------------------------------
export function parseWorkbook(wb: XLSX.WorkBook, fileName: string): ParsedExcelResult[] {
  // PATH 1: sceglie il foglio che assomiglia di più a una tabella di run
  // (più colonne-parametro riconosciute, poi più righe), non il primo che capita.
  let best: { sheet: string; found: NonNullable<ReturnType<typeof findProcessTable>>; score: number; runs: number } | null = null;
  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<any>(wb.Sheets[name], { header: 1, blankrows: false });
    const found = findProcessTable(rows);
    if (!found) continue;
    const c = found.col;
    const score = ["voltage", "voltageNeg", "flow", "temp", "humidity", "distance", "grade"].filter(k => c[k] !== undefined).length;
    const runs = rows.length - found.headerIdx - 1;
    if (!best || score > best.score || (score === best.score && runs > best.runs)) best = { sheet: name, found, score, runs };
  }
  if (best) {
    const runs = buildProcessRuns(wb, fileName, best.sheet, best.found);
    if (runs.length > 0) return runs;
  }

  // PATH 2 + 3: serie temporale / solo metadati (una sola operazione).
  const metadata: Record<string, string> = {};
  const comments: string[] = [];
  let telemetry: TelemetryRecord[] = [];
  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<any>(wb.Sheets[name], { header: 1, blankrows: false });
    if (!rows || rows.length === 0) continue;
    const ts = extractTimeSeries(rows);
    if (ts.length > telemetry.length) telemetry = ts;
    extractMetadata(rows, metadata, comments);
  }

let polymerName = pick(metadata, ["polim", "polím", "polym"]);
let solventName = pick(metadata, ["solv", "disolv"]);

// Se il materiale è già noto usa il nome canonico.
if (polymerName) {
  const found = findMaterial("polymer", polymerName);

  if (found) {
    polymerName = found.canonical;
  } else {
    registerMaterial(
      "polymer",
      polymerName,
      polymerName,
      1
    );
  }
}

if (solventName) {
  const found = findMaterial("solvent", solventName);

  if (found) {
    solventName = found.canonical;
  } else {
    registerMaterial(
      "solvent",
      solventName,
      solventName,
      1
    );
  }
}

const operationIdentifier =
  pick(metadata, [
    "run",
    "corrida",
    "operazione",
    "operation",
    "fórmula",
    "formula"
  ]) ||
  fileName.replace(/\.(xlsx|xls|xlsm)$/i, "");

const telemetrySynthesized = telemetry.length === 0;

for (const key of Object.keys(metadata)) {
  detectParameter(key);
}

return [{
  id: crypto.randomUUID(),
  operationIdentifier,
  sourceFile: fileName,
  operatorComments: comments.join(" | "),
  metadata,
  telemetryData: telemetry,
  polymerName,
  solventName,
  discoveredParameters: Object.keys(metadata),
  telemetrySynthesized,
}];
}

/**
 * Converts the XLSX workbook into the structural contract expected by
 * the Core Engine without coupling the Core to the XLSX library.
 */
function createCoreWorkbook(
  workbook: XLSX.WorkBook
): WorkbookLike {
  const sheets: WorkbookLike["Sheets"] = {};

  for (const sheetName of workbook.SheetNames) {
    const sourceSheet = workbook.Sheets[sheetName];

    if (!sourceSheet) {
      continue;
    }

    const compatibleSheet: WorkbookLike["Sheets"][string] = {};

    for (const [key, value] of Object.entries(sourceSheet)) {
      compatibleSheet[key] = value;
    }

    sheets[sheetName] = compatibleSheet;
  }

  return {
    SheetNames: [...workbook.SheetNames],
    Sheets: sheets
  };
}

export async function parseElectrospinningExcel(
  file: File
): Promise<ParsedExcelResult[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const result = event.target?.result;

        if (!(result instanceof ArrayBuffer)) {
          reject(
            new Error(
              `Formato di lettura non valido per il file "${file.name}".`
            )
          );
          return;
        }

        const data = new Uint8Array(result);
        const workbook = XLSX.read(data, {
          type: "array"
        });

        /*
         * Legacy parser.
         *
         * Remains the current producer of ParsedExcelResult so the existing
         * UI, Dashboard and Firestore import flow remain compatible.
         */
        const parsedResults = parseWorkbook(
          workbook,
          file.name
        );

        /*
         * New Core Engine.
         *
         * Runs in parallel for diagnostics and architectural validation.
         * A Core failure must not interrupt the existing user import flow
         * during this transitional integration phase.
         */
        try {
          const ingestionResult =
            await runIngestionPipeline(
             createCoreWorkbook(workbook)
          );

          console.groupCollapsed(
            `[Fluidnatek Core Engine] ${file.name}`
          );

          console.info(
            "Pipeline success:",
            ingestionResult.success
          );

          console.info(
            "Resolved headers:",
            ingestionResult.resolvedHeaders
          );

          console.info(
            "Unknown headers:",
            ingestionResult.unknownHeaders
          );

          console.info(
            "Resolved materials:",
            ingestionResult.resolvedMaterials
          );

          console.info(
            "Warnings:",
            ingestionResult.warnings
          );

          console.info(
            "Errors:",
            ingestionResult.errors
          );

          console.info(
            "Complete ingestion result:",
            ingestionResult
          );

          console.groupEnd();
        } catch (coreError: unknown) {
          console.warn(
            "Core Engine diagnostics failed. " +
              "The compatible import result was preserved.",
            coreError
          );
        }

        resolve(parsedResults);
      } catch (error: unknown) {
        reject(
          error instanceof Error
            ? error
            : new Error(
                `Errore sconosciuto durante la lettura di "${file.name}".`
              )
        );
      }
    };

    reader.onerror = () => {
      reject(
        new Error(
          `Impossibile leggere il file "${file.name}".`
        )
      );
    };

    reader.readAsArrayBuffer(file);
  });
}
