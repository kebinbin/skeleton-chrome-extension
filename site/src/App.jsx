import { Outlet, Router } from "routini";
import { SiteFooter, SiteHeader } from "./components/SiteShell.jsx";
import { paths } from "./lib/paths.js";
import Landing from "./pages/Landing.jsx";

const routes = [
  { path: paths.home, component: Landing },
  { path: paths.docs, lazy: () => import("./pages/Docs.jsx") },
  { path: paths.privacy, lazy: () => import("./pages/Privacy.jsx") },
  { path: "*", lazy: () => import("./pages/NotFound.jsx") },
];

function PageLoading() {
  return (
    <main className="page-loading" aria-live="polite">
      <span className="loading-mark" />
      <p>Loading page</p>
    </main>
  );
}

function SiteLayout() {
  return (
    <>
      <SiteHeader />
      <Outlet />
      <SiteFooter />
    </>
  );
}

export function App() {
  return (
    <Router routes={routes} loading={<PageLoading />} scrollRestoration>
      <SiteLayout />
    </Router>
  );
}
