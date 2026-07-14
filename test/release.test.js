import assert from "node:assert/strict";
import test from "node:test";

import {
  collectReleaseFiles,
  createReleaseArchive,
  validateRelease,
} from "../scripts/release.mjs";

test("release inputs are minimal, validated, and rooted at the manifest", async () => {
  const files = await collectReleaseFiles();
  const { paths } = await validateRelease(files);
  assert.equal(paths[0], "background.js");
  assert.ok(paths.includes("manifest.json"));
  assert.ok(paths.includes("images/icon-128.png"));
  assert.ok(paths.every((path) => !path.startsWith("test/")));
  assert.ok(paths.every((path) => !path.startsWith("scripts/")));
  assert.ok(paths.every((path) => !path.endsWith(".svg")));
});

test("release ZIP output is deterministic and contains a central directory", async () => {
  const files = await collectReleaseFiles();
  const first = await createReleaseArchive(files);
  const second = await createReleaseArchive(files);
  assert.deepEqual(first, second);
  assert.equal(first.readUInt32LE(0), 0x04034b50);
  assert.ok(first.includes(Buffer.from("manifest.json")));
  assert.equal(first.readUInt32LE(first.length - 22), 0x06054b50);
});
