import {
  DEFAULT_CONFIG,
  MONOCHROME_COLOR,
  PALETTE,
  loadStoredConfig,
  normalizeConfig,
} from "./shared/config.js";
import { SettingsState } from "./shared/settings-state.js";

const form = document.querySelector("#settingsForm");
const status = document.querySelector("#status");
const saveAndCloseButton = document.querySelector("#saveAndClose");
const resetButton = document.querySelector("#reset");
const revertButton = document.querySelector("#revert");
const resetPaletteButton = document.querySelector("#resetPalette");
const paletteColors = document.querySelector("#paletteColors");
const colorCustomization = document.querySelector("#colorCustomization");
const colorCustomizationTitle = document.querySelector(
  "#colorCustomizationTitle",
);
const colorCustomizationDescription = document.querySelector(
  "#colorCustomizationDescription",
);
const lightnessStepLabel = document.querySelector("#lightnessStepLabel");
const lightnessStepHelp = document.querySelector("#lightnessStepHelp");
const cycleLightnessValue = document.querySelector("#cycleLightnessValue");
const backgroundOpacityValue = document.querySelector(
  "#backgroundOpacityValue",
);
const backgroundToggles = document.querySelector("#backgroundToggles");
const outlineCustomization = document.querySelector("#outlineCustomization");
const outlineOverrideRow = document.querySelector("#outlineOverrideRow");
const outlineColorField = document.querySelector("#outlineColorField");
const automaticOutlineColorHelp = document.querySelector(
  "#automaticOutlineColorHelp",
);
const outlineColorValue = document.querySelector("#outlineColorValue");
const outlineWidthValue = document.querySelector("#outlineWidthValue");
const textColorCustomization = document.querySelector(
  "#textColorCustomization",
);
const customTextColorValue = document.querySelector("#customTextColorValue");
let colorDraft;
const settingsState = new SettingsState(DEFAULT_CONFIG);
let previewTimer;
let hasUnsavedChanges = false;
let previewRequestId = 0;
let previewPort = null;

const PREVIEW_DELAY_MS = 120;
const previewRequests = new Map();

function connectPreviewPort() {
  const port = chrome.runtime.connect({ name: "settings-preview" });
  previewPort = port;

  port.onMessage.addListener((message) => {
    const request = previewRequests.get(message?.requestId);
    if (!request || request.port !== port) return;
    previewRequests.delete(message.requestId);
    request.resolve(message);
  });

  port.onDisconnect.addListener(() => {
    if (previewPort === port) previewPort = null;
    for (const [requestId, request] of previewRequests) {
      if (request.port !== port) continue;
      previewRequests.delete(requestId);
      request.reject(new Error("The live-preview connection closed."));
    }
  });
  return port;
}

function sendPreviewCommandOnce(type, details) {
  const port = previewPort ?? connectPreviewPort();
  const requestId = ++previewRequestId;
  return new Promise((resolve, reject) => {
    previewRequests.set(requestId, { port, resolve, reject });
    try {
      port.postMessage({ type, requestId, ...details });
    } catch (error) {
      previewRequests.delete(requestId);
      if (previewPort === port) previewPort = null;
      try {
        port.disconnect();
      } catch {
        // The port was already disconnected.
      }
      reject(error);
    }
  });
}

async function sendPreviewCommand(type, details = {}) {
  try {
    return await sendPreviewCommandOnce(type, details);
  } catch (firstError) {
    try {
      return await sendPreviewCommandOnce(type, details);
    } catch (retryError) {
      retryError.cause ??= firstError;
      throw retryError;
    }
  }
}

const fields = Object.freeze({
  mode: document.querySelector("#visualizationMode"),
  gridVisualization: document.querySelector("#gridVisualization"),
  bgColor: document.querySelector("#bgColor"),
  backgroundOpacity: document.querySelector("#backgroundOpacity"),
  textColor: document.querySelector("#textColor"),
  customTextColor: document.querySelector("#customTextColor"),
  cycleLightnessStep: document.querySelector("#cycleLightnessStep"),
  byLevel: document.querySelector("#byLevel"),
  overrideBgColor: document.querySelector("#overrideBgColor"),
  outlineStyle: document.querySelector("#outlineStyle"),
  outlineColor: document.querySelector("#outlineColor"),
  outlineWidth: document.querySelector("#outlineWidth"),
  overrideBorder: document.querySelector("#overrideBorder"),
  overflowDetection: document.querySelector("#overflowDetection"),
  elementInspector: document.querySelector("#elementInspector"),
});

