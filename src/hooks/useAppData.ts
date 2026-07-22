import { useState, useMemo } from "react";

import {
  Project,
  Formulation,
  Experiment,
} from "../types";

import {
  SEED_PROJECTS,
  SEED_FORMULATIONS,
  SEED_EXPERIMENTS,
} from "../seedData";

export function useAppData() {

  const [projects, setProjects] = useState<Project[]>(SEED_PROJECTS);

  const [formulations, setFormulations] =
    useState<Formulation[]>(SEED_FORMULATIONS);

  const [experiments, setExperiments] =
    useState<Experiment[]>(SEED_EXPERIMENTS);

  const [selectedExpId, setSelectedExpId] =
    useState(SEED_EXPERIMENTS[0]?.id ?? "");

  const selectedExperiment = useMemo(() => {
    return (
      experiments.find(e => e.id === selectedExpId) ??
      null
    );
  }, [experiments, selectedExpId]);

  return {

    projects,
    setProjects,

    formulations,
    setFormulations,

    experiments,
    setExperiments,

    selectedExpId,
    setSelectedExpId,

    selectedExperiment,

  };

}