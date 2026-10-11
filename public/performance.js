import { ensureWorkspace } from "./account.js";
import {
  parsePlayer,
  metric,
  validateResponse,
  responseError,
} from "./performance-core.js";
const $ = (selector) => document.querySelector(selector);
const results = $("#performance-results"),
  empty = $("#performance-empty"),
  status = $("#lookup-status"),
  button = $("#lookup-button");
let busy = false,
  retryAt = 0;
function element(tag, text, className) {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (className) el.className = className;
  return el;
}
function card(label, value, note) {
  const box = element("article", undefined, "performance-metric");
  box.append(element("span", label), element("strong", value));
  if (note) box.append(element("small", note));
  return box;
}
function show(data) {
  $("#player-name").textContent = data.name;
  $("#player-id").textContent = `Steam ${data.steam64_id}`;
  $("#player-source").href =
    `https://leetify.com/app/profile/${data.steam64_id}`;
  const ranks = data.ranks || {},
    ratings = data.rating || {};
  $("#performance-metrics").replaceChildren(
    card(
      "Leetify Rating",
      metric(ranks.leetify, 2),
      "Your reported overall rating",
    ),
    card("Premier", metric(ranks.premier, 0), "CS Rating"),
    card("FACEIT", metric(ranks.faceit, 0), "Level"),
    card("FACEIT Elo", metric(ranks.faceit_elo, 0), "Reported Elo"),
  );
  $("#skill-grid").replaceChildren(
    ...["aim", "positioning", "utility"].map((key) => {
      const box = card(
        key[0].toUpperCase() + key.slice(1),
        metric(ratings[key], 1),
        "Leetify skill rating · 0–100",
      );
      const track = element("div", undefined, "skill-track"),
        fill = element("span");
      const value = ratings[key];
      fill.style.width = `${typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0}%`;
      track.setAttribute("aria-hidden", "true");
      track.append(fill);
      box.append(track);
      const practice = element("a", "Choose a practice drill →");
      practice.href =
        "/improve?focus=" +
        (key === "aim"
          ? "Aim"
          : key === "positioning"
            ? "Positioning"
            : "Utility");
      practice.style.cssText =
        "display:block;margin-top:16px;font-size:12px;color:#c1ee8c";
      box.append(practice);
      return box;
    }),
  );
  const matches = Array.isArray(data.recent_matches)
    ? data.recent_matches.filter((m) => m && typeof m === "object").slice(0, 10)
    : [];
  $("#match-count").textContent = matches.length
    ? `Latest ${matches.length} available`
    : "No recent matches";
  const list = $("#recent-matches");
  list.replaceChildren();
  for (const match of matches) {
    const row = element("article", undefined, "match-row");
    const outcome = ["win", "loss", "tie"].includes(match.outcome)
      ? match.outcome
      : "unknown";
    const date = new Date(match.finished_at);
    row.append(
      element(
        "span",
        outcome === "unknown" ? "—" : outcome.toUpperCase(),
        `match-outcome ${outcome}`,
      ),
    );
    const info = element("div");
    info.append(
      element(
        "strong",
        typeof match.map_name === "string"
          ? match.map_name.replace(/^de_/, "")
          : "Unknown map",
      ),
      element(
        "small",
        Number.isFinite(date.getTime())
          ? date.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "Date unavailable",
      ),
    );
    row.append(info);
    row.append(
      element(
        "strong",
        Array.isArray(match.score) && match.score.length === 2
          ? match.score.map((v) => metric(v, 0)).join(" : ")
          : "—",
        "match-score",
      ),
    );
    if (typeof match.id === "string" && /^[0-9a-f-]{36}$/i.test(match.id)) {
      const link = element("a", "View on Leetify ↗");
      link.href = `https://leetify.com/app/match-details/${match.id}/overview`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      row.append(link);
    }
    list.append(row);
  }
  if (!matches.length)
    list.append(
      element(
        "p",
        "Leetify has no recent match results available for this player.",
        "no-matches",
      ),
    );
  empty.hidden = true;
  results.hidden = false;
}
$("#player-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (busy) return;
  let player;
  try {
    player = parsePlayer($("#player-input").value);
  } catch (e) {
    status.textContent = e.message;
    status.dataset.state = "error";
    return;
  }
  if (Date.now() < retryAt) {
    status.textContent = `Please wait ${Math.ceil((retryAt - Date.now()) / 1000)} seconds before another lookup.`;
    return;
  }
  busy = true;
  button.disabled = true;
  $("#player-input").disabled = true;
  try {
    if (!(await ensureWorkspace())) {
      status.textContent =
        "Lookup cancelled. Choose an account or local guest to continue.";
      return;
    }
    results.hidden = true;
    empty.hidden = true;
    results.setAttribute("aria-busy", "true");
    status.dataset.state = "loading";
    status.textContent = "Checking this player on Leetify…";
    const response = await fetch(
      `https://api-public.cs-prod.leetify.com/v3/profile?${new URLSearchParams({ [player.key]: player.value })}`,
      {
        cache: "no-store",
        credentials: "omit",
        signal: AbortSignal.timeout(15000),
      },
    );
    retryAt = Date.now() + (response.status === 429 ? 60000 : 5000);
    if (!response.ok) throw Error(responseError(response.status));
    show(validateResponse(await response.json()));
    status.dataset.state = "success";
    status.textContent = `Checked just now · ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · Results are not saved`;
  } catch (e) {
    results.hidden = true;
    empty.hidden = false;
    status.dataset.state = "error";
    status.textContent =
      e.name === "TimeoutError"
        ? "Leetify took too long to respond. Please try again."
        : e instanceof TypeError
          ? "Could not reach Leetify. Check your connection and try again."
          : e.message;
  } finally {
    busy = false;
    button.disabled = false;
    $("#player-input").disabled = false;
    results.removeAttribute("aria-busy");
  }
});

$("#player-input").addEventListener("input", () => {
  results.hidden = true;
  empty.hidden = false;
  status.textContent = "Ready to check this player.";
  delete status.dataset.state;
});
