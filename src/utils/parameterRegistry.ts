export interface RegisteredAlias {
  aliases: Set<string>;
  confidences: number[];
}

export interface ParameterRegistry {
  [parameter: string]: RegisteredAlias;
}

export const parameterRegistry: ParameterRegistry = {};

function normalizeAlias(alias: string): string {
  return alias
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\(kv\)/gi, "kv")
    .replace(/\(ml\/h\)/gi, "mlh")
    .replace(/[_-]/g, " ")
    .replace(/[()[\]{}]/g, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function registerParameter(
  parameter: string,
  originalHeader: string,
  confidence: number
) {
  if (!parameter) return;

  if (!parameterRegistry[parameter]) {
    parameterRegistry[parameter] = {
      aliases: new Set(),
      confidences: []
    };
  }

  const alias = normalizeAlias(originalHeader);

  if (!parameterRegistry[parameter].aliases.has(alias)) {
    parameterRegistry[parameter].aliases.add(alias);
    parameterRegistry[parameter].confidences.push(confidence);
  }

  autoSave();
}

export function getRegisteredParameters() {
  return parameterRegistry;
}

export function findRegisteredParameter(
  header: string
): { parameter: string; confidence: number } | null {

  const normalized = normalizeAlias(header);

  for (const [parameter, data] of Object.entries(parameterRegistry)) {

    for (const alias of data.aliases) {

      if (normalizeAlias(alias) === normalized) {

        const bestConfidence =
          Math.max(...data.confidences);

        return {
          parameter,
          confidence: bestConfidence
        };

      }

    }

  }

  return null;

}

export function exportParameterRegistry() {
  const result: Record<
    string,
    {
      aliases: string[];
      confidences: number[];
    }
  > = {};

  for (const [parameter, data] of Object.entries(parameterRegistry)) {
    result[parameter] = {
      aliases: [...data.aliases],
      confidences: [...data.confidences]
    };
  }

  return result;
}

export function importParameterRegistry(
  data: ReturnType<typeof exportParameterRegistry>
) {
  for (const [parameter, entry] of Object.entries(data)) {
    parameterRegistry[parameter] = {
      aliases: new Set(entry.aliases),
      confidences: [...entry.confidences]
    };
  }
}

export function getParameterStatistics() {
  const stats: Record<
    string,
    {
      aliases: string[];
      averageConfidence: number;
    }
  > = {};

  for (const [parameter, data] of Object.entries(parameterRegistry)) {
    const avg =
      data.confidences.length === 0
        ? 0
        : data.confidences.reduce((a, b) => a + b, 0) /
          data.confidences.length;

    stats[parameter] = {
      aliases: [...data.aliases],
      averageConfidence: Number(avg.toFixed(3))
    };
  }

  return stats;
}

export function getRegistryStatistics() {
  return Object.entries(parameterRegistry).map(([parameter, data]) => ({
    parameter,
    aliases: [...data.aliases],
    averageConfidence:
      data.confidences.length === 0
        ? 0
        : data.confidences.reduce((a, b) => a + b, 0) /
          data.confidences.length,
    samples: data.confidences.length
  }));
}

const STORAGE_KEY = "fluidnatek_parameter_registry";

export function saveRegistry() {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(exportParameterRegistry())
  );
}

// Salva automaticamente ogni volta che cambia il registry.
function autoSave() {
  saveRegistry();
}

export function registerCustomAlias(
  parameter: string,
  alias: string
) {
  registerParameter(
    parameter,
    alias,
    1
  );

  saveRegistry();
}

export function loadRegistry() {
  if (typeof localStorage === "undefined") return;
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) return;

  try {
    importParameterRegistry(JSON.parse(raw));
  } catch {
    console.warn("Unable to load parameter registry.");
  }
}

loadRegistry();
