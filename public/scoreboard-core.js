import { parsePlayer } from "./performance-core.js";
import { SCORES } from "./friends-core.js";
export function validateBoard(value) {
  if (
    !value ||
    typeof value.name !== "string" ||
    !value.name.trim() ||
    value.name.length > 60 ||
    typeof value.mine !== "string" ||
    !Array.isArray(value.friends) ||
    value.friends.length > 20 ||
    !Object.hasOwn(SCORES, value.metric)
  )
    throw Error("Enter a name, your profile and at most 20 friends.");
  const clean = (input) => {
    const p = parsePlayer(input);
    return p.value;
  };
  const mine = clean(value.mine);
  return {
    name: value.name.trim(),
    mine,
    friends: [...new Set(value.friends.map(clean))].filter((id) => id !== mine),
    metric: value.metric,
  };
}
export function ownership(profile, linked) {
  return !!profile && !!linked && profile.steam64_id === linked.steamId;
}
