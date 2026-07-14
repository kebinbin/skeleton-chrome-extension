export const PALETTE = Object.freeze([
  "#FFE7B3",
  "#063846",
  "#FF7A18",
  "#159B9B",
  "#F4B62D",
  "#721128",
]);

export const BACKGROUND_OPTIONS = Object.freeze([
  "default",
  "monochrome",
  "colorful",
]);

export const TEXT_OPTIONS = Object.freeze(["auto", "default", "custom"]);
export const OUTLINE_OPTIONS = Object.freeze(["dashed", "solid", "none"]);
export const QUICK_MODES = Object.freeze([
  "full",
  "outline",
  "inspector",
]);

export const MONOCHROME_COLOR = "#159B9B";
export const CONFIG_SCHEMA_VERSION = 1;

const DEFAULT_STYLE = Object.freeze({
  mode: "full",
  bgColor: "colorful",
  backgroundOpacity: 67,
  textColor: "auto",
  customTextColor: "#FFFFFF",
  paletteColors: PALETTE,
  monochromeColor: MONOCHROME_COLOR,
  cycleLightnessStep: -18,
  monochromeLightnessStep: -18,
  byLevel: true,
  overrideBgColor: true,
  outlineStyle: "dashed",
  outlineColor: "#FFFFFF",
  outlineWidth: 1,
  overrideBorder: true,
  overflowDetection: false,
  elementInspector: false,
});

export const DEFAULT_CONFIG = Object.freeze({
  schemaVersion: CONFIG_SCHEMA_VERSION,
  style: DEFAULT_STYLE,
  fullStyle: DEFAULT_STYLE,
});

export class UnsupportedConfigVersionError extends Error {
  constructor(version) {
    super(
      `Settings schema ${version} is newer than supported schema ${CONFIG_SCHEMA_VERSION}.`,
    );
    this.name = "UnsupportedConfigVersionError";
    this.version = version;
  }
}

const MAX_DEPTH = 64;
const VALID_ORIGINS = new Set(["AUTHOR", "USER"]);
const INTERNAL_ELEMENT_SELECTOR = [
  "skeleton-layout-element-inspector",
  "skeleton-layout-overflow-overlay",
  "skeleton-layout-inspector-margin-overlay",
  "skeleton-layout-inspector-border-overlay",
  "skeleton-layout-inspector-padding-overlay",
  "skeleton-layout-inspector-content-overlay",
  "skeleton-layout-inspector-tooltip",
  "skeleton-layout-inspector-margin-box",
  "skeleton-layout-inspector-border-box",
  "skeleton-layout-inspector-padding-box",
  "skeleton-layout-inspector-content-box",
  "skeleton-layout-inspector-layer-name",
  "skeleton-layout-inspector-value",
  "skeleton-layout-inspector-name",
  "skeleton-layout-inspector-detail",
  "skeleton-layout-inspector-muted-detail",
  "skeleton-layout-inspector-indicators",
  "skeleton-layout-inspector-indicator",
].join(", ");
const visualizedElement = (suffix = "") =>
  `*${suffix}:not(${INTERNAL_ELEMENT_SELECTOR})`;

const isBoolean = (value) => typeof value === "boolean";
const isOption = (options, value) => options.includes(value);
const isHexColor = (value) => /^#[0-9A-F]{6}$/i.test(value);
const normalizedColor = (value, fallback) =>
  isHexColor(value) ? value.toUpperCase() : fallback;
const normalizedPalette = (value, fallback) => {
  if (
    !Array.isArray(value) ||
    value.length < fallback.length ||
    value.some((color) => !isHexColor(color))
  ) {
    return [...fallback];
  }
  return value
    .slice(0, fallback.length)
    .map((color) => color.toUpperCase());
};
const normalizedInteger = (value, minimum, maximum, fallback) =>
  Number.isFinite(value) && value >= minimum && value <= maximum
    ? Math.round(value)
    : fallback;

