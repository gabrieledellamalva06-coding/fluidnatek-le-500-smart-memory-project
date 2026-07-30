/**
 * ============================================================================
 * FLUIDNATEK SMART MEMORY
 * Data Quality Types
 * ============================================================================
 */

export type DataQualityStatus =
  | "valid"
  | "review_required"
  | "quarantine";

export interface DataQualityInfo {
  status: DataQualityStatus;

  warnings: string[];

  reviewed: boolean;

  reviewedBy?: string;

  reviewedAt?: string;
}