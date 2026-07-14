import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_CONFIG } from "../shared/config.js";
import {
  SETTINGS_PHASES,
  SettingsState,
} from "../shared/settings-state.js";

const customizedFull = (overrides = {}) => ({
  style: {
    ...DEFAULT_CONFIG.style,
    backgroundOpacity: 41,
    cycleLightnessStep: -12,
    paletteColors: [
      "#123456",
      ...DEFAULT_CONFIG.style.paletteColors.slice(1),
    ],
    ...overrides,
  },
});

test("settings state owns saved, draft, previewed, committed, and reverted phases", () => {
  const state = new SettingsState(DEFAULT_CONFIG);

  assert.equal(state.phase, SETTINGS_PHASES.SAVED);
  assert.equal(state.dirty, false);

  state.updateDraft(customizedFull());
  assert.equal(state.phase, SETTINGS_PHASES.DRAFT);
  assert.equal(state.dirty, true);
  assert.equal(state.saved.style.backgroundOpacity, 67);
  assert.equal(state.draft.style.backgroundOpacity, 41);

  state.markPreviewed();
  assert.equal(state.phase, SETTINGS_PHASES.PREVIEWED);

  state.commit();
  assert.equal(state.phase, SETTINGS_PHASES.SAVED);
  assert.equal(state.dirty, false);
  assert.equal(state.saved.style.backgroundOpacity, 41);

  state.updateDraft(customizedFull({ backgroundOpacity: 29 }));
  assert.equal(state.revert().style.backgroundOpacity, 41);
  assert.equal(state.phase, SETTINGS_PHASES.SAVED);
  assert.equal(state.dirty, false);
});

test("mode cycles never discard customized full visualization settings", () => {
  const state = new SettingsState(customizedFull());

  const outline = state.switchMode("outline");
  assert.equal(outline.style.mode, "outline");
  assert.equal(outline.style.bgColor, "default");
  assert.equal(outline.style.outlineStyle, "dashed");
  assert.equal(outline.fullStyle.backgroundOpacity, 41);
  assert.equal(outline.fullStyle.paletteColors[0], "#123456");

  const inspector = state.switchMode("inspector");
  assert.equal(inspector.style.mode, "inspector");
  assert.equal(inspector.style.elementInspector, true);
  assert.equal(inspector.fullStyle.cycleLightnessStep, -12);

  const full = state.switchMode("full");
  assert.equal(full.style.mode, "full");
  assert.equal(full.style.backgroundOpacity, 41);
  assert.equal(full.style.cycleLightnessStep, -12);
  assert.equal(full.style.paletteColors[0], "#123456");
});

test("reset is a reversible draft until committed", () => {
  const state = new SettingsState(customizedFull());

  const reset = state.reset();
  assert.equal(reset.style.backgroundOpacity, 67);
  assert.equal(state.dirty, true);
  assert.equal(state.phase, SETTINGS_PHASES.DRAFT);

  assert.equal(state.revert().style.backgroundOpacity, 41);
  assert.equal(state.dirty, false);
});

test("callers cannot mutate controller state through returned configs", () => {
  const state = new SettingsState(customizedFull());
  const exposed = state.draft;

  exposed.style.backgroundOpacity = 10;
  exposed.style.paletteColors[0] = "#FFFFFF";

  assert.equal(state.draft.style.backgroundOpacity, 41);
  assert.equal(state.draft.style.paletteColors[0], "#123456");
});
