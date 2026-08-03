<p align="center">
  <img src="images/icon.svg" width="112" height="112" alt="Skeleton Layout icon">
</p>

<h1 align="center">Skeleton Layout</h1>

<p align="center">
  Reveal the structure of any page with one click—without opening DevTools or modifying existing page elements.
</p>

<p align="center">
  <a href="https://kebinbin.github.io/skeleton-chrome-extension/">Website</a> ·
  <a href="https://kebinbin.github.io/skeleton-chrome-extension/docs">Documentation</a> ·
  <a href="https://kebinbin.github.io/skeleton-chrome-extension/privacy">Privacy</a>
</p>

Skeleton Layout is a focused Chrome extension for frontend engineers and designers. It applies configurable background colors and outlines to rendered page elements so nesting, spacing, overflow, and unexpected wrappers become immediately visible.

## Why it exists

Have you ever added random background colors or borders to HTML elements just to see what the layout is actually doing while you code? That temporary CSS is useful, but writing and removing it repeatedly interrupts the work.

Skeleton Layout grew from that habit. It turns the manual workaround into a reusable visualization that can be toggled from the toolbar while the page changes beside the editor.

Chrome DevTools offers excellent element inspection and dedicated Grid, Flexbox, paint, and compositor overlays. Those tools are precise, but they require DevTools and focus on selected layout systems or elements. Skeleton Layout provides a complementary, persistent whole-page view.

## Features

- One-click toolbar toggle with a visible `ON` badge.
- A six-color palette ordered for strong contrast between neighboring levels.
- Color by DOM nesting depth or by sibling position.
- Adjustable background opacity from 10% to 100%.
- Six editable base colors with an accumulated lightness control for later levels.
- A single editable monochrome hue with per-level lightness progression.
- Settings side panel that keeps the inspected page visible.
- Live, unsaved previews on the currently enabled page while editing settings.
- Dashed or solid, white-by-default diagnostic outlines from 1–4 px.
- Optional diagnostic text colors.
- Automatic dark/light text contrast for every generated color level.
- Experimental overflow detection that separates confirmed document-level
  horizontal overflow from possible clipped content.
- Optional box-model inspection on hover with colored margin, border, padding,
  and content regions plus element dimensions, nesting depth, display type,
  and overflow state.
- Click-to-pin inspection; press `Escape` to return to hover inspection.
- Contextual hover indicators for Flexbox, Grid, positioned elements, scroll
  and clipping axes, z-index, and stacking contexts.
- Flexbox flow, wrapping, gaps, and alignment plus Grid track counts, gaps,
  and alignment in the hover inspector.
- Saved mode presets and keyboard cycling between full, outline-only, and
  inspector-only visualization.
- Independent override controls using the browser's CSS cascade.
- Immediate updates on every enabled tab when settings change.
- Automatic reapplication after same-origin reloads and navigation.
- No classes, data attributes, or inline styles added to existing page elements.
- No analytics, network requests, or collection of page content.

## Install locally

Skeleton Layout is not yet published in the Chrome Web Store. Until then, use
the packaged release ZIP instead of loading the whole repository:

1. Download `skeleton-layout-v0.3.0.zip` from the latest GitHub release.
2. Extract the ZIP file.
3. Open `chrome://extensions` in Chrome.
4. Enable **Developer mode**.
5. Select **Load unpacked**.
6. Choose the extracted folder that contains `manifest.json`.
7. Pin Skeleton Layout to the toolbar.

Chrome cannot install the ZIP directly. It needs the extracted folder, and the
selected folder must be the one with `manifest.json` at its root.

Click the toolbar icon on a normal `http`, `https`, or permitted local-file page. To configure the visualization without leaving the page, right-click the toolbar icon and choose **Open settings beside this page**. The same menu provides **Quick mode → Hover inspector** and the other modes without requiring keyboard shortcuts.

While Skeleton Layout is enabled, settings changes preview immediately on the active page. Select **Save** to persist the previewed configuration and apply it to every enabled tab, or **Revert** to restore the saved settings. Closing the settings panel also discards its remaining unsaved previews.

