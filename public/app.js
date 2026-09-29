const $ = (s) => document.querySelector(s),
  money = (n) =>
    n == null
      ? "—"
      : new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(n),
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
let state = { wishlist: [] },
  view = "all",
  category = "all",
  limit = 60,
  items = [],
  allWishlist = [],
  sequence = 0,
  selected = null,
  lastUpdated = -1,
  toastTimer;
async function api(url, body) {
  const r = await fetch(
    url,
    body === undefined
      ? {}
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  const data = await r.json();
  if (!r.ok) throw Error(data.error || "Unable to connect");
  return data;
}
function toast(text) {
  $("#toast").textContent = text;
  $("#toast").classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("visible"), 3500);
}
const wished = (name) => state.wishlist.find((w) => w.name === name);
function names(name) {
  return {
    title: name.replace(
      / \((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)$/,
      "",
    ),
    wear:
      name.match(
        /\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)$/,
      )?.[1] || "Collectible",
  };
}
function tile(name) {
  return /★/.test(name)
    ? ["★", "gold"]
    : /Case|Capsule|Package/.test(name)
      ? ["CS2", "gold"]
      : /Sticker/.test(name)
        ? ["ST", "pink"]
        : [name.replace("StatTrak™ ", "").split(" |")[0].slice(0, 6), ""];
}
async function sync() {
  try {
    state = await api("/api/state");
    $("#status").textContent = state.error
      ? "Offline · saved prices"
      : state.busy
        ? "Updating prices"
        : state.updated
          ? "Connected to Skinport"
          : "Connecting";
    $("#status-dot").className = state.error
      ? "offline"
      : state.updated
        ? "live"
        : "";
    $("#notice").hidden = !state.error;
    $("#notice").textContent = state.error
      ? `${state.error} Your wishlist is safe. Last saved prices remain available.`
      : "";
    $("#updated").textContent = state.updated
      ? "Last updated " +
        new Date(state.updated).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Waiting for first update";
    $("#wish-count").textContent = state.wishlist.length;
    $("#saved").innerHTML = state.wishlist.length + "<span>items</span>";
    const data = await api("/api/items?category=wishlist&limit=10000");
    allWishlist = data.items;
    const priced = allWishlist.filter((i) => i.min_price != null);
    $("#total").textContent = money(
      priced.reduce((sum, i) => sum + i.min_price, 0),
    );
    $("#total-caption").textContent =
      priced.length < state.wishlist.length
        ? `${priced.length} of ${state.wishlist.length} items have listings`
        : "Current lowest listings";
    const at = priced.filter(
      (i) =>
        wished(i.market_hash_name)?.target != null &&
        i.min_price <= wished(i.market_hash_name).target,
    ).length;
    $("#targets").innerHTML = at + "<span>items</span>";
    $("#target-caption").textContent = at
      ? "Your target price is available"
      : "Good things come to those who watch";
    if (state.updated !== lastUpdated) {
      lastUpdated = state.updated;
      await render();
    } else if (view === "wishlist") await render();
  } catch (e) {
    $("#status").textContent = "Local app disconnected";
    $("#status-dot").className = "offline";
    $("#notice").hidden = false;
    $("#notice").textContent =
      "The local app is not responding. Relaunch Atelier to resume updates.";
  }
}
async function render() {
  const seq = ++sequence;
  try {
    const result = await api(
      "/api/items?" +
        new URLSearchParams({
          q: $("#search").value,
          category: view === "wishlist" ? "wishlist" : category,
          sort: $("#sort").value,
          limit,
        }),
    );
    if (seq !== sequence) return;
    items = result.items;
    $("#results-count").textContent =
      `${result.total.toLocaleString()} items · USD`;
    $("#items").innerHTML = items
      .map((i, n) => {
        const name = names(i.market_hash_name),
          w = wished(i.market_hash_name),
          [symbol, tone] = tile(i.market_hash_name),
          met =
            w?.target != null && i.min_price != null && i.min_price <= w.target;
        return `<tr style="--rarity:${i.rarity || "#91a3bd"}"><td><button class="item" data-detail="${n}"><span class="item-tile ${tone}" aria-hidden="true">${i.image ? `<img class="item-art" src="${esc(i.image)}" alt="" loading="lazy" decoding="async" width="384" height="288"><span class="art-fallback" hidden>${esc(symbol)}</span>` : esc(symbol)}</span><span><span class="item-name">${esc(name.title)}</span><span class="item-meta">${esc(name.wear)}${i.market_hash_name.startsWith("StatTrak") ? " · StatTrak™" : ""}</span></span></button></td><td class="price"><span class="card-label">LOWEST LISTING</span>${money(i.min_price)}</td><td>${i.quantity.toLocaleString()} listings</td><td><button class="target ${met ? "met" : ""}" data-detail="${n}">${w?.target ? money(w.target) + (met ? " ✓" : "") : "Set target"}</button></td><td><button class="heart ${w ? "saved" : ""}" data-save="${n}" aria-label="${w ? "Remove from" : "Add to"} wishlist: ${esc(i.market_hash_name)}" aria-pressed="${!!w}">${w ? "♥" : "♡"}</button></td></tr>`;
      })
      .join("");
    $("#empty").hidden = !!items.length;
    $("#empty").innerHTML =
      view === "wishlist" && !state.wishlist.length
        ? "<strong>Your next favorites live here.</strong>Tap a heart in the market to start your wishlist."
        : state.count === 0
          ? "<strong>Bringing the market into focus.</strong>Prices will appear when the first update finishes."
          : "<strong>No matching items.</strong>Try another name or a different filter.";
    $("#more").hidden = items.length >= result.total;
  } catch (e) {
    toast(e.message);
  }
}
async function save(name, remove = false, target) {
  try {
    const previous = wished(name);
    await api("/api/wishlist", {
      name,
      remove,
      target: target === undefined ? (previous?.target ?? null) : target,
    });
    await sync();
    await render();
    toast(remove ? "Removed from your wishlist" : "Saved on this computer");
  } catch (e) {
    toast(e.message);
    throw e;
  }
}
async function detail(item) {
  selected = item;
  const w = wished(item.market_hash_name);
  $("#detail-body").innerHTML =
    `${item.image ? `<div class="detail-stage" style="--rarity:${item.rarity}"><div class="stage-orbit"></div><img class="detail-art" src="${esc(item.image)}&amp;size=large" width="1024" height="768" alt="${esc(names(item.market_hash_name).title)}"><span class="stage-caption">${esc(names(item.market_hash_name).wear)}</span></div>` : ""}<div class="detail-kicker">${esc(names(item.market_hash_name).wear)} · Skinport</div><h2 class="detail-title">${esc(names(item.market_hash_name).title)}</h2><div class="detail-price">${money(item.min_price)}</div><div class="detail-muted">Lowest tradable listing · ${item.quantity.toLocaleString()} available</div><div id="history" class="detail-muted">Loading your local price history…</div><form class="target-form" id="target-form"><label for="target-input">Your target price (USD)</label><input id="target-input" type="number" min="0.01" step="0.01" placeholder="No target" value="${w?.target ?? ""}"><button class="primary" type="submit">Save to wishlist</button></form><p class="detail-muted">An empty target keeps the item on your wishlist without a price target.</p><div class="detail-actions"><a id="market-link" target="_blank" rel="noreferrer">View on Skinport</a>${w ? '<button id="remove-item" class="text-button">Remove from wishlist</button>' : ""}</div>`;
  const link = new URL(item.item_page);
  if (link.protocol === "https:" && link.hostname === "skinport.com")
    $("#market-link").href = link.href;
  if (!$("#detail").open) $("#detail").showModal();
  $("#target-form").onsubmit = async (e) => {
    e.preventDefault();
    const raw = $("#target-input").value,
      button = e.submitter;
    button.disabled = true;
    try {
      await save(item.market_hash_name, false, raw ? Number(raw) : null);
      $("#detail").close();
    } catch {
    } finally {
      button.disabled = false;
    }
  };
  if ($("#remove-item"))
    $("#remove-item").onclick = async () => {
      try {
        await save(item.market_hash_name, true);
        $("#detail").close();
      } catch {}
    };
  try {
    const data = await api(
      "/api/detail?name=" + encodeURIComponent(item.market_hash_name),
    );
    if (selected !== item) return;
    const h = data.history;
    if (h.length < 2) {
      $("#history").innerHTML =
        '<p class="detail-muted">Your price history starts when you save this item. A chart appears after two automatic updates.</p>';
      return;
    }
    const min = Math.min(...h.map((p) => p.price)),
      max = Math.max(...h.map((p) => p.price)),
      points = h
        .map(
          (p, i) =>
            `${10 + (i / (h.length - 1)) * 440},${90 - ((p.price - min) / (max - min || 1)) * 70}`,
        )
        .join(" ");
    $("#history").innerHTML =
      `<svg class="chart" viewBox="0 0 460 110" role="img" aria-label="Locally observed price history, from ${money(h[0].price)} to ${money(h.at(-1).price)}"><polyline points="${points}"/></svg><div class="detail-muted">${h.length.toLocaleString()} local observations · ${new Date(h[0].time).toLocaleDateString()} to ${new Date(h.at(-1).time).toLocaleDateString()}<br>Observed range ${money(min)} – ${money(max)}</div>`;
  } catch (e) {
    $("#history").textContent = "Price history is temporarily unavailable.";
  }
}
$("#items").onclick = async (e) => {
  const button = e.target.closest("button");
  if (!button) return;
  if (button.dataset.detail !== undefined)
    detail(items[Number(button.dataset.detail)]);
  if (button.dataset.save !== undefined) {
    button.disabled = true;
    const i = items[Number(button.dataset.save)];
    try {
      await save(i.market_hash_name, !!wished(i.market_hash_name));
    } catch {
    } finally {
      button.disabled = false;
    }
  }
};
document.querySelectorAll("[data-view]").forEach(
  (b) =>
    (b.onclick = () => {
      view = b.dataset.view;
      limit = 60;
      document
        .querySelectorAll("[data-view]")
        .forEach((n) => n.classList.toggle("active", n === b));
      $("#crumb").textContent = view === "all" ? "Market" : "Wishlist";
      $("#title").textContent =
        view === "all" ? "A market. In focus." : "Your next favorites.";
      $("#subtitle").textContent =
        view === "all"
          ? "Find your next favorite. Keep an eye on the price."
          : "A little patience. The right price. All in one place.";
      $("#table-title").textContent =
        view === "all" ? "Explore the market" : "Your wishlist";
      $("#filters").hidden = view === "wishlist";
      render();
    }),
);
document.querySelectorAll("[data-category]").forEach(
  (b) =>
    (b.onclick = () => {
      category = b.dataset.category;
      limit = 60;
      document
        .querySelectorAll("[data-category]")
        .forEach((n) => n.classList.toggle("selected", n === b));
      render();
    }),
);
let debounce;
$("#search").oninput = () => {
  clearTimeout(debounce);
  debounce = setTimeout(() => {
    limit = 60;
    render();
  }, 180);
};
$("#sort").onchange = () => render();
$("#more").onclick = () => {
  limit += 100;
  render();
};
$("#close-detail").onclick = () => $("#detail").close();
$("#detail").onclick = (e) => {
  if (e.target === $("#detail")) {
    const r = e.target.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      e.target.close();
  }
};
$("#backup").onclick = () => {
  location.href = "/api/export";
};
$("#refresh").onclick = async () => {
  try {
    const data = await api("/api/refresh", {});
    toast(
      data.busy
        ? "Updating market prices…"
        : "Prices refresh every five minutes. Next update " +
            new Date(data.nextRefresh).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
    );
    await sync();
  } catch (e) {
    toast(e.message);
  }
};
document.addEventListener("keydown", (e) => {
  if (
    e.key === "/" &&
    !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName) &&
    !$("#detail").open
  ) {
    e.preventDefault();
    $("#search").focus();
  }
});
sync();
setInterval(sync, 15000);
$("#detail").onclick = null;

