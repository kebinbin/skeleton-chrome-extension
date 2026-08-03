const base = import.meta.env.BASE_URL;
const repo = "https://github.com/kebinbin/skeleton-chrome-extension";

function Header() {
  return <header className="site-header">
    <a className="brand" href={base}><img src={`${base}assets/icon-128.webp`} alt="" /><b>Skeleton Layout</b></a>
    <nav aria-label="Primary navigation">
      <a href={`${base}#features`}>Features</a><a href={`${base}#modes`}>Modes</a>
      <a href={`${base}docs.html`}>Documentation</a><a href={repo}>GitHub</a>
    </nav>
  </header>;
}

function Footer() {
  return <footer className="site-footer">
    <a className="brand" href={base}><img src={`${base}assets/icon-128.webp`} alt="" /><b>Skeleton Layout</b></a>
    <p>Built for frontend engineers who want to see the whole layout.</p>
    <div><a href={`${base}docs.html`}>Documentation</a><a href={`${base}privacy.html`}>Privacy</a><a href={`${repo}/blob/experimentation/LICENSE`}>MIT License</a><a href={`${repo}/issues`}>Support</a></div>
    <small>© 2026 Kevin Castillo</small>
  </footer>;
}

function Shot({ file, alt, className = "" }) {
  return <img className={`shot ${className}`} src={`${base}assets/${file}`} alt={alt} />;
}

function ModeShot({ file, alt }) {
  return <figure className="mode-visual product-bezel"><Shot file={file} alt={alt} /></figure>;
}

function Landing() {
  return <><Header /><main>
    <section className="hero">
      <p className="eyebrow">Chrome extension for frontend development</p>
      <h1>See every layer.<br />Write better frontend.</h1>
      <p className="lead">Reveal the structure of the page while you code. No refresh, no DevTools detour, and no hovering through one element at a time.</p>
      <div className="actions"><a className="button" href={`${base}docs.html#installation`}>Install locally</a><a href={repo}>View source on GitHub</a></div>
      <p className="trust-line"><span>No tracking</span><span>Temporary tab access</span><span>Open source</span></p>
      <div className="hero-visual aspect-video product-bezel">
        <Shot file="skeleton-hero.webp" alt="Current Sona.io source beside its Full visualization in Chrome" className="hero-shot" />
      </div>
      <p className="caption">Current Sona.io case-study source and current-version Skeleton Layout capture in one 16:9 workspace.</p>
    </section>

    <section className="section origin" id="story">
      <div><p className="eyebrow">Why Skeleton exists</p><h2>It started with temporary background colors.</h2></div>
      <div className="origin-copy"><p className="origin-question">Have you ever added random colors or borders to HTML elements just to see what the layout is actually doing?</p><p>That familiar debugging habit was the starting point for Skeleton Layout. It turns the manual workaround into a reusable visualization you can toggle while coding—without repeatedly editing temporary CSS and cleaning it up afterward.</p></div>
    </section>

    <section className="section" id="features">
      <div className="heading split"><div><p className="eyebrow">Stay in the flow</p><h2>One persistent view of the whole page.</h2></div><p>Skeleton Layout complements DevTools with an always-visible structural layer. Keep coding while nesting, wrappers, spacing, and overflow remain visible beside your editor.</p></div>
      <div className="feature-grid">
        <article><span>01</span><h3>Whole-page structure</h3><p>Color every rendered element by nesting depth or sibling position.</p></article>
        <article><span>02</span><h3>Live configuration</h3><p>Adjust modes and styling beside the page with immediate unsaved previews.</p></article>
        <article><span>03</span><h3>Clean injection</h3><p>No classes, attributes, or inline styles are added to existing elements.</p></article>
      </div>
    </section>

    <section className="section" id="modes">
      <div className="heading"><p className="eyebrow">Three focused modes</p><h2>Choose the amount of structure you need.</h2><p>Every image below is a fresh capture from the current extension.</p></div>
      <div className="mode-grid">
        <article><div><h3>Full visualization</h3><p>Color the complete layout by depth and keep every boundary visible.</p></div><ModeShot file="mode-full.webp" alt="Full visualization mode with colored layout levels" /></article>
        <article><div><h3>Outline only</h3><p>Remove color and study the page skeleton with diagnostic outlines.</p></div><ModeShot file="mode-outline.webp" alt="Outline only mode showing page structure without background colors" /></article>
        <article><div><h3>Hover inspector</h3><p>Inspect dimensions, box model, layout type, overflow, and stacking.</p></div><ModeShot file="mode-inspector.webp" alt="Hover inspector showing the element box model tooltip" /></article>
      </div>
    </section>

    <section className="section settings">
      <div className="settings-copy"><p className="eyebrow">Fine-grained control</p><h2>Tune the overlay without leaving your page.</h2><p>Pick the palette, opacity, outline treatment, text contrast, and diagnostics from Chrome's side panel. Changes preview live before you save them.</p>
        <ul><li>Six editable base colors with lightness progression</li><li>Automatic text contrast and custom outlines</li><li>Box-model inspection and overflow diagnostics</li><li>Toolbar modes and reassignable shortcuts</li></ul>
        <a href={`${base}docs.html`}>Explore every setting</a>
      </div>
      <Shot file="settings.webp" alt="Current Skeleton Layout visualization settings" className="settings-shot" />
    </section>

    <section className="closing"><p className="eyebrow">Built in the open</p><h2>Make the invisible structure visible.</h2><p>Load it locally, try it on your current project, and inspect the source.</p><div className="actions centered"><a className="button" href={`${base}docs.html#installation`}>Install locally</a><a href={repo}>View source on GitHub</a></div></section>
  </main><Footer /></>;
}

