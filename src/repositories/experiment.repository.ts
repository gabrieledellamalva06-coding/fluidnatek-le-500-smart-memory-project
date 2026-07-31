import { CollectionPaths } from "../config/collectionPaths";
import type { Experiment } from "../core/types/experiment";

import { BaseRepository } from "./base.repository";

export class ExperimentRepository extends BaseRepository<Experiment> {
  constructor(companyId?: string) {
    super(CollectionPaths.experiments(companyId));
  }
}

export const experimentRepository = new ExperimentRepository();