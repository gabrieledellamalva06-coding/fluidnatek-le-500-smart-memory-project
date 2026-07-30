import { CollectionPaths } from "../config/collectionPaths";
import type { Formulation } from "../core/types/formulation";

import { BaseRepository } from "./base.repository";

export class FormulationRepository extends BaseRepository<Formulation> {
  constructor(companyId?: string) {
    super(
      CollectionPaths.formulations(companyId)
    );
  }
}

export const formulationRepository =
  new FormulationRepository();