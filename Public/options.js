// Script Injector - options.js
// This script handles the options page UI and functionality

document.addEventListener("DOMContentLoaded", function () {
  // DOM Elements
  const createScriptBtn = document.getElementById("createScriptBtn");
  const scriptsTable = document.getElementById("scriptsTable");
  const scriptsList = document.getElementById("scriptsList");
  const emptyState = document.getElementById("emptyState");
  const saveSettingsBtn = document.getElementById("saveSettingsBtn");

  // Tab elements
  const tabs = document.querySelectorAll(".tab");
  const tabContents = document.querySelectorAll(".tab-content");

  // Settings elements
  const enableAllScripts = document.getElementById("enableAllScripts");
  const showNotifications = document.getElementById("showNotifications");
  const debugMode = document.getElementById("debugMode");
  const allowThirdPartyScripts = document.getElementById(
    "allowThirdPartyScripts"
  );
  const confirmBeforeRunning = document.getElementById("confirmBeforeRunning");

  // Load and display scripts
  loadScripts();

  // Load settings
  loadSettings();

  // Event Listeners
  createScriptBtn.addEventListener("click", () => {
    window.location.href = "editor.html";
  });

  saveSettingsBtn.addEventListener("click", saveSettings);

  // Tab switching
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      // Remove active class from all tabs and contents
      tabs.forEach((t) => t.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));

      // Add active class to clicked tab and corresponding content
      tab.classList.add("active");
      const tabId = tab.dataset.tab + "-tab";
      document.getElementById(tabId).classList.add("active");
    });
  });

  // Functions
  async function loadScripts() {
    try {
      const { scripts = [] } = await chrome.storage.local.get("scripts");

      if (scripts.length === 0) {
        scriptsTable.style.display = "none";
        emptyState.style.display = "block";
        return;
      }

      scriptsTable.style.display = "table";
      emptyState.style.display = "none";

      // Clear existing items
      while (scriptsList.firstChild) {
        scriptsList.removeChild(scriptsList.firstChild);
      }

      // Sort scripts by name
      scripts.sort((a, b) => a.name.localeCompare(b.name));

      // Add each script to the table
      scripts.forEach((script, index) => {
        const row = document.createElement("tr");

        // Status column with toggle
        const statusCell = document.createElement("td");
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
        statusCell.appendChild(toggleLabel);

        // Name column
        const nameCell = document.createElement("td");
        nameCell.textContent = script.name;

        // Target website column
        const targetCell = document.createElement("td");
        targetCell.textContent = script.targetUrl;

        // Run at column
        const runAtCell = document.createElement("td");
        runAtCell.textContent = formatRunAt(script.runAt);

        // Version column
        const versionCell = document.createElement("td");
        versionCell.textContent = script.version || "1.0.0";

        // Actions column
        const actionsCell = document.createElement("td");
        actionsCell.className = "script-actions";

        // Edit button
        const editButton = document.createElement("button");
        editButton.className = "icon-button";
        editButton.innerHTML = "✏️";
        editButton.title = "Edit Script";
        editButton.addEventListener("click", () => editScript(index));

        // Duplicate button
        const duplicateButton = document.createElement("button");
        duplicateButton.className = "icon-button";
        duplicateButton.innerHTML = "📋";
        duplicateButton.title = "Duplicate Script";
        duplicateButton.addEventListener("click", () => duplicateScript(index));

        // Delete button
        const deleteButton = document.createElement("button");
        deleteButton.className = "icon-button";
        deleteButton.innerHTML = "🗑️";
        deleteButton.title = "Delete Script";
        deleteButton.addEventListener("click", () => deleteScript(index));

        // Add buttons to actions cell
        actionsCell.appendChild(editButton);
        actionsCell.appendChild(duplicateButton);
        actionsCell.appendChild(deleteButton);

        // Add all cells to the row
        row.appendChild(statusCell);
        row.appendChild(nameCell);
        row.appendChild(targetCell);
        row.appendChild(runAtCell);
        row.appendChild(versionCell);
        row.appendChild(actionsCell);

        // Add row to the table
        scriptsList.appendChild(row);
      });
    } catch (error) {
      console.error("Error loading scripts:", error);
    }
  }

  async function toggleScript(index, enabled) {
    try {
      const { scripts = [] } = await chrome.storage.local.get("scripts");

      if (index >= 0 && index < scripts.length) {
        scripts[index].enabled = enabled;
        await chrome.storage.local.set({ scripts });

        // Notify background script that scripts have been updated
        chrome.runtime.sendMessage({ action: "scriptsUpdated" });
      }
    } catch (error) {
      console.error("Error toggling script:", error);
    }
  }

  function editScript(index) {
    window.location.href = `editor.html?id=${index}`;
  }

  async function duplicateScript(index) {
    try {
      const { scripts = [] } = await chrome.storage.local.get("scripts");

      if (index >= 0 && index < scripts.length) {
        // Create a copy of the script
        const scriptCopy = { ...scripts[index] };

        // Update name, creation date and version
        scriptCopy.name = scriptCopy.name + " (Copy)";
        scriptCopy.createdAt = new Date().toISOString();
        scriptCopy.updatedAt = new Date().toISOString();

        // Parse version and increment the last number
        const versionParts = (scriptCopy.version || "1.0.0").split(".");
        versionParts[versionParts.length - 1] = (
          parseInt(versionParts[versionParts.length - 1]) + 1
        ).toString();
        scriptCopy.version = versionParts.join(".");

        // Add the copy to the scripts array
        scripts.push(scriptCopy);

        // Save updated scripts
        await chrome.storage.local.set({ scripts });

        // Refresh the list
        loadScripts();

        // Notify background script that scripts have been updated
        chrome.runtime.sendMessage({ action: "scriptsUpdated" });
      }
    } catch (error) {
      console.error("Error duplicating script:", error);
    }
  }

  async function deleteScript(index) {
    if (!confirm("Are you sure you want to delete this script?")) {
      return;
    }

    try {
      const { scripts = [] } = await chrome.storage.local.get("scripts");

      if (index >= 0 && index < scripts.length) {
        scripts.splice(index, 1);
        await chrome.storage.local.set({ scripts });

        // Refresh the list
        loadScripts();

        // Notify background script that scripts have been updated
        chrome.runtime.sendMessage({ action: "scriptsUpdated" });
      }
    } catch (error) {
      console.error("Error deleting script:", error);
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

  async function loadSettings() {
    try {
      const { settings = {} } = await chrome.storage.local.get("settings");

      // Set default values if not present
      enableAllScripts.checked = settings.enableAllScripts !== false;
      showNotifications.checked = settings.showNotifications !== false;
      debugMode.checked = settings.debugMode === true;
      allowThirdPartyScripts.checked = settings.allowThirdPartyScripts === true;
      confirmBeforeRunning.checked = settings.confirmBeforeRunning === true;
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  }

  async function saveSettings() {
    try {
      const settings = {
        enableAllScripts: enableAllScripts.checked,
        showNotifications: showNotifications.checked,
        debugMode: debugMode.checked,
        allowThirdPartyScripts: allowThirdPartyScripts.checked,
        confirmBeforeRunning: confirmBeforeRunning.checked,
      };

      await chrome.storage.local.set({ settings });

      // Show success message
      alert("Settings saved successfully.");

      // Notify background script that settings have been updated
      chrome.runtime.sendMessage({ action: "settingsUpdated" });
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings. " + error.message);
    }
  }
});
