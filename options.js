// Saves options to chrome.storage
const saveOptions = async () => {
  const bg = document.getElementById("bg").value;
  const border = document.getElementById("border").checked;
  const bgOverride = document.getElementById("bgOverride").checked;
  const forceReload = document.getElementById("forceReload").checked;

  // Check this async/await
  await chrome.storage.sync.set(
    { config: { style: { border, bg, bgOverride }, forceReload } },
    () => {
      // Update status to let user know options were saved.
      const status = document.getElementById("status");
      status.textContent = "Configurations saved.";
      setTimeout(() => {
        status.textContent = "";
      }, 1000);
    }
  );

  // Reload active tabs to reflect config changes
  if (forceReload) {
    chrome.storage.local.get(["activeTabsIds"]).then((result) => {
      const activeTabsIds = result.activeTabsIds;
      for (let i = 0; i < activeTabsIds.length; i++) {
        chrome.tabs.reload(activeTabsIds[i]);
      }
    });
  }
};

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
const restoreOptions = () => {
  chrome.storage.sync.get(["config"]).then((result) => {
    const { style, forceReload } = result.config;
    document.getElementById("bg").value = style.bg;
    document.getElementById("border").checked = style.border;
    document.getElementById("bgOverride").checked = style.bgOverride;
    document.getElementById("forceReload").checked = forceReload;
  });
};

document.addEventListener("DOMContentLoaded", restoreOptions);
document.getElementById("save").addEventListener("click", saveOptions);