Use `Ctrl+Shift+L` (`Command+Shift+L` on macOS) to toggle the extension and `Ctrl+Shift+Y` (`Command+Shift+Y` on macOS) to cycle full → outline → inspector. Chrome exposes direct commands for every mode at `chrome://extensions/shortcuts`, where all shortcuts can be reassigned. The toolbar badge shows `ON`, `OL`, or `IN` for the current mode.

## Privacy and permissions

Skeleton Layout deliberately requests no persistent site access.

| Permission | Why it is needed |
| --- | --- |
| `activeTab` | Grants temporary access only after the user clicks the toolbar action. |
| `contextMenus` | Adds the toolbar right-click shortcut for opening settings. |
| `scripting` | Inserts visualization CSS and runs the optional local overflow detector. |
| `sidePanel` | Displays settings alongside the current webpage. |
| `storage` | Syncs preferences and holds enabled-tab state for the current browser session. |

See [PRIVACY.md](PRIVACY.md) for the complete privacy statement.

## How it works

The background service worker generates structural CSS selectors from the selected configuration. Nesting mode produces selectors for depths 0–64; sibling mode uses repeating `:nth-child()` selectors. Chrome injects those rules in the author or user cascade origin according to each override setting.

Every injection is recorded in `chrome.storage.session`, allowing the extension to pass the exact same CSS and origin to `chrome.scripting.removeCSS()`. The page's classes, attributes, and inline styles remain untouched.

Synchronized preferences begin with the public version-one schema. Invalid or
unversioned pre-release settings reset to safe defaults, while settings written
by a newer incompatible extension version are left untouched instead of being
silently downgraded.

Overflow detection compares rendered element dimensions locally, then draws markers on a single canvas inside a closed Shadow DOM host. The host has no layout footprint and is removed with the rest of the visualization.

## Limitations

- Chrome-owned pages such as `chrome://extensions` and the Chrome Web Store prohibit extension injection.
- Cross-origin navigation revokes `activeTab` access. Click the action again on the new origin.
- Styles do not cross Shadow DOM boundaries. Closed shadow roots are intentionally inaccessible.
- Cross-origin iframe contents are not styled because the extension does not request broad host access.
- Nesting deeper than 64 levels is left uncolored; outlines and text treatment still apply.
- Highly dynamic or animation-heavy pages may repaint more while the visualization is enabled.
- Overflow detection is experimental and heuristic; review each marker in the
  context of the page's intended design.

## Development

The extension has no runtime dependencies and no build step. Node.js 20 or
newer and development-only tooling are used for validation.

```sh
npm install
npm test
npm run check
npm run test:browser
npm run build
```

`npm run test:browser` launches the locally installed Google Chrome in normal
windowed mode, loads the unpacked extension, and verifies real settings-form
mode cycles, draft preservation, save, and revert behavior. On systems where
Chrome is installed elsewhere, set `CHROME_PATH` to its executable. This smoke
test is intentionally separate from the fast headless test suite.

`npm run build` runs the complete validation suite and then regenerates the
deterministic, dependency-free Chrome Web Store archive in `dist/`. Use
`npm run package` when only the archive needs to be regenerated. Development
files, source SVGs, tests, repository metadata, and operating-system metadata
are excluded.

After changing the extension, select **Reload** for Skeleton Layout on `chrome://extensions`, then refresh any test tabs.

For active development, you can also load the repository root directly with
**Load unpacked** because it contains the working `manifest.json`. For normal
manual installation, prefer the release ZIP so Chrome only sees the extension
runtime files.

## Publishing

See [STORE_LISTING.md](STORE_LISTING.md) for prepared listing copy, permission justifications, QA scenarios, and the remaining release-asset checklist.

## Support and feedback

Use the structured GitHub forms to [report a bug](https://github.com/kebinbin/skeleton-chrome-extension/issues/new?template=bug_report.yml) or [suggest a focused improvement](https://github.com/kebinbin/skeleton-chrome-extension/issues/new?template=feature_request.yml). Remove private page content and account information from screenshots or recordings before attaching them.

## Project status

Version 0.3.0 is a publication candidate on the `experimentation` branch and is released under the [MIT License](LICENSE).
