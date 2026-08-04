import {
  DEFAULT_CONFIG,
  QUICK_MODES,
  buildStyleInjections,
  configForMode,
  isStoredInjection,
  loadStoredConfig,
  normalizeConfig,
  UnsupportedConfigVersionError,
} from "./shared/config.js";

const SESSION_PREFIX = "activeTab:";
const LAST_MODE_PREFIX = "lastMode:";
const PREVIEW_PORT_NAME = "settings-preview";
const OPEN_SETTINGS_MENU_ID = "open-settings-side-panel";
const QUICK_MODE_MENU_ID = "quick-visualization-mode";
const MENU_MODES = Object.freeze({
  "quick-mode-full": "full",
  "quick-mode-outline": "outline",
  "quick-mode-inspector": "inspector",
});
const ENABLED_BADGE = Object.freeze({
  text: "ON",
  color: "#49372F",
  title: "Hide layout structure",
});
const ERROR_BADGE = Object.freeze({
  text: "!",
  color: "#EC7814",
});
const MODE_BADGES = Object.freeze({
  full: ENABLED_BADGE,
  outline: Object.freeze({
    text: "OL",
    color: "#69707A",
    title: "Skeleton Layout: outline-only mode",
  }),
  inspector: Object.freeze({
    text: "IN",
    color: "#1A73E8",
    title: "Skeleton Layout: hover inspector",
  }),
});

const tabLocks = new Map();
let previewConnectionCounter = 0;

function sessionKey(tabId) {
  return `${SESSION_PREFIX}${tabId}`;
}

function lastModeKey(tabId) {
  return `${LAST_MODE_PREFIX}${tabId}`;
}

async function getLastMode(tabId) {
  const key = lastModeKey(tabId);
  const result = await chrome.storage.session.get(key);
  return QUICK_MODES.includes(result[key]) ? result[key] : null;
}

async function setLastMode(tabId, mode) {
  if (!QUICK_MODES.includes(mode)) return;
  await chrome.storage.session.set({ [lastModeKey(tabId)]: mode });
}

async function clearLastMode(tabId) {
  await chrome.storage.session.remove(lastModeKey(tabId));
}

async function getConfig() {
  const { config } = await chrome.storage.sync.get("config");
  let normalized;
  try {
    normalized = loadStoredConfig(config);
  } catch (error) {
    if (!(error instanceof UnsupportedConfigVersionError)) throw error;
    console.warn("Skeleton Layout found settings from a newer version.", error);
    return normalizeConfig(DEFAULT_CONFIG);
  }

  if (JSON.stringify(config) !== JSON.stringify(normalized)) {
    await chrome.storage.sync.set({ config: normalized });
  }

  return normalized;
}

async function initializeConfig() {
  const { config } = await chrome.storage.sync.get("config");
  if (!config) {
    await chrome.storage.sync.set({ config: normalizeConfig(DEFAULT_CONFIG) });
    return;
  }

  let loaded;
  try {
    loaded = loadStoredConfig(config);
  } catch (error) {
    if (error instanceof UnsupportedConfigVersionError) {
      console.warn("Skeleton Layout kept settings from a newer version.", error);
      return;
    }
    throw error;
  }
  if (JSON.stringify(config) !== JSON.stringify(loaded)) {
    await chrome.storage.sync.set({ config: loaded });
  }
}

async function getTabState(tabId) {
  const key = sessionKey(tabId);
  const result = await chrome.storage.session.get(key);
  const state = result[key];

  if (!state || !Array.isArray(state.injections)) {
    return null;
  }

  const injections = state.injections.filter(isStoredInjection);
  const storedHistory = Array.isArray(state.injectionHistory)
    ? state.injectionHistory.filter(isStoredInjection)
    : [];
  return {
    injections,
    injectionHistory:
      storedHistory.length > 0 ? storedHistory : [...injections],
    overflowDetection: state.overflowDetection === true,
    elementInspector: state.elementInspector === true,
    gridVisualization: state.gridVisualization === true,
    mode: QUICK_MODES.includes(state.mode) ? state.mode : "full",
    previewOwner:
      typeof state.previewOwner === "string" ? state.previewOwner : null,
  };
}

