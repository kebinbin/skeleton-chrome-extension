# Chrome Web Store release guide

## Listing copy

### Name

Skeleton Layout

### Summary

Reveal page structure with one-click layout colors and outlines—without opening DevTools.

### Detailed description

Frontend developers often add temporary background colors or borders to HTML elements just to understand what a layout is doing. Skeleton Layout turns that familiar debugging habit into a reusable visualization you can toggle instead of repeatedly writing and removing temporary CSS.

Skeleton Layout helps frontend engineers and designers understand page structure at a glance. Click the toolbar icon to color page elements by nesting depth or sibling position and add non-layout-shifting diagnostic outlines.

Use it to spot unexpected wrappers, spacing inconsistencies, overflow, stacking patterns, and component boundaries while developing or studying a page. Choose between a colorful palette and a neutral monochrome scale, then tune transparency, outlines, text color, and cascade overrides.

The main settings mode, keyboard shortcuts, or the toolbar right-click Quick mode menu switch between full visualization, outline-only structure, and the hover inspector. Toolbar quick modes do not change saved preferences.

Skeleton Layout does not add classes or attributes to inspected page elements. Optional diagnostics can distinguish confirmed horizontal page overflow from possible clipped content and show local element details on hover in isolated overlays. Element measurements are never transmitted or stored. The extension does not collect page content, browsing history, or analytics, and it requests access only to the tab where the user clicks the extension.

### Single purpose

Visually reveal the HTML layout structure of the current page for frontend development and design inspection.

## Permission justifications

### activeTab

Provides temporary access to the current tab only after the user clicks the toolbar icon. This avoids persistent access to every website.

### scripting

Required to insert and remove generated visualization CSS and, when explicitly enabled, run the local overflow detector in the user-selected tab.

### contextMenus

Adds an item to the extension toolbar icon's right-click menu so users can open settings without navigating away from their current page.

### sidePanel

Displays the extension settings alongside the current webpage for faster visual iteration.

### storage

Stores the user's visualization preferences and temporary enabled-tab state. It does not store URLs or page content.

## Data disclosure answers

- Personally identifiable information: **No**
- Health information: **No**
- Financial and payment information: **No**
- Authentication information: **No**
- Personal communications: **No**
- Location: **No**
- Web history: **No**
- User activity: **No**
- Website content: **No collection or transmission**
- Remote code: **No**

Review these answers again in the current Developer Dashboard before submission; dashboard wording can change.

## Required store assets

- [x] 128×128 store icon (`images/icon-128.png`).
- [ ] At least one 1280×800 or 640×400 screenshot showing the overlay on a representative development page.
- [ ] A screenshot of the settings experience.
- [ ] Optional 440×280 small promotional tile.
- [ ] Optional 1400×560 marquee promotional tile.
- [x] Public privacy policy: https://kebinbin.github.io/skeleton-chrome-extension/privacy
- [x] Support URL: https://github.com/kebinbin/skeleton-chrome-extension/issues
- [x] MIT repository license.

Use only screenshots and sites you own or have permission to publish. Avoid customer data, private source code, browser profile details, or third-party trademarks as the focal point.

## Manual release QA

Test the unpacked production directory in a clean Chrome profile:

1. Fresh install creates defaults without errors.
2. The first toolbar click enables the overlay and displays `ON`.
3. The second click removes every visual effect and clears the badge.
4. Changing every option updates an already-enabled tab without reloading it.
5. Reloading a same-origin page reapplies the visualization.
6. Navigating to another origin fails safely and does not retain an incorrect `ON` badge.
7. Closing an enabled tab removes its session state.
8. Protected Chrome pages show an error badge and explanatory tooltip.
9. A page that adds elements dynamically styles new elements without adding classes or attributes.
10. Settings are fully usable with keyboard navigation and at 200% zoom.
11. Test light and dark websites, long documents, SVG-heavy pages, forms, and animation-heavy pages.
12. Inspect the extension service worker console for uncaught errors.
13. Enable overflow detection on clipped, scrollable, and viewport-wide test elements; confirm page overflow appears in red, possible clipping appears in amber, intentional scroll containers are ignored, and all markers disappear when the toolbar overlay is disabled.
14. Enable element details on hover; confirm the page overlay distinguishes margin, border, padding, and content, the tooltip reports non-zero side values plus tag, size, depth, display, box sizing, border, and overflow, and everything disappears when the toolbar overlay is disabled. Include elements with zero, auto, negative, and four-digit measurements in this check.
15. Hover Flexbox and Grid containers and items, positioned elements, scroll and clipped containers, and stacking contexts; confirm only relevant layout badges appear and z-index is shown when set.
16. Test the saved Mode dropdown, toolbar right-click Quick mode menu, toggle and cycle shortcuts, and every direct mode command from `chrome://extensions/shortcuts`; confirm badges show `ON`, `OL`, and `IN`, modes survive reloads, toolbar quick modes leave saved preferences unchanged, and the experimental overflow control remains independent.
17. Change settings without saving, use **Revert**, and close the side panel with another unsaved preview; confirm both paths restore the saved visualization.
18. Leave overflow detection enabled on a large page, switch tabs, scroll continuously, and return; confirm hidden tabs remain idle and markers refresh after scrolling settles without flashing.

## Package checklist

- [ ] Run `npm run check`.
- [ ] Run `npm run test:browser` against the release candidate.
- [ ] Run `npm run package`, extract the generated ZIP from `dist/`, and load the extracted folder into a clean profile.
- [ ] Confirm `git status` contains only intended release changes.
- [ ] Confirm manifest and package versions match.
- [ ] Add release notes and tag the reviewed commit.
- [ ] Confirm the generated ZIP has `manifest.json` at its root and contains no tests, scripts, source SVGs, `.DS_Store`, or repository metadata.
- [ ] Upload to the Developer Dashboard and complete every privacy declaration.
- [ ] Use staged or trusted-tester publication before a broad public launch.
