const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export const paths = {
  home: basePath || "/",
  docs: `${basePath}/docs`,
  privacy: `${basePath}/privacy`,
};

export function asset(file) {
  return `${import.meta.env.BASE_URL}assets/${file}`;
}
