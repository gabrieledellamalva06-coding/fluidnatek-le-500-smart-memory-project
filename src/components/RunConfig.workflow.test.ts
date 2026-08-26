import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const source = readFileSync("src/components/RunConfig.tsx", "utf8");

test("recommendation and smart-point application remain local until final save", () => {
  const localApplication = source.slice(source.indexOf("const applySelectedRecommendations"), source.indexOf("const analyze"));
  assert.match(localApplication, /applyTrackedValues/);
  assert.doesNotMatch(localApplication, /onAddExperiment|firestore|save\(/i);
  const saveBody = source.slice(source.indexOf("const save = async"), source.indexOf("return (", source.indexOf("const save = async")));
  assert.match(saveBody, /await onAddExperiment/);
});

test("Edit returns to processability without clearing entered workflow state", () => {
  assert.match(source, />Edit<\/button>/);
  assert.match(source, /onClick=\{\(\) => setStage\("processability"\)\}[^>]*>Edit/);
});

test("empty comments are filtered from the final review", () => {
  assert.match(source, /compactRows\(\[\["Run \/ sample code"[\s\S]*\["Process comments", comments\]\]\)/);
});
