import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  copyFile,
  writeFile,
  readFile,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import net from "node:net";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { freshProfile } from "../public/studio-core.js";

test("Studio API persists across restart, rejects invalid writes and stale revisions", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "atelier-studio-test-"));
  let child;
  async function stop() {
    if (child && child.exitCode === null) {
      const ended = once(child, "exit");
      child.kill();
      await ended;
    }
    child = null;
  }
  try {
    await mkdir(path.join(root, "public"));
    for (const file of [
      "server.mjs",
      "artwork.mjs",
      "public/studio-core.js",
      "package.json",
    ])
      await copyFile(
        new URL("../" + file, import.meta.url),
        path.join(root, file),
      );
    await writeFile(
      path.join(root, "offline.mjs"),
      'globalThis.fetch=async()=>new Response("offline test",{status:503});',
    );
    const probe = net.createServer();
    probe.listen(0, "127.0.0.1");
    await once(probe, "listening");
    const port = probe.address().port;
    await new Promise((resolve) => probe.close(resolve));
    const base = `http://127.0.0.1:${port}`;
    async function start() {
      child = spawn(
        process.execPath,
        [
          "--import",
          pathToFileURL(path.join(root, "offline.mjs")).href,
          path.join(root, "server.mjs"),
        ],
        { env: { ...process.env, PORT: String(port) }, stdio: "ignore" },
      );
      for (let i = 0; i < 80; i++) {
        try {
          const r = await fetch(base + "/api/studio");
          if (r.ok) return await r.json();
        } catch {}
        await delay(50);
      }
      throw Error("Test server did not start");
    }
    const post = (body, origin = base) =>
      fetch(base + "/api/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: origin },
        body: JSON.stringify(body),
      });
    assert.deepEqual(await start(), {
      revision: 0,
      profiles: [],
      activeId: null,
    });
    const profile = freshProfile();
    profile.options.volume = { mode: "set", value: 0, source: "manual" };
    const body = { revision: 0, profiles: [profile], activeId: profile.id };
    assert.equal((await post(body, "https://example.com")).status, 403);
    assert.equal(
      (await post({ ...body, profiles: [{ ...profile, dpi: -1 }] })).status,
      400,
    );
    assert.equal((await post(body)).status, 200);
    assert.equal((await post(body)).status, 409);
    assert.equal(
      JSON.parse(await readFile(path.join(root, "data/studio.json"), "utf8"))
        .profiles[0].options.volume.value,
      0,
    );
    await stop();
    const saved = await start();
    assert.equal(saved.revision, 1);
    assert.deepEqual(saved.profiles, [profile]);
    const backup = await (await fetch(base + "/api/export")).json();
    assert.deepEqual(backup.studio, saved);
  } finally {
    await stop();
    await rm(root, { recursive: true, force: true });
  }
});
