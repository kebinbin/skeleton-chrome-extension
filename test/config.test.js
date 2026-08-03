import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_CONFIG,
  CONFIG_SCHEMA_VERSION,
  MONOCHROME_COLOR,
  PALETTE,
  buildStyleInjections,
  configForMode,
  loadStoredConfig,
  normalizeConfig,
  presetConfigForMode,
  UnsupportedConfigVersionError,
} from "../shared/config.js";

test("the default palette provides a distinct cycle", () => {
  assert.equal(PALETTE.length, 6);
  assert.equal(new Set(PALETTE).size, PALETTE.length);
  assert.ok(PALETTE.includes("#E5D28B"));
  assert.ok(PALETTE.includes("#FF6600"));
  assert.ok(PALETTE.includes("#63E7D8"));
});

test("full visualization defaults to the tuned background treatment", () => {
  assert.equal(DEFAULT_CONFIG.style.mode, "full");
  assert.equal(DEFAULT_CONFIG.style.gridVisualization, true);
  assert.equal(DEFAULT_CONFIG.style.overflowDetection, true);
  assert.equal(DEFAULT_CONFIG.style.byLevel, true);
  assert.equal(presetConfigForMode("full").style.byLevel, true);
  assert.equal(DEFAULT_CONFIG.style.backgroundOpacity, 41);
  assert.equal(DEFAULT_CONFIG.style.cycleLightnessStep, -7);
  assert.equal(DEFAULT_CONFIG.style.monochromeLightnessStep, -18);
});

