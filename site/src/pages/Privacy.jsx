import { repo } from "../components/SiteShell.jsx";
import { usePageMeta } from "../lib/usePageMeta.js";

export default function Privacy() {
  usePageMeta(
    "Privacy · Skeleton Layout",
    "Skeleton Layout does not collect, transmit, sell, or share personal information, browsing history, website content, or analytics.",
  );

  return <main className="policy">
    <p className="eyebrow"><span /> Last updated July 13, 2026</p>
    <h1>Privacy policy.</h1>
    <p className="lead">Skeleton Layout does not collect, transmit, sell, or share personal information, browsing history, authentication information, website content, or analytics.</p>
    <div className="policy-grid">
      <section><span>01</span><h2>Data stored</h2><p>Only visualization preferences are stored in Chrome sync. Numeric enabled-tab IDs and removal CSS remain in session storage and disappear when the browser session ends.</p></section>
      <section><span>02</span><h2>Site access</h2><p>Access is temporary and starts only when you invoke the extension. Optional diagnostic measurements stay on-device and are never stored or transmitted.</p></section>
      <section><span>03</span><h2>Third parties</h2><p>There are no analytics, advertising SDKs, remote code, external services, or third-party data processors.</p></section>
      <section><span>04</span><h2>Support</h2><p>Questions can be submitted through the <a href={`${repo}/issues`}>GitHub issue tracker</a>.</p></section>
    </div>
  </main>;
}
