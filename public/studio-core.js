export const REGISTRY_VERSION = "2026-10-09";
export const COMMAND_SOURCE =
  "https://github.com/SteamTracking/GameTracking-CS2/blob/master/DumpSource2/convars.txt";
const r = (
  command,
  label,
  category,
  min,
  max,
  step,
  preview,
  help,
  choices,
) => ({ command, label, category, min, max, step, preview, help, choices });
export const REGISTRY = [
  r(
    "viewmodel_presetpos",
    "Position preset",
    "weapon",
    1,
    2,
    1,
    1,
    "Applied before custom offsets.",
    [
      [1, "Desktop"],
      [2, "Classic"],
    ],
  ),
  r(
    "cl_prefer_lefthanded",
    "Preferred hand",
    "weapon",
    0,
    1,
    1,
    0,
    "Near center changes position, not your preferred hand.",
    [
      [0, "Right hand"],
      [1, "Left hand"],
    ],
  ),
  r(
    "viewmodel_fov",
    "Field of view",
    "weapon",
    60,
    68,
    1,
    60,
    "Changes how much of the weapon is visible.",
  ),
  r(
    "viewmodel_offset_x",
    "Horizontal offset",
    "weapon",
    -2,
    2.5,
    0.1,
    1,
    "Move inward or outward. Current command range starts at −2.",
  ),
  r(
    "viewmodel_offset_y",
    "Depth offset",
    "weapon",
    -2,
    2,
    0.1,
    1,
    "Move the weapon forward or back.",
  ),
  r(
    "viewmodel_offset_z",
    "Vertical offset",
    "weapon",
    -2,
    2,
    0.1,
    -1,
    "Raise or lower the weapon.",
  ),
  r(
    "cl_crosshair_screen_height",
    "Authoring resolution height",
    "crosshair",
    240,
    4320,
    1,
    1080,
    "Sets the reference resolution for crosshair dimensions. Exported before size fields.",
  ),
  r(
    "cl_crosshairstyle",
    "Style",
    "crosshair",
    0,
    9,
    1,
    4,
    "Dynamic previews show a resting shape; they do not simulate weapon spread.",
    [
      [0, "Dynamic cross"],
      [4, "Static cross"],
      [5, "Static with shot feedback"],
      [6, "Dot only"],
    ],
  ),
  r(
    "cl_crosshair_length",
    "Length",
    "crosshair",
    0,
    255,
    1,
    8,
    "Current crosshair length command; old cl_crosshairsize is not exported.",
  ),
  r(
    "cl_crosshair_gap",
    "Gap",
    "crosshair",
    -3840,
    3840,
    1,
    4,
    "Distance from the center. Preview is illustrative.",
  ),
  r(
    "cl_crosshair_thickness",
    "Thickness",
    "crosshair",
    0,
    32,
    1,
    2,
    "Bar thickness at the authoring resolution.",
  ),
  r(
    "cl_crosshair_drawoutline",
    "Outline",
    "crosshair",
    0,
    2,
    1,
    1,
    "Outline improves visibility on bright backgrounds.",
    [
      [0, "Off"],
      [1, "Full"],
      [2, "Half"],
    ],
  ),
  r(
    "cl_crosshairdot",
    "Center dot",
    "crosshair",
    0,
    1,
    1,
    0,
    "Add a dot in the center.",
    [
      [0, "Off"],
      [1, "On"],
    ],
  ),
  r(
    "cl_crosshair_t",
    "T style",
    "crosshair",
    0,
    1,
    1,
    0,
    "Remove the upper bar.",
    [
      [0, "Off"],
      [1, "On"],
    ],
  ),
  r(
    "cl_crosshair_recoil",
    "Follow recoil",
    "crosshair",
    0,
    1,
    1,
    1,
    "Follow predicted recoil in-game. The preview stays still.",
    [
      [0, "Off"],
      [1, "On"],
    ],
  ),
  r(
    "cl_crosshaircolor_r",
    "Red",
    "crosshair",
    0,
    255,
    1,
    0,
    "Custom RGB color.",
  ),
  r(
    "cl_crosshaircolor_g",
    "Green",
    "crosshair",
    0,
    255,
    1,
    255,
    "Custom RGB color.",
  ),
  r(
    "cl_crosshaircolor_b",
    "Blue",
    "crosshair",
    0,
    255,
    1,
    0,
    "Custom RGB color.",
  ),
  r(
    "cl_crosshaircolor_a",
    "Opacity",
    "crosshair",
    0,
    255,
    1,
    255,
    "Zero makes the crosshair transparent.",
  ),
  r(
    "cl_crosshair_sniper_width",
    "Sniper line width",
    "crosshair",
    0,
    10,
    1,
    1,
    "Studio range: 0–10. Values above 1 widen scope lines.",
  ),
  r(
    "sensitivity",
    "Mouse sensitivity",
    "aim",
    0.0001,
    8,
    0.0001,
    1.25,
    "DPI is informational and cannot be changed by this config.",
  ),
  r(
    "zoom_sensitivity_ratio",
    "Zoom sensitivity",
    "aim",
    0.01,
    3,
    0.01,
    1,
    "Sensitivity multiplier when zoomed. Uses the current CS2 command.",
  ),
  r(
    "cl_radar_scale",
    "Map zoom",
    "radar",
    0.25,
    1,
    0.01,
    0.7,
    "Lower values show more of the map.",
  ),
  r(
    "cl_hud_radar_scale",
    "Radar size",
    "radar",
    0.8,
    1.3,
    0.01,
    1,
    "Scale the radar in your HUD.",
  ),
  r(
    "cl_radar_always_centered",
    "Center on player",
    "radar",
    0,
    1,
    1,
    1,
    "Turn off to use more of the radar at map edges.",
    [
      [0, "Off"],
      [1, "On"],
    ],
  ),
  r(
    "cl_radar_rotate",
    "Rotate with player",
    "radar",
    0,
    1,
    1,
    1,
    "The schematic rotates to illustrate this setting.",
    [
      [0, "Off"],
      [1, "On"],
    ],
  ),
  r(
    "cl_radar_icon_scale_min",
    "Teammate icon size",
    "radar",
    0.4,
    1.25,
    0.05,
    0.6,
    "Minimum radar icon scale.",
  ),
  r(
    "cl_hud_color",
    "HUD color",
    "radar",
    0,
    12,
    1,
    0,
    "Changes the supported gameplay HUD color.",
    [
      [0, "Team"],
      [1, "White"],
      [2, "Bright white"],
      [3, "Light blue"],
      [4, "Blue"],
      [5, "Purple"],
      [6, "Red"],
      [7, "Orange"],
      [8, "Yellow"],
      [9, "Green"],
      [10, "Aqua"],
      [11, "Pink"],
      [12, "Teammate"],
    ],
  ),
  r(
    "hud_scaling",
    "HUD scale",
    "radar",
    0.9,
    1.1,
    0.01,
    1,
    "Current supported range is 0.9–1.1.",
  ),
  r(
    "r_fullscreen_gamma",
    "Fullscreen gamma",
    "feel",
    1,
    4,
    0.05,
    2.2,
    "Fullscreen only. Lower values appear brighter; this is not a CS:GO renderer.",
  ),
  r(
    "fps_max",
    "FPS cap",
    "feel",
    0,
    1000,
    1,
    120,
    "0 means unlimited. Studio range: 0–1000; no performance improvement is guaranteed.",
  ),
  r("volume", "Master volume", "feel", 0, 1, 0.01, 1, "Overall game volume."),
  r(
    "snd_menumusic_volume",
    "Menu music",
    "feel",
    0,
    1,
    0.01,
    0.04,
    "Main menu music volume.",
  ),
  r(
    "snd_roundend_volume",
    "Round-end music",
    "feel",
    0,
    1,
    0.01,
    0.16,
    "Won/lost music volume.",
  ),
  r(
    "snd_tensecondwarning_volume",
    "Ten-second warning",
    "feel",
    0,
    1,
    0.01,
    0.04,
    "Bomb/round warning music volume.",
  ),
  r(
    "cl_hud_telemetry_frametime_show",
    "Frame-time display",
    "feel",
    0,
    2,
    1,
    1,
    "Choose how often diagnostics appear.",
    [
      [0, "Never"],
      [1, "When poor"],
      [2, "Always"],
    ],
  ),
  r(
    "cl_hud_telemetry_ping_show",
    "Ping display",
    "feel",
    0,
    2,
    1,
    1,
    "Choose how often ping appears.",
    [
      [0, "Never"],
      [1, "When poor"],
      [2, "Always"],
    ],
  ),
];
export const BY_COMMAND = Object.fromEntries(
  REGISTRY.map((s) => [s.command, s]),
);
export const ACTIONS = {
  "+jump": "Jump",
  slot6: "HE grenade",
  slot7: "Flashbang",
  slot8: "Smoke grenade",
  slot9: "Decoy",
  slot10: "Molotov / incendiary",
  "+voicerecord": "Push to talk",
  "+lookatweapon": "Inspect weapon",
};
export const KEYS = [
  "mwheelup",
  "mwheeldown",
  "mouse3",
  "mouse4",
  "mouse5",
  "v",
  "c",
  "x",
  "z",
  "h",
  "j",
  "k",
  "l",
  "n",
  "m",
  "f",
  "g",
  "q",
  "e",
  "r",
  "b",
  "w",
  "a",
  "s",
  "d",
  "space",
  "shift",
  "ctrl",
  "tab",
  "1",
  "2",
  "3",
  "4",
  "5",
  "f6",
  "f7",
  "f8",
  "f9",
];
export const RESERVED = new Set([
  "w",
  "a",
  "s",
  "d",
  "space",
  "shift",
  "ctrl",
  "tab",
  "1",
  "2",
  "3",
  "4",
  "5",
  "q",
  "e",
  "r",
  "b",
  "f",
  "g",
  "k",
]);
export function freshProfile() {
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    displayName: "My loadout",
    dpi: 800,
    options: {},
    binds: [],
    basePresetId: null,
    updatedAt: new Date().toISOString(),
  };
}
export function validValue(command, value) {
  const d = BY_COMMAND[command];
  return (
    !!d &&
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= d.min &&
    value <= d.max &&
    (d.step !== 1 || Number.isInteger(value)) &&
    (!d.choices || d.choices.some(([v]) => v === value))
  );
}
export function validateProfile(p) {
  const errors = [];
  if (!p || p.schemaVersion !== 1)
    return ["Unsupported profile schema. Import a version 1 Studio JSON file."];
  if (typeof p.id !== "string" || !/^[a-zA-Z0-9-]{1,80}$/.test(p.id))
    errors.push("Invalid profile ID.");
  if (
    typeof p.displayName !== "string" ||
    !p.displayName.trim() ||
    p.displayName.length > 60 ||
    /[\x00-\x1f\x7f]/.test(p.displayName)
  )
    errors.push("Use a name between 1 and 60 characters without line breaks.");
  if (!Number.isFinite(p.dpi) || p.dpi < 50 || p.dpi > 100000)
    errors.push("DPI must be between 50 and 100,000.");
  if (!p.options || typeof p.options !== "object" || Array.isArray(p.options))
    errors.push("Invalid settings.");
  else
    for (const [k, o] of Object.entries(p.options)) {
      if (
        !BY_COMMAND[k] ||
        !o ||
        !["set", "unchanged"].includes(o.mode) ||
        !validValue(k, o.value)
      )
        errors.push(`Invalid or unsupported setting: ${k}`);
      if (
        o?.source &&
        !["manual", "import", ...PRESETS.map((p) => p.id)].includes(o.source)
      )
        errors.push(`Invalid provenance: ${k}`);
    }
  if (p.basePresetId !== null && !PRESETS.some((x) => x.id === p.basePresetId))
    errors.push("Unknown preset provenance.");
  if (!Array.isArray(p.binds) || p.binds.length > 50)
    errors.push("Invalid binds.");
  else
    p.binds.forEach((b) => {
      if (
        !b ||
        !KEYS.includes(b.key) ||
        !Object.hasOwn(ACTIONS, b.action) ||
        typeof b.confirmed !== "boolean"
      )
        errors.push("Invalid keybind.");
    });
  return errors;
}
export function bindIssues(p) {
  const seen = new Set(),
    errors = [];
  for (const b of p.binds) {
    if (seen.has(b.key))
      errors.push(
        `${b.key}: assigned more than once. Remove a duplicate before exporting.`,
      );
    seen.add(b.key);
    if (!b.confirmed)
      errors.push(`${b.key}: acknowledge replacing its existing in-game bind.`);
  }
  return errors;
}
export function changed(p) {
  return REGISTRY.filter((d) => p.options[d.command]?.mode === "set");
}
export function generateConfig(p) {
  const errors = [
    ...validateProfile(p),
    ...(Array.isArray(p?.binds) ? bindIssues(p) : []),
  ];
  if (errors.length) throw Error(errors.join("\n"));
  const name = p.displayName.replace(/[^\p{L}\p{N} ._-]/gu, "").slice(0, 60);
  const lines = [
    `// CSKit Loadout Studio — ${name}`,
    `// Registry ${REGISTRY_VERSION} | Schema 1`,
    `// Only explicitly selected overrides. Back up your existing config.`,
    ...(p.basePresetId
      ? [
          `// Reported partial preset: ${p.basePresetId}; custom edits take precedence.`,
        ]
      : []),
  ];
  let cat = "";
  for (const d of changed(p)) {
    if (cat !== d.category) {
      cat = d.category;
      lines.push("", `// ${cat.toUpperCase()}`);
    }
    lines.push(
      `${d.command} "${Number(p.options[d.command].value.toFixed(4))}"`,
    );
  }
  if (p.binds.length)
    lines.push(
      "",
      "// EXPLICIT KEY OVERRIDES",
      ...p.binds.map((b) => `bind "${b.key}" "${b.action}"`),
    );
  lines.push("", 'echo "CSKit Loadout Studio loaded"', "");
  return lines.join("\r\n");
}
export function importConfig(text, base = freshProfile()) {
  if (text.length > 200000)
    throw Error("Config is too large (maximum 200 KB).");
  const profile = structuredClone(base),
    warnings = [];
  let accepted = 0;
  const seen = new Set();
  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.replace(/\/\/.*$/, "").trim();
    if (!line) return;
    const m = line.match(
      /^([a-z_][a-z0-9_]*)\s+(?:"([^"\r\n]*)"|([^\s";]+))\s*$/i,
    );
    const b = line.match(/^bind\s+"?([a-z0-9]+)"?\s+"([^";\r\n]+)"$/i);
    if (
      b &&
      KEYS.includes(b[1].toLowerCase()) &&
      Object.hasOwn(ACTIONS, b[2])
    ) {
      profile.binds.push({
        key: b[1].toLowerCase(),
        action: b[2],
        confirmed: false,
      });
      accepted++;
      return;
    }
    if (m && BY_COMMAND[m[1]]) {
      const rawValue = m[2] ?? m[3],
        value =
          rawValue === "true"
            ? 1
            : rawValue === "false"
              ? 0
              : rawValue.trim() !== ""
                ? Number(rawValue)
                : NaN;
      if (validValue(m[1], value)) {
        if (seen.has(m[1]))
          warnings.push(
            `Line ${index + 1}: repeated ${m[1]}; last value wins.`,
          );
        seen.add(m[1]);
        profile.options[m[1]] = { mode: "set", value, source: "import" };
        accepted++;
        return;
      }
    }
    if (/^echo\s/.test(line)) return;
    warnings.push(`Line ${index + 1}: not imported — ${line.slice(0, 110)}`);
  });
  return { profile, warnings, accepted };
}
export const PRESETS = [
  {
    id: "donk-2026-10-09",
    name: "donk",
    role: "Rifler",
    dpi: 800,
    sensitivity: 1.25,
    zoom: 1,
    preset: 2,
  },
  {
    id: "zywoo-2026-10-09",
    name: "ZywOo",
    role: "AWPer",
    dpi: 400,
    sensitivity: 1.9,
    zoom: 1,
    preset: 1,
  },
  {
    id: "niko-2026-10-09",
    name: "NiKo",
    role: "Rifler",
    dpi: 800,
    sensitivity: 0.815,
    zoom: 0.9,
    preset: 2,
  },
  {
    id: "ropz-2026-10-09",
    name: "ropz",
    role: "Rifler",
    dpi: 400,
    sensitivity: 1.77,
    zoom: 1,
    preset: 2,
  },
].map((p) => ({
  ...p,
  source: `https://prosettings.net/players/${p.name.toLowerCase()}/`,
  observed: "2026-10-09",
  sourceDate: "2026-10-10",
  values: {
    sensitivity: p.sensitivity,
    zoom_sensitivity_ratio: p.zoom,
    viewmodel_presetpos: p.preset,
    viewmodel_fov: 68,
    viewmodel_offset_x: 2.5,
    viewmodel_offset_y: 0,
    viewmodel_offset_z: -1.5,
  },
}));
export function applyPreset(profile, preset) {
  const p = structuredClone(profile);
  p.basePresetId = preset.id;
  p.dpi = preset.dpi;
  for (const [k, value] of Object.entries(preset.values))
    p.options[k] = { mode: "set", value, source: preset.id };
  return p;
}
export function diagnose(text) {
  if (text.length > 100000) return "Paste a shorter log (under 100 KB).";
  if (/couldn.t exec|unable to (?:read|execute)|exec.*not found/i.test(text))
    return "CS2 could not find or read the config. Check game/csgo/cfg, the filename autoexec.cfg (not .cfg.txt), then run exec autoexec.cfg.";
  if (/unknown command|invalid convar/i.test(text))
    return "The log contains an unsupported command. Compare the command name with the review list; a game update or another config may be responsible. No in-game values have been verified.";
  if (
    text.includes("CSKit Loadout Studio loaded") ||
    text.includes("Atelier Loadout Studio loaded")
  )
    return "The expected marker appears in this pasted log. This suggests execution reached the end; it does not prove individual values applied. Query the changed commands below in CS2.";
  return "No Studio marker or recognized loading error found. Run exec autoexec.cfg and paste the resulting console output. The app cannot inspect the game process.";
}
