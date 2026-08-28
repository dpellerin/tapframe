import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { ensureDevData } from "./ensure-dev-data.mjs";

test("creates development data once and preserves later edits", async (context) => {
  const repoRoot = await mkdtemp(path.join(os.tmpdir(), "tapframe-dev-data-"));
  context.after(() => rm(repoRoot, { force: true, recursive: true }));

  await mkdir(path.join(repoRoot, "data", "logos"), { recursive: true });
  await writeFile(path.join(repoRoot, "data", "taps.yaml"), "title: Sample\n");
  await writeFile(path.join(repoRoot, "data", "logos", "sample.png"), "logo");

  const first = await ensureDevData(repoRoot);
  assert.equal(first.created, true);
  assert.equal(
    await readFile(path.join(repoRoot, ".dev", "data", "taps.yaml"), "utf8"),
    "title: Sample\n",
  );
  assert.equal(
    await readFile(path.join(repoRoot, ".dev", "data", "logos", "sample.png"), "utf8"),
    "logo",
  );

  await writeFile(
    path.join(repoRoot, ".dev", "data", "taps.yaml"),
    "title: My taps\n",
  );
  await writeFile(path.join(repoRoot, "data", "taps.yaml"), "title: New sample\n");

  const second = await ensureDevData(repoRoot);
  assert.equal(second.created, false);
  assert.equal(
    await readFile(path.join(repoRoot, ".dev", "data", "taps.yaml"), "utf8"),
    "title: My taps\n",
  );
});
