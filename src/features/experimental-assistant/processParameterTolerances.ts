export interface ProcessParameterTolerance {
  absolute: number;
  relative: number;
  unit: string;
}

export const processParameterTolerances: Readonly<Record<string, ProcessParameterTolerance>> = {
  flowRateMlH: { absolute: 0.2, relative: 0.2, unit: "mL/h" },
  voltageKv: { absolute: 2, relative: 0.1, unit: "kV" },
  collectorVoltageKv: { absolute: 1, relative: 0.15, unit: "kV" },
  temperatureC: { absolute: 5, relative: 0.2, unit: "°C" },
  humidityPct: { absolute: 5, relative: 0.15, unit: "%" },
  distanceMm: { absolute: 10, relative: 0.1, unit: "mm" },
  drumSpeedRpm: { absolute: 25, relative: 0.15, unit: "rpm" },
};
