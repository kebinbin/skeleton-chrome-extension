const apply = function (tab, active) {
  if (active) {
    chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ["skeleton.css"],
    });
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["skeleton.js"],
    });
  } else {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["clean.js"],
    });
  }
};

chrome.storage.local.set({ active: false }).then(() => {
  console.log("Initialized active to false...");
});

chrome.action.onClicked.addListener((tab) => {
  chrome.storage.local.get(["active"]).then((result) => {
    console.log("Current active is = " + result.active);
    const isActive = !result.active;
    chrome.storage.local.set({ active: isActive });
    apply(tab, isActive);
  });
});
