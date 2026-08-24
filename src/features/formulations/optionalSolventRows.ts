export type OptionalSolventRowCount = 0 | 1 | 2;

export interface OptionalSolventValues {
  solvent2Id: string;
  solvent2RatioPct: number | undefined;
  solvent3Id: string;
  solvent3RatioPct: number | undefined;
}

export interface SolventRatioValidation {
  valid: boolean;
  rowsComplete: boolean;
  ratiosValid: boolean;
  totalValid: boolean;
  duplicateMaterialId: string | undefined;
  total: number;
}

export function visibleOptionalSolventRows(values: OptionalSolventValues): OptionalSolventRowCount {
  if (values.solvent3Id || values.solvent3RatioPct !== undefined) return 2;
  if (values.solvent2Id || values.solvent2RatioPct !== undefined) return 1;
  return 0;
}

export function addOptionalSolventRow(count: OptionalSolventRowCount): OptionalSolventRowCount {
  return Math.min(2, count + 1) as OptionalSolventRowCount;
}

export function clearNewOptionalSolventRow(
  values: OptionalSolventValues,
  row: 2 | 3
): OptionalSolventValues {
  return row === 2
    ? { ...values, solvent2Id: "", solvent2RatioPct: undefined }
    : { ...values, solvent3Id: "", solvent3RatioPct: undefined };
}

export function removeOptionalSolventRow(
  values: OptionalSolventValues,
  row: 2 | 3
): OptionalSolventValues {
  if (row === 2 && (values.solvent3Id || values.solvent3RatioPct !== undefined)) {
    return {
      solvent2Id: values.solvent3Id,
      solvent2RatioPct: values.solvent3RatioPct,
      solvent3Id: "",
      solvent3RatioPct: undefined,
    };
  }
  return row === 2
    ? { ...values, solvent2Id: "", solvent2RatioPct: undefined }
    : { ...values, solvent3Id: "", solvent3RatioPct: undefined };
}

export function optionalSolventRowIsComplete(id: string, ratio: number | undefined): boolean {
  return Boolean(id) && ratio !== undefined && Number.isFinite(ratio);
}

export function submittedOptionalSolvents(
  values: OptionalSolventValues,
  visibleCount: OptionalSolventRowCount
): Array<{ materialId: string; ratioPct: number }> {
  return [
    { materialId: values.solvent2Id, ratioPct: values.solvent2RatioPct },
    { materialId: values.solvent3Id, ratioPct: values.solvent3RatioPct },
  ].slice(0, visibleCount).flatMap((row) =>
    optionalSolventRowIsComplete(row.materialId, row.ratioPct)
      ? [{ materialId: row.materialId, ratioPct: row.ratioPct as number }]
      : []
  );
}

export function visibleSolventTotal(
  solvent1RatioPct: number | undefined,
  values: OptionalSolventValues,
  visibleCount: OptionalSolventRowCount
): number {
  const ratios: Array<number | undefined> = [
    solvent1RatioPct,
    values.solvent2RatioPct,
    values.solvent3RatioPct,
  ].slice(0, visibleCount + 1);
  return ratios.every((ratio) => ratio !== undefined && Number.isFinite(ratio))
    ? (ratios as number[]).reduce((total, ratio) => total + ratio, 0)
    : Number.NaN;
}

export function validateVisibleSolvents(
  solvent1Id: string,
  solvent1RatioPct: number | undefined,
  values: OptionalSolventValues,
  visibleCount: OptionalSolventRowCount
): SolventRatioValidation {
  const rows = [
    { id: solvent1Id, ratio: solvent1RatioPct },
    { id: values.solvent2Id, ratio: values.solvent2RatioPct },
    { id: values.solvent3Id, ratio: values.solvent3RatioPct },
  ].slice(0, visibleCount + 1);
  const rowsComplete = rows.every((row) => Boolean(row.id) && row.ratio !== undefined);
  const ratiosValid = rows.every(
    (row) => row.ratio !== undefined && Number.isFinite(row.ratio) && row.ratio >= 0 && row.ratio <= 100
  );
  const total = visibleSolventTotal(solvent1RatioPct, values, visibleCount);
  const totalValid = Number.isFinite(total) && Math.abs(total - 100) <= 0.001;
  const duplicateMaterialId = duplicateVisibleSolventId(solvent1Id, values, visibleCount);
  return {
    valid: rowsComplete && ratiosValid && totalValid && !duplicateMaterialId,
    rowsComplete,
    ratiosValid,
    totalValid,
    duplicateMaterialId,
    total,
  };
}

export function duplicateVisibleSolventId(
  solvent1Id: string,
  values: OptionalSolventValues,
  visibleCount: OptionalSolventRowCount
): string | undefined {
  const ids = [solvent1Id, values.solvent2Id, values.solvent3Id]
    .slice(0, visibleCount + 1)
    .filter(Boolean);
  return ids.find((id, index) => ids.indexOf(id) !== index);
}
