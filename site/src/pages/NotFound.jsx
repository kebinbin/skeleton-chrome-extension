import { Link } from "routini";
import { paths } from "../lib/paths.js";
import { usePageMeta } from "../lib/usePageMeta.js";

export default function NotFound() {
  usePageMeta("Page not found · Skeleton Layout", "The requested Skeleton Layout page could not be found.");

  return <main className="not-found"><p className="eyebrow"><span /> 404</p><h1>Page not found.</h1><p className="lead">The page may have moved, or the URL may be incorrect.</p><Link className="button" to={paths.home}>Return home <span aria-hidden="true">→</span></Link></main>;
}
