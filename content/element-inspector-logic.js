(() => {
  const FLEX_DISPLAYS = new Set(["flex", "inline-flex"]);
  const GRID_DISPLAYS = new Set(["grid", "inline-grid"]);
  const SCROLL_VALUES = new Set(["auto", "scroll"]);
  const CLIP_VALUES = new Set(["hidden", "clip"]);

  const isNotNone = (value) => Boolean(value && value !== "none");
  const includesAny = (value, tokens) =>
    tokens.some((token) => value?.split(/[,\s]+/).includes(token));

  function createsStackingContext(metrics) {
    const positionedWithZIndex =
      metrics.position !== "static" && metrics.zIndex !== "auto";
    const flexOrGridItemWithZIndex =
      (FLEX_DISPLAYS.has(metrics.parentDisplay) ||
        GRID_DISPLAYS.has(metrics.parentDisplay)) &&
      metrics.zIndex !== "auto";

    return (
      metrics.isRoot ||
      ["fixed", "sticky"].includes(metrics.position) ||
      positionedWithZIndex ||
      flexOrGridItemWithZIndex ||
      Number.parseFloat(metrics.opacity) < 1 ||
      isNotNone(metrics.transform) ||
      isNotNone(metrics.filter) ||
      isNotNone(metrics.backdropFilter) ||
      isNotNone(metrics.perspective) ||
      metrics.isolation === "isolate" ||
      (metrics.mixBlendMode && metrics.mixBlendMode !== "normal") ||
      isNotNone(metrics.clipPath) ||
      isNotNone(metrics.mask) ||
      includesAny(metrics.willChange, [
        "opacity",
        "transform",
        "filter",
        "perspective",
      ]) ||
      includesAny(metrics.contain, ["layout", "paint", "strict", "content"]) ||
      ["size", "inline-size"].includes(metrics.containerType)
    );
  }

  function axisLabel(prefix, axes) {
    if (axes.length === 2) return `${prefix} XY`;
    return `${prefix} ${axes[0].toUpperCase()}`;
  }

  function layoutIndicators(metrics) {
    const indicators = [];

    if (FLEX_DISPLAYS.has(metrics.display)) indicators.push("Flex");
    if (GRID_DISPLAYS.has(metrics.display)) indicators.push("Grid");
    if (FLEX_DISPLAYS.has(metrics.parentDisplay)) indicators.push("Flex item");
    if (GRID_DISPLAYS.has(metrics.parentDisplay)) indicators.push("Grid item");

    if (metrics.position && metrics.position !== "static") {
      indicators.push(
        `${metrics.position[0].toUpperCase()}${metrics.position.slice(1)}`,
      );
    }

    const scrollAxes = [];
    if (SCROLL_VALUES.has(metrics.overflowX)) scrollAxes.push("x");
    if (SCROLL_VALUES.has(metrics.overflowY)) scrollAxes.push("y");
    if (scrollAxes.length > 0) {
      indicators.push(axisLabel("Scroll", scrollAxes));
    }

    const clippedAxes = [];
    if (metrics.horizontalOverflow && CLIP_VALUES.has(metrics.overflowX)) {
      clippedAxes.push("x");
    }
    if (metrics.verticalOverflow && CLIP_VALUES.has(metrics.overflowY)) {
      clippedAxes.push("y");
    }
    if (clippedAxes.length > 0) {
      indicators.push(axisLabel("Clips", clippedAxes));
    }

    if (metrics.zIndex && metrics.zIndex !== "auto") {
      indicators.push(`z: ${metrics.zIndex}`);
    }
    if (createsStackingContext(metrics)) indicators.push("Stacking context");

    return indicators;
  }

  function countCssTracks(value) {
    const source = String(value ?? "").trim();
    if (!source || ["none", "subgrid", "masonry"].includes(source)) return 0;

    const tracks = [];
    let token = "";
    let parenthesisDepth = 0;
    let bracketDepth = 0;
    for (const character of source) {
      if (/\s/.test(character) && parenthesisDepth === 0 && bracketDepth === 0) {
        if (token) tracks.push(token);
        token = "";
        continue;
      }
      token += character;
      if (character === "(") parenthesisDepth += 1;
      if (character === ")") parenthesisDepth = Math.max(0, parenthesisDepth - 1);
      if (character === "[") bracketDepth += 1;
      if (character === "]") bracketDepth = Math.max(0, bracketDepth - 1);
    }
    if (token) tracks.push(token);

    return tracks.reduce((count, track) => {
      if (track.startsWith("[")) return count;
      const repeat = track.match(/^repeat\(\s*(\d+)\s*,([\s\S]+)\)$/i);
      return repeat
        ? count + Number(repeat[1]) * countCssTracks(repeat[2])
        : count + 1;
    }, 0);
  }

  function layoutDetails(metrics) {
    const details = [];
    const flexContainer = FLEX_DISPLAYS.has(metrics.display);
    const gridContainer = GRID_DISPLAYS.has(metrics.display);
    if (!flexContainer && !gridContainer) return details;

    if (flexContainer) {
      details.push(`flex-direction: ${metrics.flexDirection}`);
      details.push(`flex-wrap: ${metrics.flexWrap}`);
    } else {
      const columns = countCssTracks(metrics.gridTemplateColumns);
      const rows = countCssTracks(metrics.gridTemplateRows);
      details.push(`grid-template-columns: ${columns} track${columns === 1 ? "" : "s"}`);
      details.push(`grid-template-rows: ${rows} track${rows === 1 ? "" : "s"}`);
    }

    const rowGap = metrics.rowGap === "normal" ? "0px" : metrics.rowGap;
    const columnGap =
      metrics.columnGap === "normal" ? "0px" : metrics.columnGap;
    details.push(`row-gap: ${rowGap}`);
    details.push(`column-gap: ${columnGap}`);
    details.push(`justify-content: ${metrics.justifyContent}`);
    details.push(`align-items: ${metrics.alignItems}`);
    return details;
  }

  globalThis.__skeletonLayoutElementInspectorLogic = Object.freeze({
    countCssTracks,
    createsStackingContext,
    layoutDetails,
    layoutIndicators,
  });
})();
