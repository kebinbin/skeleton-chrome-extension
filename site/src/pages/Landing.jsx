import { useState } from "react";
import { Link } from "routini";
import { Shot } from "../components/Media.jsx";
import { paths } from "../lib/paths.js";
import { repo } from "../components/SiteShell.jsx";
import { usePageMeta } from "../lib/usePageMeta.js";

const comparisons = [
  {
    id: "original",
    title: "Original",
    description: "The page with no Skeleton Layout visualization applied.",
    file: "mode-original.webp",
    alt: "Original Cabaña Caonillas page without Skeleton Layout applied",
  },
  {
    id: "outline",
    title: "Outline only",
    description: "Adds element outlines while preserving the page’s colors.",
    file: "mode-outline.webp",
    alt: "Outline only mode showing page structure without background colors",
  },
  {
    id: "monochrome",
    title: "Monochrome",
    description: "Uses one hue with lightness changes to represent nesting depth.",
    file: "mode-monochrome.webp",
    alt: "Monochrome visualization mode showing layout depth with one hue",
  },
  {
    id: "colorful",
    title: "Colorful",
    description: "Uses the configured palette to distinguish nesting levels.",
    file: "mode-full.webp",
    alt: "Colorful visualization mode with colored layout levels",
  },
];

export default function Landing() {
  const [activeComparison, setActiveComparison] = useState(comparisons[0]);

  usePageMeta(
    "Skeleton Layout · Page layout visualization for Chrome",
    "A Chrome extension for viewing element boundaries, nesting, CSS Grid tracks, spacing, and potential overflow on a webpage.",
  );

  return <main>
    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow"><span /> Chrome layout inspection extension</p>
        <h1>Inspect layout as you create it.</h1>
        <p className="lead">Display element boundaries, nesting levels, CSS Grid tracks, spacing, and potential overflow directly on the page.</p>
        <div className="actions">
          <Link className="button" to={`${paths.docs}#installation`}>Install locally <span aria-hidden="true">→</span></Link>
          <a className="text-link" href={repo}>View source <span aria-hidden="true">↗</span></a>
        </div>
      </div>
      <div className="hero-visual aspect-video product-bezel">
        <Shot file="skeleton-hero.webp" alt="Current Sona.io source beside its Full visualization in Chrome" className="hero-shot" />
      </div>
      <p className="caption">Skeleton Layout applied to a webpage during development.</p>
    </section>

    <section className="section overview" id="features">
      <div className="origin">
        <div><p className="eyebrow"><span /> Purpose and behavior</p><h2>Layout visualization without temporary CSS.</h2></div>
        <div className="origin-copy"><p className="origin-question">Developers often add temporary colors or borders to inspect a page’s layout.</p><p>Skeleton Layout provides this visual reference from a Chrome extension. It can remain active while you inspect nesting, wrappers, spacing, grid tracks, and potential overflow, without modifying the project’s stylesheets or DOM attributes.</p></div>
      </div>
      <div className="feature-grid">
        <article><span>01</span><h3>Whole-page structure</h3><p>Color every rendered element by nesting depth or sibling position.</p></article>
        <article><span>02</span><h3>Side-panel settings</h3><p>Adjust visualization settings beside the page and preview changes before saving.</p></article>
        <article><span>03</span><h3>DOM unchanged</h3><p>The extension does not add classes, attributes, or inline styles to page elements.</p></article>
      </div>
    </section>

    <section className="modes-section" id="modes">
      <div className="modes-inner">
        <div className="heading modes-heading"><p className="eyebrow"><span /> Visualization modes</p><h2>Four views of the same page.</h2><p>Compare the original page with the available outline, monochrome, and colorful visualizations.</p></div>
        <div className="mode-comparison">
          <figure className="comparison-media">
            <div className="comparison-frame">
              <Shot file={activeComparison.file} alt={activeComparison.alt} />
            </div>
            <figcaption>{activeComparison.title} · Cabaña Caonillas playground</figcaption>
          </figure>
          <div className="mode-menu" aria-label="Choose visualization">
            {comparisons.map((comparison, index) => {
              const active = comparison.id === activeComparison.id;
              return <button type="button" className={active ? "is-active" : ""} aria-pressed={active} onClick={() => setActiveComparison(comparison)} key={comparison.id}>
                <span className="mode-number">0{index + 1}</span>
                <span className="mode-option-copy"><strong>{comparison.title}</strong><small>{comparison.description}</small></span>
              </button>;
            })}
          </div>
        </div>
      </div>
    </section>

    <section className="section settings">
      <div className="settings-copy"><p className="eyebrow"><span /> Settings</p><h2>Visualization settings in the side panel.</h2><p>Configure the palette, opacity, outlines, text contrast, and diagnostic layers. Changes are previewed before they are saved.</p>
        <ul><li>Six editable colors with lightness progression</li><li>Automatic text contrast and custom outlines</li><li>Box-model inspection and overflow diagnostics</li><li>Grid visualization and reassignable shortcuts</li></ul>
        <Link className="text-link" to={paths.docs}>View documentation <span aria-hidden="true">→</span></Link>
      </div>
      <div className="settings-media"><Shot file="settings.webp" alt="Current Skeleton Layout visualization settings" className="settings-shot" /></div>
    </section>

    <section className="closing"><p className="eyebrow"><span /> Local installation</p><h2>Install the current version from GitHub.</h2><p>Download the extension, load the unpacked build in Chrome, and enable it on the page you want to inspect.</p><div className="actions centered"><Link className="button button-light" to={`${paths.docs}#installation`}>Installation instructions <span aria-hidden="true">→</span></Link><a href={repo}>View source on GitHub <span aria-hidden="true">↗</span></a></div></section>
  </main>;
}
