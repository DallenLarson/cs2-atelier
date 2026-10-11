import test from "node:test";
import assert from "node:assert/strict";
import {
  verifySteam,
  steamLoginUrl,
  NS,
  STEAM_ENDPOINT,
  hash,
  sessionValid,
  googleUser,
} from "../functions/steam-core.js";
import { createHandler } from "../functions/steam-handler.js";
import { rankFriends, friendQueue } from "../public/friends-core.js";
const steamId = "76561197969209908",
  target = "https://cskit.site/api/steam/callback?state=" + "a".repeat(64);
function assertion() {
  return new URLSearchParams({
    "openid.ns": NS,
    "openid.mode": "id_res",
    "openid.op_endpoint": STEAM_ENDPOINT,
    "openid.return_to": target,
    "openid.claimed_id": `https://steamcommunity.com/openid/id/${steamId}`,
    "openid.identity": `https://steamcommunity.com/openid/id/${steamId}`,
    "openid.signed":
      "op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle",
    "openid.sig": "signature",
    "openid.assoc_handle": "association",
    "openid.response_nonce": new Date().toISOString().slice(0, 19) + "Znonce",
  });
}
test("Steam authentication checks the assertion with the fixed Steam endpoint", async () => {
  const identity = await verifySteam(
    assertion(),
    target,
    async (url, options) => {
      assert.equal(url, STEAM_ENDPOINT);
      assert.equal(options.body.get("openid.mode"), "check_authentication");
      assert.equal(options.redirect, "error");
      return new Response("ns:" + NS + "\nis_valid:true\n");
    },
  );
  assert.equal(identity.steamId, steamId);
  const login = new URL(steamLoginUrl(target, "https://cskit.site"));
  assert.equal(login.origin, "https://steamcommunity.com");
  assert.equal(login.searchParams.get("openid.return_to"), target);
});
test("forged, stale, unsigned, duplicate and mismatched Steam assertions fail closed", async () => {
  const changes = [
    ["openid.op_endpoint", "https://evil.test"],
    ["openid.return_to", "https://evil.test"],
    [
      "openid.identity",
      "https://steamcommunity.com/openid/id/76561197969209909",
    ],
    ["openid.response_nonce", "2000-01-01T00:00:00Zold"],
    ["openid.signed", "identity"],
    ["openid.mode", "cancel"],
  ];
  for (const [key, value] of changes) {
    const params = assertion();
    params.set(key, value);
    await assert.rejects(
      verifySteam(params, target, () => {
        throw Error("Must not fetch");
      }),
    );
  }
  const duplicate = assertion();
  duplicate.append("openid.identity", "x");
  await assert.rejects(verifySteam(duplicate, target));
  await assert.rejects(
    verifySteam(
      assertion(),
      target,
      async () => new Response("is_valid:false\n"),
    ),
  );
});
test("link sessions require the initiating browser and a Google identity", () => {
  const cookie = "b".repeat(64);
  assert.doesNotThrow(() =>
    sessionValid(
      { browserHash: hash(cookie), expiresAt: Date.now() + 10000 },
      cookie,
    ),
  );
  assert.throws(() =>
    sessionValid(
      { browserHash: hash(cookie), expiresAt: Date.now() + 10000 },
      "c".repeat(64),
    ),
  );
  assert.throws(() =>
    sessionValid({ browserHash: hash(cookie), expiresAt: 0 }, cookie),
  );
  assert.throws(() =>
    googleUser({ uid: "alice", firebase: { sign_in_provider: "anonymous" } }),
  );
  assert.equal(
    googleUser({ uid: "alice", firebase: { sign_in_provider: "google.com" } }),
    "alice",
  );
});
async function call(handler, path, method = "POST", headers = {}, body = {}) {
  const response = {
    statusCode: 200,
    headers: {},
    set(k, v) {
      this.headers[k] = v;
      return this;
    },
    status(n) {
      this.statusCode = n;
      return this;
    },
    json(data) {
      this.data = data;
      return this;
    },
    redirect(n, url) {
      this.statusCode = n;
      this.url = url;
      return this;
    },
  };
  await handler(
    { originalUrl: path, method, body, get: (k) => headers[k.toLowerCase()] },
    response,
  );
  return response;
}
test("Steam endpoints reject guests, non-Google sessions and foreign origins", async () => {
  const handler = createHandler({
    auth: {
      verifyIdToken: async () => ({
        uid: "alice",
        firebase: { sign_in_provider: "anonymous" },
      }),
    },
    repo: {},
    steamKey: () => "",
  });
  assert.equal(
    (
      await call(handler, "/api/steam/start", "POST", {
        origin: "https://evil.test",
      })
    ).statusCode,
    403,
  );
  assert.equal(
    (
      await call(handler, "/api/steam/start", "POST", {
        origin: "https://cskit.site",
      })
    ).statusCode,
    401,
  );
  assert.equal(
    (
      await call(handler, "/api/steam/start", "POST", {
        origin: "https://cskit.site",
        authorization: "Bearer token",
      })
    ).statusCode,
    401,
  );
});
test("friends endpoint uses only verified identity, handles privacy and never exposes secrets", async () => {
  const base = {
    auth: {
      verifyIdToken: async () => ({
        uid: "alice",
        firebase: { sign_in_provider: "google.com" },
      }),
    },
    repo: { link: async () => ({ steamId }), throttle: async () => {} },
    steamKey: () => "test-secret",
  };
  const headers = {
    origin: "https://cskit.site",
    authorization: "Bearer token",
  };
  const handler = createHandler({
    ...base,
    fetcher: async (url) => {
      assert.equal(url.searchParams.get("steamid"), steamId);
      return Response.json({
        friendslist: {
          friends: [
            { steamid: steamId },
            { steamid: "76561197969209909" },
            { steamid: "invalid" },
          ],
        },
      });
    },
  });
  const result = await call(handler, "/api/steam/friends", "POST", headers, {
    steamId: "76561197969209910",
  });
  assert.deepEqual(result.data, { steamId, friends: ["76561197969209909"] });
  const privateResult = await call(
    createHandler({
      ...base,
      fetcher: async () => new Response("", { status: 401 }),
    }),
    "/api/steam/friends",
    "POST",
    headers,
  );
  assert.equal(privateResult.data.code, "PRIVATE_FRIENDS");
  const error = await call(
    createHandler({
      ...base,
      fetcher: async () => {
        throw Error("https://upstream?key=test-secret");
      },
    }),
    "/api/steam/friends",
    "POST",
    headers,
  );
  assert.ok(!JSON.stringify(error).includes("test-secret"));
});
test("friends rankings handle ties, negatives and missing scores without inventing zero", () => {
  const rows = [
    ["1", 0],
    ["2", 2],
    ["3", 2],
    ["4", -1],
    ["5", null],
  ].map(([id, score]) => ({
    steam64_id: id,
    name: id,
    ranks: { leetify: score },
  }));
  assert.deepEqual(
    rankFriends(rows).map((r) => [r.steamId, r.rank]),
    [
      ["2", 1],
      ["3", 1],
      ["1", 3],
      ["4", 4],
    ],
  );
  assert.deepEqual(
    friendQueue(steamId, [steamId, "invalid", "76561197969209909"]),
    [steamId, "76561197969209909"],
  );
  assert.throws(() => rankFriends(rows, "highest-ever"));
});
