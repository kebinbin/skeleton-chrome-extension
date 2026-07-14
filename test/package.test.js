import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("manifest.json", root)));
const packageJson = JSON.parse(await readFile(new URL("package.json", root)));
const optionsHtml = await readFile(new URL("options.html", root), "utf8");
const optionsScript = await readFile(new URL("options.js", root), "utf8");
const inspectorScript = await readFile(
  new URL("content/element-inspector.js", root),
  "utf8",
);
const optionsCss = await readFile(new URL("css/options.css", root), "utf8");

test("manifest uses the minimum required permissions", () => {
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.minimum_chrome_version, "116");
  assert.deepEqual(manifest.permissions, [
    "activeTab",
    "contextMenus",
    "scripting",
    "sidePanel",
    "storage",
  ]);
  assert.equal(manifest.background.type, "module");
  assert.ok(!("host_permissions" in manifest));
});

test("release metadata versions stay aligned", () => {
  assert.equal(packageJson.version, manifest.version);
  assert.equal(packageJson.private, true);
});

test("quick modes expose a toggle, a cycle shortcut, and direct commands", () => {
  assert.equal(
    manifest.commands._execute_action.suggested_key.default,
    "Ctrl+Shift+L",
  );
  assert.equal(
    manifest.commands["cycle-visualization-mode"].suggested_key.default,
    "Ctrl+Shift+Y",
  );
  for (const command of [
    "activate-full-mode",
    "activate-outline-mode",
    "activate-inspector-mode",
  ]) {
    assert.equal(typeof manifest.commands[command].description, "string");
  }
});

test("settings expose the background, outline, text, and save controls", () => {
  assert.match(optionsHtml, /id="paletteColors"/);
  assert.match(optionsHtml, /id="cycleLightnessStep"/);
  assert.match(optionsHtml, /id="backgroundOpacity"/);
  assert.match(optionsHtml, /id="colorCustomization"/);
  assert.match(optionsHtml, /id="outlineColor"/);
  assert.match(optionsHtml, /id="outlineWidth"/);
  assert.match(optionsHtml, /id="outlineStyle"/);
  assert.match(optionsHtml, /id="customTextColor"/);
  assert.match(optionsHtml, /id="overflowDetection"/);
  assert.match(optionsHtml, /id="elementInspector"/);
  assert.match(optionsHtml, /id="visualizationMode"/);
  assert.equal(optionsHtml.match(/data-section-toggle/g)?.length, 5);
  assert.equal(optionsHtml.match(/aria-expanded="true"/g)?.length, 5);
  assert.match(optionsHtml, /type="submit">Save<\/button>/);
  assert.match(optionsHtml, /id="revert"/);
  assert.match(optionsHtml, /id="saveAndClose"/);
  assert.doesNotMatch(optionsHtml, /without opening DevTools/i);
});

test("shortcut help belongs to the mode section rather than diagnostics", () => {
  const modeContent = optionsHtml.match(
    /<div class="section-content" id="modeContent">([\s\S]*?)<\/section>/,
  )?.[1];
  const diagnosticsContent = optionsHtml.match(
    /<div class="section-content" id="diagnosticsContent">([\s\S]*?)<\/section>/,
  )?.[1];

  assert.match(modeContent, /<strong>Quick modes<\/strong>/);
  assert.doesNotMatch(diagnosticsContent, /<strong>Quick modes<\/strong>/);
});

test("hover inspector supports pinned inspection and cleanup", () => {
  assert.match(inspectorScript, /addEventListener\("click", onClick, true\)/);
  assert.match(inspectorScript, /removeEventListener\("click", onClick, true\)/);
  assert.match(inspectorScript, /removeEventListener\("keydown", onKeyDown, true\)/);
  assert.doesNotMatch(inspectorScript, /Copy selector|Copy size|Esc to release/);
});

test("settings support narrow, dark, reduced-motion, and forced-color environments", () => {
  assert.match(optionsCss, /@media \(max-width: 420px\)/);
  assert.match(optionsCss, /@media \(prefers-color-scheme: dark\)/);
  assert.match(optionsCss, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(optionsCss, /@media \(forced-colors: active\)/);
  assert.match(optionsCss, /body \{\s+min-width: 0;/);
});

test("live preview reconnects and retries after a port disconnect", () => {
  assert.match(optionsScript, /function connectPreviewPort\(\)/);
  assert.match(optionsScript, /return await sendPreviewCommandOnce\(type, details\)/);
  assert.match(optionsScript, /request\.port !== port/);
});

test("settings delegate draft and mode ownership to the state controller", () => {
  assert.match(optionsScript, /new SettingsState\(DEFAULT_CONFIG\)/);
  assert.match(optionsScript, /settingsState\.switchMode\(nextMode\)/);
  assert.match(optionsScript, /settingsState\.markPreviewed\(\)/);
  assert.doesNotMatch(optionsScript, /fullModeDraft|currentMode/);
});

test("all manifest entry points and icons exist", async () => {
  const referencedFiles = [
    manifest.background.service_worker,
    manifest.options_ui.page,
    manifest.side_panel.default_path,
    "content/overflow-logic.js",
    "content/overflow.js",
    "content/element-inspector-logic.js",
    "content/element-inspector.js",
    ...Object.values(manifest.icons),
    ...Object.values(manifest.action.default_icon),
  ];

  await Promise.all(
    [...new Set(referencedFiles)].map((file) => access(new URL(file, root))),
  );
});

test("PNG icon dimensions match their manifest slots", async () => {
  for (const [size, file] of Object.entries(manifest.icons)) {
    const png = await readFile(new URL(file, root));
    assert.equal(png.toString("ascii", 1, 4), "PNG");
    assert.equal(png.readUInt32BE(16), Number(size));
    assert.equal(png.readUInt32BE(20), Number(size));
  }
});
