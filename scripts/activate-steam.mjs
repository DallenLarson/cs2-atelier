import { readFile, writeFile } from "node:fs/promises";
// Run only after deploying the backend and configuring its secret. This does not enable billing.
const endpoint =
  "https://us-central1-atelier-cs2-hub.cloudfunctions.net/steamApi/api/steam/health";
const response = await fetch(endpoint, { signal: AbortSignal.timeout(15000) });
if (!response.ok)
  throw Error("Deploy the Steam service before activating its UI.");
const health = await response.json();
if (!health.enabled || !health.friendsEnabled)
  throw Error("Steam Web API key is not configured.");
const config = JSON.parse(await readFile("firebase.json", "utf8"));
config.hosting.rewrites = config.hosting.rewrites.filter(
  (r) => r.source !== "/api/steam/**",
);
config.hosting.rewrites.unshift({
  source: "/api/steam/**",
  function: { functionId: "steamApi", region: "us-central1" },
});
await writeFile("firebase.json", JSON.stringify(config, null, 2) + "\n");
await writeFile(
  "public/steam-service.json",
  JSON.stringify({ enabled: true }) + "\n",
);
console.log(
  "Steam service verified. Build and deploy Hosting, then commit these configuration changes.",
);
