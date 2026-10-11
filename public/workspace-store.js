import { account, ready, workspaceCloud } from "./account.js";
import { freshWorkspace, validateWorkspace } from "./workspace-core.js";
let key,
  state,
  changedAccount = false;
document.addEventListener("cskit-account-changed", () => {
  changedAccount = true;
});
export async function loadWorkspace() {
  await ready;
  if (account.error)
    throw Error(
      "Account connection unavailable. Reload before opening your private workspace.",
    );
  key = "cskit.workspace.v1." + (account.user?.uid || "guest");
  const raw = localStorage.getItem(key);
  state = raw ? validateWorkspace(JSON.parse(raw)) : freshWorkspace();
  const draft = localStorage.getItem(key + ".draft");
  if (draft)
    return { data: validateWorkspace(JSON.parse(draft)), offline: true };
  if (account.user) {
    try {
      state = await workspaceCloud();
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      return { data: structuredClone(state), offline: true };
    }
  }
  return { data: structuredClone(state), offline: false };
}
async function commitWorkspace(next) {
  if (changedAccount)
    throw Error("Account changed. Export your edits and reload.");
  validateWorkspace(next);
  if (account.user) {
    try {
      next = await workspaceCloud(next);
      localStorage.removeItem(key + ".draft");
    } catch (e) {
      localStorage.setItem(key + ".draft", JSON.stringify(next));
      throw e;
    }
  } else {
    const current = JSON.parse(localStorage.getItem(key) || "null");
    if ((current?.revision || 0) !== next.revision)
      throw Error(
        "Another tab saved newer changes. Export your edits, then reload and import them as copies.",
      );
    next = { ...next, revision: next.revision + 1 };
  }
  localStorage.setItem(key, JSON.stringify(next));
  state = next;
  return structuredClone(next);
}
export async function saveWorkspace(next) {
  if (navigator.locks)
    return navigator.locks.request(key, () => commitWorkspace(next));
  return commitWorkspace(next);
}
export function downloadWorkspace(data) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "cskit-workspace.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function reloadCloudWorkspace() {
  if (changedAccount) throw Error("Account changed. Reload this page.");
  const next = await workspaceCloud();
  localStorage.setItem(key, JSON.stringify(next));
  localStorage.removeItem(key + ".draft");
  state = next;
  return structuredClone(next);
}
