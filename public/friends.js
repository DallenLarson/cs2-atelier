import { account, ready, signIn, googleToken } from "./account.js";
import { rankFriends, SCORES, friendQueue } from "./friends-core.js";
import { validateResponse, metric, responseError } from "./performance-core.js";
const $ = (s) => document.querySelector(s);
let enabled = false,
  linked = null,
  friendsEnabled = false,
  queue = [],
  profiles = [],
  checked = 0,
  missing = 0,
  loading = false,
  pausedUntil = 0,
  controller = null,
  epoch = 0;
const status = $("#friends-status"),
  rows = $("#friends-rows");
function text(tag, value, cls) {
  const el = document.createElement(tag);
  el.textContent = value;
  if (cls) el.className = cls;
  return el;
}
async function api(path, body) {
  const token = await googleToken();
  const response = await fetch("/api/steam/" + path, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      Authorization: "Bearer " + token,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  let value;
  try {
    value = await response.json();
  } catch {
    throw Error("Steam service is not available yet.");
  }
  if (!response.ok) throw Error(value.error || "Steam request failed.");
  return value;
}
function draw() {
  const selected = $("#friends-metric").value,
    ranked = rankFriends(profiles, selected),
    mine = ranked.find((p) => p.steamId === linked?.steamId);
  rows.replaceChildren();
  for (const player of ranked) {
    const row = document.createElement("tr");
    if (player.steamId === linked?.steamId) row.className = "friend-self";
    const name = text("td", player.name);
    if (player.steamId === linked?.steamId)
      name.append(text("span", "YOU", "you-badge"));
    const source = document.createElement("a");
    source.href = `https://leetify.com/app/profile/${player.steamId}`;
    source.target = "_blank";
    source.rel = "noopener noreferrer";
    source.textContent = "View on Leetify ↗";
    const cell = document.createElement("td");
    cell.append(source);
    row.append(
      text("td", String(player.rank)),
      name,
      text("td", metric(player.score, selected === "leetify" ? 2 : 1)),
      cell,
    );
    rows.append(row);
  }
  $("#friends-score-heading").textContent = SCORES[selected];
  $("#friends-position").textContent = mine
    ? `You are #${mine.rank} of ${ranked.length} rated players${checked < queue.length ? " checked so far" : ""}.`
    : checked
      ? "Your rating is unavailable for this metric."
      : "Your position will appear here.";
  $("#friends-progress").textContent = queue.length
    ? `${checked} of ${queue.length} profiles checked · ${missing} private or unavailable${checked < queue.length ? " · Partial comparison" : ""}`
    : "Only your verified Steam friends are included.";
  $("#friends-more").hidden = checked >= queue.length || !queue.length;
  $("#friends-table-wrap").hidden = !ranked.length;
}
function renderLink() {
  $("#steam-google").hidden = !!account.user;
  $("#steam-connect").hidden = !account.user || !!linked;
  $("#steam-connect").disabled = !enabled;
  $("#steam-unlink").hidden = !linked;
  $("#my-performance").hidden = !linked;
  $("#friends-refresh").disabled = !linked || !friendsEnabled || loading;
  $("#steam-link-copy").textContent = linked
    ? `Steam ${linked.steamId} is verified and connected to your Google account.`
    : account.user
      ? "Verify your Steam profile to load your own stats and compare with friends."
      : "Sign in with Google, then verify your Steam profile. Your friends comparison stays private to you.";
  $("#steam-service-note").hidden = enabled;
  $("#friends-empty").hidden = !!linked;
  if (linked && !friendsEnabled)
    status.textContent =
      "Steam is linked. Friends access is not available yet.";
}
async function loadMore() {
  if (loading || !linked || checked >= queue.length) return;
  if (Date.now() < pausedUntil) {
    status.textContent =
      "Leetify is limiting requests. Wait a minute, then continue.";
    return;
  }
  const generation = epoch;
  loading = true;
  controller = new AbortController();
  $("#friends-more").disabled = true;
  renderLink();
  let paused = false,
    end = Math.min(checked + 20, queue.length);
  try {
    while (checked < end) {
      status.textContent = `Checking profile ${checked + 1} of ${queue.length}…`;
      const response = await fetch(
        `https://api-public.cs-prod.leetify.com/v3/profile?steam64_id=${queue[checked]}`,
        {
          cache: "no-store",
          credentials: "omit",
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(15000),
          ]),
        },
      );
      if (generation !== epoch) break;
      if (response.status === 429) {
        pausedUntil = Date.now() + 60000;
        paused = true;
        status.textContent =
          "Leetify is limiting requests. Wait a minute, then continue from here.";
        break;
      }
      if (response.status >= 500 || response.status === 401) {
        paused = true;
        status.textContent =
          responseError(response.status) +
          " Continue later to retry this profile.";
        break;
      }
      if (response.ok) {
        try {
          const value = validateResponse(await response.json());
          if (value.steam64_id !== queue[checked])
            throw Error("Different player");
          if (generation !== epoch) break;
          profiles.push(value);
        } catch {
          missing++;
        }
      } else missing++;
      checked++;
      draw();
    }
    if (!paused)
      status.textContent =
        checked === queue.length
          ? "Comparison complete for available profiles. Ratings are fetched live, not saved."
          : "Partial comparison loaded. Continue to include more friends.";
  } catch (e) {
    status.textContent =
      e.name === "AbortError"
        ? "Comparison stopped."
        : "Connection interrupted. Continue to retry the remaining friends.";
  } finally {
    loading = false;
    $("#friends-more").disabled = false;
    renderLink();
    draw();
  }
}
$("#friends-more").onclick = loadMore;
$("#friends-metric").onchange = draw;
$("#friends-refresh").onclick = async () => {
  if (loading) return;
  $("#friends-refresh").disabled = true;
  status.textContent = "Reading your Steam friends list…";
  try {
    const data = await api("friends", {});
    queue = friendQueue(data.steamId, data.friends);
    profiles = [];
    checked = 0;
    missing = 0;
    pausedUntil = 0;
    draw();
    await loadMore();
  } catch (e) {
    status.textContent = e.message;
  } finally {
    renderLink();
  }
};
$("#steam-google").onclick = async () => {
  try {
    await signIn();
  } catch {
    status.textContent = "Google sign-in did not finish. Please try again.";
  }
};
$("#steam-connect").onclick = async () => {
  $("#steam-connect").disabled = true;
  try {
    const data = await api("start", {});
    const url = new URL(data.url);
    if (
      url.origin !== "https://steamcommunity.com" ||
      url.pathname !== "/openid/login"
    )
      throw Error("Invalid Steam sign-in destination.");
    location.assign(url.href);
  } catch (e) {
    status.textContent = e.message;
    renderLink();
  }
};
$("#steam-unlink").onclick = () => $("#steam-unlink-dialog").showModal();
$("#steam-unlink-cancel").onclick = () => $("#steam-unlink-dialog").close();
$("#steam-unlink-confirm").onclick = async () => {
  $("#steam-unlink-confirm").disabled = true;
  try {
    epoch++;
    controller?.abort();
    await api("unlink", {});
    linked = null;
    queue = [];
    profiles = [];
    checked = 0;
    missing = 0;
    draw();
    renderLink();
    $("#steam-unlink-dialog").close();
    status.textContent =
      "Steam disconnected. Your Google account is unchanged.";
  } catch (e) {
    $("#steam-unlink-error").textContent = e.message;
  } finally {
    $("#steam-unlink-confirm").disabled = false;
  }
};
function myPerformance() {
  if (!linked) return;
  $("#player-input").value = linked.steamId;
  $("#player-form").requestSubmit();
}
$("#my-performance").onclick = myPerformance;
document.addEventListener("cskit-account-changed", () => {
  epoch++;
  controller?.abort();
  linked = null;
  queue = [];
  profiles = [];
  checked = 0;
  draw();
  $("#friends-refresh").disabled = true;
  status.textContent = "Your Google account changed. Reload before continuing.";
});
async function init() {
  await ready;
  try {
    const config = await fetch("/steam-service.json", {
      cache: "no-store",
    }).then((r) => r.json());
    enabled = config.enabled === true;
    if (enabled && account.user) {
      const params = new URLSearchParams(location.search);
      if (params.get("steam") === "ready") {
        const state = params.get("state");
        history.replaceState(null, "", location.pathname);
        await api("finish", { state });
        status.textContent = "Steam profile verified and connected.";
      } else if (params.get("steam") === "failed") {
        history.replaceState(null, "", location.pathname);
        status.textContent =
          "Steam verification did not finish. Please connect again.";
      }
      const data = await api("status");
      linked = data.link;
      friendsEnabled = data.friendsEnabled;
    }
  } catch (e) {
    status.textContent = e.message;
  }
  renderLink();
  if (linked) myPerformance();
}
init();