function backgroundMode() {
  return fields.bgColor.value === "default" ? null : fields.bgColor.value;
}

function setPaletteColors(colors) {
  const fragment = document.createDocumentFragment();
  colors.forEach((color, index) => {
    const label = document.createElement("label");
    label.className = "color-picker";
    label.title = `Level ${index + 1}: ${color}`;

    const number = document.createElement("span");
    number.textContent = index + 1;

    const input = document.createElement("input");
    input.type = "color";
    input.name = "paletteColor";
    input.value = color;
    input.setAttribute("aria-label", `Level ${index + 1} color`);
    input.addEventListener("input", () => {
      const value = input.value.toUpperCase();
      label.title = `Level ${index + 1}: ${value}`;
      if (backgroundMode() === "colorful") {
        colorDraft.paletteColors[index] = value;
      } else {
        colorDraft.monochromeColor = value;
      }
    });

    label.append(input, number);
    fragment.append(label);
  });
  paletteColors.replaceChildren(fragment);
}

function updateColorControlValues() {
  const step = Number(fields.cycleLightnessStep.value);
  cycleLightnessValue.value = `${step > 0 ? "+" : ""}${step}%`;
  backgroundOpacityValue.value = `${fields.backgroundOpacity.value}%`;
  if (backgroundMode() === "colorful") {
    colorDraft.cycleLightnessStep = step;
  } else if (backgroundMode() === "monochrome") {
    colorDraft.monochromeLightnessStep = step;
  }
}

function renderColorCustomization() {
  const mode = backgroundMode();
  colorCustomization.hidden = mode === null;
  if (mode === null) return;

  const colorful = mode === "colorful";
  colorCustomizationTitle.textContent = colorful
    ? "Customize color palette"
    : "Customize monochrome color";
  colorCustomizationDescription.textContent = colorful
    ? "Choose the six base hues used for levels 1–6."
    : "Choose the base hue used across every level.";
  lightnessStepLabel.textContent = colorful
    ? "Lightness per six-level cycle"
    : "Lightness per level";
  lightnessStepHelp.textContent = colorful
    ? "Later levels reuse the base hues with accumulated lightness."
    : "Each next level applies another lightness step to the base hue.";
  resetPaletteButton.textContent = colorful
    ? "Restore color palette"
    : "Restore monochrome color";
  setPaletteColors(
    colorful ? colorDraft.paletteColors : [colorDraft.monochromeColor],
  );
  fields.cycleLightnessStep.value = colorful
    ? colorDraft.cycleLightnessStep
    : colorDraft.monochromeLightnessStep;
  updateColorControlValues();
}

function setFormConfig(candidate) {
  const { style } = normalizeConfig(candidate);
  fields.mode.value = style.mode;
  fields.gridVisualization.checked = style.gridVisualization;
  fields.bgColor.value = style.bgColor;
  fields.backgroundOpacity.value = style.backgroundOpacity;
  fields.textColor.value = style.textColor;
  fields.customTextColor.value = style.customTextColor;
  colorDraft = {
    paletteColors: [...style.paletteColors],
    monochromeColor: style.monochromeColor,
    cycleLightnessStep: style.cycleLightnessStep,
    monochromeLightnessStep: style.monochromeLightnessStep,
  };
  fields.byLevel.checked = style.byLevel;
  fields.overrideBgColor.checked = style.overrideBgColor;
  fields.outlineStyle.value = style.outlineStyle;
  fields.outlineColor.value = style.outlineColor;
  fields.outlineWidth.value = style.outlineWidth;
  fields.overrideBorder.checked = style.overrideBorder;
  fields.overflowDetection.checked = style.overflowDetection;
  fields.elementInspector.checked = style.elementInspector;
  updateValueLabels();
  updateDependencies();
}

function readStyleFromFields(mode = fields.mode.value) {
  return normalizeConfig({
    style: {
      mode,
      gridVisualization: fields.gridVisualization.checked,
      bgColor: fields.bgColor.value,
      backgroundOpacity: Number(fields.backgroundOpacity.value),
      textColor: fields.textColor.value,
      customTextColor: fields.customTextColor.value.toUpperCase(),
      ...colorDraft,
      byLevel: fields.byLevel.checked,
      overrideBgColor: fields.overrideBgColor.checked,
      outlineStyle: fields.outlineStyle.value,
      outlineColor: fields.outlineColor.value.toUpperCase(),
      outlineWidth: Number(fields.outlineWidth.value),
      overrideBorder: fields.overrideBorder.checked,
      overflowDetection: fields.overflowDetection.checked,
      elementInspector: fields.elementInspector.checked,
    },
  }).style;
}

