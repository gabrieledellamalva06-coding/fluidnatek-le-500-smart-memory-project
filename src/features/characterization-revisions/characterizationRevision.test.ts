import assert from "node:assert/strict";
import test from "node:test";
import { characterizationValues, changedCharacterizationFields, createCharacterizationRevisionDraft, hasCharacterizationUpdates, isSessionCharacterizationEditable, sortRevisionsNewestFirst } from "./characterizationRevision";

test("only IDs created in the current session are editable", () => {
  const sessionIds = new Set(["created-now"]);
  assert.equal(isSessionCharacterizationEditable("created-now", sessionIds), true);
  assert.equal(isSessionCharacterizationEditable("loaded-history", sessionIds), false);
});

test("revision draft preserves previous and new values and detects changed fields", () => {
  const previousValues = { viscosityMpas: 10, notes: "before" };
  const newValues = { viscosityMpas: 12, notes: "after" };
  const revision = createCharacterizationRevisionDraft({ id: "revision", characterizationId: "characterization", previousValues, newValues, changeReason: "Correction", changedBy: "Operator" });
  assert.deepEqual(revision.changedFields, ["viscosityMpas", "notes"]);
  assert.deepEqual(revision.previousValues, previousValues);
  assert.deepEqual(revision.newValues, newValues);
});

test("valid zero remains present and missing values remain absent", () => {
  const values = characterizationValues({ id: "c", formulationId: "f", ph: 0 });
  assert.equal(values.ph, 0);
  assert.equal("viscosityMpas" in values, false);
  assert.deepEqual(changedCharacterizationFields({ ph: 0 }, { ph: undefined }), ["ph"]);
});

test("revision history is newest first with a deterministic ID tie-breaker", () => {
  const revisions = [
    { id: "a", characterizationId: "c", previousValues: {}, newValues: {}, changedFields: [], changeReason: "a", changedBy: "a", changedAt: "2025-01-01" },
    { id: "b", characterizationId: "c", previousValues: {}, newValues: {}, changedFields: [], changeReason: "b", changedBy: "b", changedAt: "2026-01-01" },
  ];
  assert.deepEqual(sortRevisionsNewestFirst(revisions).map((item) => item.id), ["b", "a"]);
});

test("Updated badge state requires at least one saved revision", () => {
  assert.equal(hasCharacterizationUpdates([]), false);
  assert.equal(hasCharacterizationUpdates([{ id: "r", characterizationId: "c", previousValues: {}, newValues: {}, changedFields: [], changeReason: "reason", changedBy: "person" }]), true);
});