test("neighboring palette levels remain visually distinct", () => {
  const rgb = (hex) =>
    [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
  const distance = (first, second) => {
    const a = rgb(first);
    const b = rgb(second);
    return Math.hypot(...a.map((channel, index) => channel - b[index]));
  };

  PALETTE.forEach((color, index) => {
    const next = PALETTE[(index + 1) % PALETTE.length];
    assert.ok(
      distance(color, next) >= 50,
      `${color} and ${next} are too similar for adjacent levels`,
    );
  });
});

test("custom palette colors are validated and used in colorful CSS", () => {
  const customPalette = PALETTE.map((color, index) =>
    index === 0 ? "#123456" : color,
  );
  const customized = buildStyleInjections({
    style: {
      ...DEFAULT_CONFIG.style,
      backgroundOpacity: 100,
      paletteColors: customPalette,
    },
  })
    .map((injection) => injection.css)
    .join("\n");

  assert.match(customized, /background-color: #123456 !important/);
  assert.deepEqual(
    normalizeConfig({ style: { paletteColors: ["invalid"] } }).style
      .paletteColors,
    PALETTE,
  );
});

test("monochrome reuses one hue with accumulated per-level lightness", () => {
  const customized = buildStyleInjections({
    style: {
      ...DEFAULT_CONFIG.style,
      bgColor: "monochrome",
      backgroundOpacity: 100,
      monochromeColor: "#336699",
      monochromeLightnessStep: 10,
    },
  })
    .map((injection) => injection.css)
    .join("\n");

  const backgrounds = [
    ...customized.matchAll(/background-color: (#[A-F0-9]{6}) !important/g),
  ].map((match) => match[1]);
  assert.equal(backgrounds[0], "#336699");
  assert.equal(backgrounds[1], "#4080BF");
  assert.equal(
    normalizeConfig({ style: { monochromeColor: "invalid" } }).style
      .monochromeColor,
    MONOCHROME_COLOR,
  );
});

test("later colorful cycles reuse each hue with accumulated lightness", () => {
  const css = buildStyleInjections({
    style: {
      ...DEFAULT_CONFIG.style,
      backgroundOpacity: 100,
      paletteColors: [
        "#336699",
        ...DEFAULT_CONFIG.style.paletteColors.slice(1),
      ],
      cycleLightnessStep: 10,
    },
  })
    .map((injection) => injection.css)
    .join("\n");
  const backgrounds = [
    ...css.matchAll(/background-color: (#[A-F0-9]{6}) !important/g),
  ].map((match) => match[1]);

  assert.equal(backgrounds[0], "#336699");
  assert.equal(backgrounds[6], "#4080BF");
  assert.equal(backgrounds[12], "#6699CC");
});

test("oversized palettes normalize by keeping their first six colors", () => {
  const oversizedPalette = [...PALETTE, ...PALETTE, ...PALETTE];

  assert.deepEqual(
    normalizeConfig({ style: { paletteColors: oversizedPalette } }).style
      .paletteColors,
    PALETTE,
  );
});

test("invalid and partial settings safely fall back to defaults", () => {
  assert.deepEqual(normalizeConfig(null), DEFAULT_CONFIG);
  assert.deepEqual(
    normalizeConfig({ style: { bgColor: "unknown" } }),
    normalizeConfig(DEFAULT_CONFIG),
  );
});

test("default visualization generates user-origin override CSS", () => {
  const injections = buildStyleInjections(DEFAULT_CONFIG);

  assert.equal(injections.length, 1);
  assert.equal(injections[0].origin, "USER");
  assert.match(injections[0].css, /:where\(:root > \*\)/);
  assert.match(injections[0].css, /background-color: #E5D28B69 !important/);
  assert.match(injections[0].css, /outline: 1px dashed #FFFFFF !important/);
  assert.match(injections[0].css, /:where\(:root\) \{ color: #211812 !important; \}/);
  assert.match(
    injections[0].css,
    /:where\(:root > \*\) \{ color: #211812 !important; \}/,
  );
  assert.doesNotMatch(injections[0].css, /skeleton-x98h7f0/);
});

test("non-override settings stay at author origin without important", () => {
  const config = normalizeConfig({
    style: {
      ...DEFAULT_CONFIG.style,
      overrideBgColor: false,
      overrideBorder: false,
      textColor: "default",
    },
  });
  const injections = buildStyleInjections(config);

  assert.equal(injections.length, 1);
  assert.equal(injections[0].origin, "AUTHOR");
  assert.doesNotMatch(injections[0].css, /!important/);
});

test("mixed override settings are split into exactly removable origins", () => {
  const config = normalizeConfig({
    style: {
      ...DEFAULT_CONFIG.style,
      overrideBgColor: false,
      textColor: "light",
    },
  });
  const injections = buildStyleInjections(config);

  assert.deepEqual(
    injections.map(({ origin }) => origin),
    ["AUTHOR", "USER"],
  );
});

test("choosing a custom text color always overrides page text", () => {
  const config = normalizeConfig({
    style: {
      ...DEFAULT_CONFIG.style,
      bgColor: "default",
      outlineStyle: "none",
      textColor: "custom",
      customTextColor: "#123456",
    },
  });
  const injections = buildStyleInjections(config);

  assert.equal(injections.length, 1);
  assert.equal(injections[0].origin, "USER");
  assert.match(injections[0].css, /color: #123456 !important/);
});

test("opacity and configurable outlines are emitted exactly", () => {
  const css = buildStyleInjections({
    style: {
      ...DEFAULT_CONFIG.style,
      backgroundOpacity: 50,
      outlineStyle: "solid",
      outlineColor: "#ABCDEF",
      outlineWidth: 4,
      textColor: "default",
    },
  })
    .map((injection) => injection.css)
    .join("\n");

  assert.match(css, /background-color: #E5D28B80 !important/);
  assert.match(css, /outline: 4px solid #ABCDEF !important/);
});

test("outline-only mode follows each element's foreground color", () => {
  const config = presetConfigForMode("outline");
  const css = buildStyleInjections(config)
    .map((injection) => injection.css)
    .join("\n");

  assert.match(css, /outline: 1px dashed currentColor !important/);
  assert.doesNotMatch(css, /outline: 1px dashed #FFFFFF/);
});

test("unversioned pre-release settings reset to version-one defaults", () => {
  const loaded = loadStoredConfig({
    style: { backgroundOpacity: 42 },
  });

  assert.deepEqual(loaded, normalizeConfig(DEFAULT_CONFIG));
  assert.equal(loaded.schemaVersion, CONFIG_SCHEMA_VERSION);
});

test("version-one stored configuration loading is idempotent", () => {
  const first = loadStoredConfig({
    schemaVersion: CONFIG_SCHEMA_VERSION,
    style: {
      ...DEFAULT_CONFIG.style,
      backgroundOpacity: 42,
      paletteColors: [
        "#123456",
        ...DEFAULT_CONFIG.style.paletteColors.slice(1),
      ],
    },
  });
  const second = loadStoredConfig(first);

  assert.deepEqual(second, first);
  assert.equal(second.style.backgroundOpacity, 42);
  assert.equal(second.style.paletteColors[0], "#123456");
});

test("newer configuration schemas are never silently downgraded", () => {
  assert.throws(
    () =>
      loadStoredConfig({
        schemaVersion: CONFIG_SCHEMA_VERSION + 1,
        style: DEFAULT_CONFIG.style,
      }),
    UnsupportedConfigVersionError,
  );
});

test("automatic contrast follows sibling colors as well as depth colors", () => {
  const config = normalizeConfig({
    style: { ...DEFAULT_CONFIG.style, byLevel: false },
  });
  const css = buildStyleInjections(config)
    .map((injection) => injection.css)
    .join("\n");

  assert.match(css, /:nth-child\(65n \+ 1\).*color: #211812 !important/);
  assert.match(css, /:nth-child\(65n \+ 2\).*color: #211812 !important/);
});

test("sibling mode uses structural selectors instead of DOM mutation hooks", () => {
  const config = normalizeConfig({
    style: { ...DEFAULT_CONFIG.style, byLevel: false },
  });
  const css = buildStyleInjections(config)
    .map((injection) => injection.css)
    .join("\n");

  assert.match(css, /:nth-child\(65n \+ 1\)/);
  assert.doesNotMatch(css, /class|data-/);
  assert.match(css, /:not\(skeleton-layout-element-inspector/);
});

test("quick modes derive temporary styles without changing saved settings", () => {
  const saved = normalizeConfig({
    style: {
      ...DEFAULT_CONFIG.style,
      outlineStyle: "none",
      overflowDetection: true,
      elementInspector: true,
      gridVisualization: true,
    },
  });
  const outline = configForMode(saved, "outline");
  const inspector = configForMode(saved, "inspector");

  assert.equal(outline.style.bgColor, "default");
  assert.equal(outline.style.textColor, "default");
  assert.equal(outline.style.outlineStyle, "dashed");
  assert.equal(outline.style.overflowDetection, true);
  assert.equal(outline.style.elementInspector, false);
  assert.equal(outline.style.gridVisualization, true);
  assert.equal(inspector.style.outlineStyle, "none");
  assert.equal(inspector.style.overflowDetection, true);
  assert.equal(inspector.style.elementInspector, true);
  assert.equal(inspector.style.gridVisualization, true);
  assert.deepEqual(configForMode(saved, "full"), saved);
  assert.equal(saved.style.outlineStyle, "none");
  assert.equal(
    configForMode(presetConfigForMode("outline"), "full").style.bgColor,
    "colorful",
  );
});

test("saved mode presets set every dependent control consistently", () => {
  const full = presetConfigForMode("full");
  const outline = presetConfigForMode("outline");
  const inspector = presetConfigForMode("inspector");

  assert.deepEqual(full, normalizeConfig(DEFAULT_CONFIG));
  assert.equal(outline.style.mode, "outline");
  assert.equal(outline.style.bgColor, "default");
  assert.equal(outline.style.textColor, "default");
  assert.equal(outline.style.outlineStyle, "dashed");
  assert.equal(outline.style.outlineColor, "#FFFFFF");
  assert.equal(outline.style.outlineWidth, 1);
  assert.equal(outline.style.overrideBorder, true);
  assert.equal(outline.style.elementInspector, false);
  assert.equal(inspector.style.mode, "inspector");
  assert.equal(inspector.style.bgColor, "default");
  assert.equal(inspector.style.textColor, "default");
  assert.equal(inspector.style.outlineStyle, "none");
  assert.equal(inspector.style.elementInspector, true);
});

test("mode changes preserve customized full visualization settings", () => {
  const customizedFull = normalizeConfig({
    style: {
      ...DEFAULT_CONFIG.style,
      backgroundOpacity: 46,
      paletteColors: [
        "#123456",
        ...DEFAULT_CONFIG.style.paletteColors.slice(1),
      ],
    },
  });
  const outline = configForMode(customizedFull, "outline");

  assert.equal(outline.style.mode, "outline");
  assert.equal(outline.style.bgColor, "default");
  assert.equal(outline.style.outlineStyle, "dashed");
  assert.equal(outline.fullStyle.backgroundOpacity, 46);
  assert.equal(outline.fullStyle.paletteColors[0], "#123456");

  const restoredFull = configForMode(outline, "full");
  assert.equal(restoredFull.style.mode, "full");
  assert.equal(restoredFull.style.backgroundOpacity, 46);
  assert.equal(restoredFull.style.paletteColors[0], "#123456");
});

test("selecting no styles generates no injection", () => {
  const config = normalizeConfig({
    style: {
      ...DEFAULT_CONFIG.style,
      bgColor: "default",
      outlineStyle: "none",
      textColor: "default",
    },
  });

  assert.deepEqual(buildStyleInjections(config), []);
});
