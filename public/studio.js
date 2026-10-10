import { artworkUrl } from "./hosted.js";
import { request, storageLabel, ready } from "./account.js";
import {
  REGISTRY,
  REGISTRY_VERSION,
  BY_COMMAND,
  PRESETS,
  ACTIONS,
  KEYS,
  RESERVED,
  freshProfile,
  validateProfile,
  changed,
  generateConfig,
  bindIssues,
  importConfig,
  applyPreset,
  diagnose,
} from "./studio-core.js";
const $ = (s) => document.querySelector(s),
  esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const STEPS = [
  [
    "start",
    "Starting point",
    "Make it your own.",
    "Start clean or borrow a few reported settings. Everything else stays untouched.",
  ],
  [
    "profile",
    "Your build",
    "Give it a name.",
    "A personal setup, saved here for whenever you need it.",
  ],
  [
    "weapon",
    "Weapon",
    "Find your point of view.",
    "Choose your hand and dial in the placement.",
  ],
  [
    "crosshair",
    "Crosshair",
    "Make every pixel count.",
    "Tune your sight against light, dark, and green backgrounds.",
  ],
  [
    "aim",
    "Aim",
    "Set your pace.",
    "Choose a sensitivity that feels familiar. DPI is informational only.",
  ],
  [
    "radar",
    "Radar & HUD",
    "See the bigger picture.",
    "Balance local detail with awareness of the whole map.",
  ],
  [
    "feel",
    "Look & sound",
    "Find your balance.",
    "Adjust brightness, volume, and diagnostics deliberately.",
  ],
  [
    "binds",
    "Controls",
    "Keep it within reach.",
    "Optional single-action shortcuts, with no silent key replacements.",
  ],
  [
    "review",
    "Review",
    "Ready when you are.",
    "See exactly what changes before downloading your config.",
  ],
];
let library = { profiles: [], activeId: null, revision: 0 },
  profile,
  step = 0,
  undo = [],
  timer,
  saveInFlight = false,
  pendingSave = false,
  saveBlocked = false,
  importCandidate = null,
  toastTimer;
