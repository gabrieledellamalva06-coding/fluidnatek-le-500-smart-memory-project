/**
 * ============================================================================
 * FLUIDNATEK SMART MEMORY
 * Project Types
 *
 * Canonical project model.
 * ============================================================================
 */

import type { SourceTraceability } from "./traceability";

export type ProjectStatus =
    | "draft"
    | "active"
    | "completed"
    | "archived";

export interface ProjectMaterial {
    id: string;

    projectId: string;

    materialId: string;

    notes?: string;

    createdAt: string;
}

export interface Project {
    id: string;

    code?: string;

    name: string;

    description?: string;

    status: ProjectStatus;

    materialIds: string[];

    createdAt: string;

    updatedAt: string;

    source?: SourceTraceability;
}