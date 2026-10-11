import test from "node:test";
import assert from "node:assert/strict";
import { repository } from "../functions/steam-repository.js";
import { hash } from "../functions/steam-core.js";
test(
  "Steam ownership is atomic, browser-bound, Google-UID-bound and cannot be replayed",
  { skip: !process.env.FIRESTORE_EMULATOR_HOST },
  async () => {
    const { initializeApp, deleteApp } = await import(
      "../functions/node_modules/firebase-admin/lib/app/index.js"
    );
    const { getFirestore } = await import(
      "../functions/node_modules/firebase-admin/lib/firestore/index.js"
    );
    const app = initializeApp({ projectId: "demo-atelier" }, "steam-tests");
    const db = getFirestore(app);
    const repo = repository(db);
    const browser = "b".repeat(64);
    const sid = "76561197969209908";
    async function session(state, uid, nonce) {
      await repo.createSession(state, {
        uid,
        browserHash: hash(browser),
        stage: "started",
        expiresAt: Date.now() + 600000,
      });
      await repo.verify(state, browser, { steamId: sid, nonceHash: nonce });
    }
    try {
      await session("alice-session", "steam-alice", "nonce-alice");
      await assert.rejects(
        repo.finish("steam-bob", "alice-session", browser),
        /Google account/,
      );
      await assert.rejects(
        repo.finish("steam-alice", "alice-session", "c".repeat(64)),
        /same browser/,
      );
      await session("bob-session", "steam-bob", "nonce-bob");
      const attempts = await Promise.allSettled([
        repo.finish("steam-alice", "alice-session", browser),
        repo.finish("steam-bob", "bob-session", browser),
      ]);
      assert.equal(attempts.filter((a) => a.status === "fulfilled").length, 1);
      assert.equal(attempts.filter((a) => a.status === "rejected").length, 1);
      const winner =
          attempts[0].status === "fulfilled" ? "steam-alice" : "steam-bob",
        state = winner === "steam-alice" ? "alice-session" : "bob-session";
      assert.equal((await repo.link(winner)).steamId, sid);
      await assert.rejects(repo.finish(winner, state, browser));
      await repo.unlink(winner);
      assert.equal(await repo.link(winner), null);
      assert.equal((await db.doc("steamOwners/" + sid).get()).exists, false);
      await repo.createSession("replay", {
        uid: winner,
        browserHash: hash(browser),
        stage: "started",
        expiresAt: Date.now() + 600000,
      });
      await assert.rejects(
        repo.verify("replay", browser, {
          steamId: sid,
          nonceHash: "nonce-alice",
        }),
        /already been used/,
      );
    } finally {
      await Promise.all(
        ["steam-alice", "steam-bob"].map((uid) =>
          db.doc(`users/${uid}/private/steam`).delete(),
        ),
      );
      await Promise.all(
        ["alice-session", "bob-session", "replay"].map((id) =>
          db.doc("steamLinkSessions/" + id).delete(),
        ),
      );
      await Promise.all(
        ["nonce-alice", "nonce-bob"].map((id) =>
          db.doc("steamNonces/" + id).delete(),
        ),
      );
      await db.doc("steamOwners/" + sid).delete();
      await deleteApp(app);
    }
  },
);
