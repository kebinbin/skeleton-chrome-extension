import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import puppeteer from "puppeteer-core";

import {
  DEFAULT_CONFIG,
  buildStyleInjections,
  configForMode,
  normalizeConfig,
} from "../shared/config.js";

const extensionPath = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = resolve(
  process.argv[2] ?? "/tmp/skeleton-current-captures",
);
const targetUrl = process.argv[3] ?? "https://kevincastillo.io/";
const fullVisualizationOpacity = Math.max(
  0,
  DEFAULT_CONFIG.style.backgroundOpacity - 10,
);
const captureConfig = normalizeConfig({
  ...DEFAULT_CONFIG,
  style: {
    ...DEFAULT_CONFIG.style,
    backgroundOpacity: fullVisualizationOpacity,
  },
  fullStyle: {
    ...DEFAULT_CONFIG.fullStyle,
    backgroundOpacity: fullVisualizationOpacity,
  },
});
const executablePath =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

await mkdir(outputDirectory, { recursive: true });

const browser = await puppeteer.launch({
  executablePath,
  headless: false,
  pipe: true,
  enableExtensions: [extensionPath],
  defaultViewport: null,
  args: [
    "--no-first-run",
    "--disable-default-apps",
    "--window-size=1440,810",
    "--force-device-scale-factor=1",
  ],
});

async function extensionTabId(worker, page) {
  await page.bringToFront();
  return worker.evaluate(async (url) => {
    const [activeTab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (Number.isInteger(activeTab?.id)) return activeTab.id;

    const tabs = await chrome.tabs.query({});
    const targetOrigin = new URL(url).origin;
    return (
      tabs.find((tab) => {
        try {
          return new URL(tab.url).origin === targetOrigin;
        } catch {
          return false;
        }
      })?.id ?? null
    );
  }, page.url());
}

async function applyModeToCapture(page, mode) {
  const config = configForMode(captureConfig, mode);
  const styleHandles = [];
  for (const { css } of buildStyleInjections(config)) {
    styleHandles.push(await page.addStyleTag({ content: css }));
  }
  if (config.style.elementInspector) {
    await page.addScriptTag({
      path: resolve(extensionPath, "content/element-inspector-logic.js"),
    });
    await page.addScriptTag({
      path: resolve(extensionPath, "content/element-inspector.js"),
    });
  }
  return async () => {
    await Promise.all(styleHandles.map((handle) => handle.evaluate((node) => node.remove())));
    if (config.style.elementInspector) {
      await page.evaluate(() =>
        globalThis.__skeletonLayoutElementInspector?.destroy(),
      );
    }
  };
}

try {
  const workerTarget = await browser.waitForTarget(
    (target) =>
      target.type() === "service_worker" &&
      target.url().endsWith("/background.js"),
    { timeout: 15_000 },
  );
  const worker = await workerTarget.worker();
  const extensionId = new URL(workerTarget.url()).host;

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 810, deviceScaleFactor: 1 });
  await page.goto(targetUrl, { waitUntil: "networkidle2", timeout: 45_000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  const tabId = await extensionTabId(worker, page);
  if (!Number.isInteger(tabId)) {
    throw new Error("Could not find the target Chrome tab.");
  }

  let clearMode = await applyModeToCapture(page, "full");
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
  await page.screenshot({
    path: resolve(outputDirectory, "mode-full.webp"),
    type: "webp",
    quality: 90,
  });
  await clearMode();
  clearMode = await applyModeToCapture(page, "outline");
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 300));
  await page.screenshot({
    path: resolve(outputDirectory, "mode-outline.webp"),
    type: "webp",
    quality: 90,
  });
  await clearMode();
  clearMode = await applyModeToCapture(page, "inspector");
  const hoverTarget = await page.$("h1, h2, main a, main p");
  if (hoverTarget) await hoverTarget.hover();
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
  await page.screenshot({
    path: resolve(outputDirectory, "mode-inspector.webp"),
    type: "webp",
    quality: 90,
  });
  await clearMode();

  const settings = await browser.newPage();
  await settings.setViewport({ width: 900, height: 1100, deviceScaleFactor: 1 });
  await settings.goto(`chrome-extension://${extensionId}/options.html`);
  await settings.waitForSelector("#visualizationMode");
  await settings.screenshot({
    path: resolve(outputDirectory, "settings.webp"),
    type: "webp",
    quality: 90,
    fullPage: true,
  });

  process.stdout.write(`Captured current extension screenshots in ${outputDirectory}\n`);
} finally {
  await browser.close();
}
