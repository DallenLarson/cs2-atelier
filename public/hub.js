import {
  account,
  ready,
  request,
  signIn,
  signOut,
  importLocal,
  exportBackup,
} from "./account.js";
const $ = (s) => document.querySelector(s);
function error(e) {
  $("#hub-error").hidden = false;
  const messages = {
    "auth/popup-blocked":
      "Your browser blocked Google sign-in. Allow the popup and try again.",
    "auth/popup-closed-by-user":
      "Sign-in was cancelled. You can try again or keep browsing as a guest.",
    "auth/unauthorized-domain":
      "This address is not enabled for sign-in yet. Add it to Firebase Authentication’s authorized domains.",
    "permission-denied":
      "Your account could not access its workspace. Check that the private Firestore rules have been deployed.",
    "auth/network-request-failed":
      "Google sign-in could not connect. Check your connection and try again.",
  };
  $("#hub-error").textContent = messages[e.code] || e.message;
}
async function action(button, fn) {
  button.disabled = true;
  $("#hub-error").hidden = true;
  try {
    await fn();
  } catch (e) {
    error(e);
  } finally {
    button.disabled = false;
  }
}
$("#google-signin").onclick = () =>
  action($("#google-signin"), async () => {
    $("#account-note").textContent =
      "Complete sign-in in the Google window. If it does not open here, use this local address in your normal browser.";
    await signIn();
  });
$("#signout").onclick = () => action($("#signout"), signOut);
$("#hub-export").onclick = () => action($("#hub-export"), exportBackup);
$("#import-local").onclick = () =>
  action($("#import-local"), async () => {
    await importLocal();
    $("#account-note").textContent =
      "Local wishlist and builds copied. Originals remain on this computer.";
    await counts();
  });
async function counts() {
  try {
    const [state, studio] = await Promise.all([
      request("/api/state"),
      request("/api/studio"),
    ]);
    $("#market-count").textContent = state.count.toLocaleString();
    $("#wishlist-count").textContent = state.wishlist.length;
    $("#build-count").textContent = studio.profiles.length;
  } catch (e) {
    error(e);
  }
}
await ready;
if (account.error) {
  error(account.error);
  $("#hub-status").textContent = "Account connection unavailable";
  $("#account-note").textContent =
    "Reload to retry. Your account data has not been switched to guest storage.";
} else if (account.user) {
  const name = account.user.displayName?.split(" ")[0] || "Player";
  $("#greeting").textContent = `Welcome back, ${name}.`;
  $("#account-title").textContent = account.user.displayName || "Your account";
  $("#account-kicker").textContent = "YOUR PERSONAL CS2 WORKSPACE";
  $("#account-description").textContent =
    account.user.email || "Signed in with Google";
  $("#sidebar-avatar").textContent = $("#account-avatar").textContent =
    name[0].toUpperCase();
  $("#google-signin").hidden = $("#guest-link").hidden = true;
  $("#signout").hidden = false;
  $("#migration").hidden = false;
  $("#account-note").textContent =
    "Wishlist and builds are saved privately to your account.";
  $("#hub-status").textContent = "Signed in with Google";
  $("#workspace-mode").textContent = "Account workspace · Firebase";
  await counts();
} else {
  $("#google-signin").disabled = !account.configured;
  $("#hub-status").textContent = "Guest workspace";
  $("#account-note").textContent = account.configured
    ? "Signing in also creates your account."
    : "Google sign-in is not connected yet. Guest tools are ready now.";
  await counts();
}
document.addEventListener("atelier-account-changed", () => {
  if (!document.hidden)
    $("#hub-status").textContent = "Account changed · refresh this page";
});
document.querySelector(".hero-art img").onerror = (e) =>
  (e.target.hidden = true);
