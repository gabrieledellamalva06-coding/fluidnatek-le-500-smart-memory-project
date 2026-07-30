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
    return firestoreService.getCollection<TEntity>(
      this.path
    );
  }

  async getById(
    id: string
  ): Promise<TEntity | null> {
    return firestoreService.getDocument<TEntity>(
      this.path,
      id
    );
  }

  async create(
    entity: Omit<TEntity, "id">
  ) {
    return firestoreService.create(
      this.path,
      entity
    );
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
  }

  async update(
    id: string,
    entity: Partial<Omit<TEntity, "id">>
  ) {
    return firestoreService.update(
      this.path,
      id,
      entity
    );
  }

  async delete(id: string) {
    return firestoreService.delete(
      this.path,
      id
    );
  }
}