import { account, ready, signIn, scoreboardCloud } from "./account.js";
import {
  parsePlayer,
  validateResponse,
  responseError,
  metric,
} from "./performance-core.js";
import { rankFriends, SCORES } from "./friends-core.js";
import { validateBoard, ownership } from "./scoreboard-core.js";
const $ = (s) => document.querySelector(s);
let revision = 0,
  board = null,
  profiles = [],
  own = null,
  linked = null,
  enabled = false,
  busy = false,
  invalid = false,
  retryAt = 0,
  controller;
const status = $("#board-status");
function claim() {
  $("#board-claim").textContent = ownership(own, linked)
    ? "Verified through Steam · This Leetify profile belongs to you."
    : own && linked
      ? "This profile does not match your verified Steam account. Use the matching Leetify profile."
      : "Not verified · Save your profile, then verify ownership through Steam.";
}
document.addEventListener("cskit-steam-status", (event) => {
  linked = event.detail.linked;
  enabled = event.detail.enabled;
  claim();
  draw();
});
document.addEventListener("cskit-account-changed", () => {
  invalid = true;
  controller?.abort();
  profiles = [];
  own = null;
  draw();
  $("#board-form").hidden = true;
  status.textContent = "Account changed. Reload to open your scoreboard.";
});
function draw() {
  const rows = $("#board-rows");
  rows.replaceChildren();
  if (!board) return;
  $("#board-score-label").textContent = SCORES[board.metric];
  const ranked = rankFriends(profiles, board.metric);
  for (const p of ranked) {
    const row = document.createElement("tr");
    const self = p.steamId === own?.steam64_id;
    if (self) row.className = "friend-self";
    for (const value of [
      p.rank,
      p.name +
        (self
          ? ownership(own, linked)
            ? " · YOU ✓"
            : " · Your selected profile (unverified)"
          : ""),
      metric(p.score, board.metric === "leetify" ? 2 : 1),
    ]) {
      const td = document.createElement("td");
      td.textContent = value;
      row.append(td);
    }
    const td = document.createElement("td"),
      a = document.createElement("a");
    a.textContent = "View on Leetify";
    a.href = "https://leetify.com/app/profile/" + p.steamId;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    td.append(a);
    row.append(td);
    rows.append(row);
  }
  $("#board-table").hidden = !ranked.length;
}
function lock(value) {
  busy = value;
  $("#board-form")
    .querySelectorAll("input,textarea,select,button")
    .forEach((el) => (el.disabled = value));
}
async function refresh() {
  if (busy || invalid || !board) return;
  if (Date.now() < retryAt) {
    status.textContent = "Please wait a minute before refreshing again.";
    return;
  }
  lock(true);
  profiles = [];
  own = null;
  draw();
  claim();
  controller = new AbortController();
  let unavailable = 0,
    checked = 0;
  try {
    for (const id of [board.mine, ...board.friends]) {
      status.textContent = `Loading ${checked + 1} of ${board.friends.length + 1} profiles…`;
      const query = parsePlayer(id);
      const response = await fetch(
        "https://api-public.cs-prod.leetify.com/v3/profile?" +
          new URLSearchParams({ [query.key]: query.value }),
        {
          cache: "no-store",
          credentials: "omit",
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(15000),
          ]),
        },
      );
      if (invalid) return;
      if (response.status === 429) {
        retryAt = Date.now() + 60000;
        throw Error(responseError(429));
      }
      if (response.status >= 500 || response.status === 401)
        throw Error(responseError(response.status));
      if (response.ok) {
        try {
          const p = validateResponse(await response.json());
          if (query.key === "steam64_id" && p.steam64_id !== id)
            throw Error("Player mismatch");
          if (checked === 0) own = p;
          if (!profiles.some((x) => x.steam64_id === p.steam64_id))
            profiles.push(p);
        } catch {
          unavailable++;
        }
      } else unavailable++;
      checked++;
      draw();
      claim();
    }
    retryAt = Date.now() + 60000;
    status.textContent = `Updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · ${checked} profiles checked · ${unavailable} private or unavailable. Missing ratings are excluded; ties share rank.`;
  } catch (e) {
    if (!invalid)
      status.textContent = `Partial results: ${checked} profiles checked. ${e.message}`;
  } finally {
    lock(false);
    if (invalid) $("#board-form").hidden = true;
  }
}
$("#board-signin").onclick = async () => {
  try {
    await signIn();
  } catch (e) {
    status.textContent = e.message;
  }
};
$("#board-form").onsubmit = async (event) => {
  event.preventDefault();
  if (busy || invalid) return;
  try {
    const next = validateBoard({
      name: $("#board-name").value,
      mine: $("#board-mine").value,
      friends: $("#board-friends")
        .value.split(/\n/)
        .map((s) => s.trim())
        .filter(Boolean),
      metric: $("#board-metric").value,
    });
    lock(true);
    const saved = await scoreboardCloud({
      revision,
      payload: JSON.stringify(next),
    });
    if (invalid) return;
    revision = saved.revision;
    board = next;
    profiles = [];
    own = null;
    draw();
    claim();
    status.textContent =
      "Scoreboard saved to your account. Refresh ratings to compare your squad.";
  } catch (e) {
    status.textContent = "Not saved. " + e.message;
  } finally {
    lock(false);
  }
};
$("#board-refresh").onclick = refresh;
$("#board-verify").onclick = () => {
  if (!board) {
    status.textContent = "Save your profile before verifying it.";
    return;
  }
  if (!enabled) {
    status.textContent =
      "Steam verification is awaiting server activation. Your scoreboard is saved, but ownership is not verified.";
    return;
  }
  if (linked) {
    refresh();
    return;
  }
  $("#steam-connect").click();
};
async function init() {
  await ready;
  if (!account.user) return;
  $("#board-signin").hidden = true;
  try {
    const saved = await scoreboardCloud();
    revision = saved.revision;
    const value = JSON.parse(saved.payload);
    if (value.mine) board = validateBoard(value);
    $("#board-name").value = value.name;
    $("#board-mine").value = value.mine;
    $("#board-friends").value = value.friends.join("\n");
    $("#board-metric").value = value.metric;
    $("#board-form").hidden = false;
    status.textContent = board
      ? "Saved scoreboard loaded. Refresh ratings for current results."
      : "Add your profile and friends, then save your scoreboard.";
    if (board) await refresh();
  } catch (e) {
    status.textContent = "Could not load your saved scoreboard. " + e.message;
  }
}
init();
