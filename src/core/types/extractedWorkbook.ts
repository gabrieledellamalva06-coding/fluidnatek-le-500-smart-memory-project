import type { ExtractedSheet } from "./extractedSheet";

export interface ExtractedWorkbook {

    fileName?: string;

    sheets: ExtractedSheet[];

    importedAt: string;

}