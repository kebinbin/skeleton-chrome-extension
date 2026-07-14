import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import puppeteer from "puppeteer-core";

const extensionPath = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const executablePath =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

if (!existsSync(executablePath)) {
  throw new Error(
    `Google Chrome was not found at ${executablePath}. Set CHROME_PATH to run this test.`,
  );
}

const browser = await puppeteer.launch({
  executablePath,
  // Chrome currently loads unpacked extensions reliably only in headful mode.
  headless: false,
  pipe: true,
  enableExtensions: [extensionPath],
  args: [
    "--no-first-run",
    "--disable-default-apps",
  ],
});

try {
  const workerTarget = await browser.waitForTarget(
    (target) =>
      target.type() === "service_worker" &&
      target.url().endsWith("/background.js"),
    { timeout: 10_000 },
  );
  const extensionId = new URL(workerTarget.url()).host;

  const page = await browser.newPage();
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.waitForSelector("#visualizationMode");
  await page.evaluate(() => chrome.storage.sync.clear());
  await page.reload();
  await page.waitForSelector("#visualizationMode");
  await page.waitForFunction(
    () => document.querySelector("#backgroundOpacity")?.value === "67",
  );

  const setRange = (selector, value) =>
    page.$eval(
      selector,
      (input, nextValue) => {
        input.value = nextValue;
        input.dispatchEvent(new Event("input", { bubbles: true }));
      },
      String(value),
    );

  await setRange("#backgroundOpacity", 41);
  await page.$eval("#paletteColors input", (input) => {
    input.value = "#123456";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  await page.select("#visualizationMode", "outline");
  assert.equal(await page.$eval("#bgColor", (field) => field.value), "default");
  assert.equal(
    await page.$eval("#outlineStyle", (field) => field.value),
    "dashed",
  );

  await page.select("#visualizationMode", "inspector");
  assert.equal(
    await page.$eval("#elementInspector", (field) => field.checked),
    true,
  );

  await page.select("#visualizationMode", "full");
  assert.equal(
    await page.$eval("#backgroundOpacity", (field) => field.value),
    "41",
  );
  assert.equal(
    await page.$eval("#paletteColors input", (field) => field.value),
    "#123456",
  );

  await page.click('button[type="submit"]');
  await page.waitForFunction(
    () => document.querySelector("#status")?.textContent.startsWith("Saved."),
  );
  const saved = await page.evaluate(async () =>
    chrome.storage.sync.get("config"),
  );
  assert.equal(saved.config.style.backgroundOpacity, 41);
  assert.equal(saved.config.style.paletteColors[0], "#123456");

  await setRange("#backgroundOpacity", 29);
  await page.select("#visualizationMode", "outline");
  await page.select("#visualizationMode", "full");
  assert.equal(
    await page.$eval("#backgroundOpacity", (field) => field.value),
    "29",
  );

  await page.click("#revert");
  await page.waitForFunction(
    () =>
      document.querySelector("#status")?.textContent ===
      "Reverted to saved settings.",
  );
  assert.equal(
    await page.$eval("#backgroundOpacity", (field) => field.value),
    "41",
  );

  process.stdout.write(
    "Chrome settings smoke test passed: mode cycles, save, and revert preserve drafts.\n",
  );
} finally {
  await browser.close();
}
