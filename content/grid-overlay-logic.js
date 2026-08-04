(() => {
  function cssTrackTokens(value) {
    const source = String(value ?? "").trim();
    if (!source || source === "none" || source.startsWith("subgrid")) {
      return [];
    }

    const tokens = [];
    let token = "";
    let parenthesisDepth = 0;
    let bracketDepth = 0;
    for (const character of source) {
      if (/\s/.test(character) && parenthesisDepth === 0 && bracketDepth === 0) {
        if (token) tokens.push(token);
        token = "";
        continue;
      }
      token += character;
      if (character === "(") parenthesisDepth += 1;
      if (character === ")") parenthesisDepth = Math.max(0, parenthesisDepth - 1);
      if (character === "[") bracketDepth += 1;
      if (character === "]") bracketDepth = Math.max(0, bracketDepth - 1);
    }
    if (token) tokens.push(token);
    return tokens;
  }

  function resolvedTrackSizes(value) {
    return cssTrackTokens(value)
      .filter((token) => !token.startsWith("["))
      .map((token) => token.match(/^(-?\d*\.?\d+)px$/i))
      .filter(Boolean)
      .map((match) => Number(match[1]))
      .filter((size) => Number.isFinite(size) && size >= 0);
  }

  function columnBoxes({
    contentLeft,
    contentWidth,
    trackSizes,
    columnGap,
    justifyContent,
  }) {
    if (!Array.isArray(trackSizes) || trackSizes.length < 2) return [];
    const baseGap = Number.isFinite(columnGap) ? Math.max(0, columnGap) : 0;
    const tracksWidth = trackSizes.reduce((sum, size) => sum + size, 0);
    const baseGapsWidth = baseGap * (trackSizes.length - 1);
    const freeSpace = Math.max(0, contentWidth - tracksWidth - baseGapsWidth);
    let offset = 0;
    let extraGap = 0;

    if (["end", "flex-end", "right"].includes(justifyContent)) {
      offset = freeSpace;
    } else if (justifyContent === "center") {
      offset = freeSpace / 2;
    } else if (justifyContent === "space-between" && trackSizes.length > 1) {
      extraGap = freeSpace / (trackSizes.length - 1);
    } else if (justifyContent === "space-around") {
      extraGap = freeSpace / trackSizes.length;
      offset = extraGap / 2;
    } else if (justifyContent === "space-evenly") {
      extraGap = freeSpace / (trackSizes.length + 1);
      offset = extraGap;
    }

    let left = contentLeft + offset;
    return trackSizes.map((width) => {
      const box = { left, width };
      left += width + baseGap + extraGap;
      return box;
    });
  }

  globalThis.__skeletonLayoutGridOverlayLogic = Object.freeze({
    columnBoxes,
    resolvedTrackSizes,
  });
})();
