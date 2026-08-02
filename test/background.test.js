import assert from "node:assert/strict";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";

import { DEFAULT_CONFIG } from "../shared/config.js";

function chromeEvent() {
  const listeners = [];
  return {
    addListener(listener) {
      listeners.push(listener);
    },
    dispatch(...args) {
      listeners.forEach((listener) => listener(...args));
    },
  };
}

function storageArea(initial = {}) {
  const data = structuredClone(initial);
  const area = {
    data,
    failNextSet: false,
    async get(keys) {
      if (keys === null) {
        return structuredClone(data);
      }
      const requested = Array.isArray(keys) ? keys : [keys];
      return Object.fromEntries(
        requested.filter((key) => key in data).map((key) => [key, data[key]]),
      );
    },
    async set(values) {
      if (area.failNextSet) {
        area.failNextSet = false;
        throw new Error("Simulated storage failure");
      }
      Object.assign(data, structuredClone(values));
    },
    async remove(keys) {
      for (const key of Array.isArray(keys) ? keys : [keys]) {
        delete data[key];
      }
    },
  };
  return area;
}

function previewPort() {
  const onMessage = chromeEvent();
  const onDisconnect = chromeEvent();
  const responses = [];
  return {
    name: "settings-preview",
    onMessage,
    onDisconnect,
    responses,
    postMessage(message) {
      responses.push(structuredClone(message));
    },
  };
}

async function waitFor(predicate, message) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (predicate()) {
      return;
    }
    await delay(2);
  }
  assert.fail(message);
}

