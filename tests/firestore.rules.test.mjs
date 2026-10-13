import test from "node:test";
import { readFile } from "node:fs/promises";

test(
  "Firestore isolates accounts, denies guests, validates revisions and data limits",
  { skip: !process.env.FIRESTORE_EMULATOR_HOST },
  async () => {
    const { initializeTestEnvironment, assertFails, assertSucceeds } =
      await import("@firebase/rules-unit-testing");
    const { doc, setDoc, getDoc } = await import("firebase/firestore");
    const env = await initializeTestEnvironment({
      projectId: "demo-atelier",
      firestore: {
        rules: await readFile(
          new URL("../firestore.rules", import.meta.url),
          "utf8",
        ),
      },
    });
    try {
      const alice = env.authenticatedContext("alice").firestore(),
        bob = env.authenticatedContext("bob").firestore(),
        guest = env.unauthenticatedContext().firestore();
      const boardPath = "users/alice/private/scoreboard";
      const board = {revision:1,payload:JSON.stringify({name:"Squad",mine:"76561197969209908",friends:[],metric:"leetify"})};
      await assertSucceeds(setDoc(doc(alice,boardPath),board));
      await assertSucceeds(getDoc(doc(alice,boardPath)));
      await assertFails(getDoc(doc(bob,boardPath)));
      await assertFails(getDoc(doc(guest,boardPath)));
      await assertFails(setDoc(doc(bob,boardPath),board));
      await assertFails(setDoc(doc(alice,boardPath),board));
      await assertFails(setDoc(doc(alice,boardPath),{...board,revision:2,verified:true}));
      await assertFails(setDoc(doc(alice,boardPath),{revision:2,payload:"x".repeat(12001)}));
      await assertSucceeds(setDoc(doc(alice,boardPath),{...board,revision:2}));
      const data = { wishlist: [] };
      await assertSucceeds(
        setDoc(doc(alice, "users/alice/private/wishlist"), data),
      );
      await assertSucceeds(getDoc(doc(alice, "users/alice/private/wishlist")));
      await assertFails(getDoc(doc(bob, "users/alice/private/wishlist")));
      await assertFails(setDoc(doc(bob, "users/alice/private/wishlist"), data));
      await assertFails(getDoc(doc(guest, "users/alice/private/wishlist")));
      await assertFails(
        setDoc(doc(guest, "users/alice/private/wishlist"), data),
      );
      await assertFails(
        setDoc(doc(alice, "users/alice/private/wishlist"), {
          wishlist: Array(501).fill({ name: "x" }),
        }),
      );
      await assertFails(
        setDoc(doc(alice, "users/alice/private/wishlist"), {
          wishlist: [],
          admin: true,
        }),
      );
      await assertFails(
        setDoc(doc(alice, "users/alice/private/unknown"), data),
      );
      // Verified Steam identity and claim state must never be client writable/readable.
      for (const path of [
        "users/alice/private/steam",
        "steamOwners/76561197969209908",
        "steamLinkSessions/state",
        "steamNonces/nonce",
        "steamRateLimits/alice_friends",
      ]) {
        await assertFails(
          setDoc(doc(alice, path), { steamId: "76561197969209908" }),
        );
        await assertFails(getDoc(doc(alice, path)));
      }
      const s = doc(alice, "users/alice/private/studio");
      const workspace = {
        schema: 1,
        revision: 1,
        plans: [],
        sessions: [],
        experiments: [],
        favorites: [],
        widgets: [],
      };
      const workspacePath = "users/alice/private/workspace";
      await assertSucceeds(setDoc(doc(alice, workspacePath), workspace));
      await assertFails(getDoc(doc(bob, workspacePath)));
      await assertFails(getDoc(doc(guest, workspacePath)));
      await assertFails(
        setDoc(doc(bob, workspacePath), { ...workspace, revision: 2 }),
      );
      await assertFails(setDoc(doc(alice, workspacePath), workspace));
      await assertSucceeds(
        setDoc(doc(alice, workspacePath), { ...workspace, revision: 2 }),
      );
      await assertFails(
        setDoc(doc(alice, workspacePath), {
          ...workspace,
          revision: 3,
          sessions: Array(501).fill({}),
        }),
      );
      await assertFails(
        setDoc(s, { revision: 0, profiles: [], activeId: null }),
      );
      await assertSucceeds(
        setDoc(s, { revision: 1, profiles: [], activeId: null }),
      );
      await assertFails(
        setDoc(s, { revision: 1, profiles: [], activeId: null }),
      );
      await assertSucceeds(
        setDoc(s, { revision: 2, profiles: [], activeId: null }),
      );
      await assertFails(
        setDoc(doc(bob, "users/alice/private/studio"), {
          revision: 3,
          profiles: [],
          activeId: null,
        }),
      );
    } finally {
      await env.cleanup();
    }
  },
);
