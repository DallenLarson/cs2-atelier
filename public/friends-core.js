export const SCORES = {
  leetify: "Leetify Rating",
  aim: "Aim",
  positioning: "Positioning",
  utility: "Utility",
};
export function rankFriends(profiles, metric = "leetify") {
  if (!Object.hasOwn(SCORES, metric))
    throw Error("Unknown leaderboard metric.");
  const rows = profiles
    .map((p) => ({
      steamId: p.steam64_id,
      name: p.name,
      score: metric === "leetify" ? p.ranks?.leetify : p.rating?.[metric],
    }))
    .filter(
      (p) =>
        p.steamId && typeof p.score === "number" && Number.isFinite(p.score),
    );
  rows.sort((a, b) => b.score - a.score || a.steamId.localeCompare(b.steamId));
  let rank = 0;
  return rows.map((row, i) => {
    if (i === 0 || row.score !== rows[i - 1].score) rank = i + 1;
    return { ...row, rank };
  });
}
export function friendQueue(self, friends) {
  const valid = (id) => typeof id === "string" && /^7656119\d{10}$/.test(id);
  if (!valid(self) || !Array.isArray(friends) || friends.length > 2000)
    throw Error("Invalid Steam friends response.");
  return [...new Set([self, ...friends.filter(valid)])];
}