async function setTabState(
  tabId,
  injections,
  overflowDetection,
  elementInspector,
  gridVisualization,
  mode,
  previewOwner = null,
  injectionHistory = injections,
) {
  await chrome.storage.session.set({
    [sessionKey(tabId)]: {
      injections,
      injectionHistory: [...injectionHistory],
      overflowDetection,
      elementInspector,
      gridVisualization,
      mode,
      previewOwner,
    },
  });
}

async function clearTabState(tabId) {
  await chrome.storage.session.remove(sessionKey(tabId));
}

async function updateAction(tabId, badge) {
  await Promise.all([
    chrome.action.setBadgeText({ tabId, text: badge?.text ?? "" }),
    chrome.action.setTitle({
      tabId,
      title: badge?.title ?? "Show layout structure",
    }),
    badge?.color
      ? chrome.action.setBadgeBackgroundColor({ tabId, color: badge.color })
      : Promise.resolve(),
  ]);
}

async function syncActionWithTabState(tabId) {
  const state = await getTabState(tabId);
  await updateAction(tabId, state ? MODE_BADGES[state.mode] : null);
}

async function showError(tabId, message) {
  await updateAction(tabId, {
    ...ERROR_BADGE,
    title: `Skeleton Layout: ${message}`,
  });
}

async function removeInjections(tabId, injections) {
  const failed = [];
  // Preserve multiplicity and ordering: every entry represents one
  // successful insertCSS call in the current document lifecycle.
  for (const injection of injections) {
    const { css, origin } = injection;
    try {
      await chrome.scripting.removeCSS({
        target: { tabId },
        css,
        origin,
      });
    } catch (error) {
      failed.push(injection);
      console.warn("Skeleton Layout could not remove injected CSS.", error);
    }
  }
  return failed;
}

function injectionKey({ css, origin }) {
  return `${origin}\u0000${css}`;
}

function partitionInjectionHistory(history, activeInjections) {
  const activeCounts = new Map();
  for (const injection of activeInjections) {
    const key = injectionKey(injection);
    activeCounts.set(key, (activeCounts.get(key) ?? 0) + 1);
  }

  const active = [];
  const stale = [];
  for (const injection of history) {
    const key = injectionKey(injection);
    const remaining = activeCounts.get(key) ?? 0;
    if (remaining > 0) {
      active.push(injection);
      activeCounts.set(key, remaining - 1);
    } else {
      stale.push(injection);
    }
  }

  return { active, stale };
}

function modeUsesGridOverlay(mode) {
  return mode === "full" || mode === "outline" || mode === "inspector";
}

async function enableGridOverlay(tabId, mode) {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (activeMode) => {
      globalThis.__skeletonLayoutGridOverlayOptions = { mode: activeMode };
    },
    args: [mode],
  });
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content/grid-overlay-logic.js", "content/grid-overlay.js"],
  });
}

async function disableGridOverlay(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        globalThis.__skeletonLayoutGridOverlay?.destroy();
        delete globalThis.__skeletonLayoutGridOverlayLogic;
        delete globalThis.__skeletonLayoutGridOverlayOptions;
      },
    });
    return true;
  } catch (error) {
    console.warn("Skeleton Layout could not remove grid guides.", error);
    return false;
  }
}

async function enableOverflowDetection(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content/overflow-logic.js", "content/overflow.js"],
  });
}

async function disableOverflowDetection(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        globalThis.__skeletonLayoutOverflowOverlay?.destroy();
        delete globalThis.__skeletonLayoutOverflowLogic;
      },
    });
    return true;
  } catch (error) {
    console.warn("Skeleton Layout could not remove overflow diagnostics.", error);
    return false;
  }
}

async function enableElementInspector(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: [
      "content/element-inspector-logic.js",
      "content/element-inspector.js",
    ],
  });
}

async function disableElementInspector(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        globalThis.__skeletonLayoutElementInspector?.destroy();
        delete globalThis.__skeletonLayoutElementInspectorLogic;
      },
    });
    return true;
  } catch (error) {
    console.warn("Skeleton Layout could not remove the element inspector.", error);
    return false;
  }
}