// Keep unavailable artwork unobtrusive; the market remains usable offline.
document.addEventListener(
  "error",
  (e) => {
    if (e.target.matches?.(".item-art")) {
      e.target.hidden = true;
      const fallback = e.target.nextElementSibling;
      if (fallback) fallback.hidden = false;
    }
    if (e.target.matches?.(".detail-art")) {
      e.target.parentElement.classList.add("unavailable");
      e.target.alt = "Artwork unavailable offline";
    }
  },
  true,
);
const motion = matchMedia("(prefers-reduced-motion: reduce)");
let motionFrame = 0;
document.addEventListener("pointermove", (e) => {
  if (motion.matches || e.pointerType === "touch") return;
  const stage = e.target.closest(".item-tile,.detail-stage");
  if (!stage) return;
  cancelAnimationFrame(motionFrame);
  motionFrame = requestAnimationFrame(() => {
    const r = stage.getBoundingClientRect();
    stage.style.setProperty(
      "--rx",
      ((e.clientY - r.top) / r.height - 0.5) * -10 + "deg",
    );
    stage.style.setProperty(
      "--ry",
      ((e.clientX - r.left) / r.width - 0.5) * 14 + "deg",
    );
  });
});
document.addEventListener("pointerout", (e) => {
  const stage = e.target.closest(".item-tile,.detail-stage");
  if (stage && !stage.contains(e.relatedTarget)) {
    cancelAnimationFrame(motionFrame);
    stage.style.setProperty("--rx", "0deg");
    stage.style.setProperty("--ry", "0deg");
  }
});