function readFormConfig() {
  const style = readStyleFromFields();
  return normalizeConfig({
    style,
    fullStyle: {
      ...settingsState.draft.fullStyle,
      gridVisualization: fields.gridVisualization.checked,
    },
  });
}

function setControlState(control, enabled) {
  control.disabled = !enabled;
}

function updateDependencies() {
  const mode = fields.mode.value;
  const fullMode = mode === "full";
  const outlineMode = mode === "outline";
  setControlState(fields.gridVisualization, fullMode || outlineMode || inspectorMode);
  const hasBackground = fields.bgColor.value !== "default";
  setControlState(fields.bgColor, fullMode);
  setControlState(fields.backgroundOpacity, fullMode && hasBackground);
  setControlState(fields.byLevel, fullMode && hasBackground);
  setControlState(fields.overrideBgColor, fullMode && hasBackground);
  backgroundToggles.hidden = !hasBackground;
  const hasOutline = fields.outlineStyle.value !== "none";
  const automaticOutlineColor = outlineMode && hasOutline;
  setControlState(fields.outlineStyle, fullMode || outlineMode);
  setControlState(fields.outlineColor, hasOutline && !automaticOutlineColor);
  setControlState(fields.outlineWidth, hasOutline);
  setControlState(fields.overrideBorder, hasOutline);
  outlineCustomization.hidden = !hasOutline;
  outlineColorField.hidden = automaticOutlineColor;
  automaticOutlineColorHelp.hidden = !automaticOutlineColor;
  outlineOverrideRow.hidden = !hasOutline;
  setControlState(fields.textColor, fullMode);
  setControlState(fields.customTextColor, fullMode && fields.textColor.value === "custom");
  setControlState(fields.elementInspector, fullMode);
  setControlState(fields.overflowDetection, fullMode || outlineMode || inspectorMode);
  textColorCustomization.hidden = fields.textColor.value !== "custom";
  renderColorCustomization();
}

function updateValueLabels() {
  outlineColorValue.value = fields.outlineColor.value.toUpperCase();
  outlineWidthValue.value = `${fields.outlineWidth.value} px`;
  customTextColorValue.value = fields.customTextColor.value.toUpperCase();
}

function showStatus(message, type = "success") {
  status.textContent = message;
  status.dataset.type = type;
}

function setUnsavedChanges(value) {
  hasUnsavedChanges = value;
  revertButton.disabled = !value;
}

function cancelScheduledPreview() {
  if (previewTimer !== undefined) {
    window.clearTimeout(previewTimer);
    previewTimer = undefined;
  }
}

async function previewSettings() {
  previewTimer = undefined;

  try {
    const response = await sendPreviewCommand("preview", {
      config: settingsState.draft,
    });

    if (response?.previewed) {
      settingsState.markPreviewed();
      showStatus("Previewing unsaved changes.", "progress");
    } else if (response?.reason === "disabled") {
      showStatus("Enable Skeleton Layout on this page to preview changes.", "progress");
    } else if (response?.reason === "unavailable") {
      showStatus("Live preview is unavailable on this page.", "progress");
    }
  } catch (error) {
    showStatus("Live preview could not be applied.", "error");
    console.warn("Skeleton Layout could not preview settings.", error);
  }
}

function schedulePreview() {
  setUnsavedChanges(settingsState.dirty);
  cancelScheduledPreview();
  previewTimer = window.setTimeout(previewSettings, PREVIEW_DELAY_MS);
}

async function restoreSettings() {
  try {
    const { config } = await chrome.storage.sync.get("config");
    let displayedConfig = settingsState.loadSaved(loadStoredConfig(config));
    try {
      const activeStatus = await sendPreviewCommand("status");
      if (activeStatus?.enabled) {
        displayedConfig = settingsState.switchMode(activeStatus.mode);
      }
    } catch (error) {
      // Saved settings remain usable if the active tab cannot be inspected.
      console.warn("Skeleton Layout could not read the active tab mode.", error);
    }
    setFormConfig(displayedConfig);
    setUnsavedChanges(false);
  } catch (error) {
    setFormConfig(settingsState.loadSaved(DEFAULT_CONFIG));
    setUnsavedChanges(false);
    showStatus("Settings could not be loaded. Defaults are shown.", "error");
    console.error("Skeleton Layout could not load settings.", error);
  }
}

