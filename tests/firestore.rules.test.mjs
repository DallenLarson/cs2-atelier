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
      const s = doc(alice, "users/alice/private/studio");
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
