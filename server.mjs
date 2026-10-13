import http from "node:http";
import {
  readFileSync,
  writeFileSync,
  renameSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { artworkFor, serveArtwork, updateArtwork } from "./artwork.mjs";
import { validateProfile } from "./public/studio-core.js";
const root = path.dirname(fileURLToPath(import.meta.url)),
  data = path.join(root, "data");
mkdirSync(data, { recursive: true });
const load = (name, fallback) => {
  try {
    return JSON.parse(readFileSync(path.join(data, name), "utf8"));
  } catch (e) {
    if (e.code === "ENOENT") return fallback;
    throw e;
  }
};
const save = (name, value) => {
  const p = path.join(data, name);
  writeFileSync(p + ".tmp", JSON.stringify(value));
  renameSync(p + ".tmp", p);
};
let state = load("wishlist.json", { wishlist: [] }),
  cache = load("market.json", { items: [], updated: 0 }),
  history = load("history.json", {});
let studio = load("studio.json", { revision: 0, profiles: [], activeId: null });
let busy = false,
  error = "",
  lastAttempt = 0,
  nextRefresh = Date.now();
const interval = 300000;
async function refresh() {
  if (busy || Date.now() - lastAttempt < interval) return;
  busy = true;
  lastAttempt = Date.now();
  nextRefresh = lastAttempt + interval;
  try {
    const r = await fetch(
      "https://api.skinport.com/v1/items?app_id=730&currency=USD",
      {
        headers: { "Accept-Encoding": "br" },
        signal: AbortSignal.timeout(30000),
      },
    );
    if (!r.ok)
      throw Error(
        `Market service returned ${r.status}. Retrying automatically.`,
      );
    const items = await r.json();
    if (!Array.isArray(items) || !items.length)
      throw Error("Market returned no data.");
    const updated = Date.now();
    const nextHistory = { ...history };
    for (const w of state.wishlist) {
      const item = items.find((i) => i.market_hash_name === w.name);
      if (item?.min_price != null)
        nextHistory[w.name] = [
          ...(history[w.name] || []),
          { time: updated, price: item.min_price },
        ]
          .filter((p) => p.time > updated - 90 * 86400000)
          .slice(-26000);
    }
    save("market.json", { items, updated });
    save("history.json", nextHistory);
    cache = { items, updated };
    history = nextHistory;
    error = "";
  } catch (e) {
    error = e.message;
  } finally {
    busy = false;
  }
}
const port = Number(process.env.PORT || 43127);
const send = (res, status, obj) => {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(obj));
};
const server = http.createServer(async (req, res) => {
  try {
    if (
      req.headers.host !== `127.0.0.1:${port}` &&
      req.headers.host !== `localhost:${port}`
    )
      return send(res, 403, { error: "Invalid host" });
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    if (req.method === "GET" && url.pathname === "/api/firebase-config") {
      const config = load("firebase-config.json", null);
      if (!config) return send(res, 200, { enabled: false });
      const firebaseConfig = Object.fromEntries(
        [
          "apiKey",
          "authDomain",
          "projectId",
          "appId",
          "messagingSenderId",
          "storageBucket",
        ]
          .filter((key) => typeof config[key] === "string")
          .map((key) => [key, config[key]]),
      );
      if (
        !firebaseConfig.apiKey ||
        !firebaseConfig.projectId ||
        !firebaseConfig.appId ||
        !firebaseConfig.authDomain
      )
        return send(res, 500, {
          error: "Firebase web configuration is incomplete.",
        });
      return send(res, 200, { enabled: true, firebaseConfig });
    }
    if (req.method === "GET" && url.pathname === "/api/studio")
      return send(res, 200, studio);
    if (req.method === "GET" && url.pathname === "/api/artwork")
      return await serveArtwork(url, res);
    if (req.method === "GET" && url.pathname === "/api/state")
      return send(res, 200, {
        ...state,
        updated: cache.updated,
        nextRefresh,
        busy,
        error,
        count: cache.items.length,
      });
    if (req.method === "GET" && url.pathname === "/api/items") {
      const q = (url.searchParams.get("q") || "").toLowerCase(),
        category = url.searchParams.get("category") || "all";
      let items = cache.items.filter((i) =>
        i.market_hash_name.toLowerCase().includes(q),
      );
      if (category === "wishlist")
        items = state.wishlist
          .map(
            (w) =>
              cache.items.find((i) => i.market_hash_name === w.name) || {
                market_hash_name: w.name,
                min_price: null,
                quantity: 0,
                item_page: "https://skinport.com/market",
              },
          )
          .filter((i) => i.market_hash_name.toLowerCase().includes(q));
      if (category === "knives")
        items = items.filter(
          (i) =>
            /★/.test(i.market_hash_name) &&
            !/Gloves|Wraps/.test(i.market_hash_name),
        );
      if (category === "rifles")
        items = items.filter((i) =>
          /^(StatTrak™ )?(AK-47|M4A|AWP|AUG|FAMAS|Galil|SG 553|SSG)/.test(
            i.market_hash_name,
          ),
        );
      if (category === "containers")
        items = items.filter((i) =>
          /Case|Capsule|Package/.test(i.market_hash_name),
        );
      const sort = url.searchParams.get("sort");
      items.sort(
        sort === "low"
          ? (a, b) => (a.min_price ?? Infinity) - (b.min_price ?? Infinity)
          : sort === "high"
            ? (a, b) => (b.min_price ?? -1) - (a.min_price ?? -1)
            : (a, b) => b.quantity - a.quantity,
      );
      return send(res, 200, {
        total: items.length,
        items: items
          .slice(0, Number(url.searchParams.get("limit")) || 100)
          .map((i) => ({ ...i, ...artworkFor(i.market_hash_name) })),
      });
    }
    if (req.method === "GET" && url.pathname === "/api/detail") {
      const name = url.searchParams.get("name");
      return send(res, 200, {
        item: cache.items.find((i) => i.market_hash_name === name) || null,
        history: history[name] || [],
      });
    }
    if (req.method === "GET" && url.pathname === "/api/export") {
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="cs2-cskit-backup.json"',
      );
      return send(res, 200, {
        ...state,
        history,
        studio,
        exportedAt: new Date().toISOString(),
      });
    }
    if (req.method === "POST") {
      if (
        req.headers.origin !== `http://127.0.0.1:${port}` &&
        req.headers.origin !== `http://localhost:${port}`
      )
        return send(res, 403, { error: "Invalid origin" });
      let body = "";
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 1000000)
          return send(res, 413, { error: "Request too large" });
      }
      const input = JSON.parse(body || "{}");
      if (url.pathname === "/api/quotes") {
        if (
          !Array.isArray(input.names) ||
          input.names.length > 500 ||
          input.names.some((n) => typeof n !== "string" || n.length > 300)
        )
          return send(res, 400, { error: "Invalid item list." });
        return send(res, 200, {
          items: input.names.map((name) => ({
            ...(cache.items.find((i) => i.market_hash_name === name) || {
              market_hash_name: name,
              min_price: null,
              quantity: 0,
              item_page: "https://skinport.com/market",
            }),
            ...artworkFor(name),
          })),
        });
      }
      if (url.pathname === "/api/studio") {
        if (input.revision !== studio.revision)
          return send(res, 409, {
            error:
              "Another window saved a newer version. Export your profile JSON, then reload before saving again.",
          });
        if (!Array.isArray(input.profiles) || input.profiles.length > 50)
          return send(res, 400, {
            error: "A library can hold up to 50 profiles.",
          });
        const errors = input.profiles.flatMap(validateProfile);
        if (
          new Set(input.profiles.map((p) => p.id)).size !==
          input.profiles.length
        )
          errors.push("Duplicate profile IDs.");
        if (
          input.activeId !== null &&
          !input.profiles.some((p) => p.id === input.activeId)
        )
          errors.push("Invalid active profile.");
        if (errors.length) return send(res, 400, { error: errors.join(" ") });
        const next = {
          revision: studio.revision + 1,
          profiles: input.profiles,
          activeId: input.activeId,
        };
        save("studio.json", next);
        studio = next;
        return send(res, 200, { revision: studio.revision });
      }
      if (url.pathname === "/api/wishlist") {
        if (typeof input.name !== "string" || input.name.length > 300)
          return send(res, 400, { error: "Invalid item" });
        let wishlist = state.wishlist.filter((w) => w.name !== input.name);
        if (!input.remove) {
          if (
            !cache.items.some((i) => i.market_hash_name === input.name) &&
            !state.wishlist.some((w) => w.name === input.name)
          )
            return send(res, 400, { error: "Unknown item" });
          if (
            input.target != null &&
            (!Number.isFinite(input.target) || input.target <= 0)
          )
            return send(res, 400, { error: "Enter a positive target price" });
          wishlist.push({
            name: input.name,
            target: input.target ?? null,
            added:
              state.wishlist.find((w) => w.name === input.name)?.added ||
              Date.now(),
          });
        }
        save("wishlist.json", { wishlist });
        state = { wishlist };
        return send(res, 200, state);
      }
      if (url.pathname === "/api/refresh") {
        void refresh();
        return send(res, 200, { busy, nextRefresh });
      }
    }
    const files = {
      "/steam-service.json": "steam-service.json",
      "/friends.js": "friends.js",
      "/scoreboard.js": "scoreboard.js",
      "/scoreboard-core.js": "scoreboard-core.js",
      "/friends-core.js": "friends-core.js",
      "/steam-signin.png": "steam-signin.png",
      "/performance": "performance.html",
      "/performance.js": "performance.js",
      "/performance-core.js": "performance-core.js",
      "/performance.css": "performance.css",
      "/leetify-attribution.png": "leetify-attribution.png",
      "/site.webmanifest": "site.webmanifest",
      "/apple-touch-icon.png": "apple-touch-icon.png",
      "/favicon.png": "favicon.png",
      "/favicon.ico": "favicon.ico",
      "/cskit-icon-dark.png": "cskit-icon-dark.png",
      "/cskit-icon.png": "cskit-icon.png",
      "/cskit-wordmark.png": "cskit-wordmark.png",
      "/theme.css": "theme.css",
      "/": "hub.html",
      "/account": "account.html",
      "/market": "index.html",
      "/hub.js": "hub.js",
      "/hosted.js": "hosted.js",
      "/hub.css": "hub.css",
      "/account.js": "account.js",
      "/account-core.js": "account-core.js",
      "/app.js": "app.js",
      "/style.css": "style.css",
      "/favicon.svg": "favicon.svg",
      "/studio": "studio.html",
      "/studio.js": "studio.js",
      "/workspace.js": "workspace.js",
      "/about": "about.html",
      "/privacy": "privacy.html",
      "/social-cskit-v2.png": "social-cskit-v2.png",
  "/social-cskit-v3.png": "social-cskit-v3.png",
      "/workspace.css": "workspace.css",
      "/workspace-core.js": "workspace-core.js",
      "/workspace-store.js": "workspace-store.js",
      "/practice-data.js": "practice-data.js",
      "/shell.js": "shell.js",
      "/dashboard": "dashboard.html",
      "/improve": "improve.html",
      "/experiments": "experiments.html",
      "/maps": "maps.html",
      "/tools": "tools.html",
      "/community": "community.html",
      "/updates": "updates.html",

      "/studio-preview.js": "studio-preview.js",
      "/studio-dust2-radar.png": "studio-dust2-radar.png",
      "/studio-pistol.png": "studio-pistol.png",
      "/studio-dust2.jpg": "studio-dust2.jpg",
      "/studio-core.js": "studio-core.js",
      "/studio.css": "studio.css",
    };
    if (req.method === "GET" && files[url.pathname]) {
      const f = files[url.pathname];
      res.writeHead(200, {
        "Content-Type": f.endsWith(".json")
          ? "application/json"
          : f.endsWith(".jpg")
            ? "image/jpeg"
            : f.endsWith(".png")
              ? "image/png"
              : f.endsWith(".ico")
                ? "image/x-icon"
                : f.endsWith(".webmanifest")
                  ? "application/manifest+json"
                  : f.endsWith(".js")
                    ? "text/javascript"
                    : f.endsWith(".css")
                      ? "text/css"
                      : f.endsWith(".svg")
                        ? "image/svg+xml"
                        : "text/html",
        "Cache-Control": "no-cache",
        "Content-Security-Policy":
          "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https://*.googleusercontent.com; script-src 'self' https://www.gstatic.com https://apis.google.com; connect-src 'self' https://api-public.cs-prod.leetify.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://www.googleapis.com; frame-src https://*.firebaseapp.com; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
      });
      return res.end(readFileSync(path.join(root, "public", f)));
    }
    send(res, 404, { error: "Not found" });
  } catch (e) {
    send(res, 500, {
      error: "Unable to save or load local data. " + e.message,
    });
  }
});
server.listen(port, "127.0.0.1", () => {
  console.log(`CS2 CSKit: http://127.0.0.1:${port}`);
  void refresh();
  void updateArtwork();
  setInterval(() => void refresh(), 15000);
  setInterval(() => void updateArtwork(), 3600000);
});
