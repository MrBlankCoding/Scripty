// Script Injector - content.js
// This script only handles waiting for elements and then injecting scripts

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

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "waitForElements") {
    // Handle element_ready scripts
    message.scripts.forEach((script) => {
      if (script.waitForSelector) {
        checkForElement(script.waitForSelector, () => {
          // When element is found, notify background script to inject the code
          chrome.runtime.sendMessage({
            action: "elementFound",
            tabId: chrome.runtime.id,
            scriptCode: script.code,
          });
        });
      }
    });
    sendResponse({ status: "waiting for elements" });
  }

  return true; // Keep the message channel open for async responses
});

// Add listener for elementFound messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "elementFound") {
    // Background script will handle the actual injection
    sendResponse({ status: "received" });
  }
  return true;
});

// Notify background script that content script is ready
chrome.runtime.sendMessage({ action: "contentScriptReady" });
