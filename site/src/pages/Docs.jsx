import { Link } from "routini";
import { repo } from "../components/SiteShell.jsx";
import { usePageMeta } from "../lib/usePageMeta.js";

const sections = [
  ["modes", "Modes", "Mode presets change the visualization without overwriting your saved Full visualization preferences.", [
    ["Full visualization", "Uses your background, outline, and text treatments across the page."],
    ["Outline only", "Keeps page colors and adds an outline that follows each element's contrasting foreground color."],
    ["Hover inspector", "Keeps page styling and enables the isolated element-details overlay."],
  ]],
  ["grid-lines", "Grid lines", "Grid visualization is enabled by default. It draws the resolved columns of visible CSS Grid containers over the page without changing the layout.", [
    ["What it reveals", "Each column is outlined from the grid container's content box, making tracks, gaps, padding, and alignment easier to compare."],
    ["Nested grids", "Every visible grid with two or more resolved columns receives its own overlay, so inner components can be checked against the page-level grid."],
    ["Live pages", "The overlay follows scrolling and refreshes after resizing or DOM changes."],
    ["Toggle", "Use Enable grid visualization directly below the Visualization menu when you want to hide or restore the lines."],
    ["Current scope", "The overlay visualizes resolved CSS Grid columns. Flexbox remains available in the hover inspector, but it does not receive grid lines."],
  ]],
  ["background", "Background", "Choose whether Skeleton Layout preserves page backgrounds or replaces them with structural colors.", [
    ["Keep page's background", "Disables generated backgrounds and hides controls that do not apply."],
    ["Monochrome", "Uses one editable hue with an accumulated per-level lightness step."],
    ["Colorful", "Uses six editable hues, then repeats them with the configured lightness progression."],
    ["Opacity", "Controls generated background opacity from 10% to 100%. The default is 41%."],
    ["Color by nesting depth", "Assigns consistent colors according to DOM depth."],
    ["Override page backgrounds", "Uses the user cascade origin so visualization colors win over page styles."],
  ]],
  ["outline", "Outline", "Add a diagnostic boundary without changing layout dimensions.", [
    ["Style", "Choose dashed, solid, or no outline. Dashed is the default."],
    ["Color", "Pick the Full visualization outline color. Outline only follows each element's foreground color automatically."],
    ["Thickness", "Choose a restrained width from 1 to 4 pixels."],
    ["Override page outlines", "Keeps diagnostic outlines above page outline rules."],
  ]],
  ["text", "Text", "Keep text readable while structural backgrounds are active.", [
    ["Automatic contrast", "Chooses dark or light text for every generated color level. This is the default."],
    ["Keep page colors", "Leaves the website's existing text colors untouched."],
    ["Custom color", "Applies one chosen text color to visualized elements."],
  ]],
  ["diagnostics", "Diagnostics", "Optional layers run locally in the active tab and never transmit measurements or content.", [
    ["Grid visualization", "Draws CSS Grid column tracks across visible containers. See Grid lines above for behavior and current limits."],
    ["Element details on hover", "Shows tag, size, depth, display, box sizing, overflow, layout indicators, and margin, border, padding, and content. Click to pin; press Escape to release."],
    ["Likely overflow — experimental", "Marks confirmed horizontal page overflow in red and possible clipping in amber while ignoring intentional scroll containers."],
  ]],
];

