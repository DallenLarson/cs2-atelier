const wearPattern = / \((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)$/;
export const itemFamily = (name) => name.replace("StatTrak™ ", "").replace(wearPattern, "");
export const itemType = (name) => {
  const plain = name.replace(/StatTrak™ |Souvenir /g, "").replace(/^★ /, "");
  const model = plain.split(" | ")[0];
  if (/^(?:Sticker|Sticker Slab) \|/.test(name)) return "stickers";
  if (/^(?:Sealed )?Graffiti \|/.test(name)) return "graffiti";
  if (/^Patch \|/.test(name)) return "patches";
  if (/^(?:Souvenir )?Charm \|/.test(name)) return "charms";
  if (/^(?:StatTrak™ )?Music Kit \|/.test(name)) return "music";
  if (/ \| (?:The Professionals|Guerrilla Warfare|SWAT|Sabre|Gendarmerie Nationale|Phoenix|Elite Crew|NSWC SEAL|SEAL Frogman|FBI(?: HRT| Sniper)?|SAS|USAF TACP|Brazilian 1st Battalion|NZSAS|KSK|TACP Cavalry|SEAL Team 6|USA Fbi|Vypa Sista of the Revolution)$/.test(name)) return "agents";
  if (/^(?:Sport Gloves|Driver Gloves|Specialist Gloves|Moto Gloves|Bloodhound Gloves|Hydra Gloves|Broken Fang Gloves|Hand Wraps)$/.test(model)) return "gloves";
  if (name.startsWith("★ ")) return "knives";
  if (/^(?:AK-47|M4A4|M4A1-S|AWP|AUG|FAMAS|Galil AR|SG 553|SSG 08|G3SG1|SCAR-20)$/.test(model)) return "rifles";
  if (/^(?:Glock-18|USP-S|P2000|P250|Five-SeveN|Tec-9|CZ75-Auto|Dual Berettas|Desert Eagle|R8 Revolver)$/.test(model)) return "pistols";
  if (/^(?:MAC-10|MP9|MP7|MP5-SD|UMP-45|P90|PP-Bizon)$/.test(model)) return "smgs";
  if (/^(?:Nova|XM1014|MAG-7|Sawed-Off|M249|Negev)$/.test(model)) return "heavy";
  if (/ Key$/.test(name)) return "keys";
  if (/(?:Case|Capsule|Package|Pack|Box)$/.test(name)) return "containers";
  if (/(?:Pass|Token|Tool|Tag|Storage Unit|Operation.*Coin)/.test(name)) return "tools";
  return "other";
};

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
  result = result.filter((i) => q.trim().split(/\s+/).every((word) => i.market_hash_name.toLowerCase().includes(word)));
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
  const categoryCounts = {};
  for (const item of result) {
    const type = itemType(item.market_hash_name);
    categoryCounts[type] = (categoryCounts[type] || 0) + 1;
  }
  if (category !== "all" && category !== "wishlist") {
    const categories = category.split(",");
    result = result.filter((i) => categories.includes(itemType(i.market_hash_name)));
  }
  const models = [...new Set(result.map(i => itemFamily(i.market_hash_name).replace(/^(?:★ |Souvenir )/g, "").split(" | ")[0]))].filter(x => x.length < 60).sort();
  // Group only market browsing. Saved targets always refer to exact variants.
  if (params.get("group") === "true" && category !== "wishlist") {
    const groups = new Map();
    for (const item of result) {
      // Souvenir is a distinct collectible; combine wear and StatTrak only.
      const key = itemFamily(item.market_hash_name);
      const old = groups.get(key);
      const count = (old?.variantCount || 0) + 1;
      const priced = item.quantity > 0 && Number.isFinite(item.min_price);
      const oldPriced = old && old.quantity > 0 && Number.isFinite(old.min_price);
      const winner = !old || (priced && (!oldPriced || item.min_price < old.min_price)) ? item : old;
      groups.set(key, { ...winner, familyName: key, variantCount: count,
        groupQuantity: (old?.groupQuantity || 0) + (item.quantity || 0),
        variants: [...(old?.variants || []), item] });
    }
    result = [...groups.values()].map((group) => ({ ...group,
      variants: group.variants.sort((a,b) => (a.quantity > 0 ? a.min_price ?? Infinity : Infinity) - (b.quantity > 0 ? b.min_price ?? Infinity : Infinity)) }));
  }
  const sort = params.get("sort");
  result.sort(
    sort === "low"
      ? (a, b) => (a.min_price ?? Infinity) - (b.min_price ?? Infinity)
      : sort === "high"
        ? (a, b) => (b.min_price ?? -1) - (a.min_price ?? -1)
        : sort === "name" ? (a,b) => (a.familyName || a.market_hash_name).localeCompare(b.familyName || b.market_hash_name)
        : (a, b) => (b.groupQuantity ?? b.quantity) - (a.groupQuantity ?? a.quantity),
  );
  return {
    models,
    categories: categoryCounts,
    total: result.length,
    items: result.slice(
      0,
      Math.max(1, Math.min(Number(params.get("limit")) || 100, 10000)),
    ),
  };
}
