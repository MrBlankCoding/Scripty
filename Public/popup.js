// Script Injector - popup.js
// This script handles the popup UI and script management

document.addEventListener("DOMContentLoaded", function () {
  // DOM Elements
  const scriptList = document.getElementById("scriptList");
  const emptyState = document.getElementById("emptyState");
  const createScriptBtn = document.getElementById("createScript");
  const openOptionsBtn = document.getElementById("openOptions");
  const openFullEditorBtn = document.getElementById("openFullEditor");

  // Load and display all scripts
  loadScripts();

  // Event Listeners
  createScriptBtn.addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("editor.html") });
  });

  openOptionsBtn.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  openFullEditorBtn.addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("editor.html") });
  });

  // Functions
  async function loadScripts() {
    const { scripts = [] } = await chrome.storage.local.get("scripts");

    if (scripts.length === 0) {
      emptyState.style.display = "block";
      return;
    }

    emptyState.style.display = "none";

    // Clear existing items
    while (scriptList.firstChild) {
      scriptList.removeChild(scriptList.firstChild);
    }

    // Sort scripts by name
    scripts.sort((a, b) => a.name.localeCompare(b.name));

    // Add each script to the UI
    scripts.forEach((script, index) => {
      const scriptElement = createScriptElement(script, index);
      scriptList.appendChild(scriptElement);
    });
  }

  function createScriptElement(script, index) {
    const scriptItem = document.createElement("div");
    scriptItem.className = "script-item";
    scriptItem.dataset.id = index;

    const scriptInfo = document.createElement("div");
    scriptInfo.className = "script-info";

    const scriptName = document.createElement("div");
    scriptName.className = "script-name";
    scriptName.textContent = script.name;

    const scriptTarget = document.createElement("div");
    scriptTarget.className = "script-target";
    scriptTarget.textContent = `Target: ${
      script.targetUrl
    } | Run: ${formatRunAt(script.runAt)}`;

    scriptInfo.appendChild(scriptName);
    scriptInfo.appendChild(scriptTarget);

    const scriptActions = document.createElement("div");
    scriptActions.className = "script-actions";

    // Toggle switch
    const toggleLabel = document.createElement("label");
    toggleLabel.className = "toggle-switch";

    const toggleInput = document.createElement("input");
    toggleInput.type = "checkbox";
    toggleInput.checked = script.enabled;
    toggleInput.addEventListener("change", () =>
      toggleScript(index, toggleInput.checked)
    );

    const slider = document.createElement("span");
    slider.className = "slider";

    toggleLabel.appendChild(toggleInput);
    toggleLabel.appendChild(slider);

    // Edit button
    const editButton = document.createElement("button");
    editButton.className = "icon-button";
    editButton.innerHTML = "✏️";
    editButton.title = "Edit Script";
    editButton.addEventListener("click", () => editScript(index));

    // Delete button
    const deleteButton = document.createElement("button");
    deleteButton.className = "icon-button";
    deleteButton.innerHTML = "🗑️";
    deleteButton.title = "Delete Script";
    deleteButton.addEventListener("click", () => deleteScript(index));

    scriptActions.appendChild(toggleLabel);
    scriptActions.appendChild(editButton);
    scriptActions.appendChild(deleteButton);

    scriptItem.appendChild(scriptInfo);
    scriptItem.appendChild(scriptActions);

    return scriptItem;
  }

  async function toggleScript(index, enabled) {
    const { scripts = [] } = await chrome.storage.local.get("scripts");

    if (index >= 0 && index < scripts.length) {
      scripts[index].enabled = enabled;
      await chrome.storage.local.set({ scripts });

      // Notify background script that scripts have been updated
      chrome.runtime.sendMessage({ action: "scriptsUpdated" });
    }
  }

  function editScript(index) {
    chrome.tabs.create({
      url: `editor.html?id=${index}`,
    });
  }

  async function deleteScript(index) {
    if (!confirm("Are you sure you want to delete this script?")) {
      return;
    }

    const { scripts = [] } = await chrome.storage.local.get("scripts");

    if (index >= 0 && index < scripts.length) {
      scripts.splice(index, 1);
      await chrome.storage.local.set({ scripts });

      // Refresh the UI
      loadScripts();

      // Notify background script that scripts have been updated
      chrome.runtime.sendMessage({ action: "scriptsUpdated" });
    }
  }

  function formatRunAt(runAt) {
    const formats = {
      document_start: "Page Start",
      document_end: "DOM Ready",
      document_idle: "Page Load",
      element_ready: "Element Ready",
    };

    return formats[runAt] || runAt;
  }
});
