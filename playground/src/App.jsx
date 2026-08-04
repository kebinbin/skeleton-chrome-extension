const stays = [
  { stay: "Sunday–Thursday", rate: "$145", minimum: "2 nights", includes: "Local coffee", status: "Available" },
  { stay: "Friday–Saturday", rate: "$175", minimum: "2 nights", includes: "Local coffee", status: "Limited" },
  { stay: "Holiday weekend", rate: "$195", minimum: "3 nights", includes: "Canoe access", status: "Limited" },
  { stay: "Full week", rate: "$920", minimum: "7 nights", includes: "Trail provisions", status: "Available" },
];

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

function App() {
  return (
    <div className="page-shell">
      <header className="site-header layout-grid">
        <a className="brand" href="#top" aria-label="Cabaña Caonillas home">
          <span className="brand-mark" aria-hidden="true">CC</span>
          <span>Cabaña Caonillas</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#stay">The stay</a>
          <a href="#setting">The setting</a>
          <a href="#details">Details</a>
        </nav>
        <a className="contact-link" href="mailto:stay@example.com">Book your stay <ArrowIcon /></a>
      </header>

      <main id="top">
        <section className="hero layout-grid" aria-labelledby="hero-title">
          <p className="section-kicker">Lago Caonillas / Utuado</p>
          <p className="hero-location">Forest edge · Lakeside</p>
          <h1 id="hero-title">
            <span>Deep green.</span>
            <em>Still water.</em>
          </h1>
          <div className="hero-summary">
            <p>A small timber cabaña between tropical forest and the lake—made for open windows, muddy feet, and nights led by the coquí.</p>
            <a className="text-link" href="#stay">Discover the cabaña <ArrowIcon /></a>
          </div>
          <dl className="hero-meta">
            <div><dt>Sleeps</dt><dd>Four guests</dd></div>
            <div><dt>From San Juan</dt><dd>Ninety minutes</dd></div>
          </dl>
          <figure className="hero-image hero-image--primary">
            <img src="/images/caonillas-lake-cabin.webp" alt="Small timber cabin reflected in still water beneath dense forest" />
            <figcaption><span>The cabaña</span><span>Across the water</span></figcaption>
          </figure>
          <figure className="hero-image hero-image--secondary">
            <img src="/images/caonillas-lake.webp" alt="Still tropical lake edged by palms and dense green forest" />
            <figcaption><span>The lake</span><span>Early afternoon</span></figcaption>
          </figure>
        </section>

        <section className="work-section" id="stay" aria-labelledby="work-title">
          <div className="section-heading layout-grid">
            <p className="section-number">01</p>
            <h2 id="work-title">A cabin with roots</h2>
            <p>Rough timber, rain-cooled air, and the lake just beyond the trees.</p>
          </div>

          <div className="bento-grid">
            <article className="project-card project-card--feature">
              <div className="image-wrap image-wrap--feature">
                <img src="/images/caonillas-house.webp" alt="Dark timber cabaña surrounded by oversized tropical leaves" />
                <span className="image-index">01</span>
              </div>
              <div className="project-copy">
                <div>
                  <p className="eyebrow">The cabaña · Timber and tin</p>
                  <h3>Simple by design</h3>
                </div>
                <p>One honest room, a shaded deck, and everything needed for coffee after the rain.</p>
                <a className="round-link" href="#details" aria-label="View stay details"><ArrowIcon /></a>
              </div>
            </article>

            <article className="project-card project-card--tall">
              <div className="image-wrap image-wrap--tall">
                <img src="/images/cabana-main.webp" alt="Small A-frame cabaña tucked beneath the forest canopy" />
                <span className="image-index">02</span>
              </div>
              <div className="compact-copy">
                <div><p className="eyebrow">The setting · Utuado</p><h3>Under the canopy</h3></div>
                <span>80% green</span>
              </div>
            </article>

            <article className="quote-card" id="setting">
              <p className="eyebrow">A different pace</p>
              <blockquote>“Wake to rain on the zinc roof. Walk down to still water. Leave the clock inside.”</blockquote>
              <div className="quote-footer"><span>Cabaña Caonillas</span><span>Utuado, Puerto Rico</span></div>
            </article>

            <article className="project-card project-card--small">
              <div className="image-wrap image-wrap--small">
                <img src="/images/caonillas-veranda.webp" alt="Weathered timber veranda set among soft tropical greenery" />
                <span className="image-index">03</span>
              </div>
              <div className="compact-copy">
                <div><p className="eyebrow">Outside · Every window</p><h3>Forest air</h3></div>
                <span>21–27°C</span>
              </div>
            </article>

            <aside className="facts-card" aria-label="Studio facts">
              <p className="eyebrow">At a glance</p>
              <dl>
                <div><dt>04</dt><dd>Guests</dd></div>
                <div><dt>02</dt><dd>Bedrooms</dd></div>
                <div><dt>01</dt><dd>Lake path</dd></div>
              </dl>
            </aside>
          </div>
        </section>

        <section className="index-section" id="details" aria-labelledby="index-title">
          <div className="section-heading layout-grid">
            <p className="section-number">02</p>
            <h2 id="index-title">Plan your stay</h2>
            <p>Simple rates, useful extras, and plenty of room between stays.</p>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Stay</th><th>Nightly rate</th><th>Minimum</th><th>Includes</th><th>Status</th></tr></thead>
              <tbody>
                {stays.map((item) => (
                  <tr key={item.stay}>
                    <th scope="row">{item.stay}</th>
                    <td>{item.rate}</td>
                    <td>{item.minimum}</td>
                    <td>{item.includes}</td>
                    <td><span className={`status ${item.status === "Available" ? "status--complete" : ""}`}>{item.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <footer className="site-footer layout-grid">
        <div className="footer-statement"><p>The lake is waiting.</p><a href="mailto:stay@example.com">Reserve Cabaña Caonillas.</a></div>
        <div className="footer-column"><p>Find us</p><address>Utuado<br />Puerto Rico 00641</address></div>
        <div className="footer-column"><p>Explore</p><a href="#stay">The cabaña</a><a href="#details">Availability</a></div>
        <p className="copyright">© 2026 Cabaña Caonillas</p>
      </footer>
    </div>
  );
}

export default App;