const sections = [
  ["modes", "Modes", "Mode presets change the visualization without overwriting your saved Full visualization preferences.", [
    ["Full visualization", "Uses your background, outline, and text treatments across the page."],
    ["Outline only", "Keeps page colors and adds an outline that follows each element's contrasting foreground color."],
    ["Hover inspector", "Keeps page styling and enables the isolated element-details overlay."],
  ]],
  ["background", "Background", "Choose whether Skeleton Layout preserves page backgrounds or replaces them with structural colors.", [
    ["Keep page's background", "Disables generated backgrounds and hides controls that do not apply."],
    ["Monochrome", "Uses one editable hue with an accumulated per-level lightness step."],
    ["Colorful", "Uses six editable hues, then repeats them with the configured lightness progression."],
    ["Opacity", "Controls generated background opacity from 10% to 100%. The default is 67%."],
    ["Color by nesting depth", "Assigns consistent colors according to DOM depth."],
    ["Override page backgrounds", "Uses the user cascade origin so visualization colors win over page styles."],
  ]],
  ["outline", "Outline", "Add a diagnostic boundary without changing layout dimensions.", [
    ["Style", "Choose dashed, solid, or no outline. Dashed is the default."], ["Color", "Pick the Full visualization outline color. Outline only follows each element's foreground color automatically."],
    ["Thickness", "Choose a restrained width from 1 to 4 pixels."], ["Override page outlines", "Keeps diagnostic outlines above page outline rules."],
  ]],
  ["text", "Text", "Keep text readable while structural backgrounds are active.", [
    ["Automatic contrast", "Chooses dark or light text for every generated color level. This is the default."],
    ["Keep page colors", "Leaves the website's existing text colors untouched."], ["Custom color", "Applies one chosen text color to visualized elements."],
  ]],
  ["diagnostics", "Diagnostics", "Optional layers run locally in the active tab and never transmit measurements or content.", [
    ["Element details on hover", "Shows tag, size, depth, display, box sizing, overflow, layout indicators, and margin/border/padding/content. Click to pin; press Escape to release."],
    ["Likely overflow — experimental", "Marks confirmed horizontal page overflow in red and possible clipping in amber while ignoring intentional scroll containers."],
  ]],
];

