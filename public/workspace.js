import { account, ready, request } from "./account.js";
import {
  loadWorkspace,
  saveWorkspace,
  downloadWorkspace,
  reloadCloudWorkspace,
} from "./workspace-store.js";
import {
  freshWorkspace,
  validateWorkspace,
  mergeWorkspace,
  compareExperiment,
  sensitivity,
  WIDGETS,
} from "./workspace-core.js";
import { DRILLS, FOCUS } from "./practice-data.js";
import { generateConfig } from "./studio-core.js";
const $ = (s) => document.querySelector(s),
  root = $("#workspace-content");
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
function configText(p) {
  try {
    return generateConfig(p);
  } catch (e) {
    return "Review required in Studio: " + e.message;
  }
}
const date = (t) =>
  new Date(t).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
const number = (n) =>
  n === null
    ? "Not recorded"
    : new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);
let data = freshWorkspace(),
  library = { profiles: [], activeId: null },
  market = null,
  loaded = false,
  pending = false;
const page = document.body.dataset.page;
const message = (t) => {
  $("#workspace-status").textContent = t;
};
function alert(e) {
  $("#workspace-error").hidden = false;
  $("#workspace-error").textContent = e.message || e;
}
function clearError() {
  $("#workspace-error").hidden = true;
}
async function mutate(fn) {
  if (pending) return;
  pending = true;
  clearError();
  const old = structuredClone(data);
  try {
    fn(data);
    validateWorkspace(data);
    data = await saveWorkspace(data);
    message(
      account.user
        ? "Saved privately to your account"
        : "Saved in this browser",
    );
    render();
  } catch (e) {
    downloadCandidate = structuredClone(data);
    data = old;
    alert(e);
    $("#export-draft").hidden = false;
    recover.hidden = !account.user;
  } finally {
    pending = false;
  }
}
let downloadCandidate = null;
$("#export-draft").onclick = () => downloadWorkspace(downloadCandidate || data);
const recover = document.createElement("button");
recover.className = "button";
recover.textContent = "Export draft and load latest account copy";
recover.hidden = true;
$("#export-draft").after(recover);
recover.onclick = async () => {
  try {
    downloadWorkspace(downloadCandidate || data);
    data = await reloadCloudWorkspace();
    downloadCandidate = null;
    clearError();
    recover.hidden = true;
    $("#export-draft").hidden = true;
    render();
    message(
      "Latest account copy loaded. Import your exported draft as copies to retain both versions.",
    );
  } catch (e) {
    alert(e);
  }
};
$("#workspace-export").onclick = () => downloadWorkspace(data);
$("#workspace-import").onchange = async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    if (f.size > 600000)
      throw Error("Choose a workspace JSON file smaller than 600 KB.");
    const incoming = validateWorkspace(JSON.parse(await f.text()));
    await mutate((d) => Object.assign(d, mergeWorkspace(d, incoming)));
  } catch (e) {
    alert(e);
  }
  e.target.value = "";
};
$("#workspace-reset").onclick = () => {
  if (
    confirm(
      "Clear this workspace’s plans, practice history, experiments and favorites? Studio builds and wishlists stay unchanged. Export a backup first if needed.",
    )
  )
    mutate((d) =>
      Object.assign(d, { ...freshWorkspace(), revision: d.revision }),
    );
};
const links = {
  practice: "/improve",
  experiments: "/experiments",
  studio: "/studio",
  wishlist: "/market#wishlist",
  maps: "/maps",
};
function dashboard() {
  const completed = data.sessions.length,
    active = data.experiments.filter((e) => e.outcome === "active").length;
  root.innerHTML = `<section class="workspace-hero"><div><span class="eyebrow">CSKIT 2.0 · YOUR FREE WORKSPACE</span><h2>Less friction.<br/>More Counter-Strike.</h2><p>Your setup, practice and next experiment.<br/>One place to pick up where you left off.</p><a class="primary" href="/improve">Build your next session ↗</a><a class="hero-secondary" href="/studio">Open Studio</a></div><div class="workspace-hero-art"><img src="/cskit-icon.png" alt=""/><span>MAKE THE NEXT ROUND COUNT.</span></div></section>
 <div class="workspace-metrics"><article><span>Practice logged</span><strong>${completed}</strong><small>Self-reported drill completions · all time</small></article><article><span>Active experiments</span><strong>${active}</strong><small>Personal tests · no automatic conclusions</small></article><article><span>Saved builds</span><strong>${library.profiles.length}</strong><small>Your current Studio library</small></article></div>
 <div class="section-title"><h2>Your workspace</h2><button class="button" id="reset-widgets">Reset layout</button></div><div class="workspace-grid" id="dashboard-widgets"></div><details class="workspace-details"><summary>Show or hide dashboard cards</summary><div id="widget-choices"></div></details>`;
  const summaries = {
    practice: [
      data.plans.length ? data.plans[0].name : "Make time for one thing.",
      data.plans.length
        ? `${data.plans[0].minutes}-minute routine · ${data.plans[0].focus}`
        : "Choose a 10, 20, 30 or 60-minute practice plan.",
    ],
    experiments: [
      active
        ? `${active} tests in progress`
        : "Test an idea. Keep the evidence.",
      "Lock two Studio setups and log comparable sessions.",
    ],
    studio: [
      library.profiles.find((p) => p.id === library.activeId)?.displayName ||
        "Your next setup starts here.",
      "Crosshair, viewmodel and safe config exports.",
    ],
    wishlist: [
      market ? `${market.wishlist.length} saved items` : "Open your watchlist",
      "Skinport prices and exact variants remain in Market.",
    ],
    maps: [
      data.favorites.length
        ? "Dust II is in your favorites"
        : "Know the map. Plan the practice.",
      "Explore the Dust II overview and build a utility routine.",
    ],
  };
  for (const key of data.widgets) {
    const card = document.createElement("article");
    card.className = "workspace-card";
    card.innerHTML = `<div class="card-kicker">${esc(key)}<div><button data-up="${key}" aria-label="Move ${key} earlier">↑</button><button data-hide="${key}" aria-label="Hide ${key}">×</button></div></div><h3>${esc(summaries[key][0])}</h3><p>${esc(summaries[key][1])}</p><a href="${links[key]}">Open ${key} →</a>`;
    $("#dashboard-widgets").append(card);
  }
  $("#widget-choices").innerHTML = WIDGETS.map(
    (k) =>
      `<label><input type="checkbox" data-widget="${k}" ${data.widgets.includes(k) ? "checked" : ""}/> ${k}</label>`,
  ).join("");
  root.querySelectorAll("[data-up]").forEach(
    (b) =>
      (b.onclick = () =>
        mutate((d) => {
          const i = d.widgets.indexOf(b.dataset.up);
          if (i > 0)
            [d.widgets[i - 1], d.widgets[i]] = [d.widgets[i], d.widgets[i - 1]];
        })),
  );
  root.querySelectorAll("[data-hide]").forEach(
    (b) =>
      (b.onclick = () =>
        mutate((d) => {
          d.widgets = d.widgets.filter((x) => x !== b.dataset.hide);
        })),
  );
  root.querySelectorAll("[data-widget]").forEach(
    (b) =>
      (b.onchange = () =>
        mutate((d) => {
          d.widgets = b.checked
            ? [...d.widgets, b.dataset.widget]
            : d.widgets.filter((x) => x !== b.dataset.widget);
        })),
  );
  $("#reset-widgets").onclick = () =>
    mutate((d) => {
      d.widgets = [...WIDGETS];
    });
}
function improve() {
  const focus = new URLSearchParams(location.search).get("focus");
  root.innerHTML = `<div class="workspace-split"><section class="workspace-card"><span class="eyebrow">A LITTLE MORE DELIBERATE</span><h2>Build a practice plan.</h2><p>Pick one focus and a realistic amount of time. These are CSKit-authored practice prompts, not a claim of measured improvement.</p><form id="plan-form"><label>Plan name<input name="name" required maxlength="100" placeholder="My evening warmup"/></label><div class="form-grid"><label>Focus<select name="focus">${FOCUS.map((x) => `<option ${x === focus ? "selected" : ""}>${x}</option>`).join("")}</select></label><label>Time available<select name="minutes">${[10, 20, 30, 60].map((x) => `<option value="${x}" ${x === 20 ? "selected" : ""}>${x} minutes</option>`).join("")}</select></label></div><label>What will you observe?<textarea name="goal" maxlength="1000" placeholder="For example: clean first-shot hits out of 20 attempts"></textarea></label><button class="primary">Save practice plan</button></form></section><section class="workspace-card"><span class="eyebrow">YOUR ROUTINES</span><h2>Keep showing up.</h2><div id="plan-list"></div></section></div><div class="section-title"><h2>Drill library</h2><span>Original guidance · reviewed October 10, 2026</span></div><div class="workspace-grid">${DRILLS.map((d) => `<article class="workspace-card"><span class="tag">${d.category} · ${d.level}</span><h3>${d.name}</h3><p>${d.objective}</p><details><summary>Instructions · ${d.minutes} minutes</summary><ol>${d.steps.map((s) => `<li>${s}</li>`).join("")}</ol><p><strong>Watch for:</strong> ${d.mistake}</p><small>Requires a local practice session${d.id === "trading" ? " and a partner" : ""}. This is suggested practice, not a validated performance benchmark.</small></details></article>`).join("")}</div><div class="section-title"><h2>Practice history</h2><span>Self-reported · ${data.sessions.length} completions</span></div><div class="history-list">${
    data.sessions
      .slice()
      .reverse()
      .slice(0, 30)
      .map(
        (s) =>
          `<article><div><strong>${esc(DRILLS.find((d) => d.id === s.drill)?.name || s.drill)}</strong><small>${date(s.at)} · ${s.minutes} minutes · manually logged</small><p>${esc(s.notes)}</p></div></article>`,
      )
      .join("") ||
    "<p>No sessions yet. Open a saved plan to log your first drill.</p>"
  }</div>`;
  $("#plan-form").onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target),
      focus = f.get("focus"),
      minutes = Number(f.get("minutes"));
    const selected = DRILLS.filter((d) => d.category === focus);
    const drills = [...selected.map((d) => d.id), "review"];
    mutate((d) =>
      d.plans.push({
        id: crypto.randomUUID(),
        name: f.get("name").trim() || "Practice plan",
        focus,
        minutes,
        goal: f.get("goal"),
        drills: [...new Set(drills)],
      }),
    );
  };
  $("#plan-list").innerHTML =
    data.plans
      .map(
        (p) =>
          `<details class="plan"><summary>${esc(p.name)} <small>${p.minutes} min · ${esc(p.focus)}</small></summary><p>${esc(p.goal) || "No observation goal set."}</p><p>Split your ${p.minutes} minutes across these drills. Include time to record what you noticed.</p>${p.drills.map((id) => `<form class="log-drill" data-plan="${esc(p.id)}" data-drill="${esc(id)}"><strong>${esc(DRILLS.find((d) => d.id === id)?.name || id)}</strong><label>Minutes practiced<input name="minutes" type="number" min="1" max="180" value="${Math.max(1, Math.floor(p.minutes / p.drills.length))}" required/></label><label>Observation<input name="notes" maxlength="1000" placeholder="What happened? What will you try next?"/></label><button class="button">Log completed drill</button></form>`).join("")}<button class="text-button" data-delete-plan="${esc(p.id)}">Remove plan</button></details>`,
      )
      .join("") ||
    '<p class="empty-copy">Your first routine belongs here. Saved plans are private and usable without performance data.</p>';
  root.querySelectorAll(".log-drill").forEach(
    (form) =>
      (form.onsubmit = (e) => {
        e.preventDefault();
        const f = new FormData(form);
        mutate((d) =>
          d.sessions.push({
            id: crypto.randomUUID(),
            planId: form.dataset.plan,
            drill: form.dataset.drill,
            at: Date.now(),
            minutes: Number(f.get("minutes")),
            notes: f.get("notes"),
          }),
        );
      }),
  );
  root.querySelectorAll("[data-delete-plan]").forEach(
    (b) =>
      (b.onclick = () => {
        if (confirm("Remove this plan? Logged practice history stays saved."))
          mutate((d) => {
            d.plans = d.plans.filter((p) => p.id !== b.dataset.deletePlan);
          });
      }),
  );
}
function experiments() {
  const options = library.profiles
    .map((p) => `<option value="${esc(p.id)}">${esc(p.displayName)}</option>`)
    .join("");
  root.innerHTML = `<section class="workspace-card"><span class="eyebrow">CHANGE ONE THING. OBSERVE CAREFULLY.</span><h2>Your personal test bench.</h2><p>Compare two saved Studio setups. Their snapshots stay locked even if you edit the original builds. All results here are manually entered; no Leetify history is copied or stored.</p>${library.profiles.length < 2 ? '<p class="notice">Create or duplicate two builds in <a href="/studio">Studio</a> before starting an experiment.</p>' : `<form id="experiment-form"><div class="form-grid"><label>Experiment name<input name="name" maxlength="100" required placeholder="A lower sensitivity?"/></label><label>Primary metric and unit<input name="metric" maxlength="100" required placeholder="Clean hits out of 20 attempts"/></label><label>Control setup<select name="control">${options}</select></label><label>Variant setup<select name="variant">${options}</select></label></div><label>Hypothesis<textarea name="hypothesis" maxlength="1000" required placeholder="What do you expect to observe?"></textarea></label><label>Test plan and end condition<textarea name="conditions" maxlength="1000" required placeholder="Alternate A/B sessions; same map, weapon and drill; review after 10 sessions per setup."></textarea></label><button class="primary">Lock snapshots and start</button></form>`}</section><div class="section-title"><h2>Your experiments</h2><span>${data.experiments.length} saved</span></div><div id="experiment-list"></div>`;
  $("#experiment-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    if (f.get("control") === f.get("variant"))
      return alert("Choose two different saved builds.");
    mutate((d) =>
      d.experiments.push({
        id: crypto.randomUUID(),
        name: f.get("name"),
        metric: f.get("metric"),
        hypothesis: f.get("hypothesis"),
        conditions: f.get("conditions"),
        control: structuredClone(
          library.profiles.find((p) => p.id === f.get("control")),
        ),
        variant: structuredClone(
          library.profiles.find((p) => p.id === f.get("variant")),
        ),
        created: Date.now(),
        observations: [],
        outcome: "active",
        notes: "",
      }),
    );
  });
  $("#experiment-list").innerHTML =
    data.experiments
      .map((e) => {
        const c = compareExperiment(e);
        return `<article class="workspace-card experiment"><div class="card-kicker">${date(e.created)}<span class="tag">${e.outcome}</span></div><h3>${esc(e.name)}</h3><p>${esc(e.hypothesis)}</p><p><strong>Plan:</strong> ${esc(e.conditions)}</p><div class="comparison"><div><small>CONTROL · ${esc(e.control.displayName)}</small><strong>${number(c.control.mean)}</strong><span>${c.control.count} observations</span></div><div><small>VARIANT · ${esc(e.variant.displayName)}</small><strong>${number(c.variant.mean)}</strong><span>${c.variant.count} observations</span></div><div><small>DESCRIPTIVE DIFFERENCE</small><strong>${number(c.delta)}</strong><span>${esc(e.metric)}</span></div></div><p class="notice">${Math.min(c.control.count, c.variant.count) < 5 ? "Very small sample. Keep collecting comparable sessions. " : ""}These are sample averages, not evidence that the setting caused a change. Map, opponents, role, timing and practice can all affect results.</p><details><summary>Locked setup snapshots and observations</summary><div class="form-grid"><pre>${esc(configText(e.control))}</pre><pre>${esc(configText(e.variant))}</pre></div>${e.observations.map((o) => `<p>${date(o.at)} · ${o.group} · ${o.value} · Manual entry<br/>${esc(o.context)}</p>`).join("") || "<p>No observations recorded.</p>"}<button class="button" data-restore="${esc(e.id)}">Copy control back to Studio</button></details>${e.outcome === "active" ? `<form class="observation-form" data-id="${esc(e.id)}"><div class="form-grid"><label>Setup<select name="group"><option value="control">Control</option><option value="variant">Variant</option></select></label><label>${esc(e.metric)}<input name="value" type="number" step="any" required/></label></div><label>Context: map, role, session or match reference<input name="context" maxlength="500" required/></label><button class="button">Record observation</button></form>` : ""}<form class="outcome-form" data-id="${esc(e.id)}"><label>Conclusion<select name="outcome">${["active", "keep", "revise", "revert", "inconclusive"].map((x) => `<option ${x === e.outcome ? "selected" : ""}>${x}</option>`).join("")}</select></label><label>Notes<textarea name="notes" maxlength="1000">${esc(e.notes)}</textarea></label><button class="button">Save conclusion</button><button type="button" class="text-button" data-delete-experiment="${esc(e.id)}">Delete experiment</button></form></article>`;
      })
      .join("") ||
    '<p class="empty-copy">No experiments yet. An inconclusive result is a useful result.</p>';
  root.querySelectorAll(".observation-form").forEach(
    (form) =>
      (form.onsubmit = (ev) => {
        ev.preventDefault();
        const f = new FormData(form);
        mutate((d) =>
          d.experiments
            .find((e) => e.id === form.dataset.id)
            .observations.push({
              group: f.get("group"),
              value: Number(f.get("value")),
              context: f.get("context"),
              at: Date.now(),
              source: "manual",
            }),
        );
      }),
  );
  root.querySelectorAll(".outcome-form").forEach(
    (form) =>
      (form.onsubmit = (ev) => {
        ev.preventDefault();
        const f = new FormData(form);
        mutate((d) =>
          Object.assign(
            d.experiments.find((e) => e.id === form.dataset.id),
            { outcome: f.get("outcome"), notes: f.get("notes") },
          ),
        );
      }),
  );
  root.querySelectorAll("[data-delete-experiment]").forEach(
    (b) =>
      (b.onclick = () => {
        if (
          confirm(
            "Delete this experiment and its observations? Original Studio builds will remain.",
          )
        )
          mutate((d) => {
            d.experiments = d.experiments.filter(
              (e) => e.id !== b.dataset.deleteExperiment,
            );
          });
      }),
  );
  root.querySelectorAll("[data-restore]").forEach(
    (b) =>
      (b.onclick = async () => {
        b.disabled = true;
        try {
          const e = data.experiments.find((e) => e.id === b.dataset.restore),
            current = await request("/api/studio");
          const copy = structuredClone(e.control);
          copy.id = crypto.randomUUID();
          copy.displayName = (copy.displayName + " · restored").slice(0, 60);
          current.profiles.push(copy);
          current.activeId = copy.id;
          await request("/api/studio", current);
          message(
            "Control restored as a new Studio build. Originals were preserved.",
          );
        } catch (e) {
          alert(e);
        } finally {
          b.disabled = false;
        }
      }),
  );
}

