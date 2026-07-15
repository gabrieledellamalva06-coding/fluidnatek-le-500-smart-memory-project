import jsPDF from "jspdf";
import { Experiment } from "../types";

export async function exportToPDF(experiments: Experiment[]) {
  const doc = new jsPDF("p", "mm", "a4");
  
  doc.setFontSize(18);
  doc.text("Report Esperimenti Electrospinning", 10, 15);
  doc.setFontSize(12);

  for (let i = 0; i < experiments.length; i++) {
    const exp = experiments[i];
    if (i > 0) doc.addPage();
    
    doc.setFontSize(14);
    doc.text(`Operazione: ${exp.operationIdentifier}`, 10, 25);
    doc.setFontSize(10);
    doc.text(`Data: ${new Date(exp.ingestedAt).toLocaleDateString()}`, 10, 32);
    doc.text(`Macchina: ${exp.machineModel}`, 10, 39);
    doc.text(`Stabilità Getto (1-5): ${exp.jetStabilityGrade}`, 10, 46);
    doc.text(`Commenti Operatore: ${exp.operatorComments}`, 10, 53);

    doc.setFontSize(12);
    doc.text("Dati Telemetria (Riepilogo):", 10, 65);
    // Add summary data here if available, for now a placeholder as charts need rendering
    doc.text("Visualizzazione grafici telemetria non ancora implementata.", 10, 72);
  }

  doc.save("report-esperimenti.pdf");
}
