import {
  mkdir,
  readdir,
  readFile,
  writeFile,
  copyFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
await mkdir("dist", { recursive: true });
const art = JSON.parse(await readFile("feed/studio-artwork.json", "utf8"));
const files = (await readdir("public")).sort();
const hash = createHash("sha256");
for (const file of files) hash.update(await readFile("public/" + file));
const version = hash.digest("hex").slice(0, 12);
for (const file of files) {
  if (file.endsWith(".html")) {
    let html = (await readFile("public/" + file, "utf8")).replace(
      '<html lang="en">',
      '<html lang="en" data-hosted="true">',
    );
    html = html.replace(
      /src="\/api\/artwork\?name=([^"&]+)&size=large"/g,
      (_, name) => `src="${art[decodeURIComponent(name)] || ""}"`,
    );
    html = html.replace(
      /(src|href)="(\/[^"?]+\.(?:js|css))"/g,
      '$1="$2?v=' + version + '"',
    );
    // Version internal navigation too: old HTML may still be fresh in a visitor's
    // browser from a previous release. Canonical URLs remain query-free.
    html = html.replace(
      /href="(\/(?:market|studio|account|performance)?)(#[^"]*)?"/g,
      (_, route, fragment = "") => `href="${route}?v=${version}${fragment}"`,
    );
    html = html
      .replaceAll("Saved on this computer.", "Saved in this browser.")
      .replaceAll("on this computer", "in this browser")
      .replaceAll("this computer", "this browser")
      .replaceAll("Local workspace", "Browser workspace")
      .replace(
        "Refreshes every 5 minutes while running",
        "Automatic market snapshots · timing may vary",
      );
    await writeFile(
      "dist/" +
        (file === "index.html"
          ? "market.html"
          : file === "hub.html"
            ? "index.html"
            : file),
      html,
    );
  } else if (file.endsWith(".js")) {
    const js = (await readFile("public/" + file, "utf8")).replace(
      /(["'])(\.\/[^"']+\.js)\1/g,
      "$1$2?v=" + version + "$1",
    );
    await writeFile("dist/" + file, js);
  } else await copyFile("public/" + file, "dist/" + file);
}
const config = JSON.parse(await readFile("firebase-web.json", "utf8"));
if (!config.apiKey || !config.projectId || !config.appId)
  throw Error("Firebase web configuration missing.");
await writeFile(
  "dist/firebase-config.json",
  JSON.stringify({ enabled: true, firebaseConfig: config }),
);
await copyFile("feed/market.json", "dist/market-snapshot.json");
await copyFile("feed/studio-artwork.json", "dist/studio-artwork.json");
await writeFile(
  "dist/robots.txt",
  "User-agent: *\nAllow: /\nSitemap: https://cskit.site/sitemap.xml\n",
);
await writeFile(
  "dist/sitemap.xml",
  '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    ["/", "/market", "/studio", "/performance"]
      .map((p) => `<url><loc>https://cskit.site${p}</loc></url>`)
      .join("") +
    "</urlset>",
);
await writeFile(
  "dist/404.html",
  '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Not found — CSKit</title><link rel="stylesheet" href="/style.css"><main><h1>This page has left the server.</h1><p><a href="/">Back to CSKit →</a></p></main></html>',
);
console.log("CSKit production build ready in dist/.");
