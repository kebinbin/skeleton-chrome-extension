const applyLayout = (tab) => {
  chrome.scripting.insertCSS({
    target: { tabId: tab.id },
    files: ["skeleton.css"],
  });
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["skeleton.js"],
  });
  console.log(`Skeleton layout enabled for tab ${tab.id}.`);
};

const removeLayout = (tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["clean.js"],
  });
  console.log(`Skeleton layout removed for tab ${tab.id}.`);
};

chrome.storage.local.set({ activeTabsIds: [] }).then(() => {
  console.log("Initialized active tabs IDs.");
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
    console.log(
      `Storage key "${key}" in namespace "${namespace}" changed.`,
      `Old value was "${oldValue}", new value is "${newValue}".`
    );
  }
});

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
