export interface LocalEntity {
  id: string;
}

export interface LocalBatchSetOperation {
  type: "set";
  path: string;
  id: string;
  data: object;
  merge?: boolean;
}

export interface LocalBatchDeleteOperation {
  type: "delete";
  path: string;
  id: string;
}

export type LocalBatchOperation = LocalBatchSetOperation | LocalBatchDeleteOperation;

const MEMORY_STORE = new Map<string, Map<string, LocalEntity>>();

function storageKey(path: string): string {
  return `fluidnatek.local.${path}`;
}

function loadCollection(path: string): Map<string, LocalEntity> {
  const existing = MEMORY_STORE.get(path);
  if (existing) return existing;
  const collection = new Map<string, LocalEntity>();
  if (typeof localStorage !== "undefined") {
    const raw = localStorage.getItem(storageKey(path));
    if (raw) {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (isRecord(item) && typeof item.id === "string") collection.set(item.id, item as unknown as LocalEntity);
          }
        }
      } catch {
        localStorage.removeItem(storageKey(path));
      }
    }
  }
  MEMORY_STORE.set(path, collection);
  return collection;
}

function persist(path: string, collection: Map<string, LocalEntity>): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(storageKey(path), JSON.stringify([...collection.values()]));
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export class LocalPersistenceService {
  async getCollection<T>(path: string): Promise<T[]> {
    return [...loadCollection(path).values()] as T[];
  }

  async getDocument<T>(path: string, id: string): Promise<T | null> {
    return (loadCollection(path).get(id) as T | undefined) ?? null;
  }

  async create<T extends object>(path: string, data: T): Promise<{ id: string }> {
    const collection = loadCollection(path);
    const id = createId(path.split("/").pop() ?? "entity");
    collection.set(id, { id, ...data });
    persist(path, collection);
    return { id };
  }

  async setDocument<T extends object>(path: string, id: string, data: T): Promise<void> {
    const collection = loadCollection(path);
    const current = collection.get(id) ?? { id };
    collection.set(id, { ...current, ...data, id });
    persist(path, collection);
  }

  async replaceDocument<T extends object>(path: string, id: string, data: T): Promise<void> {
    const collection = loadCollection(path);
    collection.set(id, { ...data, id });
    persist(path, collection);
  }

  async update<T extends object>(path: string, id: string, data: T): Promise<void> {
    const collection = loadCollection(path);
    const current = collection.get(id);
    if (!current) throw new Error(`Local record "${id}" does not exist.`);
    collection.set(id, { ...current, ...data, id });
    persist(path, collection);
  }

  async delete(path: string, id: string): Promise<void> {
    const collection = loadCollection(path);
    collection.delete(id);
    persist(path, collection);
  }

  async executeBatch(operations: readonly LocalBatchOperation[]): Promise<void> {
    for (const operation of operations) {
      if (operation.type === "delete") await this.delete(operation.path, operation.id);
      else await this.setDocument(operation.path, operation.id, operation.data);
    }
  }
}

export const localPersistenceService = new LocalPersistenceService();
