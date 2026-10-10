import test from "node:test";
import assert from "node:assert/strict";
import { filterItems, hostedRequest } from "../public/hosted.js";
Object.defineProperty(globalThis, "navigator", {
  value: { locks: { request: async (_key, fn) => fn() } },
  configurable: true,
});
const data = new Map();
globalThis.localStorage = {
  getItem: (k) => data.get(k) ?? null,
  setItem: (k, v) => data.set(k, v),
};
globalThis.location = { origin: "https://cskit.site" };
test("hosted wishlists are browser-local and exports contain only guest data", async () => {
  await hostedRequest("/api/wishlist", { name: "AK-47 | Test", target: 20 });
  const backup = await hostedRequest("/api/export");
  assert.equal(backup.wishlist[0].target, 20);
  await assert.rejects(
    hostedRequest("/api/wishlist", { name: "Broken", target: -1 }),
  );
  assert.equal((await hostedRequest("/api/export")).wishlist.length, 1);
  await hostedRequest("/api/wishlist", { name: "AK-47 | Test", remove: true });
  assert.equal((await hostedRequest("/api/export")).wishlist.length, 0);
});
test("hosted studio rejects stale writes and preserves newer state", async () => {
  const value = { revision: 0, profiles: [], activeId: null };
  assert.deepEqual(await hostedRequest("/api/studio", value), { revision: 1 });
  await assert.rejects(
    hostedRequest("/api/studio", value),
    (e) => e.status === 409,
  );
  assert.equal((await hostedRequest("/api/studio")).revision, 1);
});
test("market filters retain missing saved items and sort null prices last", () => {
  const items = [
    { market_hash_name: "AK-47 | Test", min_price: 20, quantity: 5 },
    { market_hash_name: "Case", min_price: 1, quantity: 10 },
  ];
  const result = filterItems(
    items,
    new URLSearchParams("category=wishlist&sort=low"),
    [{ name: "Missing" }, { name: "AK-47 | Test" }],
  );
  assert.equal(result.total, 2);
  assert.equal(result.items[0].min_price, 20);
  assert.equal(result.items[1].min_price, null);
});
