// Script Injector - content.js
// This script gets injected into webpages and handles running the user's custom scripts

// Store pending scripts to be executed
let pendingScripts = {
  document_start: [],
  document_end: [],
  document_idle: [],
  element_ready: [],
};

// Function to inject a script into the page
function injectScript(scriptText) {
  const script = document.createElement("script");
  script.textContent = scriptText;
  document.documentElement.appendChild(script);
  script.remove(); // Remove the node after executing
}

// Function to check for element existence
function checkForElement(selector, callback, maxAttempts = 50) {
  let attempts = 0;

  const checkInterval = setInterval(() => {
    const element = document.querySelector(selector);
    attempts++;

    if (element) {
      clearInterval(checkInterval);
      callback();
    } else if (attempts >= maxAttempts) {
      console.warn(
        `Element '${selector}' not found after ${maxAttempts} attempts`
      );
      clearInterval(checkInterval);
    }
  }, 200); // Check every 200ms
}

// Execute scripts that are meant to run at document_start
document.addEventListener("DOMContentLoaded", () => {
  // Execute document_end scripts
  pendingScripts.document_end.forEach((script) => {
    injectScript(script.code);
  });
  pendingScripts.document_end = [];
});

// When page is fully loaded
window.addEventListener("load", () => {
  // Execute document_idle scripts
  pendingScripts.document_idle.forEach((script) => {
    injectScript(script.code);
  });
  pendingScripts.document_idle = [];

  // Handle element_ready scripts
  pendingScripts.element_ready.forEach((script) => {
    if (script.waitForSelector) {
      checkForElement(script.waitForSelector, () => {
        injectScript(script.code);
      });
    }
  });
  pendingScripts.element_ready = [];
});

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "prepareScriptInjection") {
    // Store scripts to be injected based on their execution timing
    message.scripts.forEach((script) => {
      if (script.runAt === "document_start") {
        // For document_start, inject immediately
        injectScript(script.code);
      } else if (script.runAt === "document_end") {
        pendingScripts.document_end.push(script);
      } else if (script.runAt === "document_idle") {
        pendingScripts.document_idle.push(script);
      } else if (script.runAt === "element_ready") {
        pendingScripts.element_ready.push(script);
      }
    });
    sendResponse({ status: "prepared" });
  }

  if (message.action === "injectScripts") {
    // Inject scripts immediately
    message.scripts.forEach((script) => {
      if (script.runAt === "element_ready" && script.waitForSelector) {
        checkForElement(script.waitForSelector, () => {
          injectScript(script.code);
        });
      } else {
        injectScript(script.code);
      }
    });
    sendResponse({ status: "injected" });
  }

  if (message.action === "refreshScripts") {
    // This could trigger a re-evaluation of scripts if needed
    sendResponse({ status: "refreshed" });
  }

  return true; // Keep the message channel open for async responses
});

// Notify background script that content script is ready
chrome.runtime.sendMessage({ action: "contentScriptReady" });
