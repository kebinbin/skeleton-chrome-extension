const bgColor = {
  solidMono: {
    value: "solidMono",
    file: "./css/bg/mono-solid.css",
    override: "./css/bg/override/mono-solid.css",
  },
  semitransparentMono: {
    value: "semitransparentMono",
    file: "./css/bg/mono-semitransparent.css",
    override: "./css/bg/override/mono-semitransparent.css",
  },
  solidColorful: {
    value: "solidColorful",
    file: "./css/bg/colorful-solid.css",
    override: "./css/bg/override/colorful-solid.css",
  },
  semitransparentColorful: {
    value: "semitransparentColorful",
    file: "./css/bg/colorful-semitransparent.css",
    override: "./css/bg/override/colorful-semitransparent.css",
  },
  default: { value: "default", file: null },
};

const borderType = {
  darkThin: {
    value: "darkThin",
    file: "./css/border/thin-dark.css",
    override: "./css/border/override/thin-dark.css",
  },
  darkThick: {
    value: "darkThick",
    file: "./css/border/thick-dark.css",
    override: "./css/border/override/thick-dark.css",
  },
  lightThin: {
    value: "lightThin",
    file: "./css/border/thin-light.css",
    override: "./css/border/override/thin-light.css",
  },
  lightThick: {
    value: "lightThick",
    file: "./css/border/thick-light.css",
    override: "./css/border/override/thick-light.css",
  },
  default: { value: "default", file: null },
};

const textColor = {
  dark: {
    value: "dark",
    file: "./css/text/dark.css",
    override: "./css/text/override/dark.css",
  },
  light: {
    value: "light",
    file: "./css/text/light.css",
    override: "./css/text/override/light.css",
  },
  default: { value: "default", file: null },
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
      style: {
        bgColor: bgColor.solidMono.value,
        borderType: borderType.lightThin.value,
        textColor: textColor.light.value,
        byLevel: true,
        overrideBgColor: true,
        overrideBorder: true,
        overrideTextColor: true,
      },
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

const cssFiles = (config) => {
  const { style } = config;
  const cssFiles = [];

  if (
    style.bgColor !== bgColor.default.value ||
    bgColor[style.bgColor].file != null
  ) {
    cssFiles.push(
      !style.overrideBgColor
        ? bgColor[style.bgColor].file
        : bgColor[style.bgColor].override
    );
  }
  if (
    style.borderType !== borderType.default.value ||
    borderType[style.borderType].file != null
  ) {
    cssFiles.push(
      !style.overrideBorder
        ? borderType[style.borderType].file
        : borderType[style.borderType].override
    );
  }
  if (
    style.textColor !== textColor.default.value ||
    textColor[style.textColor].file != null
  ) {
    cssFiles.push(
      !style.overrideTextColor
        ? textColor[style.textColor].file
        : textColor[style.textColor].override
    );
  }
  console.log("cssFiles = " + cssFiles);

  return cssFiles;
};

const jsFiles = (config) => {
  const { style } = config;
  if (style.byLevel) {
    return ["./js/level.js"];
  } else {
    return ["./js/element.js"];
  }
};

const applyLayout = (tab) => {
  chrome.storage.sync.get(["config"]).then((result) => {
    console.log(
      "Read this config when applying changes: " + JSON.stringify(result.config)
    );

    const cssFilesArr = cssFiles(result.config);
    if (cssFilesArr.length > 0) {
      chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: cssFilesArr,
      });
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: jsFiles(result.config),
      });
      console.log(`Skeleton layout enabled for tab ${tab.id}.`);
    } else {
      console.log("Nothing to inject here...");
    }
  });
};

const removeLayout = (tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["./js/clean.js"],
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
