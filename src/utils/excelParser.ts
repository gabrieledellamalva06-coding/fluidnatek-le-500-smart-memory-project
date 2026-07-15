import * as XLSX from "xlsx";
import { TelemetryRecord } from "../types";

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
}

function cleanAndParseFloat(val: any, defaultVal: number = NaN): number {
  if (val === undefined || val === null) return defaultVal;
  const str = String(val).trim();
  if (str === "") return defaultVal;
  // Convert comma decimals to dot decimals (e.g. "15,5" -> "15.5")
  const cleaned = str.replace(/,/, ".").replace(/[^\d.-]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? defaultVal : parsed;
}

export async function parseElectrospinningExcel(file: File): Promise<ParsedExcelResult[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        
        let allGroups: Record<string, {telemetry: TelemetryRecord[], comments: Set<string>, experimentId: string}> = {};
        const allResults: ParsedExcelResult[] = [];
        
        const isVoltageCol = (h: string) => 
          h.includes("voltage") || h.includes("tension") || h.includes("tensión") || h.includes("kv") || h === "v" || h.startsWith("v ") || h.includes("v_") || h.includes("hv");
        const isFlowCol = (h: string) => 
          h.includes("flow") || h.includes("ml/h") || h.includes("caudal") || h.includes("rate") || h === "q" || h.startsWith("q ") || h.includes("q_") || h.includes("portata");
        const isFormulaCol = (h: string) => h.includes("fórmula") || h.includes("formula") || h.includes("id");
        const isCommentCol = (h: string) => h.includes("comentario") || h.includes("comment");

        workbook.SheetNames.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 });
          if (!rows || rows.length < 2) return;

          let colMap: Record<string, number> = {};
          let headerRowIndex = -1;

          // Robust header detection
          for (let r = 0; r < Math.min(rows.length, 20); r++) {
            const row = (rows[r] as any[] || []).map((c: any) => String(c || "").trim().toLowerCase());
            if (row.includes("formula") && row.includes("setup")) {
              headerRowIndex = r;
              row.forEach((h, idx) => {
                if (h.includes("formula")) colMap['formula'] = idx;
                else if (h.includes("setup")) colMap['setup'] = idx;
                else if (h.includes("hv+")) colMap['hvPos'] = idx;
                else if (h.includes("hv-")) colMap['hvNeg'] = idx;
                else if (h.includes("q1")) colMap['flow'] = idx;
                else if (h.includes("procesabilidad")) colMap['grade'] = idx;
                else if (h.includes("comentarios")) colMap['comments'] = idx;
              });
              break;
            }
          }

          if (headerRowIndex !== -1) {
            for (let r = headerRowIndex + 1; r < rows.length; r++) {
              const row = rows[r];
              if (!row[colMap['formula']]) continue;

              allResults.push({
                id: crypto.randomUUID(),
                operationIdentifier: String(row[colMap['formula']] || "N/A"),
                sourceFile: file.name,
                operatorComments: String(row[colMap['comments']] || ""),
                metadata: {
                    setup: String(row[colMap['setup']] || ""),
                },
                telemetryData: [], // Not applicable in row-based structure
                discoveredParameters: [],
                // ... map other fields
              });
            }
          }
        });

        Object.entries(allGroups).forEach(([formula, data]) => {
          allResults.push({
            id: data.experimentId,
            operationIdentifier: formula,
            sourceFile: file.name,
            operatorComments: Array.from(data.comments).join(" | "),
            metadata: {},
            telemetryData: data.telemetry,
            discoveredParameters: []
          });
        });

        resolve(allResults);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (e) => reject(new Error("Impossibile leggere il file"));
    reader.readAsArrayBuffer(file);
  });
}

function generateMockTelemetryForEmptyFile(): TelemetryRecord[] {
  // If spreadsheet had only metadata, we generate a short realistic template telemetry to display nice curves.
  const telemetry: TelemetryRecord[] = [];
  const baseV = 16.5;
  const baseF = 1.0;
  for (let i = 0; i < 20; i++) {
    telemetry.push({
      id: crypto.randomUUID(),
      experimentId: 'mock', // Will be updated later
      timestampSec: i * 5,
      voltageKv: parseFloat((baseV + Math.sin(i * 0.5) * 0.2 + (Math.random() - 0.5) * 0.05).toFixed(2)),
      flowRateMlH: parseFloat((baseF + Math.cos(i * 0.5) * 0.02 + (Math.random() - 0.5) * 0.005).toFixed(3)),
      temperatureC: 22.5,
      humidityPct: 38.0,
      distanceMm: 150
    });
  }
  return telemetry;
}
