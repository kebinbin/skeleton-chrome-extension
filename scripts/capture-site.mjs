import assert from "node:assert/strict";
import { existsSync } from "node:fs";

import puppeteer from "puppeteer-core";

const executablePath = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const baseUrl = process.argv[2] ?? "http://localhost:4173/skeleton-chrome-extension/";
if (!existsSync(executablePath)) throw new Error(`Chrome not found at ${executablePath}`);

const browser = await puppeteer.launch({ executablePath, headless: true });
const errors = [];

async function capture(path, viewport, output) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`${path}: ${message.text()}`);
  });
  await page.goto(new URL(path, baseUrl), { waitUntil: "networkidle2" });
  await page.evaluate(async () => {
    const step = Math.max(320, Math.floor(window.innerHeight * 0.7));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForFunction(
    () => [...document.querySelectorAll("img.shot")].every((image) => image.complete && image.naturalWidth > 0),
    { timeout: 10_000 },
  );
  await page.screenshot({ path: output, fullPage: true });
  const measurements = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    images: [...document.querySelectorAll("img.shot")].map((image) => ({
      src: image.getAttribute("src"),
      naturalRatio: image.naturalWidth / image.naturalHeight,
      renderedRatio: image.getBoundingClientRect().width / image.getBoundingClientRect().height,
    })),
  }));
  assert.ok(measurements.documentWidth <= measurements.viewportWidth + 1, `${path} scrolls horizontally`);
  for (const image of measurements.images) {
    assert.ok(image.naturalRatio > 0, `${image.src} did not load`);
    assert.ok(Math.abs(image.naturalRatio - image.renderedRatio) < 0.01, `${image.src} is distorted`);
  }
  await page.close();
}

try {
  await capture("", { width: 1440, height: 1100, deviceScaleFactor: 1 }, "/tmp/skeleton-site-home.png");
  await capture("docs.html", { width: 1440, height: 1100, deviceScaleFactor: 1 }, "/tmp/skeleton-site-docs.png");
  await capture("privacy.html", { width: 1440, height: 1000, deviceScaleFactor: 1 }, "/tmp/skeleton-site-privacy.png");
  await capture("", { width: 390, height: 844, deviceScaleFactor: 1 }, "/tmp/skeleton-site-mobile.png");
  assert.deepEqual(errors, [], `Browser console errors:\n${errors.join("\n")}`);
  process.stdout.write("Site browser QA passed: routes render, images preserve aspect ratio, and mobile has no horizontal overflow.\n");
} finally {
  await browser.close();
}
