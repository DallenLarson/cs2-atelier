import test from "node:test";
import assert from "node:assert/strict";
import {
  freshWorkspace,
  validateWorkspace,
  mergeWorkspace,
  sensitivity,
  compareExperiment,
} from "../public/workspace-core.js";
import { freshProfile } from "../public/studio-core.js";
test("physical sensitivity uses explicit units and rejects unusable inputs", () => {
  const v = sensitivity(800, 1);
  assert.equal(v.edpi, 800);
  assert.ok(Math.abs(v.cm - 51.954545) < 0.00001);
  assert.equal(sensitivity(800, 2).cm, v.cm / 2);
  for (const n of [0, -1, NaN, Infinity])
    assert.throws(() => sensitivity(n, 1));
});
test("workspace rejects unknown versions, oversized arrays and unsafe profile snapshots", () => {
  const d = freshWorkspace();
  assert.equal(validateWorkspace(d), d);
  assert.throws(() => validateWorkspace({ ...d, schema: 2 }));
  assert.throws(() =>
    validateWorkspace({ ...d, sessions: Array(501).fill({}) }),
  );
  const e = {
    id: "a",
    name: "Test",
    hypothesis: "Test one setting",
    metric: "hits",
    conditions: "same map",
    notes: "",
    outcome: "active",
    created: 1,
    control: freshProfile(),
    variant: freshProfile(),
    observations: [],
  };
  assert.doesNotThrow(() => validateWorkspace({ ...d, experiments: [e] }));
  e.variant.options = { evil: { mode: "set", value: 1 } };
  assert.throws(() => validateWorkspace({ ...d, experiments: [e] }));
});
test("import creates separate copies and preserves session-to-plan links and current layout", () => {
  const d = freshWorkspace(),
    incoming = freshWorkspace();
  d.widgets = ["studio"];
  incoming.plans = [
    {
      id: "plan",
      name: "Practice",
      focus: "Aim",
      minutes: 20,
      goal: "hits",
      drills: ["aim"],
    },
  ];
  incoming.sessions = [
    {
      id: "session",
      planId: "plan",
      drill: "aim",
      at: 1,
      minutes: 5,
      notes: "",
    },
  ];
  const merged = mergeWorkspace(d, incoming);
  assert.notEqual(merged.plans[0].id, "plan");
  assert.equal(merged.sessions[0].planId, merged.plans[0].id);
  assert.deepEqual(merged.widgets, ["studio"]);
  assert.equal(d.plans.length, 0);
});
test("experiment comparison preserves zeros and negatives, and missing observations stay missing", () => {
  const e = { observations: [] };
  assert.equal(compareExperiment(e).delta, null);
  e.observations = [
    { group: "control", value: 0 },
    { group: "control", value: -2 },
    { group: "variant", value: 0 },
  ];
  const c = compareExperiment(e);
  assert.equal(c.control.mean, -1);
  assert.equal(c.variant.mean, 0);
  assert.equal(c.delta, 1);
});
