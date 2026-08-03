(() => {
  const INSTANCE_KEY = "__skeletonLayoutGridOverlay";
  const existing = globalThis[INSTANCE_KEY];
  if (existing) {
    existing.refresh();
    return;
  }

  const host = document.createElement("skeleton-layout-grid-overlay");
  const shadow = host.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  const canvas = document.createElement("canvas");
  style.textContent = `
    :host {
      all: initial !important;
      position: fixed !important;
      inset: 0 auto auto 0 !important;
      width: 0 !important;
      height: 0 !important;
      z-index: 2147483646 !important;
      pointer-events: none !important;
    }
    canvas {
      all: initial !important;
      position: fixed !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      pointer-events: none !important;
    }
  `;
  shadow.append(style, canvas);
  document.documentElement.append(host);

  const context = canvas.getContext("2d");
  const { columnBoxes, resolvedTrackSizes } =
    globalThis.__skeletonLayoutGridOverlayLogic;
  const MAX_GRIDS = 120;
  const MAX_SCANNED_ELEMENTS = 12000;
  const MAX_SCAN_TIME_MS = 20;
  const REFRESH_DELAY = 100;
  let destroyed = false;
  let scheduledFrame = 0;
  let refreshTimer = 0;
  let cachedGridElements = [];

  function numberValue(value) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function scanGridElements() {
    const grids = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_ELEMENT,
    );
    const startedAt = performance.now();
    let scannedCount = 0;
    let element = walker.currentNode;
    while (
      element &&
      grids.length < MAX_GRIDS &&
      scannedCount < MAX_SCANNED_ELEMENTS
    ) {
      scannedCount += 1;
      if (element !== host) {
        const computedStyle = getComputedStyle(element);
        if (["grid", "inline-grid"].includes(computedStyle.display)) {
          grids.push(element);
        }
      }
      if (scannedCount % 100 === 0 && performance.now() - startedAt >= MAX_SCAN_TIME_MS) {
        break;
      }
      element = walker.nextNode();
    }
    return grids;
  }

  function visibleGridColumns(viewportWidth, viewportHeight) {
    const grids = [];
    for (const element of cachedGridElements) {
      if (element.isConnected) {
        const computedStyle = getComputedStyle(element);
        if (["grid", "inline-grid"].includes(computedStyle.display)) {
          const rect = element.getBoundingClientRect();
          const trackSizes = resolvedTrackSizes(
            computedStyle.gridTemplateColumns,
          );
          if (
            trackSizes.length > 1 &&
            rect.width > 1 &&
            rect.height > 1 &&
            rect.right > 0 &&
            rect.left < viewportWidth &&
            rect.bottom > 0 &&
            rect.top < viewportHeight
          ) {
            const borderLeft = numberValue(computedStyle.borderLeftWidth);
            const borderRight = numberValue(computedStyle.borderRightWidth);
            const borderTop = numberValue(computedStyle.borderTopWidth);
            const borderBottom = numberValue(computedStyle.borderBottomWidth);
            const paddingLeft = numberValue(computedStyle.paddingLeft);
            const paddingRight = numberValue(computedStyle.paddingRight);
            const paddingTop = numberValue(computedStyle.paddingTop);
            const paddingBottom = numberValue(computedStyle.paddingBottom);
            const contentLeft = rect.left + borderLeft + paddingLeft;
            const contentWidth = Math.max(
              0,
              rect.width -
                borderLeft -
                borderRight -
                paddingLeft -
                paddingRight,
            );
            const top = rect.top + borderTop + paddingTop;
            const bottom = rect.bottom - borderBottom - paddingBottom;
            const boxes = columnBoxes({
              contentLeft,
              contentWidth,
              trackSizes,
              columnGap: numberValue(computedStyle.columnGap),
              justifyContent: computedStyle.justifyContent,
            });
            if (boxes.length > 1) {
              grids.push({ boxes, top, bottom });
            }
          }
        }
      }
    }
    return grids;
  }

  function draw() {
    scheduledFrame = 0;
    if (destroyed || document.visibilityState === "hidden") return;
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight;
    const density = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(viewportWidth * density);
    const pixelHeight = Math.round(viewportHeight * density);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    context.setTransform(density, 0, 0, density, 0, 0);
    context.clearRect(0, 0, viewportWidth, viewportHeight);

    const mode = globalThis.__skeletonLayoutGridOverlayOptions?.mode;
    const fullMode = mode === "full";
    context.lineWidth = fullMode ? 1.25 : 1;
    context.strokeStyle = fullMode
      ? "rgba(255, 255, 255, 0.92)"
      : "rgba(0, 111, 238, 0.9)";
    context.fillStyle = fullMode
      ? "rgba(255, 255, 255, 0.035)"
      : "rgba(0, 111, 238, 0.035)";
    context.setLineDash(fullMode ? [5, 4] : [4, 3]);

    for (const { boxes, top, bottom } of visibleGridColumns(
      viewportWidth,
      viewportHeight,
    )) {
      const clippedTop = Math.max(0, top);
      const clippedBottom = Math.min(viewportHeight, bottom);
      if (clippedBottom <= clippedTop) continue;
      for (const box of boxes) {
        context.fillRect(
          box.left,
          clippedTop,
          box.width,
          clippedBottom - clippedTop,
        );
        context.strokeRect(
          box.left + 0.5,
          clippedTop + 0.5,
          Math.max(0, box.width - 1),
          Math.max(0, clippedBottom - clippedTop - 1),
        );
      }
    }
  }

  function scheduleDraw() {
    if (destroyed || scheduledFrame) return;
    scheduledFrame = requestAnimationFrame(draw);
  }

  function scheduleRefresh() {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => {
      cachedGridElements = scanGridElements();
      scheduleDraw();
    }, REFRESH_DELAY);
  }

  function refresh() {
    cachedGridElements = scanGridElements();
    scheduleDraw();
  }

  const mutationObserver = new MutationObserver(scheduleRefresh);
  mutationObserver.observe(document.documentElement, {
    attributes: true,
    childList: true,
    subtree: true,
  });
  window.addEventListener("resize", scheduleRefresh, { passive: true });
  window.addEventListener("scroll", scheduleDraw, {
    capture: true,
    passive: true,
  });

  globalThis[INSTANCE_KEY] = {
    refresh,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      mutationObserver.disconnect();
      window.clearTimeout(refreshTimer);
      if (scheduledFrame) cancelAnimationFrame(scheduledFrame);
      window.removeEventListener("resize", scheduleRefresh);
      window.removeEventListener("scroll", scheduleDraw, true);
      host.remove();
      delete globalThis[INSTANCE_KEY];
    },
  };

  refresh();
})();
