import test from "node:test";
import assert from "node:assert/strict";
import { validateBoard, ownership } from "../public/scoreboard-core.js";
const mine = "76561197969209908",
  friend = "76561198000000000";
test("scoreboard normalizes links, deduplicates friends and removes self", () => {
  const result = validateBoard({
    name: " Squad ",
    mine: "https://leetify.com/public/profile/" + mine,
    friends: [mine, friend, "https://steamcommunity.com/profiles/" + friend],
    metric: "aim",
  });
  assert.deepEqual(result, {
    name: "Squad",
    mine,
    friends: [friend],
    metric: "aim",
  });
});
test("scoreboard rejects invalid links, oversized rosters and metrics", () => {
  const base = { name: "Squad", mine, friends: [], metric: "leetify" };
  for (const patch of [
    { friends: Array(21).fill(friend) },
    { mine: "https://evil.example/profile" },
    { metric: "invented" },
    { name: "" },
  ])
    assert.throws(() => validateBoard({ ...base, ...patch }));
});
test("ownership requires matching Steam identity and a resolved profile", () => {
  assert.equal(ownership({ steam64_id: mine }, { steamId: mine }), true);
  assert.equal(ownership({ steam64_id: mine }, { steamId: friend }), false);
  assert.equal(ownership({ steam64_id: mine }, null), false);
  assert.equal(ownership(null, { steamId: mine }), false);
});
