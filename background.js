const bg = {
  default: "default",
  colorful: "colorful",
  none: "none",
};

chrome.storage.local
  .set({
    activeTabsIds: [],
  })
  .then(() => {
    console.log("Initialized local storage.");
  });

chrome.storage.sync
  .set({
    config: {
      style: { border: true, bg: bg.default, overrideColor: false },
      forceReload: false,
    },
  })
  .then(() => {
    console.log("Initialized configurations in sync storage.");
  });

chrome.storage.onChanged.addListener((changes, namespace) => {
  for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
    console.log(
      `Storage key "${key}" in namespace "${namespace}" changed.`,
      `Old value was "${JSON.stringify(
        oldValue
      )}", new value is "${JSON.stringify(newValue)}".`
    );
  }
});

const applyLayout = (tab) => {
  chrome.storage.sync.get(["config"]).then((result) => {
    console.log(
      "Read this config when applying changes: " + JSON.stringify(result.config)
    );

    const cssFiles = [];
    const { style } = result.config;
    if (style.border) {
      cssFiles.push("./css/border.css");
    }
    if (style.bg !== bg.none) {
      cssFiles.push(
        `./css/bg-${style.bg === bg.default ? "default" : "colorful"}${
          style.overrideColor ? "-override.css" : ".css"
        }`
      );
    }

    chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: cssFiles,
    });
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["./js/level.js"],
    });
    console.log(`Skeleton layout enabled for tab ${tab.id}.`);
  });
};

const removeLayout = (tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["clean.js"],
  });
  console.log(`Skeleton layout removed for tab ${tab.id}.`);
};
/* 
  Toggle functionality for this tab.id: 
    - If it exists in array, remove it and run clean.  
    - If it does not exist, then added it and run apply.
*/
chrome.action.onClicked.addListener((tab) => {
  chrome.storage.local.get(["activeTabsIds"]).then((result) => {
    const prevActiveTabsIds = result.activeTabsIds;

    const tabIndex = prevActiveTabsIds.findIndex((tabId) => tabId === tab.id);

    if (tabIndex === -1) {
      chrome.storage.local.set({
        activeTabsIds: [...prevActiveTabsIds, tab.id],
      });
      applyLayout(tab);
    } else {
      chrome.storage.local.set({
        activeTabsIds: [
          ...prevActiveTabsIds.slice(0, tabIndex),
          ...prevActiveTabsIds.slice(tabIndex + 1),
        ],
      });
      removeLayout(tab);
    }
  });
});

/* 
  Re-execute apply if the update comes from a tab.id in activeTabsIds: 
*/
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status == "complete" &&
    tab.status == "complete" &&
    tab.url != undefined
  ) {
    chrome.storage.local.get(["activeTabsIds"]).then((result) => {
      const prevActiveTabsIds = result.activeTabsIds;
      const tabIndex = prevActiveTabsIds.findIndex((tabId) => tabId === tab.id);
      if (tabIndex !== -1) {
        applyLayout(tab);
        console.log(
          `Skeleton layout has been replied on tab ${tab.id} due to tab re-fresh.`
        );
      }
    });
  }
});