async function saveSettings({ close = false } = {}) {
  cancelScheduledPreview();
  form.setAttribute("aria-busy", "true");
  const buttons = form.querySelectorAll("button");
  buttons.forEach((button) => {
    button.disabled = true;
  });
  showStatus("Saving…", "progress");

  try {
    settingsState.updateDraft(readFormConfig());
    await chrome.storage.sync.set({ config: settingsState.draft });
    await sendPreviewCommand("commit").catch((error) => {
      console.warn("Skeleton Layout could not finalize preview ownership.", error);
    });
    settingsState.commit();
    setUnsavedChanges(false);
    showStatus("Saved. Enabled tabs updated automatically.");
    if (close) {
      window.setTimeout(() => window.close(), 350);
    }
  } catch (error) {
    showStatus("Settings could not be saved. Please try again.", "error");
    console.error("Skeleton Layout could not save settings.", error);
  } finally {
    form.removeAttribute("aria-busy");
    buttons.forEach((button) => {
      button.disabled = false;
    });
    revertButton.disabled = !hasUnsavedChanges;
  }
}

async function revertSettings() {
  cancelScheduledPreview();
  form.setAttribute("aria-busy", "true");
  const buttons = form.querySelectorAll("button");
  buttons.forEach((button) => {
    button.disabled = true;
  });
  showStatus("Reverting…", "progress");

  try {
    await sendPreviewCommand("revert");
    setFormConfig(settingsState.revert());
    setUnsavedChanges(false);
    showStatus("Reverted to saved settings.");
  } catch (error) {
    showStatus("The preview could not be reverted.", "error");
    console.error("Skeleton Layout could not revert settings.", error);
  } finally {
    form.removeAttribute("aria-busy");
    buttons.forEach((button) => {
      button.disabled = false;
    });
    revertButton.disabled = !hasUnsavedChanges;
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  saveSettings();
});

saveAndCloseButton.addEventListener("click", () => {
  saveSettings({ close: true });
});

revertButton.addEventListener("click", revertSettings);

resetButton.addEventListener("click", () => {
  setFormConfig(settingsState.reset());
  schedulePreview();
});

resetPaletteButton.addEventListener("click", () => {
  if (backgroundMode() === "colorful") {
    colorDraft.paletteColors = [...PALETTE];
    colorDraft.cycleLightnessStep = DEFAULT_CONFIG.style.cycleLightnessStep;
  } else {
    colorDraft.monochromeColor = MONOCHROME_COLOR;
    colorDraft.monochromeLightnessStep =
      DEFAULT_CONFIG.style.monochromeLightnessStep;
  }
  renderColorCustomization();
  settingsState.updateDraft(readFormConfig());
  schedulePreview();
});

fields.cycleLightnessStep.addEventListener("input", updateColorControlValues);
fields.backgroundOpacity.addEventListener("input", updateColorControlValues);
fields.outlineColor.addEventListener("input", updateValueLabels);
fields.outlineWidth.addEventListener("input", updateValueLabels);
fields.customTextColor.addEventListener("input", updateValueLabels);

[fields.bgColor, fields.textColor, fields.outlineStyle].forEach((control) => {
  control.addEventListener("change", updateDependencies);
});

fields.mode.addEventListener("change", () => {
  const nextMode = fields.mode.value;
  const currentStyle = readStyleFromFields(settingsState.draft.style.mode);
  settingsState.updateDraft({
    style: currentStyle,
    fullStyle: settingsState.draft.fullStyle,
  });
  setFormConfig(settingsState.switchMode(nextMode));
  schedulePreview();
});

form.addEventListener("input", (event) => {
  if (event.target !== fields.mode) {
    settingsState.updateDraft(readFormConfig());
  }
  schedulePreview();
});

document.querySelectorAll("[data-section-toggle]").forEach((button) => {
  button.addEventListener("click", () => {
    const content = document.getElementById(button.getAttribute("aria-controls"));
    const willExpand = button.getAttribute("aria-expanded") !== "true";
    button.setAttribute("aria-expanded", String(willExpand));
    content.hidden = !willExpand;
  });
});

restoreSettings();