function normalizedBackground(value) {
  if (isOption(BACKGROUND_OPTIONS, value)) return value;
  return DEFAULT_CONFIG.style.bgColor;
}

function normalizeStyle(style = {}) {
  return {
    mode: QUICK_MODES.includes(style.mode)
      ? style.mode
      : DEFAULT_CONFIG.style.mode,
    bgColor: normalizedBackground(style.bgColor),
    backgroundOpacity: normalizedInteger(
      style.backgroundOpacity,
      10,
      100,
      DEFAULT_CONFIG.style.backgroundOpacity,
    ),
    textColor: isOption(TEXT_OPTIONS, style.textColor)
      ? style.textColor
      : DEFAULT_CONFIG.style.textColor,
    customTextColor: normalizedColor(
      style.customTextColor,
      DEFAULT_CONFIG.style.customTextColor,
    ),
    paletteColors: normalizedPalette(style.paletteColors, PALETTE),
    monochromeColor: normalizedColor(
      style.monochromeColor,
      MONOCHROME_COLOR,
    ),
    cycleLightnessStep: normalizedInteger(
      style.cycleLightnessStep,
      -30,
      30,
      DEFAULT_CONFIG.style.cycleLightnessStep,
    ),
    monochromeLightnessStep: normalizedInteger(
      style.monochromeLightnessStep,
      -30,
      30,
      DEFAULT_CONFIG.style.monochromeLightnessStep,
    ),
    byLevel: isBoolean(style.byLevel)
      ? style.byLevel
      : DEFAULT_CONFIG.style.byLevel,
    overrideBgColor: isBoolean(style.overrideBgColor)
      ? style.overrideBgColor
      : DEFAULT_CONFIG.style.overrideBgColor,
    outlineStyle: isOption(OUTLINE_OPTIONS, style.outlineStyle)
      ? style.outlineStyle
      : DEFAULT_CONFIG.style.outlineStyle,
    outlineColor: normalizedColor(
      style.outlineColor,
      DEFAULT_CONFIG.style.outlineColor,
    ),
    outlineWidth: normalizedInteger(
      style.outlineWidth,
      1,
      4,
      DEFAULT_CONFIG.style.outlineWidth,
    ),
    overrideBorder: isBoolean(style.overrideBorder)
      ? style.overrideBorder
      : DEFAULT_CONFIG.style.overrideBorder,
    overflowDetection: isBoolean(style.overflowDetection)
      ? style.overflowDetection
      : DEFAULT_CONFIG.style.overflowDetection,
    elementInspector: isBoolean(style.elementInspector)
      ? style.elementInspector
      : DEFAULT_CONFIG.style.elementInspector,
  };
}

export function normalizeConfig(candidate) {
  const style = normalizeStyle(candidate?.style);
  const fullStyle =
    style.mode === "full"
      ? { ...style, paletteColors: [...style.paletteColors] }
      : {
          ...normalizeStyle(candidate?.fullStyle),
          mode: "full",
        };

  return { schemaVersion: CONFIG_SCHEMA_VERSION, style, fullStyle };
}

export function loadStoredConfig(candidate) {
  if (!candidate) return normalizeConfig(DEFAULT_CONFIG);

  const version = candidate?.schemaVersion;
  if (Number.isInteger(version) && version > CONFIG_SCHEMA_VERSION) {
    throw new UnsupportedConfigVersionError(version);
  }
  if (version !== CONFIG_SCHEMA_VERSION) {
    return normalizeConfig(DEFAULT_CONFIG);
  }
  return normalizeConfig(candidate);
}

