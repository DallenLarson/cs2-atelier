import { hosted, hostedRequest } from "./hosted.js";
import {
  validateLibrary,
  validateWishlist,
  mergeLocalData,
} from "./account-core.js";

let auth,
  db,
  authSdk,
  store,
  initialUid,
  changedIdentity = false;
export const account = { user: null, configured: false, error: null };
export async function localRequest(url, body) {
  if (hosted) return hostedRequest(url, body);
  const response = await fetch(
    url,
    body === undefined
      ? {}
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  const value = await response.json();
  if (!response.ok)
    throw Object.assign(Error(value.error || "Request failed."), {
      status: response.status,
    });
  return value;
}
export const ready = (async () => {
  try {
    const config = await localRequest("/api/firebase-config");
    if (!config.enabled) return account;
    account.configured = true;
    const [app, authentication, firestore] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js"),
    ]);
    authSdk = authentication;
    store = firestore;
    const instance = app.initializeApp(config.firebaseConfig);
    auth = authSdk.getAuth(instance);
    db = store.getFirestore(instance);
    await auth.authStateReady();
    account.user = auth.currentUser;
    initialUid = account.user?.uid ?? null;
    authSdk.onAuthStateChanged(auth, (user) => {
      if ((user?.uid ?? null) !== initialUid) {
        changedIdentity = true;
        document.dispatchEvent(new CustomEvent("cskit-account-changed"));
      }
    });
  } catch (e) {
    account.error = e;
  }
  document
    .querySelectorAll("[data-account-label]")
    .forEach(
      (el) => (el.textContent = account.user ? "My account" : "Sign in"),
    );
  document
    .querySelectorAll("[data-storage-label]")
    .forEach(
      (el) =>
        (el.textContent = account.user
          ? "Saved to your account."
          : hosted
            ? "Saved in this browser."
            : "Saved on this computer."),
    );
  return account;
})();
function session() {
  if (account.error)
    throw Error(
      "Account connection unavailable. Reload to retry; no data was switched to guest mode.",
    );
  if (changedIdentity || (auth && auth.currentUser?.uid !== account.user?.uid))
    throw Error(
      "Your account changed in another window. Export unsaved edits and reload.",
    );
}
export function storageLabel() {
  return account.user
    ? "Saved to your account"
    : hosted
      ? "Saved in this browser"
      : "Saved on this computer";
}
export async function signIn() {
  await ready;
  if (!auth) throw Error("Google sign-in is not connected yet.");
  const provider = new authSdk.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  await authSdk.signInWithPopup(auth, provider);
  location.assign(location.pathname + location.search + location.hash);
}
export async function signOut() {
  await ready;
  await authSdk.signOut(auth);
  location.assign("/" + location.search);
}
function ref(kind) {
  session();
  if (!account.user) throw Error("Sign in first.");
  return store.doc(db, "users", account.user.uid, "private", kind);
}
const emptyStudio = () => ({ revision: 0, profiles: [], activeId: null });
async function read(kind) {
  const doc = await store.getDocFromServer(ref(kind));
  session();
  const data = doc.exists()
    ? doc.data()
    : kind === "studio"
      ? emptyStudio()
      : { wishlist: [] };
  return kind === "studio" ? validateLibrary(data) : validateWishlist(data);
}
export async function request(url, body) {
  await ready;
  session();
  if (!account.user) {
    if (
      body !== undefined &&
      ["/api/studio", "/api/wishlist"].includes(
        new URL(url, location.origin).pathname,
      ) &&
      !(await ensureWorkspace())
    )
      throw Error("Save cancelled. Choose an account or local guest to save.");
    return localRequest(url, body);
  }
  const parsed = new URL(url, location.origin),
    kind = parsed.pathname;
  if (kind === "/api/studio") {
    if (body === undefined) return read("studio");
    validateLibrary(body);
    return store.runTransaction(db, async (tx) => {
      const target = ref("studio"),
        old = await tx.get(target);
      session();
      const revision = old.exists() ? old.data().revision : 0;
      if (body.revision !== revision)
        throw Object.assign(
          Error(
            "Another window saved newer changes. Export this build, then reload.",
          ),
          { status: 409 },
        );
      tx.set(target, { ...body, revision: revision + 1 });
      return { revision: revision + 1 };
    });
  }
  if (kind === "/api/state") {
    const [market, wishlist] = await Promise.all([
      localRequest("/api/state"),
      read("wishlist"),
    ]);
    return { ...market, wishlist: wishlist.wishlist };
  }
  if (kind === "/api/wishlist") {
    return store.runTransaction(db, async (tx) => {
      const target = ref("wishlist"),
        old = await tx.get(target);
      session();
      const current = old.exists()
        ? validateWishlist(old.data())
        : { wishlist: [] };
      const wishlist = current.wishlist.filter((w) => w.name !== body.name);
      if (!body.remove)
        wishlist.push({
          name: body.name,
          target: body.target ?? null,
          added:
            current.wishlist.find((w) => w.name === body.name)?.added ??
            Date.now(),
        });
      const next = validateWishlist({ wishlist });
      tx.set(target, next);
      return next;
    });
  }
  if (
    kind === "/api/items" &&
    parsed.searchParams.get("category") === "wishlist"
  ) {
    const saved = await read("wishlist");
    const quotes = await localRequest("/api/quotes", {
      names: saved.wishlist.map((w) => w.name),
    });
    const q = (parsed.searchParams.get("q") || "").toLowerCase();
    const items = quotes.items.filter((i) =>
        i.market_hash_name.toLowerCase().includes(q),
      ),
      sort = parsed.searchParams.get("sort");
    items.sort(
      sort === "low"
        ? (a, b) => (a.min_price ?? Infinity) - (b.min_price ?? Infinity)
        : sort === "high"
          ? (a, b) => (b.min_price ?? -1) - (a.min_price ?? -1)
          : (a, b) => b.quantity - a.quantity,
    );
    return {
      total: items.length,
      items: items.slice(0, Number(parsed.searchParams.get("limit")) || 100),
    };
  }
  if (kind === "/api/export") {
    const [wishlist, studio] = await Promise.all([
      read("wishlist"),
      read("studio"),
    ]);
    return { ...wishlist, studio, exportedAt: new Date().toISOString() };
  }
  if (kind === "/api/detail") {
    const detail = await localRequest(url);
    return { ...detail, history: [] };
  }
  return localRequest(url, body);
}
export async function importLocal() {
  await ready;
  session();
  if (!account.user) throw Error("Sign in first.");
  const [localWishlist, localStudio] = await Promise.all([
    localRequest("/api/state"),
    localRequest("/api/studio"),
  ]);
  return store.runTransaction(db, async (tx) => {
    const wref = ref("wishlist"),
      sref = ref("studio");
    const [w, s] = await Promise.all([tx.get(wref), tx.get(sref)]);
    session();
    const cloudStudio = s.exists() ? s.data() : emptyStudio();
    const result = mergeLocalData(
      w.exists() ? w.data() : { wishlist: [] },
      cloudStudio,
      localWishlist,
      localStudio,
    );
    tx.set(wref, result.wishlist);
    tx.set(sref, { ...result.studio, revision: cloudStudio.revision + 1 });
    return result;
  });
}
export async function exportBackup() {
  const value = await request("/api/export");
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "cskit-backup.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// One explicit guest choice per tab session; browsing never requires an account.
let accountPrompt;
export async function ensureWorkspace() {
  await ready;
  session();
  if (account.user || sessionStorage.getItem("cskit.guest") === "chosen")
    return true;
  return openAccount();
}
export async function openAccount() {
  await ready;
  if (accountPrompt) return accountPrompt;
  accountPrompt = new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.className = "account-dialog";
    dialog.setAttribute("aria-labelledby", "account-dialog-title");
    dialog.innerHTML = `<button class="dialog-dismiss" aria-label="Close account dialog">×</button><img class="dialog-logo" src="/cskit-icon-dark.png" alt="" width="64" height="64"><h2 id="account-dialog-title"></h2><p class="dialog-description"></p><button class="primary dialog-google">Continue with Google</button><button class="button dialog-guest">Continue as local guest</button><p class="dialog-note">Guest saves stay in this browser. Google sign-in keeps your wishlist and loadouts in your account.</p><p class="dialog-error" role="alert" hidden></p>`;
    const signedIn = !!account.user;
    dialog.querySelector("h2").textContent = signedIn
      ? "Your CSKit account"
      : "Make CSKit your own.";
    dialog.querySelector(".dialog-description").textContent = signedIn
      ? account.user.email || account.user.displayName || "Signed in"
      : "Sign up or sign in with Google in one step, or keep your setup local. Your choice.";
    const google = dialog.querySelector(".dialog-google");
    google.textContent = signedIn ? "Sign out" : "Continue with Google";
    google.disabled = !account.configured || !!account.error;
    const guest = dialog.querySelector(".dialog-guest");
    guest.hidden = signedIn || !!account.error;
    if (signedIn)
      dialog.querySelector(".dialog-note").textContent =
        "Your wishlist and loadouts are saved to your account. Local guest data remains separate.";
    if (account.error || !account.configured) {
      const error = dialog.querySelector(".dialog-error");
      error.hidden = false;
      error.textContent = account.error
        ? "Account connection unavailable. Reload to retry safely."
        : "Google sign-in is unavailable here. You can continue locally.";
    }
    let accepted = false;
    guest.onclick = () => {
      sessionStorage.setItem("cskit.guest", "chosen");
      accepted = true;
      dialog.close();
    };
    google.onclick = async () => {
      google.disabled = true;
      try {
        await (signedIn ? signOut() : signIn());
      } catch (e) {
        const error = dialog.querySelector(".dialog-error");
        error.hidden = false;
        error.textContent =
          e.code === "auth/popup-closed-by-user"
            ? "Sign-in closed. Try again or continue locally."
            : "Sign-in could not finish. Please try again.";
        google.disabled = false;
      }
    };
    dialog.querySelector(".dialog-dismiss").onclick = () => dialog.close();
    dialog.addEventListener(
      "close",
      () => {
        dialog.remove();
        accountPrompt = null;
        resolve(accepted);
      },
      { once: true },
    );
    document.body.append(dialog);
    dialog.showModal();
  });
  return accountPrompt;
}
ready.then(() => {
  const control = document.querySelector("#account-control");
  if (!control) return;
  control.onclick = () => openAccount();
  const name = account.user?.displayName || "My account";
  control.querySelector(".account-control-label").textContent = account.user
    ? name.split(" ")[0]
    : "Sign in";
  control.setAttribute(
    "aria-label",
    account.user ? `Open account for ${name}` : "Sign up or sign in",
  );
  const avatar = control.querySelector(".profile-photo");
  if (account.user) {
    avatar.textContent = name.slice(0, 1).toUpperCase();
    try {
      const url = new URL(account.user.photoURL);
      if (
        url.protocol === "https:" &&
        url.hostname.endsWith(".googleusercontent.com")
      ) {
        const img = document.createElement("img");
        img.src = url.href;
        img.alt = "";
        img.referrerPolicy = "no-referrer";
        img.onerror = () => {
          avatar.textContent = name.slice(0, 1).toUpperCase();
        };
        avatar.replaceChildren(img);
      }
    } catch {}
  }
  document
    .querySelector("#guest-link")
    ?.addEventListener("click", () =>
      sessionStorage.setItem("cskit.guest", "chosen"),
    );
});
