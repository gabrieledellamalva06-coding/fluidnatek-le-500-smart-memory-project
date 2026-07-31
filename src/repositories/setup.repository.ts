import { CollectionPaths } from "../config/collectionPaths";
import type { ExperimentalSetup } from "../core/types/setup";

import { BaseRepository } from "./base.repository";

export class SetupRepository extends BaseRepository<ExperimentalSetup> {
  constructor(companyId?: string) {
    super(CollectionPaths.setups(companyId));
  }
}

export const setupRepository = new SetupRepository();