export function configForMode(candidate, mode) {
  const config = normalizeConfig(candidate);
  if (!QUICK_MODES.includes(mode)) return config;
  if (mode === "full") {
    return normalizeConfig({
      style: config.fullStyle,
      fullStyle: config.fullStyle,
    });
  }

  const baseStyle = {
    ...config.style,
    mode,
    bgColor: "default",
    textColor: "default",
    outlineStyle: "none",
    overflowDetection: false,
    elementInspector: false,
  };

  if (mode === "outline") {
    baseStyle.outlineStyle =
      config.style.outlineStyle === "none"
        ? DEFAULT_CONFIG.style.outlineStyle
        : config.style.outlineStyle;
  } else if (mode === "inspector") {
    baseStyle.elementInspector = true;
  }

  return normalizeConfig({ style: baseStyle, fullStyle: config.fullStyle });
}

export function presetConfigForMode(mode) {
  const normalizedMode = QUICK_MODES.includes(mode) ? mode : "full";
  const style = {
    ...DEFAULT_CONFIG.style,
    paletteColors: [...DEFAULT_CONFIG.style.paletteColors],
    mode: normalizedMode,
  };

  if (normalizedMode === "outline") {
    Object.assign(style, {
      bgColor: "default",
      textColor: "default",
      outlineStyle: "dashed",
      outlineColor: "#FFFFFF",
      outlineWidth: 1,
      overrideBorder: true,
      overflowDetection: false,
      elementInspector: false,
    });
  } else if (normalizedMode === "inspector") {
    Object.assign(style, {
      bgColor: "default",
      textColor: "default",
      outlineStyle: "none",
      overflowDetection: false,
      elementInspector: true,
    });
  }

  return normalizeConfig({ style, fullStyle: DEFAULT_CONFIG.fullStyle });
}

function colorWithAlpha(hex, alpha) {
  const normalizedAlpha = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();
  return `${hex}${normalizedAlpha}`;
}

function depthSelector(depth) {
  return `:where(:root${" > *".repeat(depth)})`;
}

