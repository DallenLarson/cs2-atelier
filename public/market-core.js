export function filterItems(items, params, wishlist = []) {
  const q = (params.get("q") || "").toLowerCase(),
    category = params.get("category") || "all";
  let result =
    category === "wishlist"
      ? wishlist.map(
          (w) =>
            items.find((i) => i.market_hash_name === w.name) || {
              market_hash_name: w.name,
              min_price: null,
              quantity: 0,
              item_page: "https://skinport.com/market",
            },
        )
      : [...items];
  result = result.filter((i) => i.market_hash_name.toLowerCase().includes(q));
  if (category === "knives")
    result = result.filter(
      (i) =>
        /★/.test(i.market_hash_name) &&
        !/Gloves|Wraps/.test(i.market_hash_name),
    );
  if (category === "rifles")
    result = result.filter((i) =>
      /^(StatTrak™ |Souvenir )?(AK-47|M4A|AWP|AUG|FAMAS|Galil|SG 553|SSG)/.test(
        i.market_hash_name,
      ),
    );
  if (category === "containers")
    result = result.filter((i) =>
      /Case|Capsule|Package/.test(i.market_hash_name),
    );
  const wear = params.get("wear") || "all";
  const tracking = params.get("tracking") || "all";
  const weapon = (params.get("weapon") || "").trim().toLowerCase();
  const min = params.get("min"), max = params.get("max");
  const tracked = (name) => /StatTrak™/.test(name);
  const souvenir = (name) => /^(★ )?Souvenir /.test(name);
  const base = (name) => name.replace(/StatTrak™ |Souvenir /g, "");
  result = result.filter((i) => {
    const name = i.market_hash_name;
    return (wear === "all" || name.endsWith(" (" + wear + ")"))
      && (tracking === "all" || (tracking === "stattrak" ? tracked(name)
        : tracking === "souvenir" ? souvenir(name) : !tracked(name) && !souvenir(name)))
      && (!weapon || base(name).replace(/^★ /, "").split(" | ")[0].toLowerCase().includes(weapon))
      && (!min || (Number.isFinite(Number(min)) && i.min_price != null && i.min_price >= Number(min)))
      && (!max || (Number.isFinite(Number(max)) && i.min_price != null && i.min_price <= Number(max)))
      && (params.get("available") !== "true" || (i.quantity > 0 && i.min_price != null));
  });
  const categoryPatterns = {
    gloves: /Gloves|Hand Wraps/,
    pistols: /^(?:StatTrak™ |Souvenir )?(?:Glock-18|USP-S|P2000|P250|Five-SeveN|Tec-9|CZ75-Auto|Dual Berettas|Desert Eagle|R8 Revolver)(?: |$)/,
    smgs: /^(?:StatTrak™ |Souvenir )?(?:MAC-10|MP9|MP7|MP5-SD|UMP-45|P90|PP-Bizon)(?: |$)/,
    heavy: /^(?:StatTrak™ |Souvenir )?(?:Nova|XM1014|MAG-7|Sawed-Off|M249|Negev)(?: |$)/,
    stickers: /^Sticker \|/,

  };
  if (categoryPatterns[category]) result = result.filter((i) => categoryPatterns[category].test(i.market_hash_name));
  // Group only market browsing. Saved targets always refer to exact variants.
  if (params.get("group") === "true" && category !== "wishlist") {
    const groups = new Map();
    for (const item of result) {
      // Souvenir is a distinct collectible; combine wear and StatTrak only.
      const key = item.market_hash_name.replace("StatTrak™ ", "")
        .replace(/ \((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)$/, "");
      const old = groups.get(key);
      const count = (old?.variantCount || 0) + 1;
      const priced = item.quantity > 0 && Number.isFinite(item.min_price);
      const oldPriced = old && old.quantity > 0 && Number.isFinite(old.min_price);
      const winner = !old || (priced && (!oldPriced || item.min_price < old.min_price)) ? item : old;
      groups.set(key, { ...winner, variantCount: count });
    }
    result = [...groups.values()];
  }
  const sort = params.get("sort");
  result.sort(
    sort === "low"
      ? (a, b) => (a.min_price ?? Infinity) - (b.min_price ?? Infinity)
      : sort === "high"
        ? (a, b) => (b.min_price ?? -1) - (a.min_price ?? -1)
        : (a, b) => b.quantity - a.quantity,
  );
  return {
    total: result.length,
    items: result.slice(
      0,
      Math.max(1, Math.min(Number(params.get("limit")) || 100, 10000)),
    ),
  };
}
