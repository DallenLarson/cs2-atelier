import { filterItems } from "./market-core.js";
export { filterItems } from "./market-core.js";
import { validateLibrary, validateWishlist } from "./account-core.js";

export const hosted =
  typeof document !== "undefined" &&
  document.documentElement.dataset.hosted === "true";
const feed =
  "https://raw.githubusercontent.com/DallenLarson/cs2-atelier/market-data/market.json";
let market = { items: [], updated: 0 },
  lastAttempt = 0,
  pending,
  failure = "";
const emptyStudio = () => ({ revision: 0, profiles: [], activeId: null });
function read(key, fallback) {
  const raw = localStorage.getItem("cskit." + key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    throw Error(
      "Saved browser data could not be read. Export a backup before clearing storage.",
    );
  }
}
function save(key, value) {
  try {
    localStorage.setItem("cskit." + key, JSON.stringify(value));
  } catch {
    throw Error(
      "Browser storage is full or unavailable. Your changes were not saved.",
    );
  }
}
async function prices(force = false) {
  if (pending) return pending;
  if (!force && Date.now() - lastAttempt < 300000) return market;
  lastAttempt = Date.now();
  pending = (async () => {
    try {
      const response = await fetch(feed, {
        cache: "no-cache",
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw Error("Market feed unavailable.");
      const next = await response.json();
      if (
        !Array.isArray(next.items) ||
        !next.items.length ||
        !Number.isFinite(next.updated)
      )
        throw Error("Invalid market feed.");
      market = next;
      failure = "";
      try {
        const cache = await caches.open("cskit-market-v1");
        await cache.put(
          "/cached-market.json",
          new Response(JSON.stringify(next)),
        );
      } catch {}
    } catch {
      failure = "The market feed is temporarily unavailable.";
      if (!market.items.length) {
        try {
          const cache = await caches.open("cskit-market-v1");
          const saved = await cache.match("/cached-market.json");
          if (saved) market = await saved.json();
        } catch {}
        if (!market.items.length) {
          try {
            const response = await fetch("/market-snapshot.json");
            if (response.ok) market = await response.json();
          } catch {}
        }
      }
    }
    return market;
  })().finally(() => {
    pending = null;
  });
  return pending;
}
async function locked(kind, fn) {
  if (navigator.locks) return navigator.locks.request("cskit." + kind, fn);
  return fn();
}
export async function hostedRequest(url, body) {
  const parsed = new URL(url, location.origin),
    kind = parsed.pathname;
  if (kind === "/api/firebase-config") {
    const response = await fetch("/firebase-config.json");
    if (!response.ok) throw Error("Account configuration could not be loaded.");
    return response.json();
  }
  if (kind === "/api/studio") {
    if (body === undefined)
      return validateLibrary(read("studio", emptyStudio()));
    return locked("studio", () => {
      validateLibrary(body);
      const old = validateLibrary(read("studio", emptyStudio()));
      if (body.revision !== old.revision)
        throw Object.assign(
          Error(
            "Another tab saved newer changes. Export this build, then reload.",
          ),
          { status: 409 },
        );
      save("studio", { ...body, revision: old.revision + 1 });
      return { revision: old.revision + 1 };
    });
  }
  if (kind === "/api/wishlist")
    return locked("wishlist", () => {
      const current = validateWishlist(read("wishlist", { wishlist: [] }));
      const wishlist = current.wishlist.filter((w) => w.name !== body.name);
      if (!body.remove)
        wishlist.push({
          name: body.name,
          target: body.target ?? null,
          added:
            current.wishlist.find((w) => w.name === body.name)?.added ??
            Date.now(),
        });
      const next = validateWishlist({ wishlist });
      save("wishlist", next);
      return next;
    });
  if (kind === "/api/export")
    return {
      ...validateWishlist(read("wishlist", { wishlist: [] })),
      studio: validateLibrary(read("studio", emptyStudio())),
      exportedAt: new Date().toISOString(),
    };
  await prices(kind === "/api/refresh");
  if (kind === "/api/state")
    return {
      ...validateWishlist(read("wishlist", { wishlist: [] })),
      updated: market.updated,
      nextRefresh: Date.now() + 300000,
      busy: false,
      count: market.items.length,
      error:
        failure ||
        (Date.now() - market.updated > 1800000
          ? "Market updates are delayed. Showing the latest saved snapshot."
          : ""),
    };
  if (kind === "/api/items")
    return filterItems(
      market.items,
      parsed.searchParams,
      validateWishlist(read("wishlist", { wishlist: [] })).wishlist,
    );
  if (kind === "/api/quotes")
    return {
      items: body.names.map(
        (name) =>
          market.items.find((i) => i.market_hash_name === name) || {
            market_hash_name: name,
            min_price: null,
            quantity: 0,
            item_page: "https://skinport.com/market",
          },
      ),
    };
  if (kind === "/api/detail")
    return {
      item:
        market.items.find(
          (i) => i.market_hash_name === parsed.searchParams.get("name"),
        ) || null,
      history: [],
    };
  if (kind === "/api/refresh")
    return {
      busy: false,
      nextRefresh: Date.now() + 300000,
      message:
        "Checked the latest market snapshot. Scheduled updates can take longer than five minutes.",
    };
  throw Error("Unknown CSKit request.");
}
export async function artworkUrl(name, large = false) {
  if (!hosted)
    return (
      "/api/artwork?name=" +
      encodeURIComponent(name) +
      (large ? "&size=large" : "")
    );
  const response = await fetch("/studio-artwork.json");
  if (!response.ok) throw Error("Artwork unavailable.");
  const catalog = await response.json();
  return catalog[name] || "";
}
