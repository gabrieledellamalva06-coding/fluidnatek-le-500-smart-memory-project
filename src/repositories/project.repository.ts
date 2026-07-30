import { CollectionPaths } from "../config/collectionPaths";
import type { Project } from "../core/types/project";

import { BaseRepository } from "./base.repository";

export class ProjectRepository extends BaseRepository<Project> {
  constructor(companyId?: string) {
    super(
      CollectionPaths.projects(companyId)
    );
  }
}

export const projectRepository =
  new ProjectRepository();