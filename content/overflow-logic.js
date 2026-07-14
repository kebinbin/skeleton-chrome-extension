(() => {
  const OVERFLOW_TOLERANCE = 3;
  const CLIPPING_VALUES = new Set(["hidden", "clip"]);
  const SCROLL_CONTAINER_VALUES = new Set(["auto", "scroll"]);

  function isClippingValue(value) {
    return CLIPPING_VALUES.has(value);
  }

  function hasReliableBox(display) {
    return !["none", "contents", "inline"].includes(display);
  }

  function scanBudgetExceeded(
    scannedCount,
    elapsedMilliseconds,
    budgetMilliseconds,
    checkInterval = 100,
  ) {
    return (
      scannedCount > 0 &&
      scannedCount % checkInterval === 0 &&
      elapsedMilliseconds >= budgetMilliseconds
    );
  }

  function classifyOverflow({
    isDocumentElement,
    horizontalDelta,
    verticalDelta,
    overflowX,
    overflowY,
    position,
    rectRight,
    viewportWidth,
    pageScrollsHorizontally,
  }) {
    const states = [];
    const horizontal = horizontalDelta > OVERFLOW_TOLERANCE;
    const vertical = verticalDelta > OVERFLOW_TOLERANCE;

    if (!isDocumentElement && horizontal && isClippingValue(overflowX)) {
      states.push("clipped-x");
    }
    if (!isDocumentElement && vertical && isClippingValue(overflowY)) {
      states.push("clipped-y");
    }

    const extendsViewport =
      rectRight > viewportWidth + OVERFLOW_TOLERANCE;
    const canContributeToPageScroll =
      position !== "fixed" && !SCROLL_CONTAINER_VALUES.has(overflowX);
    if (
      pageScrollsHorizontally &&
      canContributeToPageScroll &&
      (extendsViewport || (horizontal && overflowX === "visible"))
    ) {
      states.push("page-x");
    }

    return states;
  }

  globalThis.__skeletonLayoutOverflowLogic = Object.freeze({
    OVERFLOW_TOLERANCE,
    classifyOverflow,
    hasReliableBox,
    isClippingValue,
    scanBudgetExceeded,
  });
})();
