import assert from "node:assert/strict";
import test from "node:test";

await import("../content/overflow-logic.js");

const { classifyOverflow, hasReliableBox, scanBudgetExceeded } =
  globalThis.__skeletonLayoutOverflowLogic;

const baseMetrics = Object.freeze({
  isDocumentElement: false,
  horizontalDelta: 0,
  verticalDelta: 0,
  overflowX: "visible",
  overflowY: "visible",
  position: "static",
  rectRight: 800,
  viewportWidth: 1024,
  pageScrollsHorizontally: false,
});

test("ordinary inline elements are excluded from overflow geometry", () => {
  assert.equal(hasReliableBox("inline"), false);
  assert.equal(hasReliableBox("inline-block"), true);
  assert.equal(hasReliableBox("block"), true);
});

test("small metric differences and intentional scroll containers are ignored", () => {
  assert.deepEqual(
    classifyOverflow({
      ...baseMetrics,
      horizontalDelta: 2,
      verticalDelta: 3,
      overflowX: "hidden",
      overflowY: "hidden",
    }),
    [],
  );
  assert.deepEqual(
    classifyOverflow({
      ...baseMetrics,
      horizontalDelta: 200,
      overflowX: "auto",
      rectRight: 1400,
      pageScrollsHorizontally: true,
    }),
    [],
  );
});

test("clipped content is reported without flagging normal visible overflow", () => {
  assert.deepEqual(
    classifyOverflow({
      ...baseMetrics,
      horizontalDelta: 20,
      verticalDelta: 12,
      overflowX: "hidden",
      overflowY: "clip",
    }),
    ["clipped-x", "clipped-y"],
  );
  assert.deepEqual(
    classifyOverflow({
      ...baseMetrics,
      horizontalDelta: 20,
      verticalDelta: 12,
    }),
    [],
  );
});

test("only eligible elements contributing to page scrolling get page-x", () => {
  assert.deepEqual(
    classifyOverflow({
      ...baseMetrics,
      rectRight: 1300,
      pageScrollsHorizontally: true,
    }),
    ["page-x"],
  );
  assert.deepEqual(
    classifyOverflow({
      ...baseMetrics,
      position: "fixed",
      rectRight: 1300,
      pageScrollsHorizontally: true,
    }),
    [],
  );
});

test("large-page scan budgets are checked in bounded batches", () => {
  assert.equal(scanBudgetExceeded(99, 40, 20), false);
  assert.equal(scanBudgetExceeded(100, 19, 20), false);
  assert.equal(scanBudgetExceeded(100, 20, 20), true);
  assert.equal(scanBudgetExceeded(200, 25, 20), true);
});
