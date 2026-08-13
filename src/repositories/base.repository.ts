import { localPersistenceService } from "../services/local.persistence.service";
import { firestoreService } from "../services/firestore.service";

export interface RepositoryEntity {
  id: string;
}

export class BaseRepository<
  TEntity extends RepositoryEntity
> {
  constructor(
    private readonly path: string
  ) {}

  async getAll(): Promise<TEntity[]> {
    const localRecords = await localPersistenceService.getCollection<TEntity>(this.path);
    try {
      const historicalRecords = await firestoreService.getCollection<TEntity>(this.path);
      const merged = new Map<string, TEntity>();
      for (const record of historicalRecords) merged.set(record.id, record);
      for (const record of localRecords) merged.set(record.id, record);
      return [...merged.values()];
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown Firestore error";
      throw new Error(`Firestore read failed for ${this.path}. Local cache contains ${localRecords.length} record(s), but it was not used as a silent fallback. ${reason}`);
    }
  }

  async getById(
    id: string
  ): Promise<TEntity | null> {
    const localRecord = await localPersistenceService.getDocument<TEntity>(this.path, id);
    if (localRecord) return localRecord;
    return firestoreService.getDocument<TEntity>(this.path, id);
  }

  async create(
    entity: Omit<TEntity, "id">
  ) {
    const created = await firestoreService.create(this.path, entity);
    await localPersistenceService.setDocument(this.path, created.id, entity);
    return created;
  }

  async save(
    entity: TEntity
  ): Promise<void> {
    const {
      id,
      ...entityData
    } = entity;

    await firestoreService.setDocument(
      this.path,
      id,
      entityData
    );
    await localPersistenceService.setDocument(this.path, id, entityData);
  }

  async update(
    id: string,
    entity: Partial<Omit<TEntity, "id">>
  ) {
    const result = await firestoreService.update(
      this.path,
      id,
      entity
    );
    await localPersistenceService.update(this.path, id, entity);
    return result;
  }

  async delete(id: string) {
    await firestoreService.delete(this.path, id);
    return localPersistenceService.delete(
      this.path,
      id
    );
  }
}
