const STORAGE_KEY = "fluidnatek_custom_aliases";

export type CustomAliases = Record<string, string[]>;

export function loadCustomAliases(): CustomAliases {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return {};
    }

    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveCustomAliases(data: CustomAliases): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function addCustomAlias(
  parameter: string,
  alias: string
): void {
  const aliases = loadCustomAliases();

  if (!aliases[parameter]) {
    aliases[parameter] = [];
  }

  const normalized = alias.trim().toLowerCase();

  if (!aliases[parameter].includes(normalized)) {
    aliases[parameter].push(normalized);
  }

  saveCustomAliases(aliases);
}