async function disableForTab(tabId) {
  const state = await getTabState(tabId);
  if (!state) {
    await updateAction(tabId, null);
    return true;
  }

  const [
    failedInjections,
    gridOverlayRemoved,
    overflowRemoved,
    inspectorRemoved,
  ] =
    await Promise.all([
      // Calling removeCSS for a stylesheet that no longer exists is a no-op.
      // The history contains one entry for every insertCSS registration, so
      // cleanup does not rely on a fixed number of removal attempts.
      removeInjections(tabId, state.injectionHistory),
      disableGridOverlay(tabId),
      disableOverflowDetection(tabId),
      disableElementInspector(tabId),
    ]);
  const gridOverlayRemaining =
    state.gridVisualization && !gridOverlayRemoved;
  const overflowRemaining = state.overflowDetection && !overflowRemoved;
  const inspectorRemaining = state.elementInspector && !inspectorRemoved;

  if (
    failedInjections.length > 0 ||
    gridOverlayRemaining ||
    overflowRemaining ||
    inspectorRemaining
  ) {
    await setTabState(
      tabId,
      failedInjections,
      overflowRemaining,
      inspectorRemaining,
      gridOverlayRemaining,
      state.mode,
      state.previewOwner,
      failedInjections,
    );
    await showError(tabId, "cleanup was incomplete; click again to retry");
    return false;
  }

  await clearTabState(tabId);
  await updateAction(tabId, null);
  return true;
}

async function enableForTab(
  tabId,
  config = null,
  mode = null,
  { documentChanged = false, previewOwner = null } = {},
) {
  const previousState = await getTabState(tabId);
  const baseConfig = normalizeConfig(config ?? (await getConfig()));
  const normalizedMode = QUICK_MODES.includes(mode)
    ? mode
    : baseConfig.style.mode;
  const normalizedConfig = configForMode(baseConfig, normalizedMode);
  const injections = buildStyleInjections(normalizedConfig);
  const overflowDetection = normalizedConfig.style.overflowDetection;
  const elementInspector = normalizedConfig.style.elementInspector;
  const gridVisualization =
    normalizedConfig.style.gridVisualization &&
    modeUsesGridOverlay(normalizedMode);
  if (
    injections.length === 0 &&
    !gridVisualization &&
    !overflowDetection &&
    !elementInspector
  ) {
    await disableForTab(tabId);
    await showError(tabId, "Select at least one visualization style");
    return;
  }

  const previousInjections =
    previousState && !documentChanged ? previousState.injections : [];
  const previousHistory =
    previousState && !documentChanged ? previousState.injectionHistory : [];
  const previousKeys = new Set(previousInjections.map(injectionKey));
  const additions = injections.filter(
    (injection) => !previousKeys.has(injectionKey(injection)),
  );
  const inserted = [];
  try {
    // Insert replacements first so the page never renders without an active
    // visualization between settings changes.
    for (const injection of additions) {
      await chrome.scripting.insertCSS({
        target: { tabId },
        css: injection.css,
        origin: injection.origin,
      });
      inserted.push(injection);
    }

    if (gridVisualization) {
      await enableGridOverlay(tabId, normalizedMode);
    }

    if (overflowDetection) {
      await enableOverflowDetection(tabId);
    }

    if (elementInspector) {
      await enableElementInspector(tabId);
    }

    const overflowRemoved =
      overflowDetection || documentChanged
        ? true
        : await disableOverflowDetection(tabId);
    const inspectorRemoved =
      elementInspector || documentChanged
        ? true
        : await disableElementInspector(tabId);
    const gridOverlayRemoved =
      gridVisualization ||
      documentChanged ||
      !previousState?.gridVisualization
        ? true
        : await disableGridOverlay(tabId);
    if (!gridOverlayRemoved) {
      throw new Error("Grid guide cleanup failed");
    }
    const overflowRemaining =
      overflowDetection ||
      (previousState?.overflowDetection === true && !overflowRemoved);
    const inspectorRemaining =
      elementInspector ||
      (previousState?.elementInspector === true && !inspectorRemoved);

    const provisionalHistory = [
      ...previousHistory,
      ...inserted,
    ];
    const historyPartition = partitionInjectionHistory(
      provisionalHistory,
      injections,
    );

    // Persist the new registrations before removing stale styles. If the
    // service worker is interrupted, the toolbar still has an exact cleanup
    // ledger for everything that may remain in the document.
    await setTabState(
      tabId,
      injections,
      overflowRemaining,
      inspectorRemaining,
      gridVisualization,
      normalizedMode,
      previewOwner,
      provisionalHistory,
    );

    const failedStaleRemovals = await removeInjections(
      tabId,
      historyPartition.stale,
    );
    const injectionHistory = [
      ...historyPartition.active,
      ...failedStaleRemovals,
    ];
    await setTabState(
      tabId,
      injections,
      overflowRemaining,
      inspectorRemaining,
      gridVisualization,
      normalizedMode,
      previewOwner,
      injectionHistory,
    );
    await setLastMode(tabId, normalizedMode);

    await updateAction(tabId, MODE_BADGES[normalizedMode]).catch((error) => {
      console.warn("Skeleton Layout could not update its toolbar badge.", error);
    });
  } catch (error) {
    const failedInsertedRemovals = await removeInjections(tabId, inserted);
    if (overflowDetection && !previousState?.overflowDetection) {
      await disableOverflowDetection(tabId);
    }
    if (elementInspector && !previousState?.elementInspector) {
      await disableElementInspector(tabId);
    }
    if (previousState?.gridVisualization) {
      await enableGridOverlay(tabId, previousState.mode).catch((restoreError) => {
        console.warn(
          "Skeleton Layout could not restore its previous grid guides.",
          restoreError,
        );
      });
    } else if (gridVisualization) {
      await disableGridOverlay(tabId);
    }
    if (previousState && !documentChanged) {
      await setTabState(
        tabId,
        previousState.injections,
        previousState.overflowDetection,
        previousState.elementInspector,
        previousState.gridVisualization,
        previousState.mode,
        previousState.previewOwner,
        [
          ...previousState.injectionHistory,
          ...failedInsertedRemovals,
        ],
      );
      await updateAction(tabId, MODE_BADGES[previousState.mode]);
    } else {
      await clearTabState(tabId);
      await showError(
        tabId,
        "this page is protected by Chrome or has not granted site access",
      );
    }
    console.warn("Skeleton Layout could not style the tab.", error);
  }
}

