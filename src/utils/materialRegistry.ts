export type MaterialType =
  | "polymer"
  | "solvent"
  | "injector"
  | "collector"
  | "additive"
  | "other";

export interface RegisteredMaterial {

  aliases: Set<string>;

  confidences: number[];

}

export interface MaterialRegistry {

  [type: string]: {

    [canonical: string]: RegisteredMaterial;

  };

}

const STORAGE_KEY = "fluidnatek_material_registry";

export const materialRegistry: MaterialRegistry = {};

function normalizeAlias(alias: string): string {

  return alias
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/[()[\]{}]/g, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

}

export function registerMaterial(

  type: MaterialType,

  canonical: string,

  alias: string,

  confidence: number

) {

  const t = type.toLowerCase();

  const c = normalizeAlias(canonical);

  const a = normalizeAlias(alias);

  if (!materialRegistry[t]) {

    materialRegistry[t] = {};

  }

  if (!materialRegistry[t][c]) {

    materialRegistry[t][c] = {

      aliases: new Set(),

      confidences: []

    };

  }

  const entry = materialRegistry[t][c];

  if (!entry.aliases.has(a)) {

    entry.aliases.add(a);

    entry.confidences.push(confidence);

    saveMaterialRegistry();

  }

}

export function findMaterial(

  type: MaterialType,

  alias: string

) {

  const t = type.toLowerCase();

  const a = normalizeAlias(alias);

  if (!materialRegistry[t]) return null;

  for (const [canonical, data] of Object.entries(materialRegistry[t])) {

    for (const stored of data.aliases) {

      if (stored === a) {

        return {

          canonical,

          confidence: Math.max(...data.confidences)

        };

      }

    }

  }

  return null;

}

export function exportMaterialRegistry() {

  const out: any = {};

  for (const [type, group] of Object.entries(materialRegistry)) {

    out[type] = {};

    for (const [canonical, data] of Object.entries(group)) {

      out[type][canonical] = {

        aliases: [...data.aliases],

        confidences: [...data.confidences]

      };

    }

  }

  return out;

}

export function importMaterialRegistry(data: any) {

  for (const [type, group] of Object.entries<any>(data)) {

    materialRegistry[type] = {};

    for (const [canonical, entry] of Object.entries<any>(group)) {

      materialRegistry[type][canonical] = {

        aliases: new Set(entry.aliases),

        confidences: [...entry.confidences]

      };

    }

  }

}

export function saveMaterialRegistry() {

  if (typeof localStorage === "undefined") return;

  localStorage.setItem(

    STORAGE_KEY,

    JSON.stringify(exportMaterialRegistry())

  );

}

export function loadMaterialRegistry() {

  if (typeof localStorage === "undefined") return;

  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) return;

  try {

    importMaterialRegistry(JSON.parse(raw));

  }

  catch {

    console.warn("Unable to load material registry.");

  }

}

loadMaterialRegistry();

export function getMaterialSuggestions(
  type: MaterialType,
  query: string
): string[] {

  const q = normalizeAlias(query);

  if (!materialRegistry[type]) {
    return [];
  }

  const results = new Set<string>();

  for (const [canonical, data] of Object.entries(materialRegistry[type])) {

    if (canonical.includes(q)) {
      results.add(canonical);
    }

    for (const alias of data.aliases) {

      if (alias.includes(q)) {
        results.add(canonical);
      }

    }

  }

  return [...results].sort();

}

export function getMaterialStatistics() {

  return Object.entries(materialRegistry).flatMap(

    ([type, group]) =>

      Object.entries(group).map(

        ([canonical, data]) => ({

          type,

          canonical,

          aliases: [...data.aliases],

          samples: data.confidences.length,

          averageConfidence:

            data.confidences.length === 0

              ? 0

              : data.confidences.reduce((a, b) => a + b, 0) /

                data.confidences.length

        })

      )

  );

}


loadMaterialRegistry();

export function removeMaterial(
  type: MaterialType,
  canonical: string
) {

  if (!materialRegistry[type]) return;

  delete materialRegistry[type][canonical];

  saveMaterialRegistry();

}

export function clearMaterialRegistry() {

  materialRegistry.polymer = {};

  materialRegistry.solvent = {};

  saveMaterialRegistry();

}
