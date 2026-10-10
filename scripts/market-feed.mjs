import { mkdir, writeFile } from "node:fs/promises";
const out = process.argv[2] || "feed";
async function json(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
  if (!response.ok)
    throw Error(`${new URL(url).hostname} returned ${response.status}`);
  return response.json();
}
const [prices, catalog] = await Promise.all([
  json("https://api.skinport.com/v1/items?app_id=730&currency=USD"),
  json(
    "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/all.json",
  ),
]);
if (
  !Array.isArray(prices) ||
  prices.length < 100 ||
  Object.keys(catalog).length < 100
)
  throw Error(
    "Incomplete market response; previous snapshot remains published.",
  );
const allowed = (source) => {
  try {
    const u = new URL(source);
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
const art = Object.fromEntries(
  Object.values(catalog)
    .filter((a) => allowed(a.image))
    .map((a) => [a.market_hash_name || a.name, a]),
);
const items = prices.map((i) => {
  const a = art[i.market_hash_name],
    image = a?.image || null;
  return {
    market_hash_name: i.market_hash_name,
    min_price: i.min_price,
    quantity: i.quantity,
    item_page: i.item_page?.startsWith("https://skinport.com/")
      ? i.item_page
      : "https://skinport.com/market",
    image: image
      ? image + (image.includes("/economy/image/") ? "/384fx288f" : "")
      : null,
    imageLarge: image
      ? image + (image.includes("/economy/image/") ? "/1024fx768f" : "")
      : null,
    rarity: /^#[a-f0-9]{6}$/i.test(a?.rarity?.color || "")
      ? a.rarity.color
      : "#91a3bd",
  };
});
await mkdir(out, { recursive: true });
await writeFile(
  `${out}/market.json`,
  JSON.stringify({ updated: Date.now(), items }),
);
await writeFile(
  `${out}/studio-artwork.json`,
  JSON.stringify(
    Object.fromEntries(
      [
        "AK-47 | Redline (Field-Tested)",
        "M4A1-S | Printstream (Field-Tested)",
        "AWP | Asiimov (Field-Tested)",
        "Desert Eagle | Printstream (Field-Tested)",
      ].map((name) => [
        name,
        items.find((i) => i.market_hash_name === name)?.imageLarge || "",
      ]),
    ),
  ),
);
console.log(`Published feed prepared: ${items.length} market items.`);
