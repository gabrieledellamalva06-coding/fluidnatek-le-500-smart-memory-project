/**
 * Normalizza un'intestazione Excel prima del matching.
 * Lo scopo è eliminare differenze dovute a unità di misura,
 * parentesi, simboli e formattazioni differenti.
 */
export function normalizeHeader(header: string): string {
  return header
    .toLowerCase()

    // Elimina il contenuto tra parentesi tonde e quadre
    .replace(/\(.*?\)/g, "")
    .replace(/\[.*?\]/g, "")

    // Elimina alcune unità comuni
    .replace(/\bkv\b/g, "")
    .replace(/\bml\/h\b/g, "")
    .replace(/\bmm\b/g, "")
    .replace(/\bcm\b/g, "")
    .replace(/\b°c\b/g, "")
    .replace(/\bc\b/g, "")
    .replace(/\b%\b/g, "")

    // Uniforma separatori
    .replace(/[_\-]+/g, " ")

    // Elimina simboli residui
    .replace(/[^\w\s]/g, " ")

    // Comprime spazi multipli
    .replace(/\s+/g, " ")

    .trim();
}