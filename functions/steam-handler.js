import {
  googleUser,
  secret,
  hash,
  sessionValid,
  verifySteam,
  steamLoginUrl,
  steamIdValid,
  fail,
} from "./steam-core.js";
export function createHandler({
  auth,
  repo,
  steamKey,
  origin = "https://cskit.site",
  fetcher = fetch,
}) {
  const cookie = (value, maxAge = 600) =>
    `__session=${value}; Path=/api/steam; Secure; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
  const cookieValue = (req) =>
    (req.get("cookie") || "")
      .split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith("__session="))
      ?.slice(10) || "";
  return async (req, res) => {
    res.set("Cache-Control", "private, no-store");
    res.set("Referrer-Policy", "no-referrer");
    res.set("X-Content-Type-Options", "nosniff");
    const url = new URL(req.originalUrl, origin),
      route = url.pathname;
    try {
      if (route === "/api/steam/health" && req.method === "GET")
        return res.json({ enabled: true, friendsEnabled: !!steamKey() });
      if (route === "/api/steam/callback" && req.method === "GET") {
        const state = url.searchParams.get("state"),
          browserSecret = cookieValue(req);
        if (!/^[a-f0-9]{64}$/.test(state || ""))
          throw fail("LINK_EXPIRED", "Steam connection expired.");
        const current = await repo.session(hash(state));
        sessionValid(current, browserSecret);
        const identity = await verifySteam(
          url.searchParams,
          `${origin}/api/steam/callback?state=${state}`,
          fetcher,
        );
        await repo.verify(hash(state), browserSecret, identity);
        // Only a fresh Google-authenticated finish call can persist this identity.
        return res.redirect(
          303,
          `${origin}/performance?steam=ready&state=${state}`,
        );
      }
      const allowed = {
        "/api/steam/status": "GET",
        "/api/steam/start": "POST",
        "/api/steam/finish": "POST",
        "/api/steam/unlink": "POST",
        "/api/steam/friends": "POST",
      };
      if (!allowed[route]) throw fail("NOT_FOUND", "Not found.", 404);
      if (req.method !== allowed[route])
        throw fail("METHOD", "Method not allowed.", 405);
      if (req.method === "POST" && req.get("origin") !== origin)
        throw fail("ORIGIN", "Request origin not allowed.", 403);
      const bearer = req.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
      if (!bearer)
        throw fail("GOOGLE_REQUIRED", "Sign in with Google first.", 401);
      let decoded;
      try {
        decoded = await auth.verifyIdToken(bearer, true);
      } catch {
        throw fail(
          "GOOGLE_REQUIRED",
          "Your Google session expired. Sign in again.",
          401,
        );
      }
      const uid = googleUser(decoded);
      if (route === "/api/steam/status")
        return res.json({
          link: await repo.link(uid),
          friendsEnabled: !!steamKey(),
        });
      if (route === "/api/steam/start") {
        await repo.throttle(uid, "link", 30000);
        if (await repo.link(uid))
          throw fail(
            "UNLINK_FIRST",
            "Steam is already connected. Disconnect it before changing profiles.",
            409,
          );
        const state = secret(),
          browserSecret = secret();
        await repo.createSession(hash(state), {
          uid,
          browserHash: hash(browserSecret),
          stage: "started",
          expiresAt: Date.now() + 600000,
        });
        res.set("Set-Cookie", cookie(browserSecret));
        return res.json({
          url: steamLoginUrl(
            `${origin}/api/steam/callback?state=${state}`,
            origin,
          ),
        });
      }
      if (route === "/api/steam/finish") {
        const state = req.body?.state;
        if (!/^[a-f0-9]{64}$/.test(state || ""))
          throw fail("LINK_EXPIRED", "Start Steam sign-in again.");
        const link = await repo.finish(uid, hash(state), cookieValue(req));
        res.set("Set-Cookie", cookie("", 0));
        return res.json({ link });
      }
      if (route === "/api/steam/unlink") {
        await repo.unlink(uid);
        res.set("Set-Cookie", cookie("", 0));
        return res.json({ unlinked: true });
      }
      const link = await repo.link(uid);
      if (!link)
        throw fail("STEAM_REQUIRED", "Connect your Steam profile first.", 403);
      const key = steamKey();
      if (!key)
        throw fail(
          "NOT_CONFIGURED",
          "Steam friends access is not available yet.",
          503,
        );
      await repo.throttle(uid, "friends", 60000);
      const upstream = new URL(
        "https://api.steampowered.com/ISteamUser/GetFriendList/v0001/",
      );
      upstream.search = new URLSearchParams({
        key,
        steamid: link.steamId,
        relationship: "friend",
      });
      const response = await fetcher(upstream, {
        redirect: "error",
        signal: AbortSignal.timeout(12000),
      });
      if ([401, 403].includes(response.status))
        throw fail(
          "PRIVATE_FRIENDS",
          "Steam cannot share this friends list. Check your Steam friends-list privacy settings.",
          403,
        );
      if (response.status === 429)
        throw fail(
          "RATE_LIMIT",
          "Steam is limiting requests. Try again in a minute.",
          429,
        );
      if (!response.ok)
        throw fail(
          "STEAM_UNAVAILABLE",
          "Steam friends are temporarily unavailable.",
          502,
        );
      const data = await response.json();
      if (!Array.isArray(data.friendslist?.friends))
        throw fail(
          "STEAM_UNAVAILABLE",
          "Steam returned an unreadable friends list.",
          502,
        );
      const ids = [
        ...new Set(
          data.friendslist.friends.map((f) => f.steamid).filter(steamIdValid),
        ),
      ].filter((id) => id !== link.steamId);
      if (ids.length > 2000)
        throw fail(
          "FRIENDS_LIMIT",
          "This friends list is too large to compare in one session.",
          400,
        );
      return res.json({ steamId: link.steamId, friends: ids });
    } catch (e) {
      if (route === "/api/steam/callback")
        return res.redirect(303, `${origin}/performance?steam=failed`);
      // Never return/log upstream URLs (Steam's key is a query parameter), tokens or assertions.
      return res
        .status(e.status || 502)
        .json({
          error: e.status
            ? e.message
            : "Steam connection is temporarily unavailable.",
          code: e.code || "UNAVAILABLE",
        });
    }
  };
}
