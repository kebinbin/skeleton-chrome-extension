import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { copyFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const base = "/skeleton-chrome-extension/";
const baseWithoutSlash = base.replace(/\/$/, "");

function redirectBaseWithoutSlash(server) {
  server.middlewares.use((request, response, next) => {
    const url = new URL(request.url || "/", "http://localhost");

    if (url.pathname === baseWithoutSlash) {
      response.statusCode = 308;
      response.setHeader("Location", `${base}${url.search}`);
      response.end();
      return;
    }

    next();
  });
}

export default defineConfig({
  base,
  optimizeDeps: {
    include: ["react", "react-dom/client", "routini"],
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
    warmup: {
      clientFiles: ["./src/main.jsx"],
    },
  },
  plugins: [
    react(),
    {
      name: "redirect-base-without-trailing-slash",
      configureServer: redirectBaseWithoutSlash,
      configurePreviewServer: redirectBaseWithoutSlash,
    },
    {
      name: "github-pages-spa-fallback",
      closeBundle() {
        copyFileSync(resolve(root, "dist/index.html"), resolve(root, "dist/404.html"));
      },
    },
  ],
});