function adjustLightness(hex, adjustment) {
  const [red, green, blue] = [1, 3, 5].map(
    (offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255,
  );
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const delta = maximum - minimum;
  let hue = 0;
  const lightness = (maximum + minimum) / 2;
  const saturation =
    delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

  if (delta !== 0) {
    if (maximum === red) {
      hue = ((green - blue) / delta) % 6;
    } else if (maximum === green) {
      hue = (blue - red) / delta + 2;
    } else {
      hue = (red - green) / delta + 4;
    }
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  const adjustedLightness = Math.min(
    0.95,
    Math.max(0.05, lightness + adjustment / 100),
  );
  const chroma =
    (1 - Math.abs(2 * adjustedLightness - 1)) * saturation;
  const segment = hue / 60;
  const secondary = chroma * (1 - Math.abs((segment % 2) - 1));
  const [redPrime, greenPrime, bluePrime] =
    segment < 1
      ? [chroma, secondary, 0]
      : segment < 2
        ? [secondary, chroma, 0]
        : segment < 3
          ? [0, chroma, secondary]
          : segment < 4
            ? [0, secondary, chroma]
            : segment < 5
              ? [secondary, 0, chroma]
              : [chroma, 0, secondary];
  const match = adjustedLightness - chroma / 2;
  return `#${[redPrime, greenPrime, bluePrime]
    .map((channel) =>
      Math.round((channel + match) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`.toUpperCase();
}

function paletteForStyle(style) {
  const colorful = style.bgColor === "colorful";
  const baseColors = colorful ? style.paletteColors : [style.monochromeColor];
  const lightnessStep = colorful
    ? style.cycleLightnessStep
    : style.monochromeLightnessStep;

  return Array.from({ length: MAX_DEPTH + 1 }, (_, index) => {
    const baseColor = baseColors[index % baseColors.length];
    const cycle = Math.floor(index / baseColors.length);
    return adjustLightness(baseColor, cycle * lightnessStep);
  });
}

function backgroundRules(style, important) {
  if (style.bgColor === "default") {
    return [];
  }

  const palette = paletteForStyle(style);
  const colors =
    style.backgroundOpacity < 100
      ? palette.map((color) =>
          colorWithAlpha(color, style.backgroundOpacity / 100),
        )
      : palette;
  const priority = important ? " !important" : "";
  const declarations = (color) => {
    const imageReset = important ? `background-image: none${priority}; ` : "";
    return `${imageReset}background-color: ${color}${priority};`;
  };

  if (!style.byLevel) {
    return colors.map(
      (color, index) =>
        `:where(${visualizedElement(`:nth-child(${colors.length}n + ${index + 1})`)}) { ${declarations(color)} }`,
    );
  }

  return Array.from({ length: MAX_DEPTH + 1 }, (_, depth) =>
    `${depthSelector(depth)} { ${declarations(colors[depth % colors.length])} }`,
  );
}

function borderRules(style, important) {
  if (style.outlineStyle === "none") {
    return [];
  }

  const priority = important ? " !important" : "";

  return [
    `:where(${visualizedElement()}) { outline: ${style.outlineWidth}px ${style.outlineStyle} ${style.outlineColor}${priority}; outline-offset: -${style.outlineWidth}px${priority}; }`,
  ];
}

function textRules(style, important) {
  if (style.textColor === "default") {
    return [];
  }

  const priority = important ? " !important" : "";
  if (style.textColor === "custom") {
    return [
      `:where(${visualizedElement()}) { color: ${style.customTextColor}${priority}; }`,
    ];
  }

  if (style.bgColor === "default") {
    return [];
  }

  const colors = paletteForStyle(style);
  const srgbChannel = (channel) => {
    const value = channel / 255;
    return value <= 0.04045
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  };
  const luminance = (hex) => {
    const [red, green, blue] = [1, 3, 5].map((offset) =>
      Number.parseInt(hex.slice(offset, offset + 2), 16),
    );
    return (
      0.2126 * srgbChannel(red) +
      0.7152 * srgbChannel(green) +
      0.0722 * srgbChannel(blue)
    );
  };
  const darkText = "#211812";
  const lightText = "#FFF5E8";
  const darkLuminance = luminance(darkText);
  const lightLuminance = luminance(lightText);
  const contrastingText = (background) => {
    const backgroundLuminance = luminance(background);
    const darkContrast =
      (Math.max(backgroundLuminance, darkLuminance) + 0.05) /
      (Math.min(backgroundLuminance, darkLuminance) + 0.05);
    const lightContrast =
      (Math.max(backgroundLuminance, lightLuminance) + 0.05) /
      (Math.min(backgroundLuminance, lightLuminance) + 0.05);
    return darkContrast >= lightContrast ? darkText : lightText;
  };
  const declaration = (background) =>
    `color: ${contrastingText(background)}${priority};`;

  if (!style.byLevel) {
    return colors.map(
      (background, index) =>
        `:where(${visualizedElement(`:nth-child(${colors.length}n + ${index + 1})`)}) { ${declaration(background)} }`,
    );
  }

  return Array.from({ length: MAX_DEPTH + 1 }, (_, depth) =>
    `${depthSelector(depth)} { ${declaration(colors[depth % colors.length])} }`,
  );
}

export function buildStyleInjections(candidate) {
  const { style } = normalizeConfig(candidate);
  const rulesByOrigin = { AUTHOR: [], USER: [] };
  const addRules = (rules, override) => {
    const origin = override ? "USER" : "AUTHOR";
    rulesByOrigin[origin].push(...rules);
  };

  addRules(
    backgroundRules(style, style.overrideBgColor),
    style.overrideBgColor,
  );
  addRules(borderRules(style, style.overrideBorder), style.overrideBorder);
  addRules(textRules(style, true), true);

  return Object.entries(rulesByOrigin)
    .filter(([, rules]) => rules.length > 0)
    .map(([origin, rules]) => ({
      origin,
      css: `/* Skeleton Layout: generated visualization styles */\n${rules.join("\n")}`,
    }));
}

export function isStoredInjection(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof value.css === "string" &&
    VALID_ORIGINS.has(value.origin)
  );
}
