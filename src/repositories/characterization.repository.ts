import { CollectionPaths } from "../config/collectionPaths";
import type {
  MaterialCharacterization,
  SolutionCharacterization,
} from "../core/types/characterization";

import { BaseRepository } from "./base.repository";

export class SolutionCharacterizationRepository extends BaseRepository<SolutionCharacterization> {
  constructor(companyId?: string) {
    super(
      CollectionPaths.solutionCharacterizations(companyId)
    );
  }
}

export class MaterialCharacterizationRepository extends BaseRepository<MaterialCharacterization> {
  constructor(companyId?: string) {
    super(
      CollectionPaths.materialCharacterizations(companyId)
    );
  }
}

export const solutionCharacterizationRepository =
  new SolutionCharacterizationRepository();

export const materialCharacterizationRepository =
  new MaterialCharacterizationRepository();