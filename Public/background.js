// Script Injector - background.js
// This script handles the monitoring of browser tabs and executes logic for script injection

// Listen for tab updates to detect page navigation
chrome.webNavigation.onCommitted.addListener(async (details) => {
  // Ignore iframes and non-main frames
  if (details.frameId !== 0) return;

  // Get the URL of the current tab
  const url = details.url;

  // Fetch all user scripts from storage
  const { scripts = [] } = await chrome.storage.local.get("scripts");

  // Find scripts that match the current URL
  const matchingScripts = scripts.filter((script) => {
    // Skip disabled scripts
    if (!script.enabled) return false;

    // Check if the URL matches the script's target pattern
    return urlMatchesPattern(url, script.targetUrl);
  });

  // If we found matching scripts set to run at document_start
  const documentStartScripts = matchingScripts.filter(
    (script) => script.runAt === "document_start"
  );

  if (documentStartScripts.length > 0) {
    // Send message to content script to prepare for injection
    chrome.tabs
      .sendMessage(details.tabId, {
        action: "prepareScriptInjection",
        scripts: documentStartScripts,
      })
      .catch(() => {
        // Content script might not be ready yet, which is expected at document_start
        console.log("Content script not ready yet for document_start scripts");
      });
  }
});

// Listen for DOM content loaded events
chrome.webNavigation.onDOMContentLoaded.addListener(async (details) => {
  // Ignore iframes and non-main frames
  if (details.frameId !== 0) return;

  const url = details.url;
  const { scripts = [] } = await chrome.storage.local.get("scripts");

  // Find matching scripts that should run at document_end
  const matchingScripts = scripts.filter(
    (script) =>
      script.enabled &&
      script.runAt === "document_end" &&
      urlMatchesPattern(url, script.targetUrl)
  );

  if (matchingScripts.length > 0) {
    chrome.tabs
      .sendMessage(details.tabId, {
        action: "injectScripts",
        scripts: matchingScripts,
      })
      .catch((error) => {
        console.error("Error injecting document_end scripts:", error);
      });
  }
});

// Listen for page load complete events
chrome.webNavigation.onCompleted.addListener(async (details) => {
  // Ignore iframes and non-main frames
  if (details.frameId !== 0) return;

  const url = details.url;
  const { scripts = [] } = await chrome.storage.local.get("scripts");

  // Find matching scripts that should run at document_idle
  const matchingScripts = scripts.filter(
    (script) =>
      script.enabled &&
      script.runAt === "document_idle" &&
      urlMatchesPattern(url, script.targetUrl)
  );

  if (matchingScripts.length > 0) {
    chrome.tabs
      .sendMessage(details.tabId, {
        action: "injectScripts",
        scripts: matchingScripts,
      })
      .catch((error) => {
        console.error("Error injecting document_idle scripts:", error);
      });
  }
});

// Function to check if a URL matches a pattern
function urlMatchesPattern(url, pattern) {
  // Convert URL to a string if it's not already
  if (typeof url !== "string") {
    url = url.toString();
  }

  // Create a URL object for more precise matching
  try {
    const urlObj = new URL(url);

    // Exact match
    if (pattern === url) {
      return true;
    }

    // Domain and subdomain matching with wildcards
    if (pattern.startsWith("*.")) {
      const domain = pattern.substring(2);
      return (
        urlObj.hostname === domain || urlObj.hostname.endsWith("." + domain)
      );
    }

    // Domain-only matching (any path on the domain)
    if (!pattern.includes("*") && !pattern.includes("/")) {
      return urlObj.hostname === pattern;
    }

    // Convert simple domain patterns to match all paths
    if (!pattern.includes("://")) {
      pattern = "*://" + pattern + "/*";
    }

    // For patterns with * wildcards, convert to regex
    if (pattern.includes("*")) {
      const regexPattern = pattern
        .replace(/\./g, "\\.")
        .replace(/\*/g, ".*")
        .replace(/\//g, "\\/");
      const regex = new RegExp("^" + regexPattern + "$");
      return regex.test(url);
    }

    // Fallback to simple string matching
    return url.includes(pattern);
  } catch (e) {
    console.error("Error parsing URL:", e);
    // Fallback to simple string matching
    return url.includes(pattern);
  }
}

// Handle communication from popup or options page
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "scriptsUpdated") {
    // Refresh script execution on the active tab if needed
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        const activeTab = tabs[0];
        // If needed, trigger a refresh of scripts on the active tab
        chrome.tabs
          .sendMessage(activeTab.id, { action: "refreshScripts" })
          .catch(() => console.log("No content script to refresh"));
      }
    });
    sendResponse({ status: "received" });
  }
  return true; // Keep the message channel open for async responses
});
