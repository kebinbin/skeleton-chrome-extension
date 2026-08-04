import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

await import("../content/grid-overlay-logic.js");

const { columnBoxes, resolvedTrackSizes } =
  globalThis.__skeletonLayoutGridOverlayLogic;

test("resolved grid columns preserve pixel tracks and ignore line names", () => {
  assert.deepEqual(
    resolvedTrackSizes("[start] 80px [one] 120.5px [two] 80px [end]"),
    [80, 120.5, 80],
  );
  assert.deepEqual(resolvedTrackSizes("subgrid [] [] []"), []);
  assert.deepEqual(resolvedTrackSizes("none"), []);
});

test("grid column boxes include gaps and content-box offsets", () => {
  assert.deepEqual(
    columnBoxes({
      contentLeft: 24,
      contentWidth: 340,
      trackSizes: [100, 100, 100],
      columnGap: 20,
      justifyContent: "start",
    }),
    [
      { left: 24, width: 100 },
      { left: 144, width: 100 },
      { left: 264, width: 100 },
    ],
  );
});

test("grid column boxes honor distributed alignment", () => {
  assert.deepEqual(
    columnBoxes({
      contentLeft: 0,
      contentWidth: 260,
      trackSizes: [100, 100],
      columnGap: 20,
      justifyContent: "space-between",
    }),
    [
      { left: 0, width: 100 },
      { left: 160, width: 100 },
    ],
  );
});

test("overlay canvas uses the scrollbar-excluding viewport width", async () => {
  const overlaySource = await readFile(
    new URL("../content/grid-overlay.js", import.meta.url),
    "utf8",
  );

  assert.match(overlaySource, /width: 100% !important/);
  assert.match(overlaySource, /height: 100% !important/);
  assert.doesNotMatch(overlaySource, /100vw|100vh/);
});
