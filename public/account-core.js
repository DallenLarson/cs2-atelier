import { validateProfile } from "./studio-core.js";

export function validateLibrary(value) {
  if (
    !value ||
    !Number.isSafeInteger(value.revision) ||
    value.revision < 0 ||
    !Array.isArray(value.profiles) ||
    value.profiles.length > 50
  )
    throw Error("Invalid Studio library.");
  for (const profile of value.profiles) {
    const errors = validateProfile(profile);
    if (errors.length) throw Error(errors.join(" "));
  }
  if (new Set(value.profiles.map((p) => p.id)).size !== value.profiles.length)
    throw Error("Duplicate profile IDs.");
  if (
    value.activeId !== null &&
    !value.profiles.some((p) => p.id === value.activeId)
  )
    throw Error("Invalid active build.");
  return value;
}
export function validateWishlist(value) {
  if (!value || !Array.isArray(value.wishlist) || value.wishlist.length > 500)
    throw Error("A wishlist can hold up to 500 items.");
  for (const item of value.wishlist)
    if (
      !item ||
      typeof item.name !== "string" ||
      !item.name.length ||
      item.name.length > 300 ||
      (item.target !== null &&
        (!Number.isFinite(item.target) || item.target <= 0)) ||
      !Number.isFinite(item.added)
    )
      throw Error("Invalid wishlist item.");
  if (new Set(value.wishlist.map((w) => w.name)).size !== value.wishlist.length)
    throw Error("Duplicate wishlist items.");
  return value;
}
export function mergeLocalData(
  cloudWishlist,
  cloudStudio,
  localWishlist,
  localStudio,
) {
  [cloudWishlist, localWishlist].forEach(validateWishlist);
  [cloudStudio, localStudio].forEach(validateLibrary);
  const names = new Set(cloudWishlist.wishlist.map((w) => w.name)),
    ids = new Set(cloudStudio.profiles.map((p) => p.id));
  const wishlist = {
    wishlist: [
      ...cloudWishlist.wishlist,
      ...localWishlist.wishlist.filter((w) => !names.has(w.name)),
    ],
  };
  const studio = {
    ...cloudStudio,
    profiles: [
      ...cloudStudio.profiles,
      ...localStudio.profiles.filter((p) => !ids.has(p.id)),
    ],
  };
  studio.activeId ||= studio.profiles[0]?.id || null;
  validateWishlist(wishlist);
  validateLibrary(studio);
  return { wishlist, studio };
}
