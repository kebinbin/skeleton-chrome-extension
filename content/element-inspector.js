(() => {
  const INSTANCE_KEY = "__skeletonLayoutElementInspector";
  const existing = globalThis[INSTANCE_KEY];
  if (existing) {
    existing.refresh();
    return;
  }
  const { layoutDetails, layoutIndicators } =
    globalThis.__skeletonLayoutElementInspectorLogic;

  const host = document.createElement("skeleton-layout-element-inspector");
  const shadow = host.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  const marginOverlay = document.createElement(
    "skeleton-layout-inspector-margin-overlay",
  );
  const borderOverlay = document.createElement(
    "skeleton-layout-inspector-border-overlay",
  );
  const paddingOverlay = document.createElement(
    "skeleton-layout-inspector-padding-overlay",
  );
  const contentOverlay = document.createElement(
    "skeleton-layout-inspector-content-overlay",
  );
  const overlays = [
    marginOverlay,
    borderOverlay,
    paddingOverlay,
    contentOverlay,
  ];
  const tooltip = document.createElement("skeleton-layout-inspector-tooltip");
  const INSPECTOR_LAYER_Z_INDEX = 2147483647;

  style.textContent = `
    :host {
      all: initial !important;
      position: fixed !important;
      inset: 0 auto auto 0 !important;
      width: 0 !important;
      height: 0 !important;
      z-index: ${INSPECTOR_LAYER_Z_INDEX} !important;
      pointer-events: none !important;
    }
    skeleton-layout-inspector-margin-overlay,
    skeleton-layout-inspector-border-overlay,
    skeleton-layout-inspector-padding-overlay,
    skeleton-layout-inspector-content-overlay {
      all: initial !important;
      display: none !important;
      position: fixed !important;
      box-sizing: border-box !important;
      border-style: solid !important;
      outline: 0 !important;
      background: transparent !important;
      pointer-events: none !important;
    }
    skeleton-layout-inspector-margin-overlay {
      border-color: rgba(105, 112, 122, 0.24) !important;
    }
    skeleton-layout-inspector-border-overlay {
      border-color: rgba(32, 33, 36, 0.5) !important;
    }
    skeleton-layout-inspector-padding-overlay {
      border-color: rgba(26, 115, 232, 0.2) !important;
    }
    skeleton-layout-inspector-content-overlay {
      border: 0 !important;
      background: rgba(19, 121, 91, 0.16) !important;
    }
    skeleton-layout-inspector-tooltip {
      all: initial !important;
      display: none !important;
      position: fixed !important;
      box-sizing: border-box !important;
      max-width: min(430px, calc(100vw - 16px)) !important;
      padding: 0 !important;
      border: 0 !important;
      outline: 0 !important;
      border-radius: 12px !important;
      background: transparent !important;
      box-shadow:
        0 12px 32px rgba(32, 33, 36, 0.18),
        0 2px 8px rgba(32, 33, 36, 0.12) !important;
      color: #202124 !important;
      font: 12px/1.4 system-ui, -apple-system, BlinkMacSystemFont, sans-serif !important;
      letter-spacing: normal !important;
      white-space: nowrap !important;
      pointer-events: none !important;
    }
    skeleton-layout-inspector-margin-box,
    skeleton-layout-inspector-border-box,
    skeleton-layout-inspector-padding-box,
    skeleton-layout-inspector-content-box {
      all: initial !important;
      display: block !important;
      position: relative !important;
      box-sizing: border-box !important;
      border: 0 !important;
      outline: 0 !important;
      font: 10px/1 system-ui, -apple-system, BlinkMacSystemFont, sans-serif !important;
    }
    skeleton-layout-inspector-margin-box {
      width: min(410px, calc(100vw - 28px)) !important;
      padding: 19px 31px !important;
      border-radius: 9px !important;
      background: rgba(247, 248, 250, 0.72) !important;
      color: #69707a !important;
    }
    skeleton-layout-inspector-border-box {
      padding: 19px 31px !important;
      border-radius: 8px !important;
      background: #dfe2e7 !important;
      color: #202124 !important;
    }
    skeleton-layout-inspector-padding-box {
      padding: 19px 31px !important;
      border-radius: 7px !important;
      background: #f7f8fa !important;
      color: #69707a !important;
    }
    skeleton-layout-inspector-content-box {
      padding: 10px 12px !important;
      border-radius: 6px !important;
      background: #dfe2e7 !important;
      color: #202124 !important;
    }
    skeleton-layout-inspector-layer-name,
    skeleton-layout-inspector-value {
      all: initial !important;
      display: block !important;
      position: absolute !important;
      box-sizing: border-box !important;
      border: 0 !important;
      outline: 0 !important;
      color: inherit !important;
      font: 600 9px/1 system-ui, -apple-system, BlinkMacSystemFont, sans-serif !important;
      white-space: nowrap !important;
    }
    skeleton-layout-inspector-value {
      padding: 1px 3px !important;
      border-radius: 3px !important;
      background: rgba(255, 255, 255, 0.72) !important;
      font-variant-numeric: tabular-nums !important;
    }
    skeleton-layout-inspector-layer-name {
      top: 5px !important;
      left: 6px !important;
      opacity: 0.72 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.04em !important;
    }
    skeleton-layout-inspector-value[data-side="top"] {
      top: 5px !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
    }
    skeleton-layout-inspector-value[data-side="right"] {
      top: 50% !important;
      right: 6px !important;
      transform: translateY(-50%) !important;
    }
    skeleton-layout-inspector-value[data-side="bottom"] {
      bottom: 5px !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
    }
    skeleton-layout-inspector-value[data-side="left"] {
      top: 50% !important;
      left: 6px !important;
      transform: translateY(-50%) !important;
    }
    skeleton-layout-inspector-name {
      all: initial !important;
      display: block !important;
      margin-bottom: 4px !important;
      border: 0 !important;
      outline: 0 !important;
      color: #1a73e8 !important;
      font: 600 12px/1.4 ui-monospace, SFMono-Regular, Consolas, monospace !important;
      overflow-wrap: anywhere !important;
      white-space: normal !important;
    }
    skeleton-layout-inspector-detail,
    skeleton-layout-inspector-muted-detail {
      all: initial !important;
      display: block !important;
      border: 0 !important;
      outline: 0 !important;
      color: #202124 !important;
      font: 11px/1.5 system-ui, -apple-system, BlinkMacSystemFont, sans-serif !important;
      overflow-wrap: anywhere !important;
      white-space: normal !important;
    }
    skeleton-layout-inspector-muted-detail {
      color: #69707a !important;
    }
    skeleton-layout-inspector-indicators {
      all: initial !important;
      display: flex !important;
      margin: 0 0 5px !important;
      border: 0 !important;
      outline: 0 !important;
      flex-wrap: wrap !important;
      gap: 3px !important;
    }
    skeleton-layout-inspector-indicator {
      all: initial !important;
      display: inline-flex !important;
      padding: 2px 5px !important;
      border: 0 !important;
      outline: 0 !important;
      border-radius: 999px !important;
      background: rgba(255, 255, 255, 0.66) !important;
      color: #4f5660 !important;
      font: 600 9px/1.25 system-ui, -apple-system, BlinkMacSystemFont, sans-serif !important;
      white-space: nowrap !important;
    }
  `;
  shadow.append(style, ...overlays, tooltip);
  document.documentElement.append(host);

  let currentElement = null;
  let pointerX = 0;
  let pointerY = 0;
  let scheduledFrame = 0;
  let destroyed = false;
  let pinned = false;

  const numericValue = (value) => Number.parseFloat(value) || 0;
  const sidesFromStyle = (computedStyle, prefix, suffix = "") => ({
    top: computedStyle[`${prefix}Top${suffix}`],
    right: computedStyle[`${prefix}Right${suffix}`],
    bottom: computedStyle[`${prefix}Bottom${suffix}`],
    left: computedStyle[`${prefix}Left${suffix}`],
  });
  const numericSides = (sides) =>
    Object.fromEntries(
      Object.entries(sides).map(([side, value]) => [side, numericValue(value)]),
    );

  function nestingDepth(element) {
    let depth = 0;
    let ancestor = element;
    while (ancestor && ancestor !== document.documentElement) {
      depth += 1;
      ancestor = ancestor.parentElement;
    }
    return depth;
  }

  function elementName(element) {
    const tag = element.tagName.toLowerCase();
    const id = element.id ? `#${CSS.escape(element.id)}` : "";
    const classes = [...element.classList]
      .slice(0, 2)
      .map((name) => `.${CSS.escape(name)}`)
      .join("");
    return `${tag}${id}${classes}`;
  }

  function overflowDescription(element, computedStyle) {
    const tolerance = 3;
    const horizontal = element.scrollWidth - element.clientWidth > tolerance;
    const vertical = element.scrollHeight - element.clientHeight > tolerance;
    const states = [];
    if (horizontal) states.push(`${computedStyle.overflowX} x`);
    if (vertical) states.push(`${computedStyle.overflowY} y`);
    return states.length > 0 ? states.join(", ") : "none";
  }

  function setGeometry(element, rect, borderWidths = null) {
    element.style.setProperty("display", "block", "important");
    element.style.setProperty("left", `${rect.left}px`, "important");
    element.style.setProperty("top", `${rect.top}px`, "important");
    element.style.setProperty("width", `${Math.max(0, rect.width)}px`, "important");
    element.style.setProperty(
      "height",
      `${Math.max(0, rect.height)}px`,
      "important",
    );
    if (borderWidths) {
      element.style.setProperty(
        "border-width",
        `${borderWidths.top}px ${borderWidths.right}px ${borderWidths.bottom}px ${borderWidths.left}px`,
        "important",
      );
    }
  }

  function drawBoxModelOverlay(rect, computedStyle) {
    const margins = numericSides(sidesFromStyle(computedStyle, "margin"));
    const borders = numericSides(
      sidesFromStyle(computedStyle, "border", "Width"),
    );
    const paddings = numericSides(sidesFromStyle(computedStyle, "padding"));
    const visibleMargins = Object.fromEntries(
      Object.entries(margins).map(([side, value]) => [side, Math.max(0, value)]),
    );

    const marginRect = {
      left: rect.left - visibleMargins.left,
      top: rect.top - visibleMargins.top,
      width: rect.width + visibleMargins.left + visibleMargins.right,
      height: rect.height + visibleMargins.top + visibleMargins.bottom,
    };
    const paddingRect = {
      left: rect.left + borders.left,
      top: rect.top + borders.top,
      width: rect.width - borders.left - borders.right,
      height: rect.height - borders.top - borders.bottom,
    };
    const contentRect = {
      left: paddingRect.left + paddings.left,
      top: paddingRect.top + paddings.top,
      width: paddingRect.width - paddings.left - paddings.right,
      height: paddingRect.height - paddings.top - paddings.bottom,
    };

    setGeometry(marginOverlay, marginRect, visibleMargins);
    setGeometry(borderOverlay, rect, borders);
    setGeometry(paddingOverlay, paddingRect, paddings);
    setGeometry(contentOverlay, contentRect);
  }

  function boxLayer(tagName, label, values, child) {
    const layer = document.createElement(tagName);
    const visibleValue = (value) => {
      const normalized = String(value).trim().toLowerCase();
      const numeric = Number.parseFloat(normalized);
      if (Number.isFinite(numeric)) return Math.abs(numeric) > 0.01;
      return !["", "none", "normal"].includes(normalized);
    };
    const visibleHorizontalValues = [values.left, values.right].filter(
      visibleValue,
    );
    const horizontalValueLength = Math.max(
      0,
      ...visibleHorizontalValues.map((value) => String(value).length),
    );
    const horizontalGutter = Math.max(31, horizontalValueLength * 6 + 12);
    layer.style.setProperty(
      "padding-left",
      `${horizontalGutter}px`,
      "important",
    );
    layer.style.setProperty(
      "padding-right",
      `${horizontalGutter}px`,
      "important",
    );
    const name = document.createElement("skeleton-layout-inspector-layer-name");
    name.textContent = label;
    layer.append(name);
    for (const side of ["top", "right", "bottom", "left"]) {
      if (!visibleValue(values[side])) continue;
      const value = document.createElement("skeleton-layout-inspector-value");
      value.dataset.side = side;
      value.textContent = values[side];
      layer.append(value);
    }
    layer.append(child);
    return layer;
  }

  function indicatorMetrics(element, computedStyle) {
    const parentDisplay = element.parentElement
      ? getComputedStyle(element.parentElement).display
      : "";
    return {
      isRoot: element === document.documentElement,
      display: computedStyle.display,
      flexDirection: computedStyle.flexDirection,
      flexWrap: computedStyle.flexWrap,
      rowGap: computedStyle.rowGap,
      columnGap: computedStyle.columnGap,
      justifyContent: computedStyle.justifyContent,
      alignItems: computedStyle.alignItems,
      gridTemplateColumns: computedStyle.gridTemplateColumns,
      gridTemplateRows: computedStyle.gridTemplateRows,
      parentDisplay,
      position: computedStyle.position,
      zIndex: computedStyle.zIndex,
      opacity: computedStyle.opacity,
      transform: computedStyle.transform,
      filter: computedStyle.filter,
      backdropFilter:
        computedStyle.backdropFilter || computedStyle.webkitBackdropFilter,
      perspective: computedStyle.perspective,
      isolation: computedStyle.isolation,
      mixBlendMode: computedStyle.mixBlendMode,
      clipPath: computedStyle.clipPath,
      mask: computedStyle.maskImage || computedStyle.webkitMaskImage,
      willChange: computedStyle.willChange,
      contain: computedStyle.contain,
      containerType: computedStyle.containerType,
      overflowX: computedStyle.overflowX,
      overflowY: computedStyle.overflowY,
      horizontalOverflow: element.scrollWidth - element.clientWidth > 3,
      verticalOverflow: element.scrollHeight - element.clientHeight > 3,
    };
  }

  function buildIndicatorRow(element, computedStyle) {
    const labels = layoutIndicators(indicatorMetrics(element, computedStyle));
    if (labels.length === 0) return null;
    const row = document.createElement("skeleton-layout-inspector-indicators");
    for (const label of labels) {
      const indicator = document.createElement(
        "skeleton-layout-inspector-indicator",
      );
      indicator.textContent = label;
      row.append(indicator);
    }
    return row;
  }

  function buildLayoutDetailRows(element, computedStyle) {
    return layoutDetails(indicatorMetrics(element, computedStyle)).map(
      (value) => {
        const detail = document.createElement(
          "skeleton-layout-inspector-muted-detail",
        );
        detail.textContent = value;
        return detail;
      },
    );
  }

  function buildTooltip(rect, computedStyle) {
    const name = document.createElement("skeleton-layout-inspector-name");
    const dimensions = document.createElement(
      "skeleton-layout-inspector-detail",
    );
    const layout = document.createElement(
      "skeleton-layout-inspector-muted-detail",
    );
    const overflow = document.createElement(
      "skeleton-layout-inspector-muted-detail",
    );
    const sizing = document.createElement(
      "skeleton-layout-inspector-muted-detail",
    );
    const width = Math.round(rect.width * 10) / 10;
    const height = Math.round(rect.height * 10) / 10;
    name.textContent = elementName(currentElement);
    dimensions.textContent = `${width} × ${height}px · depth ${nestingDepth(currentElement)}`;
    layout.textContent = `display: ${computedStyle.display}`;
    overflow.textContent = `overflow: ${overflowDescription(
      currentElement,
      computedStyle,
    )}`;
    sizing.textContent = `box-sizing: ${computedStyle.boxSizing}`;

    const content = document.createElement(
      "skeleton-layout-inspector-content-box",
    );
    const indicators = buildIndicatorRow(currentElement, computedStyle);
    const layoutDetailRows = buildLayoutDetailRows(
      currentElement,
      computedStyle,
    );
    content.append(name);
    if (indicators) content.append(indicators);
    content.append(dimensions, layout, ...layoutDetailRows, overflow, sizing);
    const padding = boxLayer(
      "skeleton-layout-inspector-padding-box",
      "padding",
      sidesFromStyle(computedStyle, "padding"),
      content,
    );
    const border = boxLayer(
      "skeleton-layout-inspector-border-box",
      "border",
      sidesFromStyle(computedStyle, "border", "Width"),
      padding,
    );
    return boxLayer(
      "skeleton-layout-inspector-margin-box",
      "margin",
      sidesFromStyle(computedStyle, "margin"),
      border,
    );
  }

  function hide() {
    for (const overlay of overlays) {
      overlay.style.setProperty("display", "none", "important");
    }
    tooltip.style.setProperty("display", "none", "important");
  }

  function draw() {
    scheduledFrame = 0;
    if (destroyed || !currentElement?.isConnected) {
      hide();
      return;
    }

    const rect = currentElement.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) {
      hide();
      return;
    }

    const computedStyle = getComputedStyle(currentElement);
    drawBoxModelOverlay(rect, computedStyle);
    tooltip.replaceChildren(buildTooltip(rect, computedStyle));
    tooltip.style.setProperty("display", "block", "important");

    const tooltipRect = tooltip.getBoundingClientRect();
    const gap = 12;
    const left = Math.min(
      Math.max(8, pointerX + gap),
      Math.max(8, window.innerWidth - tooltipRect.width - 8),
    );
    const preferredTop = pointerY + gap;
    const top =
      preferredTop + tooltipRect.height <= window.innerHeight - 8
        ? preferredTop
        : Math.max(8, pointerY - tooltipRect.height - gap);
    tooltip.style.setProperty("left", `${left}px`, "important");
    tooltip.style.setProperty("top", `${top}px`, "important");
  }

  function refresh() {
    if (destroyed) return;
    if (scheduledFrame) cancelAnimationFrame(scheduledFrame);
    scheduledFrame = requestAnimationFrame(draw);
  }

  function onPointerMove(event) {
    if (pinned) return;
    pointerX = event.clientX;
    pointerY = event.clientY;
    const candidate = event.composedPath().find((node) => node instanceof Element);
    currentElement = candidate === host ? null : candidate;
    refresh();
  }

  function onPointerLeave() {
    if (pinned) return;
    currentElement = null;
    refresh();
  }

  function onClick(event) {
    if (event.composedPath().includes(host)) return;
    const candidate = event
      .composedPath()
      .find((node) => node instanceof Element);
    if (!candidate) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    pointerX = event.clientX;
    pointerY = event.clientY;
    currentElement = candidate;
    pinned = true;
    refresh();
  }

  function onKeyDown(event) {
    if (event.key !== "Escape" || !pinned) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    pinned = false;
    currentElement = null;
    refresh();
  }

  document.addEventListener("pointermove", onPointerMove, true);
  document.addEventListener("pointerleave", onPointerLeave, true);
  document.addEventListener("click", onClick, true);
  document.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("scroll", refresh, { capture: true, passive: true });
  window.addEventListener("resize", refresh, { passive: true });

  globalThis[INSTANCE_KEY] = {
    refresh,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      document.removeEventListener("pointermove", onPointerMove, true);
      document.removeEventListener("pointerleave", onPointerLeave, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("scroll", refresh, true);
      window.removeEventListener("resize", refresh);
      if (scheduledFrame) cancelAnimationFrame(scheduledFrame);
      host.remove();
      delete globalThis[INSTANCE_KEY];
    },
  };
})();
