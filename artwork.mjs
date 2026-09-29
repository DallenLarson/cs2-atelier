import {
  readFileSync,
  writeFileSync,
  renameSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
const folder = new URL("./data/", import.meta.url),
  directory = new URL("./data/images/", import.meta.url);
mkdirSync(directory, { recursive: true });
let catalog = { items: {}, updated: 0 };
try {
  catalog = JSON.parse(readFileSync(new URL("artwork.json", folder)));
} catch {}
const allowed = (url) => {
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      [
        "community.akamai.steamstatic.com",
        "community.cloudflare.steamstatic.com",
        "steamcommunity-a.akamaihd.net",
        "raw.githubusercontent.com",
      ].includes(u.hostname)
    );
  } catch {
    return false;
  }
};
export const artworkFor = (name) => {
  const a = catalog.items[name];
  return a && allowed(a.image)
    ? {
        image: "/api/artwork?name=" + encodeURIComponent(name),
        rarity: /^#[0-9a-f]{6}$/i.test(a.rarity || "") ? a.rarity : "#91a3bd",
      }
    : { image: null, rarity: "#91a3bd" };
};
export async function updateArtwork() {
  if (Date.now() - catalog.updated < 86400000) return;
  try {
    const response = await fetch(
      "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/all.json",
      { signal: AbortSignal.timeout(30000) },
    );
    if (!response.ok) return;
    const records = Object.values(await response.json());
    if (records.length < 100) return;
    const next = {
      updated: Date.now(),
      items: Object.fromEntries(
        records
          .filter((x) => x.image && allowed(x.image))
          .map((x) => [
            x.market_hash_name || x.name,
            { image: x.image, rarity: x.rarity?.color },
          ]),
      ),
    };
    writeFileSync(new URL("artwork.json.tmp", folder), JSON.stringify(next));
    renameSync(
      new URL("artwork.json.tmp", folder),
      new URL("artwork.json", folder),
    );
    catalog = next;
  } catch {}
}
const pending = new Map();
let active = 0;
const queue = [];
async function download(url, file) {
  if (active >= 5) await new Promise((resolve) => queue.push(resolve));
  active++;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (
      !r.ok ||
      !/^image\/(png|webp|jpeg)/.test(r.headers.get("content-type") || "")
    )
      throw Error("Artwork unavailable");
    const bytes = Buffer.from(await r.arrayBuffer());
    if (bytes.length > 5000000) throw Error("Artwork too large");
    writeFileSync(file, bytes);
    return bytes;
  } finally {
    active--;
    queue.shift()?.();
  }
}
export async function serveArtwork(url, res) {
  const name = url.searchParams.get("name"),
    record = catalog.items[name];
  if (!record || !allowed(record.image)) {
    res.writeHead(404);
    return res.end();
  }
  const large = url.searchParams.get("size") === "large";
  const source =
    record.image +
    (record.image.includes("/economy/image/")
      ? large
        ? "/1024fx768f"
        : "/384fx288f"
      : "");
  const key = createHash("sha256").update(source).digest("hex"),
    file = new URL(key + ".img", directory);
  try {
    let bytes;
    if (existsSync(file)) bytes = readFileSync(file);
    else {
      if (!pending.has(key))
        pending.set(
          key,
          download(source, file).finally(() => pending.delete(key)),
        );
      bytes = await pending.get(key);
    }
    res.writeHead(200, {
      "Content-Type":
        bytes[0] === 137
          ? "image/png"
          : bytes[0] === 255
            ? "image/jpeg"
            : "image/webp",
      "Cache-Control": "public, max-age=86400",
    });
    res.end(bytes);
  } catch {
    res.writeHead(503, { "Cache-Control": "no-store" });
    res.end();
  }
}
