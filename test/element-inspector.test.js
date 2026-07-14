import assert from "node:assert/strict";
import test from "node:test";

await import("../content/element-inspector-logic.js");

const { countCssTracks, createsStackingContext, layoutDetails, layoutIndicators } =
  globalThis.__skeletonLayoutElementInspectorLogic;

const baseMetrics = Object.freeze({
  isRoot: false,
  display: "block",
  parentDisplay: "block",
  position: "static",
  zIndex: "auto",
  opacity: "1",
  transform: "none",
  filter: "none",
  backdropFilter: "none",
  perspective: "none",
  isolation: "auto",
  mixBlendMode: "normal",
  clipPath: "none",
  mask: "none",
  willChange: "auto",
  contain: "none",
  containerType: "normal",
  overflowX: "visible",
  overflowY: "visible",
  horizontalOverflow: false,
  verticalOverflow: false,
  flexDirection: "row",
  flexWrap: "nowrap",
  rowGap: "normal",
  columnGap: "normal",
  justifyContent: "normal",
  alignItems: "normal",
  gridTemplateColumns: "none",
  gridTemplateRows: "none",
});

test("layout indicators distinguish containers, items, and positioning", () => {
  assert.deepEqual(
    layoutIndicators({
      ...baseMetrics,
      display: "grid",
      parentDisplay: "flex",
      position: "absolute",
    }),
    ["Grid", "Flex item", "Absolute"],
  );
});

test("scroll and clipping indicators report their active axes", () => {
  assert.deepEqual(
    layoutIndicators({
      ...baseMetrics,
      overflowX: "auto",
      overflowY: "scroll",
    }),
    ["Scroll XY"],
  );
  assert.deepEqual(
    layoutIndicators({
      ...baseMetrics,
      overflowX: "hidden",
      horizontalOverflow: true,
    }),
    ["Clips X"],
  );
});

test("stacking contexts include the useful cause-adjacent indicators", () => {
  const metrics = {
    ...baseMetrics,
    parentDisplay: "grid",
    zIndex: "4",
  };
  assert.equal(createsStackingContext(metrics), true);
  assert.deepEqual(layoutIndicators(metrics), [
    "Grid item",
    "z: 4",
    "Stacking context",
  ]);
  assert.equal(
    createsStackingContext({ ...baseMetrics, transform: "translateX(0px)" }),
    true,
  );
  assert.equal(createsStackingContext(baseMetrics), false);
});

test("flex details report flow, gaps, and alignment", () => {
  assert.deepEqual(
    layoutDetails({
      ...baseMetrics,
      display: "flex",
      flexDirection: "column",
      flexWrap: "wrap",
      rowGap: "12px",
      columnGap: "8px",
      justifyContent: "space-between",
      alignItems: "center",
    }),
    [
      "flex-direction: column",
      "flex-wrap: wrap",
      "row-gap: 12px",
      "column-gap: 8px",
      "justify-content: space-between",
      "align-items: center",
    ],
  );
});

test("grid details count resolved tracks without counting line names", () => {
  assert.equal(countCssTracks("[start] 120px minmax(0px, 1fr) [end]"), 2);
  assert.equal(countCssTracks("repeat(3, minmax(0px, 1fr))"), 3);
  assert.equal(countCssTracks("none"), 0);
  assert.deepEqual(
    layoutDetails({
      ...baseMetrics,
      display: "grid",
      gridTemplateColumns: "100px 1fr 1fr",
      gridTemplateRows: "80px 120px",
      rowGap: "16px",
      columnGap: "16px",
      justifyContent: "stretch",
      alignItems: "start",
    }),
    [
      "grid-template-columns: 3 tracks",
      "grid-template-rows: 2 tracks",
      "row-gap: 16px",
      "column-gap: 16px",
      "justify-content: stretch",
      "align-items: start",
    ],
  );
});

test("ordinary elements do not receive container detail rows", () => {
  assert.deepEqual(layoutDetails(baseMetrics), []);
});
