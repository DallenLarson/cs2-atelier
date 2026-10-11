import test from "node:test";
import assert from "node:assert/strict";
import { applySeo, pages } from "../scripts/seo.mjs";
test("page metadata replaces stale tags, keeps one canonical and emits valid structured data", () => {
  for (const file of Object.keys(pages)) {
    const html = applySeo(
      '<html><head><title>Old</title><meta property="og:title" content="Old"/><link rel="canonical" href="https://old.example"/></head></html>',
      file,
    );
    assert.equal((html.match(/<title>/g) || []).length, 1);
    assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
    assert.equal((html.match(/property="og:title"/g) || []).length, 1);
    assert.ok(html.includes("https://cskit.site/social-cskit-v3.png"));
    const json = JSON.parse(
      html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1],
    );
    assert.equal(json["@graph"][1].name, "CSKit");
    if (file === "account.html") assert.ok(html.includes("noindex,follow"));
  }
});
