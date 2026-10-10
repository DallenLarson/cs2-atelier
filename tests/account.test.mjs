import test from "node:test";
import assert from "node:assert/strict";
import {
  mergeLocalData,
  validateLibrary,
  validateWishlist,
} from "../public/account-core.js";
import { freshProfile } from "../public/studio-core.js";
const library = (profiles) => ({
  revision: 0,
  profiles,
  activeId: profiles[0]?.id || null,
});
test("local migration adds missing entries, preserves cloud edits, and is idempotent", () => {
  const cloud = freshProfile(),
    local = { ...cloud, displayName: "Old local name" },
    other = freshProfile();
  const cw = { wishlist: [{ name: "AK-47", target: 12, added: 1 }] },
    lw = {
      wishlist: [
        { name: "AK-47", target: 7, added: 1 },
        { name: "AWP", target: null, added: 2 },
      ],
    };
  const result = mergeLocalData(
    cw,
    library([cloud]),
    lw,
    library([local, other]),
  );
  assert.equal(result.wishlist.wishlist[0].target, 12);
  assert.equal(result.studio.profiles[0].displayName, cloud.displayName);
  assert.equal(result.studio.profiles.length, 2);
  assert.deepEqual(
    mergeLocalData(result.wishlist, result.studio, lw, library([local, other])),
    result,
  );
  assert.equal(cw.wishlist.length, 1);
  assert.equal(lw.wishlist[0].target, 7);
});
test("invalid cloud data is rejected rather than rendered or silently reset", () => {
  assert.throws(() =>
    validateLibrary({ revision: 0, profiles: [null], activeId: null }),
  );
  assert.throws(() =>
    validateLibrary({ revision: -1, profiles: [], activeId: null }),
  );
  assert.throws(() =>
    validateWishlist({ wishlist: [{ name: "AK", target: -1, added: 0 }] }),
  );
  assert.throws(() =>
    validateWishlist({
      wishlist: Array(501).fill({ name: "AK", target: 1, added: 0 }),
    }),
  );
});
test("migration refuses exceeding profile limit without truncating local builds", () => {
  const cloud = library(Array.from({ length: 50 }, freshProfile)),
    local = library([freshProfile()]);
  assert.throws(() =>
    mergeLocalData({ wishlist: [] }, cloud, { wishlist: [] }, local),
  );
  assert.equal(local.profiles.length, 1);
});
