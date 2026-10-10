import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
// This branch contains only the current public feed, never source or user data.
const repo = "DallenLarson/cs2-atelier";
function api(endpoint, method = "GET", body) {
  return JSON.parse(
    execFileSync(
      "gh",
      [
        "api",
        `repos/${repo}/${endpoint}`,
        "--method",
        method,
        ...(body ? ["--input", "-"] : []),
      ],
      {
        input: body ? JSON.stringify(body) : undefined,
        encoding: "utf8",
        maxBuffer: 30000000,
      },
    ),
  );
}
const tree = [];
for (const path of ["market.json", "studio-artwork.json"]) {
  const content = await readFile("feed/" + path, "utf8");
  const blob = api("git/blobs", "POST", { content, encoding: "utf-8" });
  tree.push({ path, mode: "100644", type: "blob", sha: blob.sha });
}
const nextTree = api("git/trees", "POST", { tree });
const commit = api("git/commits", "POST", {
  message: "Refresh public CSKit market snapshot",
  tree: nextTree.sha,
  parents: [],
});
let exists = false;
try {
  api("git/ref/heads/market-data");
  exists = true;
} catch {}
if (exists)
  api("git/refs/heads/market-data", "PATCH", { sha: commit.sha, force: true });
else
  api("git/refs", "POST", { ref: "refs/heads/market-data", sha: commit.sha });
console.log("Current public market feed published:", commit.sha);