function toast(text) {
  $("#toast").textContent = text;
  $("#toast").classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("visible"), 3500);
}
function error(text) {
  $("#studio-error").hidden = !text;
  $("#studio-error").textContent = text;
}
function remember() {
  undo.push(structuredClone(profile));
  if (undo.length > 40) undo.shift();
}
function syncProfile() {
  profile.updatedAt = new Date().toISOString();
  const i = library.profiles.findIndex((p) => p.id === profile.id);
  if (i < 0) library.profiles.push(profile);
  else library.profiles[i] = profile;
  library.activeId = profile.id;
}
function scheduleSave() {
  syncProfile();
  $("#save-status").textContent = "Unsaved changes";
  pendingSave = true;
  clearTimeout(timer);
  timer = setTimeout(flushSave, 450);
}
async function flushSave() {
  if (saveInFlight || saveBlocked || !pendingSave) return;
  const invalid = library.profiles.flatMap(validateProfile);
  if (invalid.length) {
    error(invalid.join(" "));
    $("#save-status").textContent = "Fix fields to save";
    return;
  }
  saveInFlight = true;
  pendingSave = false;
  const payload = structuredClone(library);
  try {
    let data;
    try {
      data = await request("/api/studio", payload);
    } catch (e) {
      if (e.status === 409) saveBlocked = true;
      throw e;
    }
    library.revision = data.revision;
    $("#save-status").textContent = pendingSave ? "Saving…" : storageLabel();
    error("");
  } catch (e) {
    pendingSave = true;
    $("#save-status").textContent = "Not saved · export a backup";
    error(
      e.message +
        " Your edits remain in this page. Use Export profile to keep a copy.",
    );
  } finally {
    saveInFlight = false;
    if (pendingSave && !saveBlocked && !$("#studio-error").textContent)
      void flushSave();
  }
}
window.addEventListener("beforeunload", (e) => {
  if (pendingSave || saveInFlight) {
    e.preventDefault();
    e.returnValue = "";
  }
});
function mutate(fn, rerender = true) {
  remember();
  fn();
  scheduleSave();
  if (rerender) render();
  else updatePreview();
}
function setValues(values, source = "manual") {
  mutate(() => {
    for (const [k, value] of Object.entries(values))
      profile.options[k] = { mode: "set", value, source };
  });
}
function value(k) {
  return profile.options[k]?.mode === "set"
    ? profile.options[k].value
    : BY_COMMAND[k].preview;
}
function sourceLabel(o) {
  if (!o || o.mode !== "set") return "Keep current";
  return o.source && o.source !== "manual" && o.source !== "import"
    ? "Reported preset"
    : o.source === "import"
      ? "Imported"
      : "Override";
}
function field(d) {
  const o = profile.options[d.command],
    enabled = o?.mode === "set",
    v = o?.value ?? d.preview;
  return `<div class="setting ${enabled ? "is-set" : ""}" data-setting="${d.command}"><div class="setting-heading"><label for="field-${d.command}">${esc(d.label)}</label><label class="override-toggle"><input type="checkbox" aria-label="Override ${esc(d.label)}" data-toggle="${d.command}" ${enabled ? "checked" : ""}><span>${sourceLabel(o)}</span></label></div><div class="setting-control">${d.choices ? `<select id="field-${d.command}" data-value="${d.command}" ${enabled ? "" : "disabled"}>${d.choices.map(([n, label]) => `<option value="${n}" ${n === v ? "selected" : ""}>${esc(label)}</option>`).join("")}</select>` : `<input class="setting-slider" type="range" aria-label="${esc(d.label)} slider" data-slider="${d.command}" min="${d.min}" max="${d.max}" step="${d.step}" value="${v}" ${enabled ? "" : "disabled"}><input id="field-${d.command}" class="setting-number" type="number" data-value="${d.command}" min="${d.min}" max="${d.max}" step="${d.step}" value="${v}" ${enabled ? "" : "disabled"}>`}</div><details class="setting-help"><summary>${esc(d.command)}</summary><p>${esc(d.help)} Preview reference: ${d.preview}. ${d.min}–${d.max}${d.command === "fps_max" || d.command === "cl_crosshair_sniper_width" ? " (Studio range)" : ""}.</p></details></div>`;
}
function fields(category) {
  return REGISTRY.filter((d) => d.category === category)
    .map(field)
    .join("");
}
function pill(label, action, value) {
  return `<button class="option-pill" data-action="${action}" data-choice="${esc(value)}">${label}</button>`;
}
function startContent() {
  return `<button class="clean-start" data-action="clean"><span class="clean-icon">◎</span><span><strong>Start with your current settings</strong><small>No overrides. Your in-game setup stays yours.</small></span><span class="tiny-badge">RECOMMENDED</span></button><div class="section-line"><h3>A pro-inspired starting point</h3><span>Reported · partial snapshots</span></div><div class="pro-grid">${PRESETS.map((p) => `<article class="pro-card ${profile.basePresetId === p.id ? "chosen" : ""}"><div class="pro-monogram">${p.name.slice(0, 2)}</div><span class="pro-role">${p.role}</span><h3>${p.name}</h3><p>${p.dpi} DPI · ${p.sensitivity} sensitivity</p><small>7 aim & viewmodel overrides</small><button class="button" data-action="preset" data-choice="${p.id}">${profile.basePresetId === p.id ? "Apply again" : "Use starting point"}</button><a href="${p.source}" target="_blank" rel="noreferrer">Reported settings ↗</a></article>`).join("")}</div><details class="studio-explainer"><summary>What do these presets include?</summary><p>Only sensitivity, zoom sensitivity, viewmodel preset, FOV and offsets. Crosshair, handedness, audio, radar, video and binds remain unchanged. Applying a preset replaces those seven fields; Undo restores your previous build.</p><p>Read on October 9, 2026. The source pages display October 10, 2026, so these are reported snapshots with an unresolved source-date discrepancy, not independently verified current pro configurations. Settings can change.</p><div class="preset-compare">${PRESETS.map((p) => `<span><b>${p.name}</b><br>${p.sensitivity} sens · ${p.zoom} zoom<br>${p.dpi * p.sensitivity} eDPI</span>`).join("")}</div></details><button class="text-button" data-action="import">Already have a config? Import it</button>`;
}
function crossContent() {
  return `<div class="quick-options">${["Compact", "Classic", "Precision", "Minimal"].map((p) => pill(p, "cross", p)).join("")}</div><div class="color-swatches">${[
    ["Mint", "#65ffc9"],
    ["Cyan", "#00e5ff"],
    ["Green", "#00ff00"],
    ["White", "#ffffff"],
    ["Yellow", "#ffff00"],
    ["Pink", "#ff65c8"],
  ]
    .map(
      ([n, c]) =>
        `<button aria-label="${n} crosshair" title="${n}" style="--swatch:${c}" data-action="color" data-choice="${c}"></button>`,
    )
    .join("")}<span>Sets RGB only</span></div>${REGISTRY.filter(
    (d) => d.category === "crosshair",
  )
    .slice(0, 6)
    .map(field)
    .join(
      "",
    )}<details class="advanced-settings"><summary>Dot, color, recoil & advanced controls</summary>${REGISTRY.filter(
    (d) => d.category === "crosshair",
  )
    .slice(6)
    .map(field)
    .join(
      "",
    )}</details><p class="studio-note">Preview shows the resting shape at an enlarged, illustrative scale. Dimensions may differ by resolution. Legacy size/gap commands are not silently converted on import.</p>`;
}
function bindsContent() {
  return `<p class="studio-note">US QWERTY key names. These replace the selected key’s current action. Existing in-game binds cannot be detected. Modifier combinations and multi-action scripts are intentionally unsupported.</p><div class="bind-add"><label>Key<select id="bind-key">${KEYS.map((k) => `<option>${k}</option>`).join("")}</select></label><label>Action<select id="bind-action">${Object.entries(
    ACTIONS,
  )
    .map(([v, n]) => `<option value="${v}">${n}</option>`)
    .join(
      "",
    )}</select></label><button class="button" data-action="add-bind">Add bind</button></div><div class="bind-list">${profile.binds.map((b, i) => `<div class="bind-row"><div><kbd>${b.key}</kbd><strong>${ACTIONS[b.action]}</strong><button class="text-button" data-action="remove-bind" data-choice="${i}" aria-label="Remove bind ${i + 1}">Remove</button></div><code>bind "${b.key}" "${b.action}"</code>${RESERVED.has(b.key) ? '<p class="bind-warning">This key commonly controls an essential action.</p>' : ""}<label class="bind-ack"><input type="checkbox" data-bind-confirm="${i}" ${b.confirmed ? "checked" : ""}>I intend to replace this key’s existing action.</label></div>`).join("") || '<div class="studio-empty">No keybind overrides. Your controls stay untouched.</div>'}</div><div class="validation-list" role="status">${bindIssues(
    profile,
  )
    .map((e) => `<p>${esc(e)}</p>`)
    .join("")}</div>`;
}
function reviewContent() {
  const errors = [...validateProfile(profile), ...bindIssues(profile)];
  const changes = changed(profile);
  let cfg = "";
  try {
    cfg = generateConfig(profile);
  } catch (e) {
    cfg = "// Export blocked until the issues above are resolved.";
  }
  return `<div class="review-metrics"><div><strong>${changes.length + profile.binds.length}</strong><span>overrides</span></div><div><strong>${REGISTRY.length - changes.length}</strong><span>settings untouched</span></div><div><strong>${errors.length ? "Fix issues" : "Ready"}</strong><span>${errors.length ? "export blocked" : "to export"}</span></div></div>${profile.basePresetId ? `<p class="studio-note">Based on ${esc(PRESETS.find((p) => p.id === profile.basePresetId)?.name)}’s reported partial snapshot. ${changes.filter((d) => profile.options[d.command].source !== profile.basePresetId).length} custom/imported settings. See Starting point for provenance.</p>` : ""}<div class="validation-list" role="status">${errors.map((e) => `<p>${esc(e)}</p>`).join("")}</div><div class="diff-list">${[
    "weapon",
    "crosshair",
    "aim",
    "radar",
    "feel",
  ]
    .map(
      (cat) =>
        `<details ${changes.some((d) => d.category === cat) ? "open" : ""}><summary>${cat === "feel" ? "Look & sound" : cat} <span>${changes.filter((d) => d.category === cat).length || "No"} overrides</span></summary>${
          changes
            .filter((d) => d.category === cat)
            .map(
              (d) =>
                `<div><code>${d.command}</code><span>unchanged → <b>${profile.options[d.command].value}</b></span></div>`,
            )
            .join("") || "<p>All settings in this category stay untouched.</p>"
        }</details>`,
    )
    .join(
      "",
    )}</div><label class="config-label" for="config-text">Your autoexec.cfg</label><textarea id="config-text" readonly rows="12" spellcheck="false">${esc(cfg)}</textarea><div class="export-actions"><button class="primary" data-action="download" ${errors.length ? "disabled" : ""}>Download autoexec.cfg</button><button class="button" data-action="copy" ${errors.length ? "disabled" : ""}>Copy commands</button></div><p class="studio-note">Exports contain only selected overrides and a fixed completion marker. Back up existing configs; no files in your game directory are changed automatically.</p><details class="studio-explainer"><summary>Install & verify in CS2</summary>${installGuide()}</details><details class="studio-explainer"><summary>Did it load? Check pasted console output</summary><textarea id="console-log" rows="4" aria-label="CS2 console output" placeholder="Paste console output here…"></textarea><button class="button" data-action="diagnose">Check output</button><p id="diagnosis" role="status"></p><p>Query these commands in the CS2 console:</p><pre>${esc(
    changes
      .slice(0, 3)
      .map((d) => d.command)
      .join("\n") || "No settings were changed.",
  )}</pre></details>`;
}
function installGuide() {
  return "<ol><li>Back up your existing autoexec.</li><li>Steam → Counter-Strike 2 → Manage → Browse local files.</li><li>Save as <code>game\\csgo\\cfg\\autoexec.cfg</code>, not .cfg.txt.</li><li>Run <code>exec autoexec.cfg</code> in the CS2 console. Optionally add <code>+exec autoexec.cfg</code> to Steam launch options.</li><li>Look for <code>CSKit Loadout Studio loaded</code>, then query your changed commands.</li></ol><p>This app cannot detect in-game execution or verify live values.</p>";
}
function content() {
  const cat = STEPS[step][0];
  if (cat === "start") return startContent();
  if (cat === "profile")
    return `<div class="profile-name-card"><span class="profile-symbol">⌘</span><label for="build-name">Build name</label><input id="build-name" maxlength="60" value="${esc(profile.displayName)}" placeholder="My match-day setup"><p>${storageLabel()}. Autosaved as you edit. Export a profile JSON to move it to another device.</p></div><div class="studio-info-grid"><div><strong>Intentional by default.</strong><p>Nothing is applied to CS2 automatically. Only settings you choose are included in the download.</p></div><div><strong>Room to experiment.</strong><p>Duplicate a build before trying a new direction. Undo restores edits made during this session.</p></div></div>`;
  if (cat === "weapon")
    return `<div class="quick-options">${pill("Near center", "weapon", "center")}${pill("Far edge", "weapon", "edge")}${pill("Low profile", "weapon", "low")}</div><p class="studio-note">Near center uses an inward offset (−2). CS2 has no separate center-handed mode. The item artwork illustrates direction, not a first-person viewmodel.</p>${fields(cat)}`;
  if (cat === "crosshair") return crossContent();
  if (cat === "aim")
    return `<div class="dpi-card"><label for="dpi">Mouse DPI <span>INFORMATIONAL</span></label><input id="dpi" type="number" min="50" max="100000" value="${profile.dpi}"><div id="edpi"></div><p>Set hardware DPI in your mouse software. It is never exported.</p></div>${fields(cat)}`;
  if (cat === "radar")
    return `<div class="quick-options">${pill("More map", "radar", 0.3)}${pill("Balanced", "radar", 0.5)}${pill("Closer view", "radar", 0.8)}</div>${fields(cat)}`;
  if (cat === "feel")
    return `<div class="gamma-options">${[
      ["Keep current", "keep"],
      ["Standard · 2.2", "2.2"],
      ["CS:GO-inspired · 2.0", "2"],
      ["Brighter · 1.8", "1.8"],
    ]
      .map(([n, v]) => pill(n, "gamma", v))
      .join(
        "",
      )}</div><p class="studio-note">Gamma simulates relative brightness only and affects fullscreen rendering. Resolution, stretch, refresh rate, shadows and anti-aliasing should be configured in CS2 and your GPU software.</p>${fields(cat)}`;
  if (cat === "binds") return bindsContent();
  return reviewContent();
}
function render() {
  if (!profile) return;
  $("#profile-picker").innerHTML = library.profiles
    .map(
      (p) =>
        `<option value="${p.id}" ${p.id === profile.id ? "selected" : ""}>${esc(p.displayName)}</option>`,
    )
    .join("");
  $("#undo").disabled = !undo.length;
  $("#step-nav").innerHTML = STEPS.map(
    ([id, label], i) =>
      `<button data-step="${i}" ${i === step ? 'aria-current="step"' : ""}><span>${String(i + 1).padStart(2, "0")}</span>${label}${REGISTRY.some((d) => d.category === id && profile.options[d.command]?.mode === "set") ? '<i aria-label="modified"></i>' : ""}</button>`,
  ).join("");
  $("#section-kicker").textContent =
    `STEP ${String(step + 1).padStart(2, "0")} · ${STEPS[step][1].toUpperCase()}`;
  $("#section-title").textContent = STEPS[step][2];
  $("#section-description").textContent = STEPS[step][3];
  $("#step-content").innerHTML = content();
  $("#step-count").textContent = `${String(step + 1).padStart(2, "0")} / 09`;
  $("#progress-fill").style.width = ((step + 1) / 9) * 100 + "%";
  $("#reset-step").hidden = [0, 1, 8].includes(step);
  $("#back").disabled = step === 0;
  $("#skip").hidden = step === 8;
  $("#continue").hidden = step === 8;
  $("#continue").textContent = step === 7 ? "Review build" : "Continue";
  updatePreview();
}
function navigate(i) {
  step = Math.max(0, Math.min(8, i));
  render();
  $("#section-title").focus({ preventScroll: true });
}
function download(name, content, type = "text/plain") {
  const u = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
$("#step-nav").onclick = (e) => {
  const b = e.target.closest("[data-step]");
  if (b) navigate(Number(b.dataset.step));
};
$("#back").onclick = () => navigate(step - 1);
$("#continue").onclick = $("#skip").onclick = () => navigate(step + 1);
$("#review-top").onclick = () => navigate(8);
$("#reset-step").onclick = () =>
  mutate(() => {
    const cat = STEPS[step][0];
    if (cat === "binds") profile.binds = [];
    else
      for (const d of REGISTRY.filter((d) => d.category === cat))
        delete profile.options[d.command];
  });
$("#undo").onclick = () => {
  if (!undo.length) return;
  profile = undo.pop();
  scheduleSave();
  render();
  toast("Previous edit restored");
};
$("#step-content").addEventListener("change", (e) => {
  const t = e.target;
  if (t.dataset.toggle) {
    const k = t.dataset.toggle;
    mutate(() => {
      profile.options[k] = {
        mode: t.checked ? "set" : "unchanged",
        value: profile.options[k]?.value ?? BY_COMMAND[k].preview,
        source: "manual",
      };
    });
  } else if (t.dataset.value) {
    const k = t.dataset.value,
      d = BY_COMMAND[k],
      v = Number(t.value);
    if (
      t.value === "" ||
      !Number.isFinite(v) ||
      v < d.min ||
      v > d.max ||
      (d.step === 1 && !Number.isInteger(v))
    ) {
      t.setCustomValidity(
        `Enter ${d.min}–${d.max}${d.step === 1 ? " (whole numbers)" : ""}.`,
      );
      t.reportValidity();
      t.value = value(k);
      t.setCustomValidity("");
      return;
    }
    mutate(() => {
      profile.options[k] = { mode: "set", value: v, source: "manual" };
    }, false);
    const slider = document.querySelector(`[data-slider="${k}"]`);
    if (slider) slider.value = v;
  } else if (t.dataset.bindConfirm !== undefined)
    mutate(() => {
      profile.binds[Number(t.dataset.bindConfirm)].confirmed = t.checked;
    });
  else if (t.id === "build-name") {
    if (t.value.trim() === profile.displayName) return;
    if (!t.value.trim()) {
      t.value = profile.displayName;
      return;
    }
    mutate(() => (profile.displayName = t.value.trim()), false);
    $("#profile-picker option:checked").textContent = profile.displayName;
  } else if (t.id === "dpi") {
    if (t.value === "" || Number(t.value) < 50 || Number(t.value) > 100000) {
      t.value = profile.dpi;
      toast("Use a DPI between 50 and 100,000");
      return;
    }
    mutate(() => (profile.dpi = Number(t.value)), false);
  }
});
$("#step-content").addEventListener("input", (e) => {
  if (
    e.target.id === "build-name" &&
    e.target.value.trim() &&
    e.target.value.trim() !== profile.displayName
  ) {
    mutate(() => (profile.displayName = e.target.value.trim()), false);
    $("#profile-picker option:checked").textContent = profile.displayName;
    return;
  }
  const k =
    e.target.dataset.slider ||
    (e.target.type === "number" ? e.target.dataset.value : null);
  if (!k) return;
  const d = BY_COMMAND[k],
    v = Number(e.target.value);
  if (
    e.target.value === "" ||
    !Number.isFinite(v) ||
    v < d.min ||
    v > d.max ||
    (d.step === 1 && !Number.isInteger(v))
  )
    return;
  if (!e.target.dataset.dragging) {
    remember();
    e.target.dataset.dragging = "1";
  }
  profile.options[k] = {
    mode: "set",
    value: Number(e.target.value),
    source: "manual",
  };
  $("#field-" + k).value = e.target.value;
  const slider = document.querySelector(`[data-slider="${k}"]`);
  if (slider) slider.value = e.target.value;
  scheduleSave();
  updatePreview();
});
$("#step-content").addEventListener("change", (e) => {
  if (e.target.dataset.slider || e.target.dataset.value)
    delete e.target.dataset.dragging;
});
$("#step-content").onclick = async (e) => {
  const b = e.target.closest("[data-action]");
  if (!b) return;
  const a = b.dataset.action,
    c = b.dataset.choice;
  if (a === "clean")
    mutate(() => {
      profile.options = {};
      profile.binds = [];
      profile.basePresetId = null;
    });
  if (a === "preset") {
    mutate(
      () =>
        (profile = applyPreset(
          profile,
          PRESETS.find((p) => p.id === c),
        )),
    );
    toast("Applied 7 reported settings. Everything else is preserved.");
  }
  if (a === "import") openImport();
  if (a === "weapon")
    setValues(
      c === "center"
        ? { viewmodel_offset_x: -2 }
        : c === "edge"
          ? { viewmodel_offset_x: 2.5, viewmodel_fov: 68 }
          : { viewmodel_offset_z: -2, viewmodel_fov: 68 },
    );
  if (a === "cross") {
    const presets = {
      Compact: [3, 2, 1],
      Classic: [8, 4, 2],
      Precision: [2, 3, 1],
      Minimal: [1, 2, 1],
    };
    const [l, g, t] = presets[c];
    setValues({
      cl_crosshair_screen_height: 1080,
      cl_crosshairstyle: 4,
      cl_crosshair_length: l,
      cl_crosshair_gap: g,
      cl_crosshair_thickness: t,
      cl_crosshairdot: 0,
      cl_crosshair_t: 0,
    });
  }
  if (a === "color")
    setValues({
      cl_crosshaircolor_r: parseInt(c.slice(1, 3), 16),
      cl_crosshaircolor_g: parseInt(c.slice(3, 5), 16),
      cl_crosshaircolor_b: parseInt(c.slice(5, 7), 16),
    });
  if (a === "radar") setValues({ cl_radar_scale: Number(c) });
  if (a === "gamma") {
    if (c === "keep") mutate(() => delete profile.options.r_fullscreen_gamma);
    else setValues({ r_fullscreen_gamma: Number(c) });
  }
  if (a === "add-bind")
    mutate(() =>
      profile.binds.push({
        key: $("#bind-key").value,
        action: $("#bind-action").value,
        confirmed: false,
      }),
    );
  if (a === "remove-bind") mutate(() => profile.binds.splice(Number(c), 1));
  if (a === "download") {
    try {
      download("autoexec.cfg", generateConfig(profile));
      $("#ready-dialog").showModal();
    } catch (e) {
      toast(e.message);
    }
  }
  if (a === "copy") {
    try {
      await navigator.clipboard.writeText(generateConfig(profile));
      toast("Config copied");
    } catch {
      toast("Copy unavailable. Select the config text or download it instead.");
    }
  }
  if (a === "diagnose")
    $("#diagnosis").textContent = diagnose($("#console-log").value);
};
$("#profile-picker").onchange = (e) => {
  profile = library.profiles.find((p) => p.id === e.target.value);
  undo = [];
  scheduleSave();
  render();
};
function addProfile(p) {
  if (library.profiles.length >= 50) {
    toast("Export or delete a build first (50-profile limit).");
    return;
  }
  profile = p;
  undo = [];
  scheduleSave();
  step = 0;
  render();
}
$("#new-profile").onclick = () => addProfile(freshProfile());
$("#duplicate-profile").onclick = () =>
  addProfile({
    ...structuredClone(profile),
    id: crypto.randomUUID(),
    displayName: profile.displayName.slice(0, 53) + " copy",
  });
$("#delete-profile").onclick = () => {
  if (
    !confirm(
      `Delete “${profile.displayName}” from this workspace? Export a JSON backup first if you want to keep it.`,
    )
  )
    return;
  library.profiles = library.profiles.filter((p) => p.id !== profile.id);
  profile = library.profiles[0] || freshProfile();
  undo = [];
  scheduleSave();
  render();
};
$("#export-json").onclick = () =>
  download(
    "cskit-loadout.json",
    JSON.stringify(profile, null, 2),
    "application/json",
  );
function openImport() {
  $("#import-dialog").showModal();
}
$("#import-open").onclick = openImport;
$("#import-close").onclick = () => $("#import-dialog").close();
$("#ready-close").onclick = $("#ready-done").onclick = () =>
  $("#ready-dialog").close();
$("#import-file").onchange = async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  if (f.size > 200000) {
    $("#import-report").textContent = "Maximum import size: 200 KB.";
    return;
  }
  $("#import-text").value = await f.text();
  importCandidate = null;
  $("#import-apply").disabled = true;
};
$("#import-text").oninput = () => {
  importCandidate = null;
  $("#import-apply").disabled = true;
};
$("#import-check").onclick = () => {
  try {
    const text = $("#import-text").value;
    if (text.length > 200000 || !text.trim())
      throw Error("Paste a config or JSON profile (maximum 200 KB).");
    let warnings = [],
      accepted = 0;
    if (text.trim().startsWith("{")) {
      const p = JSON.parse(text);
      const errors = validateProfile(p);
      if (errors.length) throw Error(errors.join(" "));
      importCandidate = { ...p, id: crypto.randomUUID() };
      importCandidate.binds = p.binds.map((b) => ({ ...b, confirmed: false }));
      accepted = changed(p).length + p.binds.length;
      warnings = bindIssues(importCandidate);
    } else {
      const result = importConfig(text);
      importCandidate = result.profile;
      importCandidate.displayName = "Imported build";
      warnings = result.warnings;
      accepted = result.accepted;
    }
    const candidateErrors = validateProfile(importCandidate);
    if (candidateErrors.length) throw Error(candidateErrors.join(" "));
    $("#import-report").textContent =
      `${accepted} recognized settings/binds. ${warnings.length} notices.\n${warnings.join("\n")}`;
    $("#import-apply").disabled = false;
  } catch (e) {
    importCandidate = null;
    $("#import-apply").disabled = true;
    $("#import-report").textContent = e.message;
  }
};
$("#import-apply").onclick = () => {
  if (importCandidate) {
    addProfile(structuredClone(importCandidate));
    $("#import-dialog").close();
    toast("Imported as a separate build");
  }
};
function setupCanvas(canvas, w, h) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);
  return ctx;
}
function drawCrosshair() {
  const canvas = $("#crosshair-canvas"),
    box = $("#studio-scene").getBoundingClientRect(),
    w = box.width || 400,
    h = box.height || 320,
    ctx = setupCanvas(canvas, w, h),
    scale = 2.2;
  const l = Math.min(value("cl_crosshair_length"), 50) * scale,
    g = Math.max(0, Math.min(80, value("cl_crosshair_gap"))) * scale + 3,
    t = Math.max(1, Math.min(20, value("cl_crosshair_thickness")) * scale),
    x = w / 2,
    y = h / 2;
  ctx.fillStyle = `rgba(${value("cl_crosshaircolor_r")},${value("cl_crosshaircolor_g")},${value("cl_crosshaircolor_b")},${value("cl_crosshaircolor_a") / 255})`;
  const rect = (a, b, c, d) => {
    if (value("cl_crosshair_drawoutline")) {
      ctx.strokeStyle = "#101922";
      ctx.lineWidth = value("cl_crosshair_drawoutline") === 2 ? 1 : 2;
      ctx.strokeRect(a, b, c, d);
    }
    ctx.fillRect(a, b, c, d);
  };
  if (value("cl_crosshairstyle") !== 6) {
    rect(x - g - l, y - t / 2, l, t);
    rect(x + g, y - t / 2, l, t);
    rect(x - t / 2, y + g, t, l);
    if (!value("cl_crosshair_t")) rect(x - t / 2, y - g - l, t, l);
  }
  if (value("cl_crosshairdot") || value("cl_crosshairstyle") === 6)
    rect(x - t / 2, y - t / 2, t, t);
}
function drawRadar() {
  const c = $("#radar-canvas"),
    ctx = setupCanvas(c, 180, 180);
  ctx.save();
  ctx.beginPath();
  ctx.arc(90, 90, 80, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#253d48";
  ctx.fillRect(0, 0, 180, 180);
  ctx.translate(90, 90);
  ctx.rotate(value("cl_radar_rotate") ? -0.4 : 0);
  const zoom = value("cl_radar_scale") * 2;
  ctx.scale(zoom, zoom);
  if (!value("cl_radar_always_centered")) ctx.translate(14, -12);
  ctx.strokeStyle = "#56727c";
  ctx.lineWidth = 17;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(-75, 55);
  ctx.lineTo(-75, -40);
  ctx.lineTo(-20, -40);
  ctx.lineTo(-20, -75);
  ctx.lineTo(60, -75);
  ctx.lineTo(60, 10);
  ctx.lineTo(10, 10);
  ctx.lineTo(10, 60);
  ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = "#344f5a";
  ctx.fillRect(-44, -16, 28, 40);
  ctx.fillStyle = "#d8b873";
  ctx.font = "bold 16px system-ui";
  ctx.fillText("A", -72, -38);
  ctx.fillText("B", 44, -40);
  const colors = ["#86d7ea", "#b6a0e7", "#eac785"];
  [
    [-60, 25],
    [40, -55],
    [0, 50],
  ].forEach(([x, y], i) => {
    ctx.fillStyle = colors[i];
    ctx.beginPath();
    ctx.arc(x, y, 5 * value("cl_radar_icon_scale_min"), 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(90, 82);
  ctx.lineTo(85, 96);
  ctx.lineTo(95, 96);
  ctx.closePath();
  ctx.fill();
  c.style.width = 115 * value("cl_hud_radar_scale") + "px";
  c.style.height = c.style.width;
}
function updatePreview() {
  if (!profile) return;
  const count = changed(profile).length + profile.binds.length;
  $("#change-count").textContent =
    `${count} overrides · ${REGISTRY.length - changed(profile).length} untouched`;
  $("#preview-change-count").textContent = count + " overrides";
  $("#undo").disabled = !undo.length;
  $("#preview-label").textContent =
    STEPS[step][1].toUpperCase() + " · LIVE PREVIEW";
  const hand = value("cl_prefer_lefthanded") === 1;
  const anchor = $("#weapon-anchor");
  anchor.style.left =
    (hand ? 25 : 75) +
    (hand ? -1 : 1) * (value("viewmodel_offset_x") - 1) * 5 +
    "%";
  anchor.style.bottom = 18 + value("viewmodel_offset_z") * 5 + "%";
  anchor.style.transform = `translateX(-50%) scale(${1 + (value("viewmodel_fov") - 60) * 0.02 + value("viewmodel_offset_y") * 0.035}) scaleX(${hand ? -1 : 1})`;
  $("#studio-scene").style.setProperty(
    "--brightness",
    Math.pow(2.2 / value("r_fullscreen_gamma"), 0.8),
  );
  $("#studio-scene").dataset.scene = $("#preview-scene").value;
  $("#sample-hud").style.color = [
    "#dbe7f2",
    "#fff",
    "#fff",
    "#98cbff",
    "#6c93fa",
    "#c6a8ff",
    "#f09797",
    "#f6be83",
    "#f6e284",
    "#9ee1b5",
    "#8adee2",
    "#f1b7da",
    "#dbe7f2",
  ][value("cl_hud_color")];
  $("#sample-hud").style.fontSize = 17 * value("hud_scaling") + "px";
  drawCrosshair();
  drawRadar();
  $("#preview-readout").innerHTML =
    `<span>${hand ? "Left" : "Right"} hand<small>preview</small></span><span>${value("viewmodel_fov")}°<small>viewmodel FOV</small></span><span>${value("r_fullscreen_gamma")}<small>gamma</small></span>`;
  let cfg;
  try {
    cfg = generateConfig(profile);
  } catch (e) {
    cfg = e.message;
  }
  $("#command-peek").textContent = cfg;
  if ($("#edpi"))
    $("#edpi").textContent =
      profile.options.sensitivity?.mode === "set"
        ? `${Math.round(profile.dpi * value("sensitivity"))} eDPI`
        : "Set sensitivity to calculate eDPI";
  const alpha = value("cl_crosshaircolor_a");
  if (alpha < 50)
    $("#preview-label").textContent = "LOW OPACITY · MAY BE HARD TO SEE";
}
$("#preview-scene").onchange = updatePreview;
$("#preview-weapon").onchange = async (e) => {
  $("#studio-weapon").hidden = false;
  $("#weapon-fallback").hidden = true;
  $("#studio-weapon").alt =
    e.target.selectedOptions[0].textContent + " illustrative item artwork";
  $("#studio-weapon").src = await artworkUrl(e.target.value, true);
};
$("#studio-weapon").onerror = () => {
  $("#studio-weapon").hidden = true;
  $("#weapon-fallback").hidden = false;
};
new ResizeObserver(() => {
  if (profile) {
    drawCrosshair();
    drawRadar();
  }
}).observe($("#studio-scene"));
async function init() {
  try {
    const data = await request("/api/studio");
    if (
      !Array.isArray(data.profiles) ||
      data.profiles.some((p) => validateProfile(p).length)
    )
      throw Error(
        "The saved Studio library could not be read safely. Keep a backup before repairing or restoring your builds.",
      );
    library = data;
    profile =
      library.profiles.find((p) => p.id === library.activeId) ||
      library.profiles[0];
    if (!profile) {
      profile = freshProfile();
      scheduleSave();
    } else $("#save-status").textContent = storageLabel();
    render();
  } catch (e) {
    error(e.message);
    $("#save-status").textContent = "Library unavailable";
    document
      .querySelectorAll("button,select")
      .forEach((b) => (b.disabled = true));
  }
}
await ready;
init();