export default function Docs() {
  usePageMeta(
    "Documentation · Skeleton Layout",
    "Install Skeleton Layout locally and learn how to use its visualization modes, diagnostics, and settings.",
  );

  return <main className="docs">
    <aside><b>Documentation</b><a href="#installation">Installation</a>{sections.map(([id, title]) => <a key={id} href={`#${id}`}>{title}</a>)}<a href="#shortcuts">Shortcuts</a><a href="#permissions">Permissions</a><a href="#compatibility">Compatibility</a><a href="#limits">Limitations</a></aside>
    <div className="docs-main">
      <header><p className="eyebrow"><span /> Skeleton Layout documentation</p><h1>Installation and settings.</h1><p className="lead">Instructions for installing the extension and configuring its visualization and diagnostic options.</p></header>
      <section className="doc-section installation" id="installation"><h2>Install locally</h2><p>Until the Chrome Web Store release is available, run the current version directly from this repository.</p><ol><li>Download or clone the <a href={repo}>Skeleton Layout repository</a>.</li><li>Open <code>chrome://extensions</code> in Google Chrome.</li><li>Enable <strong>Developer mode</strong>.</li><li>Select <strong>Load unpacked</strong> and choose the folder containing <code>manifest.json</code>.</li><li>Pin Skeleton Layout, then click its toolbar icon on a normal webpage.</li></ol><div className="note"><strong>Updating a local installation</strong><span>Pull or download the new files, select <b>Reload</b> on <code>chrome://extensions</code>, then refresh the page you are inspecting.</span></div></section>
      {sections.map(([id, title, intro, items]) => <section className="doc-section" id={id} key={id}><h2>{title}</h2><p>{intro}</p><dl>{items.map(([term, definition]) => <div key={term}><dt>{term}</dt><dd>{definition}</dd></div>)}</dl></section>)}
      <section className="doc-section" id="shortcuts"><h2>Toolbar and shortcuts</h2><p>Click the toolbar icon to toggle. Right-click it to open settings beside the page or select a Quick mode.</p><dl><div><dt>Toggle</dt><dd><kbd>Ctrl/⌘</kbd> <kbd>Shift</kbd> <kbd>L</kbd></dd></div><div><dt>Cycle modes</dt><dd><kbd>Ctrl/⌘</kbd> <kbd>Shift</kbd> <kbd>Y</kbd></dd></div><div><dt>Direct commands</dt><dd>Assign them at <code>chrome://extensions/shortcuts</code>.</dd></div></dl></section>
      <section className="doc-section" id="permissions"><h2>Permissions</h2><p>Skeleton Layout requests no persistent site access.</p><dl>{[["activeTab","Temporary access after you invoke the extension."],["scripting","Insert and remove CSS and optional diagnostics."],["contextMenus","Offer settings and modes from the toolbar icon."],["sidePanel","Keep settings beside the inspected page."],["storage","Save preferences and temporary tab state; never URLs or page content."]].map(([name, description]) => <div key={name}><dt>{name}</dt><dd>{description}</dd></div>)}</dl></section>
      <section className="doc-section" id="compatibility"><h2>Compatibility</h2><p>The main visualization works on ordinary web pages where Chrome permits temporary extension access.</p><dl><div><dt>Static and server-rendered pages</dt><dd>Supported. Existing and newly rendered elements receive generated structural styles.</dd></div><div><dt>React, Vue, Astro, and similar apps</dt><dd>Supported. DOM changes are visualized without adding classes or attributes to application elements.</dd></div><div><dt>Flexbox and Grid layouts</dt><dd>Supported. Hover inspection adds contextual container and item details.</dd></div><div><dt>Local development servers</dt><dd>Supported on normal <code>http://localhost</code> pages. File URLs require the user to enable file access for the extension.</dd></div><div><dt>Shadow DOM and iframes</dt><dd>The document itself is supported, but styling cannot cross closed shadow roots or enter cross-origin iframe documents.</dd></div><div><dt>Chrome internal pages</dt><dd>Unsupported by browser policy, including <code>chrome://</code> pages and the Chrome Web Store.</dd></div></dl></section>
      <section className="doc-section" id="limits"><h2>Limitations</h2><ul><li>Chrome-owned pages and the Chrome Web Store prohibit injection.</li><li>Cross-origin navigation revokes temporary access until invoked again.</li><li>Styles cannot cross Shadow DOM boundaries or reach cross-origin iframe contents.</li><li>Nesting deeper than 64 levels is left uncolored.</li><li>Overflow detection is experimental and contextual.</li></ul></section>
    </div>
  </main>;
}
