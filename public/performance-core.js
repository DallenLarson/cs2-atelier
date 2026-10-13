const steam = /^7656119\d{10}$/;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function parsePlayer(input) {
  let value = String(input).trim();
  if (value.length > 250) throw Error("That profile link is too long.");
  if (steam.test(value)) return { key: "steam64_id", value };
  if (uuid.test(value)) return { key: "id", value };
  if (/^(www\.)?(steamcommunity\.com|leetify\.com)\//i.test(value))
    value = "https://" + value;
  let url;
  try {
    url = new URL(value);
  } catch {
    throw Error(
      "Enter a 17-digit Steam64 ID or a Steam / Leetify profile link.",
    );
  }
  if (url.protocol !== "https:" || url.username || url.password)
    throw Error("Use an HTTPS Steam or Leetify profile link.");
  const host = url.hostname.replace(/^www\./, "");
  let id;
  if (host === "steamcommunity.com") {
    if (url.pathname.startsWith("/id/"))
      throw Error(
        "Custom Steam names are not supported yet. Copy your numeric Steam64 ID or use your Leetify profile link.",
      );
    id = url.pathname.match(/^\/profiles\/(\d+)\/?$/)?.[1];
    if (id && steam.test(id)) return { key: "steam64_id", value: id };
  }
  if (host === "leetify.com") {
    id = url.pathname.match(/^\/(?:app|public)\/profile\/([^/]+)\/?$/)?.[1];
    if (id && steam.test(id)) return { key: "steam64_id", value: id };
    if (id && uuid.test(id)) return { key: "id", value: id };
  }
  throw Error(
    "Use a Steam numeric profile link or a Leetify player profile link.",
  );
}
export function metric(value, digits = 1) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("en-US", { maximumFractionDigits: digits })
    : "—";
}
export function validateResponse(data) {
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw Error(
      "Leetify returned an unreadable profile. Please try again later.",
    );
  if (data.privacy_mode !== "public")
    throw Error(
      "This profile is private or unavailable. Its stats cannot be displayed.",
    );
  if (!steam.test(data.steam64_id || "") || typeof data.name !== "string")
    throw Error("No complete player profile was returned by Leetify.");
  return data;
}
export function responseError(status) {
  if (status === 429)
    return "Leetify is limiting requests. Wait a minute before trying again.";
  if ([401, 403].includes(status))
    return "Leetify has restricted access to this profile or request. Open the profile on Leetify, or try again later.";
  if (status === 404)
    return "No Leetify profile was found. Check the identifier; the player may not have any analyzed matches yet.";
  return "Leetify is temporarily unavailable. Please try again later.";
}
