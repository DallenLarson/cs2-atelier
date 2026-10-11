import { fail, sessionValid } from "./steam-core.js";
export function repository(db) {
  const linkRef = (uid) => db.doc(`users/${uid}/private/steam`);
  const sessionRef = (state) => db.doc(`steamLinkSessions/${state}`);
  return {
    async link(uid) {
      return (await linkRef(uid).get()).data() || null;
    },
    async createSession(state, data) {
      await sessionRef(state).create({
        ...data,
        expireAt: new Date(data.expiresAt),
      });
    },
    async session(state) {
      return (await sessionRef(state).get()).data();
    },
    async throttle(uid, action, delay) {
      await db.runTransaction(async (tx) => {
        const ref = db.doc(`steamRateLimits/${uid}_${action}`),
          old = await tx.get(ref),
          now = Date.now();
        if (old.exists && old.data().nextAt > now)
          throw fail(
            "RATE_LIMIT",
            "Please wait a minute before trying again.",
            429,
          );
        tx.set(ref, {
          nextAt: now + delay,
          expireAt: new Date(now + 86400000),
        });
      });
    },
    async verify(state, browserSecret, identity) {
      await db.runTransaction(async (tx) => {
        const ref = sessionRef(state),
          snap = await tx.get(ref),
          current = snap.data();
        sessionValid(current, browserSecret);
        if (current.stage !== "started")
          throw fail("REPLAY", "This Steam response has already been used.");
        const nonce = db.doc(`steamNonces/${identity.nonceHash}`),
          seen = await tx.get(nonce);
        if (seen.exists)
          throw fail("REPLAY", "This Steam response has already been used.");
        tx.create(nonce, { expireAt: new Date(Date.now() + 600000) });
        tx.update(ref, { stage: "verified", steamId: identity.steamId });
      });
    },
    async finish(uid, state, browserSecret) {
      return db.runTransaction(async (tx) => {
        const ref = sessionRef(state),
          session = (await tx.get(ref)).data();
        sessionValid(session, browserSecret);
        if (session.uid !== uid || session.stage !== "verified")
          throw fail(
            "LINK_MISMATCH",
            "Sign in with the Google account that started this connection.",
            403,
          );
        const target = linkRef(uid),
          ownerRef = db.doc(`steamOwners/${session.steamId}`);
        const [existing, owner] = await Promise.all([
          tx.get(target),
          tx.get(ownerRef),
        ]);
        if (owner.exists && owner.data().uid !== uid)
          throw fail(
            "ALREADY_LINKED",
            "This Steam profile is already linked to another CSKit account.",
            409,
          );
        if (existing.exists && existing.data().steamId !== session.steamId)
          throw fail(
            "UNLINK_FIRST",
            "Disconnect your current Steam profile before linking another.",
            409,
          );
        const data = { steamId: session.steamId, linkedAt: Date.now() };
        tx.set(target, data);
        tx.set(ownerRef, { uid });
        tx.delete(ref);
        return data;
      });
    },
    async unlink(uid) {
      await db.runTransaction(async (tx) => {
        const target = linkRef(uid),
          old = await tx.get(target);
        if (old.exists) {
          const owner = db.doc(`steamOwners/${old.data().steamId}`),
            current = await tx.get(owner);
          if (current.data()?.uid === uid) tx.delete(owner);
          tx.delete(target);
        }
      });
    },
  };
}
