import { useEffect, useState } from "react";
import { Link, useLocation } from "routini";
import { asset, paths } from "../lib/paths.js";

const repo = "https://github.com/kebinbin/skeleton-chrome-extension";
const themeKey = "skeleton-site-theme";

function NavLink({ to, children }) {
  const { path } = useLocation();
  const active = path === to;
  return <Link to={to} aria-current={active ? "page" : undefined}>{children}</Link>;
}

export function SiteHeader() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "light";
    return window.localStorage.getItem(themeKey) || "light";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(themeKey, theme);
  }, [theme]);

  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <div className="header-wrap">
      <header className="site-header">
        <Link className="brand" to={paths.home} aria-label="Skeleton Layout home">
          <img src={asset("icon-128.webp")} alt="" />
          <span><b>Skeleton</b><small>Layout inspector</small></span>
        </Link>
        <nav aria-label="Primary navigation">
          <Link to={`${paths.home}#features`}>Features</Link>
          <Link to={`${paths.home}#modes`}>Modes</Link>
          <NavLink to={paths.docs}>Documentation</NavLink>
          <a className="nav-source" href={repo}>View source <span aria-hidden="true">↗</span></a>
          <button className="theme-toggle" type="button" aria-label={`Switch to ${nextTheme} theme`} onClick={() => setTheme(nextTheme)}>
            <span aria-hidden="true" />
          </button>
        </nav>
      </header>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <Link className="brand" to={paths.home}>
        <img src={asset("icon-128.webp")} alt="" />
        <span><b>Skeleton</b><small>Layout inspector</small></span>
      </Link>
      <p>A Chrome extension for inspecting webpage layout structure.</p>
      <div>
        <Link to={paths.docs}>Documentation</Link>
        <Link to={paths.privacy}>Privacy</Link>
        <a href={`${repo}/blob/experimentation/LICENSE`}>MIT License</a>
        <a href={`${repo}/issues`}>Support</a>
      </div>
      <small>© 2026 Kevin Castillo</small>
    </footer>
  );
}

export { repo };