function maps() {
  root.innerHTML = `<section class="workspace-card"><div class="card-kicker">MAP LIBRARY · INITIAL RELEASE<span class="tag">1 map available</span></div><h2>Dust II</h2><p>Explore the game-extracted overview. The map asset is a reference, not a claim that a lineup works on the current patch.</p><div class="map-controls"><button class="button" id="map-out" aria-label="Zoom out">−</button><button class="button" id="map-in" aria-label="Zoom in">+</button><button class="button" id="map-reset">Reset map</button><button class="primary" id="map-favorite">${data.favorites.includes("dust2") ? "Remove favorite" : "Favorite map"}</button><a href="/improve?focus=Utility">Practice utility →</a></div><div class="map-viewport" tabindex="0" aria-label="Dust II map. Use arrow keys to pan and plus or minus to zoom."><img src="/studio-dust2-radar.png" alt="Top-down Dust II radar overview" draggable="false"/></div><p class="source-note">Asset: Valve game overview, distributed by <a href="https://github.com/MurkyYT/cs2-map-icons" target="_blank" rel="noreferrer">cs2-map-icons</a> · retrieved October 10, 2026. Drag or use arrow keys to pan. Buttons or + / − zoom.</p></section><section class="workspace-card"><span class="tag">CONTENT VERIFICATION PENDING</span><h3>Lineups that earn your trust.</h3><p>Verified callout markers, grenade walkthroughs and additional maps are not available yet. No untested throws are presented as working lineups.</p><a href="/improve?focus=Utility">Use the self-verified throw drill →</a></section>`;
  let zoom = 1,
    x = 0,
    y = 0,
    start = null;
  const viewport = $(".map-viewport"),
    img = viewport.querySelector("img");
  const draw = () => {
    zoom = Math.max(1, Math.min(4, zoom));
    const limit = (viewport.clientWidth * (zoom - 1)) / 2;
    x = Math.max(-limit, Math.min(limit, x));
    y = Math.max(-limit, Math.min(limit, y));
    img.style.transform = `translate(${x}px,${y}px) scale(${zoom})`;
  };
  $("#map-in").onclick = () => {
    zoom += 0.25;
    draw();
  };
  $("#map-out").onclick = () => {
    zoom -= 0.25;
    draw();
  };
  $("#map-reset").onclick = () => {
    zoom = 1;
    x = y = 0;
    draw();
  };
  viewport.onpointerdown = (e) => {
    start = [e.clientX - x, e.clientY - y];
    viewport.setPointerCapture(e.pointerId);
  };
  viewport.onpointermove = (e) => {
    if (start) {
      x = e.clientX - start[0];
      y = e.clientY - start[1];
      draw();
    }
  };
  viewport.onpointerup = viewport.onpointercancel = () => {
    start = null;
  };
  viewport.onkeydown = (e) => {
    if (
      [
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "+",
        "-",
        "=",
      ].includes(e.key)
    ) {
      e.preventDefault();
      if (e.key === "ArrowLeft") x += 30;
      if (e.key === "ArrowRight") x -= 30;
      if (e.key === "ArrowUp") y += 30;
      if (e.key === "ArrowDown") y -= 30;
      if (["+", "="].includes(e.key)) zoom += 0.25;
      if (e.key === "-") zoom -= 0.25;
      draw();
    }
  };
  $("#map-favorite").onclick = () =>
    mutate((d) => {
      d.favorites = d.favorites.includes("dust2") ? [] : ["dust2"];
    });
}
function tools() {
  root.innerHTML = `<section class="workspace-card" id="sensitivity"><span class="eyebrow">SENSITIVITY LAB</span><h2>Know what your settings mean.</h2><p>Compare physical mouse travel. No sensitivity is universally best.</p><form id="sensitivity-form"><div class="form-grid"><label>Mouse DPI<input name="dpi" type="number" min="50" max="100000" value="800" required/></label><label>CS2 sensitivity<input name="sens" type="number" min="0.001" max="100" step="any" value="1" required/></label><label>Yaw multiplier<input name="yaw" type="number" min="0.001" max="1" step="any" value="0.022" required/></label><label>Mousepad width (cm)<input name="pad" type="number" min="1" max="200" step="any" value="45" required/></label></div><button class="primary">Calculate</button></form><div class="comparison" id="sensitivity-result" aria-live="polite"></div><p class="source-note">Assumes yaw in degrees per mouse count and unchanged input scaling: inches/360 = 360 ÷ (DPI × sensitivity × yaw); cm/360 = inches × 2.54. Default m_yaw 0.022 from the <a href="https://github.com/SteamTracking/GameTracking-CS2/blob/master/DumpSource2/convars.txt" target="_blank" rel="noreferrer">CS2 command reference</a>. Does not convert scoped FOV or mouse acceleration.</p><a href="/experiments">Test two saved setups →</a></section><section class="workspace-card"><span class="eyebrow">DISPLAY HELPER</span><h2>Compare aspect ratios.</h2><form id="aspect-form"><div class="form-grid"><label>Width (pixels)<input name="width" type="number" min="1" max="16384" value="1920" required/></label><label>Height (pixels)<input name="height" type="number" min="1" max="16384" value="1080" required/></label></div><button class="button">Calculate ratio</button></form><p id="aspect-result" aria-live="polite"></p><small>Pixel ratio only. This does not change your display or simulate stretched rendering.</small></section><div class="workspace-grid">${[
    [
      "/studio",
      "Config builder",
      "Import safe CFG text, inspect commands, and export only intended settings.",
    ],
    [
      "/studio",
      "Crosshair & viewmodel",
      "Live reference preview, named builds and supported controls.",
    ],
    [
      "/performance",
      "Player lookup",
      "Fetch available Leetify ratings with provider attribution.",
    ],
    [
      "/market#wishlist",
      "Price targets",
      "Track exact item variants and current source prices.",
    ],
  ]
    .map(
      ([href, name, desc]) =>
        `<a class="workspace-card tool-card" href="${href}"><h3>${name} ↗</h3><p>${desc}</p></a>`,
    )
    .join("")}</div>`;
  const calc = () => {
    const f = new FormData($("#sensitivity-form"));
    try {
      const r = sensitivity(
        Number(f.get("dpi")),
        Number(f.get("sens")),
        Number(f.get("yaw")),
      );
      $("#sensitivity-result").innerHTML =
        `<div><small>eDPI</small><strong>${number(r.edpi)}</strong></div><div><small>CM / 360°</small><strong>${number(r.cm)}</strong></div><div><small>INCHES / 360°</small><strong>${number(r.inches)}</strong></div><div><small>PAD WIDTH / FULL TURN</small><strong>${number(Number(f.get("pad")) / r.cm)}×</strong></div>`;
    } catch (e) {
      alert(e);
    }
  };
  $("#sensitivity-form").onsubmit = (e) => {
    e.preventDefault();
    calc();
  };
  calc();
  $("#aspect-form").onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target),
      w = Number(f.get("width")),
      h = Number(f.get("height"));
    const gcd = (a, b) => (b ? gcd(b, a % b) : a);
    const g = gcd(w, h);
    $("#aspect-result").textContent =
      `${w / g}:${h / g} · ${number(w / h)}:1 · ${number(w * h)} pixels`;
  };
}
function community() {
  root.innerHTML = `<section class="workspace-hero"><div><span class="eyebrow">COMMUNITY · PLANNED</span><h2>Better together.<br/>Private by default.</h2><p>Public profiles, shared configs and squads are planned. Publishing remains disabled until permission controls, reporting and moderation are ready.</p><a class="primary" href="/studio">Export a Studio profile</a></div><div class="workspace-hero-art"><img src="/cskit-icon.png" alt=""/></div></section><div class="workspace-grid"><article class="workspace-card"><span class="tag">AVAILABLE</span><h3>Share a file on your terms.</h3><p>Export a Studio JSON profile and send it yourself. Importing a profile creates a separate build; it does not replace your existing one.</p><a href="/studio">Open Studio →</a></article><article class="workspace-card"><span class="tag">AWAITING ACTIVATION</span><h3>Steam friends comparison.</h3><p>The verified Steam linking service requires owner setup. Public Leetify player lookup is available today.</p><a href="/performance">Open Performance →</a></article></div>`;
}
function updates() {
  root.innerHTML = `<section class="workspace-card"><span class="eyebrow">CSKIT RELEASE NOTES · OCTOBER 10, 2026</span><h2>The CSKit 2.0 foundation.</h2><ul><li>Shared navigation and searchable tool palette across the site.</li><li>Personal dashboard, practice plans, manual session history and map favorites.</li><li>Experiments with locked Studio snapshots, manual observations and explicit conclusions.</li><li>Sensitivity and aspect-ratio calculators, and the Dust II map explorer.</li><li>Versioned workspace export/import, private account storage and conflict protection.</li><li>Guest tools open directly; signing in is optional.</li></ul><p>The existing Market, Wishlist, Studio and public Performance lookup remain available.</p></section><section class="workspace-card"><span class="tag">OFFICIAL SOURCE</span><h3>Counter-Strike patch notes</h3><p>Read Valve’s original notes. An automated patch digest and profile-impact analysis are not connected yet; CSKit does not invent patch summaries.</p><a href="https://store.steampowered.com/news/app/730" target="_blank" rel="noreferrer">Open official Counter-Strike updates ↗</a></section><section class="workspace-card"><h3>Still on the roadmap</h3><p>Verified lineup content, crosshair share-code support, full Studio revision history, multiple wishlists, dream loadouts, public sharing, squads, detailed match analysis and demo parsing need separate implementation and verification. Steam linking remains awaiting owner activation.</p></section>`;
}
function render() {
  (
    ({ dashboard, improve, experiments, maps, tools, community, updates })[
      page
    ] || dashboard
  )();
}
try {
  const workspace = await loadWorkspace();
  data = workspace.data;
  loaded = true;
  recover.hidden = !account.user || !workspace.offline;
  message(
    workspace.offline
      ? "Offline account copy · export edits if account saving is unavailable"
      : account.user
        ? "Private account workspace"
        : "Guest workspace · saved in this browser",
  );
  render();
  if (["dashboard", "experiments"].includes(page)) {
    try {
      library = await request("/api/studio");
      render();
    } catch (e) {
      alert(e);
    }
  }
  if (page === "dashboard") {
    try {
      market = await request("/api/state");
      render();
    } catch {
      message("Workspace ready · market summary unavailable");
    }
  }
} catch (e) {
  alert(e);
  root.innerHTML =
    '<p class="empty-copy">Your saved workspace could not be opened safely. Reload to retry. Existing data has not been replaced.</p>';
}
if (!loaded)
  for (const id of ["workspace-export", "workspace-import", "workspace-reset"])
    $("#" + id).disabled = true;
document.addEventListener("cskit-account-changed", () => {
  alert(
    "Account changed in another window. Export your current work and reload before continuing.",
  );
});
