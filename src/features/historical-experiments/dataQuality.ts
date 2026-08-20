export interface RecordQualitySummary { score: number; complete: string[]; missing: string[]; }
export function calculateRecordQuality(input: { project: string; formulation: string; setup: string; flowRate: number | null; hvPlus: number | null; hvMinus: number | null; grade: number | null; sourceFile: string; characterization: boolean }): RecordQualitySummary {
  const checks: Array<[string, boolean]> = [["Project", Boolean(input.project)], ["Formulation", Boolean(input.formulation)], ["Setup", Boolean(input.setup)], ["Flow Rate", input.flowRate !== null], ["HV+", input.hvPlus !== null], ["HV−", input.hvMinus !== null], ["Processability grade", input.grade !== null], ["Source file", Boolean(input.sourceFile)], ["Characterization", input.characterization]];
  const complete = checks.filter(([, present]) => present).map(([label]) => label);
  return { score: Math.round((complete.length / checks.length) * 100), complete, missing: checks.filter(([, present]) => !present).map(([label]) => label) };
}
