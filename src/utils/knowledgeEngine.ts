import { Experiment, Formulation } from "../types";

export function getExperimentsForFormulation(
  formulationId: string,
  experiments: Experiment[]
) {
  return experiments.filter(
    e => e.formulationId === formulationId
  );
}

export function getAverageVoltage(
  experiments: Experiment[]
) {
  const values = experiments.flatMap(
    e => e.telemetryData.map(t => t.voltageKv)
  );

  if (!values.length) return null;

  return (
    values.reduce((a,b)=>a+b,0) /
    values.length
  );
}

export function getAverageFlowRate(
  experiments: Experiment[]
) {
  const values = experiments.flatMap(
    e => e.telemetryData.map(t => t.flowRateMlH)
  );

  if (!values.length) return null;

  return (
    values.reduce((a,b)=>a+b,0) /
    values.length
  );
}