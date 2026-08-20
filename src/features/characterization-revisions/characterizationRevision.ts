import type { SolutionCharacterization, SolutionCharacterizationRevision, SolutionCharacterizationValues } from "../../core/types/characterization";

export const CHARACTERIZATION_VALUE_FIELDS: ReadonlyArray<keyof SolutionCharacterizationValues> = [
  "solidsContentPct", "viscosityMpas", "conductivityUsCm", "densityGcm3", "surfaceTensionMnM", "ph", "notes",
];

export function characterizationValues(record: SolutionCharacterization): SolutionCharacterizationValues {
  return Object.fromEntries(CHARACTERIZATION_VALUE_FIELDS.flatMap((field) => record[field] === undefined ? [] : [[field, record[field]]])) as SolutionCharacterizationValues;
}

export function changedCharacterizationFields(previous: SolutionCharacterizationValues, next: SolutionCharacterizationValues): Array<keyof SolutionCharacterizationValues> {
  return CHARACTERIZATION_VALUE_FIELDS.filter((field) => previous[field] !== next[field]);
}

export function createCharacterizationRevisionDraft(input: { id: string; characterizationId: string; previousValues: SolutionCharacterizationValues; newValues: SolutionCharacterizationValues; changeReason: string; changedBy: string }): Omit<SolutionCharacterizationRevision, "changedAt"> {
  return { ...input, changedFields: changedCharacterizationFields(input.previousValues, input.newValues) };
}

export function isSessionCharacterizationEditable(id: string, sessionCreatedIds: ReadonlySet<string>): boolean {
  return sessionCreatedIds.has(id);
}

export function hasCharacterizationUpdates(revisions: readonly SolutionCharacterizationRevision[]): boolean {
  return revisions.length > 0;
}

export function sortRevisionsNewestFirst(revisions: readonly SolutionCharacterizationRevision[]): SolutionCharacterizationRevision[] {
  return [...revisions].sort((left, right) => revisionTimestamp(right.changedAt) - revisionTimestamp(left.changedAt) || right.id.localeCompare(left.id));
}

export function revisionTimestamp(value: unknown): number {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") return value.toDate().getTime();
  if (typeof value === "string" || typeof value === "number") { const timestamp = new Date(value).getTime(); return Number.isNaN(timestamp) ? 0 : timestamp; }
  return 0;
}
