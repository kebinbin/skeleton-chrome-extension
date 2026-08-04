import { asset } from "../lib/paths.js";

export function Shot({ file, alt, className = "" }) {
  return <img className={`shot ${className}`} src={asset(file)} alt={alt} />;
}