test("service worker toggles, removes exact CSS, reapplies, and fails safely", async () => {
  const runtimeInstalled = chromeEvent();
  const runtimeConnected = chromeEvent();
  const actionClicked = chromeEvent();
  const tabUpdated = chromeEvent();
  const tabActivated = chromeEvent();
  const tabRemoved = chromeEvent();
  const storageChanged = chromeEvent();
  const contextMenuClicked = chromeEvent();
  const commandTriggered = chromeEvent();
  const sync = storageArea({ config: DEFAULT_CONFIG });
  const session = storageArea();
  session.data["activeTab:99"] = {
    injections: [],
    overflowDetection: false,
    elementInspector: false,
    mode: "full",
  };
  session.data["activeTab:18"] = {
    injections: [],
    overflowDetection: false,
    elementInspector: true,
    mode: "inspector",
  };
  const inserted = [];
  const removed = [];
  const styleOperations = [];
  const appliedStyleCounts = new Map();
  const executed = [];
  const badges = [];
  const sidePanels = [];
  const menuItems = [];
  let rejectInjection = false;
  let rejectRemovalCount = 0;
  const originalWarn = console.warn;
  console.warn = () => undefined;

  globalThis.chrome = {
    runtime: { onInstalled: runtimeInstalled, onConnect: runtimeConnected },
    commands: { onCommand: commandTriggered },
    contextMenus: {
      onClicked: contextMenuClicked,
      async removeAll() {
        menuItems.length = 0;
      },
      create(item) {
        menuItems.push(item);
      },
    },
    sidePanel: {
      async open(details) {
        sidePanels.push(details);
      },
    },
    action: {
      onClicked: actionClicked,
      async setBadgeText(details) {
        if (details.tabId === 18) throw new Error("Badge unavailable");
        badges.push(details);
      },
      async setBadgeBackgroundColor() {},
      async setTitle() {},
    },
    scripting: {
      async insertCSS(injection) {
        if (rejectInjection) {
          throw new Error("Cannot access this page");
        }
        const key = `${injection.target.tabId}\u0000${injection.origin}\u0000${injection.css}`;
        appliedStyleCounts.set(key, (appliedStyleCounts.get(key) ?? 0) + 1);
        inserted.push(structuredClone(injection));
        styleOperations.push({ type: "insert", css: injection.css });
      },
      async removeCSS(injection) {
        if (rejectRemovalCount > 0) {
          rejectRemovalCount -= 1;
          throw new Error("Simulated removal failure");
        }
        const key = `${injection.target.tabId}\u0000${injection.origin}\u0000${injection.css}`;
        const count = appliedStyleCounts.get(key) ?? 0;
        if (count <= 1) {
          appliedStyleCounts.delete(key);
        } else {
          appliedStyleCounts.set(key, count - 1);
        }
        removed.push(structuredClone(injection));
        styleOperations.push({ type: "remove", css: injection.css });
      },
      async executeScript(injection) {
        executed.push({
          target: structuredClone(injection.target),
          files: injection.files ? [...injection.files] : undefined,
          functionCall: typeof injection.func === "function",
        });
        return [];
      },
    },
    storage: {
      sync,
      session,
      onChanged: storageChanged,
    },
    tabs: {
      onUpdated: tabUpdated,
      onActivated: tabActivated,
      onRemoved: tabRemoved,
      async get(tabId) {
        if (tabId === 99) throw new Error("No tab with id 99");
        return { id: tabId };
      },
      async query() {
        return [{ id: 17 }];
      },
    },
  };

  await import(`../background.js?test=${Date.now()}`);
  const appliedStyleCount = (tabId) =>
    [...appliedStyleCounts.entries()]
      .filter(([key]) => key.startsWith(`${tabId}\u0000`))
      .reduce((total, [, count]) => total + count, 0);
  await waitFor(
    () => session.data["activeTab:99"] === undefined,
    "stale session state was not cleaned up at worker startup",
  );
  assert.ok(
    session.data["activeTab:18"],
    "a badge failure incorrectly discarded valid enabled-tab state",
  );
  tabRemoved.dispatch(18);
  await waitFor(
    () => session.data["activeTab:18"] === undefined,
    "valid startup fixture was not cleaned up",
  );

  let previewRequestId = 0;
  const sendPreviewCommand = async (port, type, details = {}) => {
    const requestId = ++previewRequestId;
    port.onMessage.dispatch({ type, requestId, ...details });
    await waitFor(
      () => port.responses.some((message) => message.requestId === requestId),
      `preview command ${type} did not respond`,
    );
    return port.responses.find((message) => message.requestId === requestId);
  };

  runtimeInstalled.dispatch({ reason: "install" });
  await waitFor(() => menuItems.length === 5, "action menus were not created");
  contextMenuClicked.dispatch(
    { menuItemId: "open-settings-side-panel" },
    { id: 17 },
  );
  await waitFor(() => sidePanels.length === 1, "settings side panel did not open");
  assert.deepEqual(sidePanels[0], { tabId: 17 });

  actionClicked.dispatch({ id: 17 });
  await waitFor(
    () => badges.some(({ tabId, text }) => tabId === 17 && text === "ON"),
    "toolbar did not enter its enabled state",
  );

  assert.equal(inserted.length, 1);
  assert.ok(session.data["activeTab:17"]);
  assert.equal(inserted[0].css, session.data["activeTab:17"].injections[0].css);

  const firstPreviewPort = previewPort();
  runtimeConnected.dispatch(firstPreviewPort);
  const initialStatus = await sendPreviewCommand(firstPreviewPort, "status");
  assert.equal(initialStatus.enabled, true);
  assert.equal(initialStatus.mode, "full");
  let previewResponse = await sendPreviewCommand(
    firstPreviewPort,
    "preview",
    {
      config: {
        style: {
          ...DEFAULT_CONFIG.style,
          mode: "outline",
          bgColor: "default",
          textColor: "default",
        },
      },
    },
  );
  assert.equal(previewResponse.previewed, true);
  assert.equal(previewResponse.mode, "outline");
  assert.equal(session.data["activeTab:17"].mode, "outline");
  assert.match(session.data["activeTab:17"].previewOwner, /^settings-preview:/);
  assert.equal(badges.at(-1).text, "OL");
  assert.deepEqual(
    styleOperations.slice(-2).map(({ type }) => type),
    ["insert", "remove"],
    "preview replacement briefly removed every visualization style",
  );

  const previewOwnerBeforeDocumentUpdate =
    session.data["activeTab:17"].previewOwner;
  const insertionsBeforePreviewDocumentUpdate = inserted.length;
  tabUpdated.dispatch(17, { status: "complete" });
  await waitFor(
    () => inserted.length === insertionsBeforePreviewDocumentUpdate + 1,
    "document update did not reapply the live preview",
  );
  assert.equal(session.data["activeTab:17"].mode, "outline");
  assert.equal(
    session.data["activeTab:17"].previewOwner,
    previewOwnerBeforeDocumentUpdate,
  );
  assert.equal(
    inserted.at(-1).css,
    session.data["activeTab:17"].injections[0].css,
  );

  previewResponse = await sendPreviewCommand(firstPreviewPort, "preview", {
    config: {
      style: {
        ...DEFAULT_CONFIG.style,
        mode: "inspector",
        bgColor: "default",
        textColor: "default",
        outlineStyle: "none",
        elementInspector: true,
      },
    },
  });
  assert.equal(previewResponse.previewed, true);
  assert.equal(previewResponse.mode, "inspector");
  assert.equal(session.data["activeTab:17"].mode, "inspector");
  const inspectorStatus = await sendPreviewCommand(firstPreviewPort, "status");
  assert.equal(inspectorStatus.enabled, true);
  assert.equal(inspectorStatus.mode, "inspector");

  previewResponse = await sendPreviewCommand(firstPreviewPort, "preview", {
    config: {
      style: {
        ...DEFAULT_CONFIG.style,
        mode: "outline",
        bgColor: "default",
        textColor: "default",
      },
    },
  });
  assert.equal(previewResponse.previewed, true);
  assert.equal(previewResponse.mode, "outline");
  assert.equal(session.data["activeTab:17"].mode, "outline");

  const commitResponse = await sendPreviewCommand(firstPreviewPort, "commit");
  assert.equal(commitResponse.committed, true);
  assert.equal(session.data["activeTab:17"].mode, "outline");
  assert.equal(session.data["activeTab:17"].previewOwner, null);

  previewResponse = await sendPreviewCommand(firstPreviewPort, "preview", {
    config: {
      style: {
        ...DEFAULT_CONFIG.style,
        mode: "outline",
        bgColor: "default",
        textColor: "default",
      },
    },
  });
  assert.equal(previewResponse.previewed, true);

  const revertResponse = await sendPreviewCommand(firstPreviewPort, "revert");
  assert.equal(revertResponse.reverted, true);
  assert.equal(session.data["activeTab:17"].mode, "full");
  assert.equal(session.data["activeTab:17"].previewOwner, null);

  previewResponse = await sendPreviewCommand(firstPreviewPort, "preview", {
    config: {
      style: {
        ...DEFAULT_CONFIG.style,
        mode: "outline",
        bgColor: "default",
        textColor: "default",
      },
    },
  });
  assert.equal(previewResponse.previewed, true);
  firstPreviewPort.onDisconnect.dispatch();
  await waitFor(
    () =>
      session.data["activeTab:17"]?.mode === "full" &&
      session.data["activeTab:17"]?.previewOwner === null,
    "closing settings did not discard its unsaved preview",
  );

  // Model repeated Chrome registrations of the same generated stylesheet.
  // Cleanup must preserve and remove every registration, not collapse them by
  // CSS text or rely on a fixed number of removal passes.
  const repeatedInjection = session.data["activeTab:17"].injections[0];
  for (let registration = 0; registration < 5; registration += 1) {
    await chrome.scripting.insertCSS({
      target: { tabId: 17 },
      css: repeatedInjection.css,
      origin: repeatedInjection.origin,
    });
    session.data["activeTab:17"].injectionHistory.push(
      structuredClone(repeatedInjection),
    );
  }

  const stateBeforeDisable = structuredClone(session.data["activeTab:17"]);
  const removalsBeforeDisable = removed.length;
  actionClicked.dispatch({ id: 17 });
  await waitFor(
    () => badges.some(({ tabId, text }) => tabId === 17 && text === ""),
    "toolbar did not enter its disabled state",
  );

  assert.ok(
    removed.length >=
      removalsBeforeDisable + stateBeforeDisable.injectionHistory.length,
    "toolbar did not attempt to remove every stylesheet used by prior modes",
  );
  assert.equal(session.data["activeTab:17"], undefined);
  assert.equal(
    appliedStyleCount(17),
    0,
    "toolbar cleanup left an older mode stylesheet applied",
  );
  const secondPreviewPort = previewPort();
  runtimeConnected.dispatch(secondPreviewPort);
  const disabledStatus = await sendPreviewCommand(secondPreviewPort, "status");
  assert.equal(disabledStatus.enabled, false);
  assert.equal(disabledStatus.mode, null);
  const insertionsWhileDisabled = inserted.length;
  previewResponse = await sendPreviewCommand(
    secondPreviewPort,
    "preview",
    { config: DEFAULT_CONFIG },
  );
  assert.equal(previewResponse.reason, "disabled");
  assert.equal(inserted.length, insertionsWhileDisabled);

  const insertionsBeforeEnable = inserted.length;
  actionClicked.dispatch({ id: 17 });
  await waitFor(
    () => inserted.length === insertionsBeforeEnable + 1,
    "second enable did not inject CSS",
  );
  const insertionsBeforeReload = inserted.length;
  tabUpdated.dispatch(17, { status: "complete" });
  await waitFor(
    () => inserted.length === insertionsBeforeReload + 1,
    "reload did not reapply CSS",
  );

  const updatedConfig = {
    schemaVersion: DEFAULT_CONFIG.schemaVersion,
    style: {
      ...DEFAULT_CONFIG.style,
      overrideBgColor: false,
      overrideBorder: false,
      overflowDetection: true,
      elementInspector: true,
    },
  };
  const insertionsBeforeSettingsUpdate = inserted.length;
  storageChanged.dispatch(
    { config: { oldValue: DEFAULT_CONFIG, newValue: updatedConfig } },
    "sync",
  );
  await waitFor(
    () => inserted.length >= insertionsBeforeSettingsUpdate + 2,
    "settings change did not reapply CSS",
  );
  assert.deepEqual(
    inserted.slice(-2).map(({ origin }) => origin),
    ["AUTHOR", "USER"],
  );
  await waitFor(
    () => executed.some(({ files }) => files?.includes("content/overflow.js")),
    "overflow detector was not installed",
  );
  assert.equal(session.data["activeTab:17"].overflowDetection, true);
  await waitFor(
    () =>
      executed.some(({ files }) =>
        files?.includes("content/element-inspector.js"),
      ),
    "element inspector was not installed",
  );
  assert.equal(session.data["activeTab:17"].elementInspector, true);

  const outlineConfig = {
    schemaVersion: DEFAULT_CONFIG.schemaVersion,
    style: {
      ...DEFAULT_CONFIG.style,
      mode: "outline",
      bgColor: "default",
      textColor: "default",
      outlineStyle: "dashed",
      overflowDetection: false,
      elementInspector: false,
    },
  };
  storageChanged.dispatch(
    { config: { oldValue: updatedConfig, newValue: outlineConfig } },
    "sync",
  );
  await waitFor(
    () => session.data["activeTab:17"]?.mode === "outline",
    "saved mode did not update the enabled tab",
  );
  assert.equal(badges.at(-1).text, "OL");

  const badgeCountBeforeActivation = badges.length;
  tabActivated.dispatch({ tabId: 17, windowId: 1 });
  await waitFor(
    () =>
      badges.length > badgeCountBeforeActivation && badges.at(-1)?.text === "OL",
    "tab activation did not restore the saved mode badge",
  );

  contextMenuClicked.dispatch(
    { menuItemId: "quick-mode-inspector" },
    { id: 17 },
  );
  await waitFor(
    () => session.data["activeTab:17"]?.mode === "inspector",
    "inspector context-menu mode was not applied",
  );
  assert.ok(
    badges.some(({ tabId, text }) => tabId === 17 && text === "IN"),
  );

  actionClicked.dispatch({ id: 17 });
  await waitFor(
    () => session.data["activeTab:17"] === undefined,
    "toolbar did not disable the hover inspector",
  );
  assert.equal(
    session.data["lastMode:17"],
    "inspector",
    "disabling did not remember the last active mode",
  );

  actionClicked.dispatch({ id: 17 });
  await waitFor(
    () =>
      session.data["activeTab:17"]?.mode === "inspector" &&
      session.data["activeTab:17"]?.elementInspector === true,
    "toolbar did not resume the last active hover-inspector mode",
  );

  const insertionsBeforeQuickFull = inserted.length;
  contextMenuClicked.dispatch({ menuItemId: "quick-mode-full" }, { id: 17 });
  await waitFor(
    () =>
      session.data["activeTab:17"]?.mode === "full" &&
      session.data["activeTab:17"]?.elementInspector === false &&
      inserted.length > insertionsBeforeQuickFull,
    "full context-menu mode did not replace the hover inspector",
  );
  assert.equal(badges.at(-1).text, "ON");

  contextMenuClicked.dispatch(
    { menuItemId: "quick-mode-inspector" },
    { id: 17 },
  );
  await waitFor(
    () => session.data["activeTab:17"]?.mode === "inspector",
    "inspector context-menu mode was not reapplied",
  );
  commandTriggered.dispatch("cycle-visualization-mode");
  await waitFor(
    () => session.data["activeTab:17"]?.mode === "full",
    "mode command did not cycle from inspector to full mode",
  );
  assert.ok(
    badges.some(({ tabId, text }) => tabId === 17 && text === "ON"),
  );

  actionClicked.dispatch({ id: 17 });
  await waitFor(
    () => session.data["activeTab:17"] === undefined,
    "toolbar did not remove the full mode selected after the inspector",
  );
  assert.equal(
    appliedStyleCount(17),
    0,
    "disabling Full after Inspector exposed a stale Outline stylesheet",
  );

  actionClicked.dispatch({ id: 17 });
  await waitFor(
    () => session.data["activeTab:17"]?.mode === "full",
    "toolbar did not re-enable the visualization after quick-mode cleanup",
  );

  rejectRemovalCount = 1;
  actionClicked.dispatch({ id: 17 });
  await waitFor(
    () =>
      session.data["activeTab:17"]?.injections.length > 0 &&
      badges.at(-1)?.text === "!",
    "failed cleanup was not retained for a retry",
  );
  actionClicked.dispatch({ id: 17 });
  await waitFor(
    () => session.data["activeTab:17"] === undefined,
    "toolbar did not retry and finish a previously failed cleanup",
  );
  assert.equal(appliedStyleCount(17), 0);
  actionClicked.dispatch({ id: 17 });
  await waitFor(
    () => session.data["activeTab:17"]?.mode === "full",
    "toolbar did not re-enable after a cleanup retry",
  );

  const badgeCountBeforeStorageFailure = badges.length;
  session.failNextSet = true;
  contextMenuClicked.dispatch(
    { menuItemId: "quick-mode-outline" },
    { id: 17 },
  );
  await waitFor(
    () => badges.length > badgeCountBeforeStorageFailure,
    "failed update did not restore the previous toolbar state",
  );
  assert.equal(session.data["activeTab:17"].mode, "full");
  assert.equal(badges.at(-1).text, "ON");

  rejectInjection = true;
  const badgeCountBeforeRejectedReload = badges.length;
  tabUpdated.dispatch(17, { status: "complete" });
  await waitFor(
    () =>
      badges.length > badgeCountBeforeRejectedReload &&
      badges.at(-1)?.tabId === 17 &&
      badges.at(-1)?.text === "!",
    "failed injection did not display an error state",
  );
  assert.equal(session.data["activeTab:17"], undefined);

  tabRemoved.dispatch(17);
  await delay(0);
  assert.equal(session.data["activeTab:17"], undefined);
  assert.equal(session.data["lastMode:17"], undefined);

  console.warn = originalWarn;
  delete globalThis.chrome;
});
