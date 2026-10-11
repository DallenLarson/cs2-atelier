import { validateProfile } from "./studio-core.js";
export const WIDGETS = [
  "practice",
  "experiments",
  "studio",
  "wishlist",
  "maps",
];
export const freshWorkspace = () => ({
  schema: 1,
  revision: 0,
  plans: [],
  sessions: [],
  experiments: [],
  favorites: [],
  widgets: [...WIDGETS],
});
const text = (s, n = 1000) => typeof s === "string" && s.length <= n;
const number = (n) => typeof n === "number" && Number.isFinite(n);
export function validateWorkspace(d) {
  const fail = () => {
    throw Error("Invalid workspace file. Your existing data was not changed.");
  };
  if (
    !d ||
    d.schema !== 1 ||
    !Number.isInteger(d.revision) ||
    d.revision < 0 ||
    Object.keys(d).some(
      (k) =>
        ![
          "schema",
          "revision",
          "plans",
          "sessions",
          "experiments",
          "favorites",
          "widgets",
        ].includes(k),
    )
  )
    fail();
  for (const [key, limit] of [
    ["plans", 50],
    ["sessions", 500],
    ["experiments", 30],
    ["favorites", 20],
    ["widgets", 5],
  ])
    if (!Array.isArray(d[key]) || d[key].length > limit) fail();
  for (const p of d.plans)
    if (
      !text(p.id, 80) ||
      !text(p.name, 100) ||
      !text(p.focus, 60) ||
      ![10, 20, 30, 60].includes(p.minutes) ||
      !text(p.goal) ||
      !Array.isArray(p.drills) ||
      p.drills.length > 15 ||
      p.drills.some((x) => !text(x, 60))
    )
      fail();
  for (const s of d.sessions)
    if (
      !text(s.id, 80) ||
      !text(s.planId, 80) ||
      !text(s.drill, 60) ||
      !text(s.notes) ||
      !number(s.at) ||
      !number(s.minutes) ||
      s.minutes < 0 ||
      s.minutes > 180
    )
      fail();
  for (const e of d.experiments) {
    if (
      !text(e.id, 80) ||
      !text(e.name, 100) ||
      !text(e.hypothesis) ||
      !text(e.metric, 100) ||
      !text(e.conditions) ||
      !text(e.notes) ||
      !["active", "keep", "revise", "revert", "inconclusive"].includes(
        e.outcome,
      ) ||
      !number(e.created) ||
      !Array.isArray(e.observations) ||
      e.observations.length > 200
    )
      fail();
    for (const k of ["control", "variant"]) {
      try {
        if (validateProfile(e[k]).length) fail();
      } catch {
        fail();
      }
    }
    for (const o of e.observations)
      if (
        !["control", "variant"].includes(o.group) ||
        !number(o.value) ||
        !number(o.at) ||
        !text(o.context, 500) ||
        o.source !== "manual"
      )
        fail();
  }
  if (
    d.favorites.some((x) => x !== "dust2") ||
    new Set(d.favorites).size !== d.favorites.length ||
    d.widgets.some((x) => !WIDGETS.includes(x)) ||
    new Set(d.widgets).size !== d.widgets.length
  )
    fail();
  if (JSON.stringify(d).length > 600000) fail();
  return d;
}
export function sensitivity(dpi, sens, yaw = 0.022) {
  if (![dpi, sens, yaw].every((n) => number(n) && n > 0))
    throw Error("Enter positive DPI, sensitivity and yaw values.");
  const inches = 360 / (dpi * sens * yaw);
  return { edpi: dpi * sens, inches, cm: inches * 2.54 };
}
export function compareExperiment(e) {
  const summarize = (group) => {
    const rows = e.observations.filter((o) => o.group === group);
    return {
      count: rows.length,
      mean: rows.length
        ? rows.reduce((n, o) => n + o.value, 0) / rows.length
        : null,
    };
  };
  const control = summarize("control"),
    variant = summarize("variant");
  return {
    control,
    variant,
    delta:
      control.mean === null || variant.mean === null
        ? null
        : variant.mean - control.mean,
  };
}
export function mergeWorkspace(current, imported) {
  validateWorkspace(current);
  validateWorkspace(imported);
  const next = structuredClone(current),
    idMap = new Map();
  for (const p of imported.plans) {
    const id = crypto.randomUUID();
    idMap.set(p.id, id);
    next.plans.push({ ...p, id });
  }
  next.sessions.push(
    ...imported.sessions.map((s) => ({
      ...s,
      id: crypto.randomUUID(),
      planId: idMap.get(s.planId) || s.planId,
    })),
  );
  next.experiments.push(
    ...structuredClone(imported.experiments).map((e) => ({
      ...e,
      id: crypto.randomUUID(),
    })),
  );
  next.favorites = [...new Set([...current.favorites, ...imported.favorites])];
  return validateWorkspace(next);
}
