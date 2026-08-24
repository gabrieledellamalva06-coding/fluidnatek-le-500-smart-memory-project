export type OptionalPolymerRowCount = 0 | 1 | 2;

export interface OptionalPolymerValues {
  polymer2Id: string;
  polymer2ConcentrationPct: number | undefined;
  polymer3Id: string;
  polymer3ConcentrationPct: number | undefined;
}

export function visibleOptionalPolymerRows(
  values: OptionalPolymerValues
): OptionalPolymerRowCount {
  if (values.polymer3Id || values.polymer3ConcentrationPct !== undefined) return 2;
  if (values.polymer2Id || values.polymer2ConcentrationPct !== undefined) return 1;
  return 0;
}

export function addOptionalPolymerRow(
  count: OptionalPolymerRowCount
): OptionalPolymerRowCount {
  return Math.min(2, count + 1) as OptionalPolymerRowCount;
}

export function removeOptionalPolymerRow(
  values: OptionalPolymerValues,
  row: 2 | 3
): OptionalPolymerValues {
  if (row === 2 && (values.polymer3Id || values.polymer3ConcentrationPct !== undefined)) {
    return {
      polymer2Id: values.polymer3Id,
      polymer2ConcentrationPct: values.polymer3ConcentrationPct,
      polymer3Id: "",
      polymer3ConcentrationPct: undefined,
    };
  }

  return row === 2
    ? { ...values, polymer2Id: "", polymer2ConcentrationPct: undefined }
    : { ...values, polymer3Id: "", polymer3ConcentrationPct: undefined };
}

export function optionalPolymerRowIsComplete(
  materialId: string,
  concentration: number | undefined
): boolean {
  return Boolean(materialId) && concentration !== undefined && Number.isFinite(concentration);
}

export function submittedOptionalPolymers(
  values: OptionalPolymerValues,
  visibleCount: OptionalPolymerRowCount
): Array<{ materialId: string; concentrationPct: number }> {
  const rows = [
    { materialId: values.polymer2Id, concentrationPct: values.polymer2ConcentrationPct },
    { materialId: values.polymer3Id, concentrationPct: values.polymer3ConcentrationPct },
  ].slice(0, visibleCount);

  return rows.flatMap((row) =>
    optionalPolymerRowIsComplete(row.materialId, row.concentrationPct)
      ? [{ materialId: row.materialId, concentrationPct: row.concentrationPct as number }]
      : []
  );
}
