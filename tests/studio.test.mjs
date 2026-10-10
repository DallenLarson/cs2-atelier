import test from "node:test";
import assert from "node:assert/strict";
import {
  REGISTRY,
  PRESETS,
  freshProfile,
  validValue,
  validateProfile,
  generateConfig,
  importConfig,
  applyPreset,
  diagnose,
} from "../public/studio-core.js";
const set = (p, k, value) =>
  (p.options[k] = { mode: "set", value, source: "manual" });
test("clean profile exports no setting or bind overrides", () => {
  const cfg = generateConfig(freshProfile());
  assert.equal(
    cfg
      .split("\r\n")
      .filter((l) => l && !l.startsWith("//"))
      .join("\n"),
    'echo "Atelier Loadout Studio loaded"',
  );
  assert.ok(!cfg.replaceAll("\r\n", "").includes("\n"));
});
test("every setting round trips at its preview value; zero is explicit", () => {
  for (const d of REGISTRY) {
    const p = freshProfile();
    set(p, d.command, d.preview);
    const cfg = generateConfig(p);
    const result = importConfig(cfg);
    assert.equal(result.accepted, 1, d.command);
    assert.equal(result.profile.options[d.command].value, d.preview);
  }
  const p = freshProfile();
  set(p, "cl_prefer_lefthanded", 0);
  assert.match(generateConfig(p), /cl_prefer_lefthanded "0"/);
  p.options.cl_prefer_lefthanded.mode = "unchanged";
  assert.doesNotMatch(generateConfig(p), /cl_prefer_lefthanded/);
});
test("near center preserves left hand and exports supported minimum", () => {
  const p = freshProfile();
  set(p, "cl_prefer_lefthanded", 1);
  set(p, "viewmodel_offset_x", -2);
  assert.match(generateConfig(p), /cl_prefer_lefthanded "1"/);
  assert.match(generateConfig(p), /viewmodel_offset_x "-2"/);
  assert.equal(validValue("viewmodel_offset_x", -2.5), false);
});
test("presets apply only documented fields and custom edits win", () => {
  for (const preset of PRESETS) {
    const p = applyPreset(freshProfile(), preset);
    assert.equal(Object.keys(p.options).length, 7);
    assert.deepEqual(validateProfile(p), []);
    set(p, "sensitivity", 2);
    const cfg = generateConfig(p);
    assert.match(cfg, /sensitivity "2"/);
    assert.ok(
      cfg.indexOf("viewmodel_presetpos") < cfg.indexOf("viewmodel_offset_x"),
    );
    assert.doesNotMatch(cfg, /cl_prefer_lefthanded|cl_crosshair/);
  }
});
test("invalid values, unknown commands, and injected strings cannot export", () => {
  for (const value of [NaN, Infinity, -1, 9, "1; quit", '"\nquit']) {
    const p = freshProfile();
    set(p, "sensitivity", value);
    assert.throws(() => generateConfig(p));
  }
  const p = freshProfile();
  set(p, "quit", 1);
  assert.throws(() => generateConfig(p));
  p.options = {};
  p.displayName = 'A"; quit';
  assert.doesNotMatch(generateConfig(p), /;|A"/);
});
test("cfg import skips scripts, old commands, aliases, malformed binds and out of range values", () => {
  const text =
    'sensitivity "2"\ncl_crosshairsize "3"\nexec evil.cfg\nalias x "quit"\nbind "v" "+jump; quit"\nviewmodel_fov "100"\nsensitivity "1;quit"\ncl_prefer_lefthanded "true"';
  const result = importConfig(text);
  assert.equal(result.accepted, 2);
  assert.equal(result.warnings.length, 6);
  assert.equal(result.profile.options.cl_prefer_lefthanded.value, 1);
  assert.doesNotMatch(
    generateConfig(result.profile),
    /evil|quit|cl_crosshairsize/,
  );
});
test("bind replacements must be confirmed and duplicates block export", () => {
  const p = freshProfile();
  p.binds = [{ key: "mwheelup", action: "+jump", confirmed: false }];
  assert.throws(() => generateConfig(p), /acknowledge/);
  p.binds[0].confirmed = true;
  assert.match(generateConfig(p), /bind "mwheelup" "\+jump"/);
  p.binds.push({ key: "mwheelup", action: "slot8", confirmed: true });
  assert.throws(() => generateConfig(p), /more than once/);
});
test("schema errors preserve an explicit failure and input length is bounded", () => {
  assert.match(validateProfile({ schemaVersion: 2 })[0], /Unsupported/);
  assert.throws(() => importConfig("x".repeat(200001)), /large/);
  const p = freshProfile();
  p.dpi = 0;
  assert.ok(validateProfile(p).length);
});
test("diagnosis prioritizes loading errors over completion marker", () => {
  assert.match(
    diagnose("Unknown command: thing\nAtelier Loadout Studio loaded"),
    /unsupported/,
  );
  assert.match(diagnose("couldn't exec autoexec.cfg"), /could not find/);
  assert.match(diagnose("Atelier Loadout Studio loaded"), /does not prove/);
  assert.match(diagnose(""), /cannot inspect/);
});
