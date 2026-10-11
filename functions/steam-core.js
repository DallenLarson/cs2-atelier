import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
export const STEAM_ENDPOINT = "https://steamcommunity.com/openid/login";
export const NS = "http://specs.openid.net/auth/2.0";
export const steamIdValid = (id) =>
  typeof id === "string" && /^7656119\d{10}$/.test(id);
export const hash = (value) => createHash("sha256").update(value).digest("hex");
export const secret = () => randomBytes(32).toString("hex");
export function fail(code, message, status = 400) {
  return Object.assign(new Error(message), { code, status });
}
export function googleUser(token) {
  if (!token?.uid || token.firebase?.sign_in_provider !== "google.com")
    throw fail(
      "GOOGLE_REQUIRED",
      "Sign in with Google before connecting Steam.",
      401,
    );
  return token.uid;
}
export function sessionValid(session, browserSecret, now = Date.now()) {
  if (
    !session ||
    session.expiresAt <= now ||
    !/^[a-f0-9]{64}$/.test(browserSecret || "")
  )
    throw fail("LINK_EXPIRED", "Steam connection expired. Start again.");
  const expected = Buffer.from(session.browserHash || "", "hex"),
    actual = Buffer.from(hash(browserSecret), "hex");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
    throw fail(
      "LINK_MISMATCH",
      "Return to the same browser that started Steam sign-in.",
    );
}
export function steamLoginUrl(returnTo, origin) {
  const p = new URLSearchParams({
    "openid.ns": NS,
    "openid.mode": "checkid_setup",
    "openid.return_to": returnTo,
    "openid.realm": origin + "/",
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  });
  return STEAM_ENDPOINT + "?" + p;
}
export async function verifySteam(
  params,
  returnTo,
  fetcher = fetch,
  now = Date.now(),
) {
  for (const key of new Set(params.keys()))
    if (params.getAll(key).length !== 1)
      throw fail("INVALID_STEAM", "Ambiguous Steam response.");
  if (
    params.get("openid.mode") !== "id_res" ||
    params.get("openid.ns") !== NS ||
    params.get("openid.op_endpoint") !== STEAM_ENDPOINT ||
    params.get("openid.return_to") !== returnTo
  )
    throw fail("INVALID_STEAM", "Steam sign-in could not be verified.");
  const claimed = params.get("openid.claimed_id");
  const id = claimed?.match(
    /^https:\/\/steamcommunity\.com\/openid\/id\/(7656119\d{10})$/,
  )?.[1];
  if (!id || params.get("openid.identity") !== claimed)
    throw fail("INVALID_STEAM", "Invalid Steam identity.");
  const signed = new Set((params.get("openid.signed") || "").split(","));
  if (
    ![
      "op_endpoint",
      "claimed_id",
      "identity",
      "return_to",
      "response_nonce",
      "assoc_handle",
    ].every((k) => signed.has(k)) ||
    !params.get("openid.sig")
  )
    throw fail("INVALID_STEAM", "Steam response is missing signed fields.");
  const nonce = params.get("openid.response_nonce") || "",
    stamp = Date.parse(nonce.slice(0, 20));
  if (!Number.isFinite(stamp) || Math.abs(now - stamp) > 5 * 60 * 1000)
    throw fail("LINK_EXPIRED", "Steam sign-in response expired. Start again.");
  const body = new URLSearchParams();
  for (const [key, value] of params)
    if (key.startsWith("openid.")) body.set(key, value);
  body.set("openid.mode", "check_authentication");
  const response = await fetcher(STEAM_ENDPOINT, {
    method: "POST",
    body,
    redirect: "error",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok || !/^is_valid:true\r?$/m.test(await response.text()))
    throw fail("INVALID_STEAM", "Steam did not verify this sign-in.");
  return { steamId: id, nonceHash: hash(nonce) };
}
