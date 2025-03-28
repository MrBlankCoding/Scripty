// Script Injector - editor.js
// This script handles the script editor UI and script saving functionality

document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const scriptForm = document.getElementById('scriptForm');
  const pageTitle = document.getElementById('pageTitle');
  const scriptName = document.getElementById('scriptName');
  const targetUrl = document.getElementById('targetUrl');
  const runAt = document.getElementById('runAt');
  const scriptVersion = document.getElementById('scriptVersion');
  const codeEditor = document.getElementById('codeEditor');
  const domAccess = document.getElementById('domAccess');
  const storageAccess = document.getElementById('storageAccess');
  const ajaxAccess = document.getElementById('ajaxAccess');
  const cancelBtn = document.getElementById('cancelBtn');
  const saveBtn = document.getElementById('saveBtn');
  const selectorContainer = document.getElementById('selectorContainer');
  const waitForSelector = document.getElementById('waitForSelector');
  
  // Set default version if empty
  if (!scriptVersion.value) {
    scriptVersion.value = '1.0.0';
  }
  
  // Check if we're editing an existing script
  const urlParams = new URLSearchParams(window.location.search);
  const scriptId = urlParams.get('id');
  let isEditMode = scriptId !== null;
  
  // Update UI based on mode
  if (isEditMode) {
    pageTitle.textContent = 'Edit Script';
    loadScript(scriptId);
  } else {
    // Default template for new scripts
    codeEditor.value = `// Script Injector custom script
// This script will run on: ${targetUrl.value || 'your-target-website.com'}

(function() {
  'use strict';
  
  // Your code here...
  console.log('Script Injector: Custom script is running!');
  
  // Example: Modify page elements
  // const mainContent = document.querySelector('main');
  // if (mainContent) {
  //   mainContent.style.backgroundColor = '#f5f5f5';
  // }
})();`;
  }
  
  // Event Listeners
  runAt.addEventListener('change', function() {
    if (this.value === 'element_ready') {
      selectorContainer.style.display = 'block';
      waitForSelector.required = true;
    } else {
      selectorContainer.style.display = 'none';
      waitForSelector.required = false;
    }
  });
  
  scriptForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    await saveScript();
  });
  
  cancelBtn.addEventListener('click', function() {
    // Go back to the previous page
    window.history.back();
  });
  
  // Functions
  async function loadScript(id) {
    try {
      const { scripts = [] } = await chrome.storage.local.get('scripts');
      const script = scripts[id];
      
      if (!script) {
        alert('Script not found.');
        return;
      }
      
      // Populate form with script data
      scriptName.value = script.name;
      targetUrl.value = script.targetUrl;
      runAt.value = script.runAt;
      scriptVersion.value = script.version;
      codeEditor.value = script.code;
      
      // Set permissions
      domAccess.checked = script.permissions?.domAccess ?? true;
      storageAccess.checked = script.permissions?.storageAccess ?? false;
      ajaxAccess.checked = script.permissions?.ajaxAccess ?? false;
      
      // Handle element selector if applicable
      if (script.runAt === 'element_ready') {
        selectorContainer.style.display = 'block';
        waitForSelector.value = script.waitForSelector || '';
      }
    } catch (error) {
      console.error('Error loading script:', error);
      alert('Failed to load script. ' + error.message);
    }
  }
  
  async function saveScript() {
    try {
      if (!scriptForm.checkValidity()) {
        return;
      }
      
      // Gather script data
      const scriptData = {
        name: scriptName.value.trim(),
        targetUrl: targetUrl.value.trim(),
        runAt: runAt.value,
        version: scriptVersion.value.trim() || '1.0.0',
        code: codeEditor.value,
        enabled: true,
        permissions: {
          domAccess: domAccess.checked,
          storageAccess: storageAccess.checked,
          ajaxAccess: ajaxAccess.checked
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Add waitForSelector if needed
      if (runAt.value === 'element_ready') {
        scriptData.waitForSelector = waitForSelector.value.trim();
        if (!scriptData.waitForSelector) {
          alert('Please specify an element selector.');
          return;
        }
      }
      
      // Load existing scripts
      const { scripts = [] } = await chrome.storage.local.get('scripts');
      
      // Update or add the script
      if (isEditMode) {
        // Preserve the original creation date
        scriptData.createdAt = scripts[scriptId].createdAt;
        scripts[scriptId] = scriptData;
      } else {
        scripts.push(scriptData);
      }
      
      // Save scripts
      await chrome.storage.local.set({ scripts });
      
      // Notify background script that scripts have been updated
      chrome.runtime.sendMessage({ action: 'scriptsUpdated' });
      
      // Go back to the previous page
      window.location.href = 'options.html';
    } catch (error) {
      console.error('Error saving script:', error);
      alert('Failed to save script. ' + error.message);
    }
  }
  
  // Initialize based on state
  function init() {
    if (runAt.value === 'element_ready') {
      selectorContainer.style.display = 'block';
    }
  }
  
  init();
});