(() => {
  const INSTANCE_KEY = "__skeletonLayoutOverflowOverlay";
  const existing = globalThis[INSTANCE_KEY];
  if (existing) {
    existing.refresh();
    return;
  }

  const host = document.createElement("skeleton-layout-overflow-overlay");
  const shadow = host.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  const canvas = document.createElement("canvas");
  style.textContent = `
    :host {
      all: initial !important;
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 0 !important;
      height: 0 !important;
      z-index: 2147483647 !important;
      pointer-events: none !important;
    }
    canvas {
      all: initial !important;
      position: fixed !important;
      inset: 0 !important;
      z-index: 2147483647 !important;
      width: 100vw !important;
      height: 100vh !important;
      pointer-events: none !important;
    }
  `;
  shadow.append(style, canvas);
  document.documentElement.append(host);

  const context = canvas.getContext("2d");
  const OVERFLOW_COLOR = "#E83B2D";
  const POSSIBLE_CLIP_COLOR = "#B45309";
  const MAX_MARKERS = 300;
  const MAX_CANDIDATES = 1000;
  const MAX_SCANNED_ELEMENTS = 12000;
  const MAX_SCAN_TIME_MS = 20;
  const SCROLL_IDLE_SCAN_MS = 180;
  const MUTATION_SCAN_MS = 120;
  const SAFETY_SCAN_MS = 3000;
  const {
    OVERFLOW_TOLERANCE,
    classifyOverflow,
    hasReliableBox,
    isClippingValue,
    scanBudgetExceeded,
  } = globalThis.__skeletonLayoutOverflowLogic;
  const IGNORED_TAGS = new Set([
    "SCRIPT",
    "STYLE",
    "LINK",
    "META",
    "NOSCRIPT",
    "TEMPLATE",
    "INPUT",
    "TEXTAREA",
    "SELECT",
    "OPTION",
  ]);
  let destroyed = false;
  let scheduledFrame = 0;
  let fullScanTimer = 0;
  let fullScanNeeded = true;
  let cachedMarkers = [];
  let cachedCandidateCount = 0;
  let cachedScanTruncated = false;

  function elementGeometry(element) {
    const styleDeclaration = getComputedStyle(element);
    if (
      styleDeclaration.display === "none" ||
      !hasReliableBox(styleDeclaration.display) ||
      styleDeclaration.visibility === "hidden"
    ) {
      return null;
    }

    const rect = element.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return null;
    return { rect, styleDeclaration };
  }

  function overflowStates(
    element,
    rect,
    styleDeclaration,
    viewportWidth,
    pageScrollsHorizontally,
  ) {
    const isDocumentElement =
      element === document.documentElement || element === document.body;
    return new Set(
      classifyOverflow({
        isDocumentElement,
        horizontalDelta: element.scrollWidth - element.clientWidth,
        verticalDelta: isDocumentElement
          ? 0
          : element.scrollHeight - element.clientHeight,
        overflowX: styleDeclaration.overflowX,
        overflowY: styleDeclaration.overflowY,
        position: styleDeclaration.position,
        rectRight: rect.right,
        viewportWidth,
        pageScrollsHorizontally,
      }),
    );
  }

  function deduplicateCandidates(candidates) {
    const normalized = candidates.map((candidate) => ({
      ...candidate,
      states: new Set(candidate.states),
    }));
    const byElement = new Map(
      normalized.map((candidate) => [candidate.element, candidate]),
    );

    for (const candidate of normalized) {
      let ancestor = candidate.element.parentElement;
      while (ancestor) {
        const ancestorCandidate = byElement.get(ancestor);
        if (ancestorCandidate) {
          for (const state of candidate.states) {
            ancestorCandidate.states.delete(state);
          }
        }
        ancestor = ancestor.parentElement;
      }
    }

    return normalized.filter(({ states }) => states.size > 0);
  }

  function drawLabel(label, x, y, viewportWidth, color = OVERFLOW_COLOR) {
    context.font = "600 11px system-ui, sans-serif";
    const padding = 5;
    const height = 20;
    const width = Math.ceil(context.measureText(label).width) + padding * 2;
    const left = Math.min(Math.max(0, x), Math.max(0, viewportWidth - width));
    const top = Math.max(0, y - height);
    context.fillStyle = color;
    context.fillRect(left, top, width, height);
    context.fillStyle = "#FFFFFF";
    context.fillText(label, left + padding, top + 14);
  }

  function scanCandidates(viewportWidth, viewportHeight) {
    const rootStyle = getComputedStyle(document.documentElement);
    const bodyStyle = document.body ? getComputedStyle(document.body) : null;
    const pageClipsHorizontally =
      isClippingValue(rootStyle.overflowX) ||
      isClippingValue(bodyStyle?.overflowX);
    const pageScrollsHorizontally =
      !pageClipsHorizontally &&
      document.documentElement.scrollWidth - viewportWidth > OVERFLOW_TOLERANCE;

    function* candidateElements() {
      yield document.documentElement;
      yield document.body;
      if (!document.body) return;
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_ELEMENT,
      );
      let element = walker.nextNode();
      while (element) {
        yield element;
        element = walker.nextNode();
      }
    }
    let scannedCount = 0;
    const candidates = [];
    const scanStartedAt = performance.now();
    let scanTruncated = false;

    for (const element of candidateElements()) {
      if (
        !element ||
        scannedCount >= MAX_SCANNED_ELEMENTS ||
        candidates.length >= MAX_CANDIDATES
      ) {
        scanTruncated = true;
        break;
      }
      scannedCount += 1;
      if (
        scanBudgetExceeded(
          scannedCount,
          performance.now() - scanStartedAt,
          MAX_SCAN_TIME_MS,
        )
      ) {
        scanTruncated = true;
        break;
      }
      if (IGNORED_TAGS.has(element.tagName)) continue;
      const geometry = elementGeometry(element);
      if (!geometry) continue;
      const { rect, styleDeclaration } = geometry;
      if (rect.bottom < 0 || rect.top > viewportHeight) continue;
      const states = overflowStates(
        element,
        rect,
        styleDeclaration,
        viewportWidth,
        pageScrollsHorizontally,
      );
      if (states.size === 0) continue;
      candidates.push({ element, rect, states });
    }

    return {
      markers: deduplicateCandidates(candidates).slice(0, MAX_MARKERS),
      candidateCount: candidates.length,
      scanTruncated:
        scanTruncated || candidates.length > MAX_MARKERS,
    };
  }

  function draw() {
    scheduledFrame = 0;
    if (
      destroyed ||
      document.visibilityState === "hidden" ||
      !document.documentElement.isConnected
    ) {
      return;
    }

    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight;
    if (fullScanNeeded) {
      fullScanNeeded = false;
      const scan = scanCandidates(viewportWidth, viewportHeight);
      cachedMarkers = scan.markers;
      cachedCandidateCount = scan.candidateCount;
      cachedScanTruncated = scan.scanTruncated;
    }

    const density = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(viewportWidth * density);
    const pixelHeight = Math.round(viewportHeight * density);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    context.setTransform(density, 0, 0, density, 0, 0);
    context.clearRect(0, 0, viewportWidth, viewportHeight);
    context.lineWidth = 2;
    context.setLineDash([6, 4]);

    let visibleMarkerCount = 0;
    let visiblePageOverflowCount = 0;
    for (const { element, states } of cachedMarkers) {
      if (!element.isConnected) continue;
      const rect = element.getBoundingClientRect();
      const left = Math.max(0, rect.left);
      const top = Math.max(0, rect.top);
      const right = Math.min(viewportWidth, rect.right);
      const bottom = Math.min(viewportHeight, rect.bottom);
      if (right <= left || bottom <= top) continue;
      visibleMarkerCount += 1;

      const isPageOverflow = states.has("page-x");
      if (isPageOverflow) visiblePageOverflowCount += 1;
      const markerColor = isPageOverflow
        ? OVERFLOW_COLOR
        : POSSIBLE_CLIP_COLOR;
      const markerFill = isPageOverflow
        ? "rgba(232, 59, 45, 0.10)"
        : "rgba(180, 83, 9, 0.10)";
      const stateLabels = [...states].map((state) =>
        state === "page-x" ? "page-x" : `possible ${state}`,
      );

      context.strokeStyle = markerColor;
      context.fillStyle = markerFill;
      context.fillRect(left, top, right - left, bottom - top);
      context.strokeRect(
        left + 1,
        top + 1,
        Math.max(0, right - left - 2),
        Math.max(0, bottom - top - 2),
      );
      drawLabel(
        `${element.tagName.toLowerCase()} · ${stateLabels.join(" · ")}`,
        left,
        top,
        viewportWidth,
        markerColor,
      );
    }

    if (visibleMarkerCount > 0) {
      const pageOverflowCount = visiblePageOverflowCount;
      const possibleClipCount = visibleMarkerCount - pageOverflowCount;
      const summaryParts = [];
      if (pageOverflowCount > 0) {
        summaryParts.push(
          `${pageOverflowCount} page overflow${
            pageOverflowCount === 1 ? "" : "s"
          }`,
        );
      }
      if (possibleClipCount > 0) {
        summaryParts.push(
          `${possibleClipCount} possible clip${
            possibleClipCount === 1 ? "" : "s"
          }`,
        );
      }
      context.setLineDash([]);
      drawLabel(
        `${summaryParts.join(" · ")}${
          cachedScanTruncated || cachedCandidateCount > MAX_MARKERS ? "+" : ""
        }`,
        viewportWidth - 150,
        viewportHeight,
        viewportWidth,
        POSSIBLE_CLIP_COLOR,
      );
    }
  }

  function scheduleDraw() {
    if (
      destroyed ||
      document.visibilityState === "hidden" ||
      scheduledFrame
    ) {
      return;
    }
    scheduledFrame = requestAnimationFrame(draw);
  }

  function scheduleFullScan(delay = 0) {
    if (destroyed || document.visibilityState === "hidden") return;
    window.clearTimeout(fullScanTimer);
    fullScanTimer = window.setTimeout(() => {
      fullScanTimer = 0;
      fullScanNeeded = true;
      scheduleDraw();
    }, delay);
  }

  function refresh() {
    fullScanNeeded = true;
    scheduleDraw();
  }

  const mutationObserver = new MutationObserver(() =>
    scheduleFullScan(MUTATION_SCAN_MS),
  );
  mutationObserver.observe(document.documentElement, {
    attributes: true,
    childList: true,
    characterData: true,
    subtree: true,
  });
  const interval = window.setInterval(() => {
    if (document.visibilityState !== "hidden") scheduleFullScan();
  }, SAFETY_SCAN_MS);
  const onResize = () => scheduleFullScan(80);
  const onScroll = () => {
    scheduleDraw();
    scheduleFullScan(SCROLL_IDLE_SCAN_MS);
  };
  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      window.clearTimeout(fullScanTimer);
      fullScanTimer = 0;
      if (scheduledFrame) cancelAnimationFrame(scheduledFrame);
      scheduledFrame = 0;
      context.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    refresh();
  };
  window.addEventListener("resize", onResize, { passive: true });
  window.addEventListener("scroll", onScroll, {
    capture: true,
    passive: true,
  });
  document.addEventListener("visibilitychange", onVisibilityChange);

  globalThis[INSTANCE_KEY] = {
    refresh,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      mutationObserver.disconnect();
      window.clearInterval(interval);
      window.clearTimeout(fullScanTimer);
      if (scheduledFrame) cancelAnimationFrame(scheduledFrame);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      host.remove();
      delete globalThis[INSTANCE_KEY];
    },
  };

  refresh();
})();