function withTabLock(tabId, operation) {
  const previous = tabLocks.get(tabId) ?? Promise.resolve();
  const current = previous.catch(() => undefined).then(operation);
  tabLocks.set(tabId, current);

  return current.finally(() => {
    if (tabLocks.get(tabId) === current) {
      tabLocks.delete(tabId);
    }
  });
}

async function activeTabIds() {
  const session = await chrome.storage.session.get(null);
  return Object.keys(session)
    .filter((key) => key.startsWith(SESSION_PREFIX))
    .map((key) => Number(key.slice(SESSION_PREFIX.length)))
    .filter(Number.isInteger);
}

async function restoreSessionActions() {
  const tabIds = await activeTabIds();
  await Promise.all(
    tabIds.map(async (tabId) => {
      try {
        await chrome.tabs.get(tabId);
      } catch {
        tabLocks.delete(tabId);
        await clearTabState(tabId);
        return;
      }
      await syncActionWithTabState(tabId).catch((error) => {
        console.warn(
          `Skeleton Layout could not restore the badge for tab ${tabId}.`,
          error,
        );
      });
    }),
  );
}

chrome.runtime.onInstalled.addListener(() => {
  initializeConfig().catch((error) => {
    console.error("Skeleton Layout could not initialize settings.", error);
  });

  chrome.contextMenus
    .removeAll()
    .then(() => {
      chrome.contextMenus.create({
        id: OPEN_SETTINGS_MENU_ID,
        title: "Open settings beside this page",
        contexts: ["action"],
      });
      chrome.contextMenus.create({
        id: QUICK_MODE_MENU_ID,
        title: "Quick mode",
        contexts: ["action"],
      });
      for (const [id, title] of [
        ["quick-mode-full", "Full visualization"],
        ["quick-mode-outline", "Outline only"],
        ["quick-mode-inspector", "Hover inspector"],
      ]) {
        chrome.contextMenus.create({
          id,
          parentId: QUICK_MODE_MENU_ID,
          title,
          contexts: ["action"],
        });
      }
    })
    .catch((error) => {
      console.warn("Skeleton Layout could not create its settings menu.", error);
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!Number.isInteger(tab?.id)) {
    return;
  }

  if (info.menuItemId === OPEN_SETTINGS_MENU_ID) {
    chrome.sidePanel.open({ tabId: tab.id }).catch((error) => {
      console.warn("Skeleton Layout could not open its settings panel.", error);
    });
    return;
  }

  const mode = MENU_MODES[info.menuItemId];
  if (!mode) return;
  withTabLock(tab.id, () => enableForTab(tab.id, null, mode)).catch((error) => {
    console.warn("Skeleton Layout quick mode failed.", error);
  });
});

chrome.action.onClicked.addListener((tab) => {
  if (!Number.isInteger(tab.id)) {
    return;
  }

  withTabLock(tab.id, async () => {
    const state = await getTabState(tab.id);
    if (state) {
      await disableForTab(tab.id);
    } else {
      await enableForTab(tab.id, null, await getLastMode(tab.id));
    }
  }).catch((error) => {
    console.error("Skeleton Layout toggle failed.", error);
  });
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== PREVIEW_PORT_NAME) return;

  const owner = `settings-preview:${++previewConnectionCounter}`;
  const previewedTabIds = new Set();
  let queue = Promise.resolve();
  let disconnected = false;

  const respond = (requestId, response) => {
    if (disconnected || requestId === undefined) return;
    try {
      port.postMessage({ requestId, ...response });
    } catch {
      // The panel may close between completing the operation and responding.
    }
  };

  const clearPreviewOwnership = async () => {
    const tabIds = [...previewedTabIds];
    previewedTabIds.clear();
    await Promise.all(
      tabIds.map((tabId) =>
        withTabLock(tabId, async () => {
          const state = await getTabState(tabId);
          if (state?.previewOwner !== owner) return;
          await setTabState(
            tabId,
            state.injections,
            state.overflowDetection,
            state.elementInspector,
            state.gridVisualization,
            state.mode,
            null,
            state.injectionHistory,
          );
        }),
      ),
    );
  };

  const revertPreviews = async () => {
    const tabIds = [...previewedTabIds];
    previewedTabIds.clear();
    if (tabIds.length === 0) return;
    const savedConfig = await getConfig();
    await Promise.all(
      tabIds.map((tabId) =>
        withTabLock(tabId, async () => {
          const state = await getTabState(tabId);
          if (state?.previewOwner !== owner) return;
          await enableForTab(
            tabId,
            savedConfig,
            savedConfig.style.mode,
          );
        }),
      ),
    );
  };

  const handleMessage = async (message) => {
    if (message?.type === "status") {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!Number.isInteger(tab?.id)) {
        return { enabled: false, mode: null, reason: "unavailable" };
      }

      return withTabLock(tab.id, async () => {
        const state = await getTabState(tab.id);
        return {
          enabled: state !== null,
          mode: state?.mode ?? null,
        };
      });
    }
    if (message?.type === "commit") {
      await clearPreviewOwnership();
      return { committed: true };
    }
    if (message?.type === "revert") {
      await revertPreviews();
      return { reverted: true };
    }
    if (message?.type !== "preview") {
      return { previewed: false, reason: "unavailable" };
    }

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!Number.isInteger(tab?.id)) {
      return { previewed: false, reason: "unavailable" };
    }

    return withTabLock(tab.id, async () => {
      const state = await getTabState(tab.id);
      if (!state) {
        return { previewed: false, reason: "disabled" };
      }

      const config = normalizeConfig(message.config);
      previewedTabIds.add(tab.id);
      await enableForTab(tab.id, config, config.style.mode, {
        previewOwner: owner,
      });
      const updatedState = await getTabState(tab.id);
      return updatedState?.previewOwner === owner
        ? { previewed: true, mode: updatedState.mode }
        : { previewed: false, reason: "unavailable" };
    });
  };

  port.onMessage.addListener((message) => {
    queue = queue
      .then(() => handleMessage(message))
      .then((response) => respond(message?.requestId, response))
      .catch((error) => {
        console.warn("Skeleton Layout live preview failed.", error);
        respond(message?.requestId, {
          previewed: false,
          reason: "unavailable",
        });
      });
  });

  port.onDisconnect.addListener(() => {
    disconnected = true;
    queue = queue
      .catch(() => undefined)
      .then(revertPreviews)
      .catch((error) => {
        console.warn("Skeleton Layout could not revert a preview.", error);
      });
  });
});

