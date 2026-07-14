import {
  DEFAULT_CONFIG,
  QUICK_MODES,
  normalizeConfig,
  presetConfigForMode,
} from "./config.js";

export const SETTINGS_PHASES = Object.freeze({
  SAVED: "saved",
  DRAFT: "draft",
  PREVIEWED: "previewed",
});

const sameConfig = (left, right) =>
  JSON.stringify(left) === JSON.stringify(right);

export class SettingsState {
  #saved;
  #draft;
  #phase = SETTINGS_PHASES.SAVED;

  constructor(candidate = DEFAULT_CONFIG) {
    this.loadSaved(candidate);
  }

  get saved() {
    return normalizeConfig(this.#saved);
  }

  get draft() {
    return normalizeConfig(this.#draft);
  }

  get phase() {
    return this.#phase;
  }

  get dirty() {
    return !sameConfig(this.#draft, this.#saved);
  }

  loadSaved(candidate) {
    this.#saved = normalizeConfig(candidate);
    this.#draft = normalizeConfig(this.#saved);
    this.#phase = SETTINGS_PHASES.SAVED;
    return this.draft;
  }

  updateDraft(candidate) {
    this.#draft = normalizeConfig(candidate);
    this.#phase = this.dirty
      ? SETTINGS_PHASES.DRAFT
      : SETTINGS_PHASES.SAVED;
    return this.draft;
  }

  switchMode(mode) {
    if (!QUICK_MODES.includes(mode)) return this.draft;

    const fullStyle =
      this.#draft.style.mode === "full"
        ? this.#draft.style
        : this.#draft.fullStyle;
    const style =
      mode === "full"
        ? fullStyle
        : presetConfigForMode(mode).style;

    return this.updateDraft({ style, fullStyle });
  }

  markPreviewed() {
    this.#phase = this.dirty
      ? SETTINGS_PHASES.PREVIEWED
      : SETTINGS_PHASES.SAVED;
  }

  commit() {
    this.#saved = normalizeConfig(this.#draft);
    this.#phase = SETTINGS_PHASES.SAVED;
    return this.saved;
  }

  revert() {
    this.#draft = normalizeConfig(this.#saved);
    this.#phase = SETTINGS_PHASES.SAVED;
    return this.draft;
  }

  reset() {
    return this.updateDraft(DEFAULT_CONFIG);
  }
}
