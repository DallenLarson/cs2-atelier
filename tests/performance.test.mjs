import test from "node:test";
import assert from "node:assert/strict";
import {
  parsePlayer,
  metric,
  validateResponse,
  responseError,
} from "../public/performance-core.js";
test("player lookup accepts numeric IDs and exact official profile URLs", () => {
  const steam = { key: "steam64_id", value: "76561197969209908" };
  for (const input of [
    steam.value,
    " https://steamcommunity.com/profiles/" + steam.value + "/ ",
    "steamcommunity.com/profiles/" + steam.value,
    "https://leetify.com/app/profile/" + steam.value,
  ])
    assert.deepEqual(parsePlayer(input), steam);
  const id = "e50a982e-d8ec-4627-996f-017ed9d7162e";
  assert.deepEqual(parsePlayer("https://leetify.com/app/profile/" + id), {
    key: "id",
    value: id,
  });
});
test("lookup rejects deceptive hosts, credentials, custom names and malformed IDs", () => {
  for (const input of [
    "https://leetify.com.evil.test/app/profile/76561197969209908",
    "https://evil.test/?leetify.com",
    "https://user:secret@leetify.com/app/profile/76561197969209908",
    "https://steamcommunity.com/id/example",
    "javascript:alert(1)",
    "123456",
    "76561197969209908&admin=true",
  ])
    assert.throws(() => parsePlayer(input));
});
test("private or incomplete API results never render as public profiles", () => {
  for (const privacy_mode of ["private", "friends_only", null, undefined])
    assert.throws(() =>
      validateResponse({
        privacy_mode,
        name: "Player",
        steam64_id: "76561197969209908",
      }),
    );
  assert.throws(() => validateResponse({ privacy_mode: "public" }));
  assert.equal(
    validateResponse({
      privacy_mode: "public",
      name: "Player",
      steam64_id: "76561197969209908",
    }).name,
    "Player",
  );
});
test("ratings preserve zero, negatives and missing values without invented scores", () => {
  assert.equal(metric(0), "0");
  assert.equal(metric(-1.47, 2), "-1.47");
  assert.equal(metric(61.23), "61.2");
  for (const value of [null, undefined, NaN, Infinity, "99"])
    assert.equal(metric(value), "—");
});
test("upstream failures explain rate limits and unavailable profiles", () => {
  assert.match(responseError(429), /Wait a minute/);
  assert.match(responseError(404), /No Leetify profile/);
  assert.match(responseError(403), /restricted/);
  assert.match(responseError(500), /temporarily unavailable/);
});
