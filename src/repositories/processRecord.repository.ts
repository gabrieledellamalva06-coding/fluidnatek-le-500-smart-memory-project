import { CollectionPaths } from "../config/collectionPaths";
import type { ProcessRecord } from "../core/types/processRecord";

import { BaseRepository } from "./base.repository";

export class ProcessRecordRepository extends BaseRepository<ProcessRecord> {
  constructor(companyId?: string) {
    super(CollectionPaths.processRecords(companyId));
  }
}

export const processRecordRepository =
  new ProcessRecordRepository();