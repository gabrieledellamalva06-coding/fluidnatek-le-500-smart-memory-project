import { Project } from "../types";
import { firestoreService } from "../services/firestore.service";
import { CollectionPaths } from "../config/collectionPaths";

export class ProjectRepository {
  private readonly path = CollectionPaths.projects();

  async getAll(): Promise<Project[]> {
    return firestoreService.getCollection<Project>(this.path);
  }

  async getById(id: string) {
    return firestoreService.getDocument<Project>(this.path, id);
  }

  async create(project: Omit<Project, "id">) {
    return firestoreService.create(this.path, project);
  }

  async update(id: string, project: Partial<Project>) {
    return firestoreService.update(this.path, id, project);
  }

  async delete(id: string) {
    return firestoreService.delete(this.path, id);
  }
}

export const projectRepository = new ProjectRepository();