// Saves options to chrome.storage
const doSave = async (close) => {
  const bgColor = document.getElementById("bgColor").value;
  const borderType = document.getElementById("borderType").value;
  const textColor = document.getElementById("textColor").value;
  const byLevel = document.getElementById("byLevel").checked;
  const overrideBgColor = document.getElementById("overrideBgColor").checked;
  const overrideBorder = document.getElementById("overrideBorder").checked;
  const overrideTextColor =
    document.getElementById("overrideTextColor").checked;
  const forceReload = document.getElementById("forceReload").checked;

  // Check this async/await
  await chrome.storage.sync.set(
    {
      config: {
        style: {
          bgColor,
          borderType,
          textColor,
          byLevel,
          overrideBgColor,
          overrideBorder,
          overrideTextColor,
        },
        forceReload,
      },
    },
    () => {
      // Update status to let user know options were saved.
      const status = document.getElementById("status");
      status.textContent = "Configurations saved.";
      setTimeout(() => {
        status.textContent = "";
        if (close) {
          window.close();
        }
      }, 750);
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

const saveOptionsAndClose = () => {
  doSave(true);
};

const saveOptions = () => {
  doSave(false);
};

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
const restoreOptions = () => {
  chrome.storage.sync.get(["config"]).then((result) => {
    const { style, forceReload } = result.config;
    document.getElementById("bgColor").value = style.bgColor;
    document.getElementById("borderType").value = style.borderType;
    document.getElementById("textColor").value = style.textColor;
    document.getElementById("byLevel").checked = style.byLevel;
    document.getElementById("overrideBgColor").checked = style.overrideBgColor;
    document.getElementById("overrideBorder").checked = style.overrideBorder;
    document.getElementById("overrideTextColor").checked =
      style.overrideTextColor;
    document.getElementById("forceReload").checked = forceReload;
  });
};

const selectOptions = () => {
  const bgColor = document.getElementById("bgColor").value;
  const borderType = document.getElementById("borderType").value;
  const textColor = document.getElementById("textColor").value;

  if (bgColor === "default") {
    //default => keep bg's as they are, don't paint them.
    document.getElementById("overrideBgColor").disabled = true;
    document.getElementById("overrideBgColor").checked = false;
    document.getElementById("byLevel").disabled = true;
    document.getElementById("byLevel").checked = false;
  } else {
    document.getElementById("overrideBgColor").disabled = false;
    document.getElementById("byLevel").disabled = false;
  }

  if (borderType === "default") {
    document.getElementById("overrideBorder").disabled = true;
    document.getElementById("overrideBorder").checked = false;
  } else {
    document.getElementById("overrideBorder").disabled = false;
  }

  if (textColor === "default") {
    document.getElementById("overrideTextColor").disabled = true;
    document.getElementById("overrideTextColor").checked = false;
  } else {
    document.getElementById("overrideTextColor").disabled = false;
  }
};

document.addEventListener("DOMContentLoaded", restoreOptions);
document.getElementById("save").addEventListener("click", saveOptions);
document
  .getElementById("saveAndClose")
  .addEventListener("click", saveOptionsAndClose);
document.getElementById("bgColor").addEventListener("change", selectOptions);
document.getElementById("bgColor").addEventListener("load", selectOptions);
document.getElementById("borderType").addEventListener("change", selectOptions);
document.getElementById("borderType").addEventListener("load", selectOptions);
document.getElementById("textColor").addEventListener("change", selectOptions);
document.getElementById("textColor").addEventListener("load", selectOptions);