function Docs() {
  return <><Header /><main className="docs">
    <aside><b>Documentation</b><a href="#installation">Installation</a>{sections.map(([id, title]) => <a key={id} href={`#${id}`}>{title}</a>)}<a href="#shortcuts">Shortcuts</a><a href="#permissions">Permissions</a><a href="#compatibility">Compatibility</a><a href="#limits">Limitations</a></aside>
    <div className="docs-main">
      <header><p className="eyebrow">Skeleton Layout documentation</p><h1>Every setting, explained.</h1><p className="lead">Configure the overlay for whole-page structure, focused outlines, or element-level inspection.</p></header>
      <section className="doc-section installation" id="installation"><h2>Install locally</h2><p>Until the Chrome Web Store release is available, run the current version directly from this repository.</p><ol><li>Download or clone the <a href={repo}>Skeleton Layout repository</a>.</li><li>Open <code>chrome://extensions</code> in Google Chrome.</li><li>Enable <strong>Developer mode</strong>.</li><li>Select <strong>Load unpacked</strong> and choose the folder containing <code>manifest.json</code>.</li><li>Pin Skeleton Layout, then click its toolbar icon on a normal webpage.</li></ol><div className="note"><strong>Updating a local installation</strong><span>Pull or download the new files, select <b>Reload</b> on <code>chrome://extensions</code>, then refresh the page you are inspecting.</span></div></section>
      <figure className="docs-settings"><Shot file="settings.webp" alt="Complete current Skeleton Layout settings interface" /><figcaption>Default Full visualization configuration in the current settings interface.</figcaption></figure>
      {sections.map(([id, title, intro, items]) => <section className="doc-section" id={id} key={id}><h2>{title}</h2><p>{intro}</p><dl>{items.map(([term, def]) => <div key={term}><dt>{term}</dt><dd>{def}</dd></div>)}</dl>{id === "modes" && <div className="docs-shots"><ModeShot file="mode-full.webp" alt="Current colored Full visualization" /><ModeShot file="mode-outline.webp" alt="Current Outline only mode" /><ModeShot file="mode-inspector.webp" alt="Current Hover inspector mode" /></div>}</section>)}
      <section className="doc-section" id="shortcuts"><h2>Toolbar and shortcuts</h2><p>Click the toolbar icon to toggle. Right-click it to open settings beside the page or select a Quick mode.</p><dl><div><dt>Toggle</dt><dd><kbd>Ctrl/⌘</kbd> <kbd>Shift</kbd> <kbd>L</kbd></dd></div><div><dt>Cycle modes</dt><dd><kbd>Ctrl/⌘</kbd> <kbd>Shift</kbd> <kbd>Y</kbd></dd></div><div><dt>Direct commands</dt><dd>Assign them at <code>chrome://extensions/shortcuts</code>.</dd></div></dl></section>
      <section className="doc-section" id="permissions"><h2>Permissions</h2><p>Skeleton Layout requests no persistent site access.</p><dl>{[["activeTab","Temporary access after you invoke the extension."],["scripting","Insert and remove CSS and optional diagnostics."],["contextMenus","Offer settings and modes from the toolbar icon."],["sidePanel","Keep settings beside the inspected page."],["storage","Save preferences and temporary tab state; never URLs or page content."]].map(([a,b])=><div key={a}><dt>{a}</dt><dd>{b}</dd></div>)}</dl></section>
      <section className="doc-section" id="compatibility"><h2>Compatibility</h2><p>The main visualization works on ordinary web pages where Chrome permits temporary extension access.</p><dl><div><dt>Static and server-rendered pages</dt><dd>Supported. Existing and newly rendered elements receive generated structural styles.</dd></div><div><dt>React, Vue, Astro, and similar apps</dt><dd>Supported. DOM changes are visualized without adding classes or attributes to application elements.</dd></div><div><dt>Flexbox and Grid layouts</dt><dd>Supported. Hover inspection adds contextual container and item details.</dd></div><div><dt>Local development servers</dt><dd>Supported on normal <code>http://localhost</code> pages. File URLs require the user to enable file access for the extension.</dd></div><div><dt>Shadow DOM and iframes</dt><dd>The document itself is supported, but styling cannot cross closed shadow roots or enter cross-origin iframe documents.</dd></div><div><dt>Chrome internal pages</dt><dd>Unsupported by browser policy, including <code>chrome://</code> pages and the Chrome Web Store.</dd></div></dl></section>
      <section className="doc-section" id="limits"><h2>Limitations</h2><ul><li>Chrome-owned pages and the Chrome Web Store prohibit injection.</li><li>Cross-origin navigation revokes temporary access until invoked again.</li><li>Styles cannot cross Shadow DOM boundaries or reach cross-origin iframe contents.</li><li>Nesting deeper than 64 levels is left uncolored.</li><li>Overflow detection is experimental and contextual.</li></ul></section>
    </div>
  </main><Footer /></>;
}

function Privacy() {
  return <><Header /><main className="policy"><p className="eyebrow">Last updated July 13, 2026</p><h1>Privacy policy</h1><p className="lead">Skeleton Layout does not collect, transmit, sell, or share personal information, browsing history, authentication information, website content, or analytics.</p><h2>Data stored</h2><p>Only visualization preferences are stored in Chrome sync. Numeric enabled-tab IDs and removal CSS remain in session storage and disappear when the browser session ends.</p><h2>Site access</h2><p>Access is temporary and starts only when you invoke the extension. Optional diagnostic measurements stay on-device and are never stored or transmitted.</p><h2>Third parties</h2><p>There are no analytics, advertising SDKs, remote code, external services, or third-party data processors.</p><h2>Support</h2><p>Questions can be submitted through the <a href={`${repo}/issues`}>GitHub issue tracker</a>.</p></main><Footer /></>;
}

export function App() {
  const page = window.location.pathname.split("/").pop();
  return page === "docs.html" ? <Docs /> : page === "privacy.html" ? <Privacy /> : <Landing />;
}