chrome.commands.onCommand.addListener((command) => {
  const commandModes = {
    "activate-full-mode": "full",
    "activate-outline-mode": "outline",
    "activate-inspector-mode": "inspector",
  };
  if (command !== "cycle-visualization-mode" && !commandModes[command]) {
    return;
  }

  chrome.tabs
    .query({ active: true, currentWindow: true })
    .then(([tab]) => {
      if (!Number.isInteger(tab?.id)) return;
      return withTabLock(tab.id, async () => {
        const state = await getTabState(tab.id);
        const mode =
          command === "cycle-visualization-mode"
            ? QUICK_MODES[
                state ? (QUICK_MODES.indexOf(state.mode) + 1) % QUICK_MODES.length : 0
              ]
            : commandModes[command];
        await enableForTab(tab.id, null, mode);
      });
    })
    .catch((error) => {
      console.warn("Skeleton Layout mode command failed.", error);
    });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status !== "complete") {
    return;
  }

  withTabLock(tabId, async () => {
    const state = await getTabState(tabId);
    if (!state) return;

    const inserted = [];
    try {
      // A complete event normally means the old document and its injected
      // CSS are gone. Removing the ledger first also handles duplicate or
      // same-document complete events without stacking another registration.
      const failedPreviousRemovals = await removeInjections(
        tabId,
        state.injectionHistory,
      );
      for (const injection of state.injections) {
        await chrome.scripting.insertCSS({
          target: { tabId },
          css: injection.css,
          origin: injection.origin,
        });
        inserted.push(injection);
      }
      if (state.overflowDetection) await enableOverflowDetection(tabId);
      if (state.elementInspector) await enableElementInspector(tabId);
      if (state.gridVisualization) {
        await enableGridOverlay(tabId, state.mode);
      }
      await setTabState(
        tabId,
        state.injections,
        state.overflowDetection,
        state.elementInspector,
        state.gridVisualization,
        state.mode,
        state.previewOwner,
        [...failedPreviousRemovals, ...inserted],
      );
      await updateAction(tabId, MODE_BADGES[state.mode]);
    } catch (error) {
      await removeInjections(tabId, inserted);
      await clearTabState(tabId);
      await showError(
        tabId,
        "this page is protected by Chrome or has not granted site access",
      );
      throw error;
    }
  }).catch((error) => {
    console.warn("Skeleton Layout could not reapply after navigation.", error);
  });
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  syncActionWithTabState(tabId).catch((error) => {
    console.warn("Skeleton Layout could not restore its toolbar state.", error);
  });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabLocks.delete(tabId);
  Promise.all([clearTabState(tabId), clearLastMode(tabId)]).catch(
    () => undefined,
  );
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync" || !changes.config) {
    return;
  }

  let config;
  try {
    config = loadStoredConfig(changes.config.newValue);
  } catch (error) {
    console.warn("Skeleton Layout ignored incompatible settings.", error);
    return;
  }
  activeTabIds()
    .then((tabIds) =>
      Promise.all(
        tabIds.map((tabId) =>
          withTabLock(tabId, async () => {
            const state = await getTabState(tabId);
            if (state) await enableForTab(tabId, config, config.style.mode);
          }),
        ),
      ),
    )
    .catch((error) => {
      console.warn("Skeleton Layout could not apply updated settings.", error);
    });
});

restoreSessionActions()
  .catch((error) => {
    console.warn("Skeleton Layout could not restore toolbar badges.", error);
  });
