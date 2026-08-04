# Skeleton Layout 0.3.0

Skeleton Layout is a Chrome extension for keeping the structure of an entire webpage visible while developing frontend interfaces. This release is the first public release candidate.

## Highlights

- Full-page visualization by DOM nesting depth or sibling position.
- Six-color customizable palette with opacity and lightness progression.
- Monochrome visualization with per-level lightness progression.
- Outline-only and hover-inspector modes.
- Live settings preview in Chrome's side panel.
- Automatic text contrast and configurable outlines.
- Box-model inspection with margin, border, padding, and content measurements.
- Flexbox, Grid, positioning, scrolling, clipping, z-index, and stacking-context indicators.
- Keyboard shortcuts, toolbar quick modes, and mode-specific badges.
- Automatic reapplication after supported reloads and same-origin navigation.
- No analytics, remote code, persistent site access, or modification of page classes and attributes.

## Experimental

Overflow diagnostics are intentionally labeled experimental. They identify likely horizontal page overflow and possible clipped content while filtering common intentional scrolling patterns, but every marker should still be reviewed in the context of the page design.

## Install the release candidate

1. Download and extract the release archive.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Select **Load unpacked** and choose the extracted folder containing `manifest.json`.

See the [documentation](https://kebinbin.github.io/skeleton-chrome-extension/docs) for settings, shortcuts, compatibility, and limitations.
