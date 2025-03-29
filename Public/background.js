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

  // Find scripts that match the current URL and should run at document_start
  const documentStartScripts = scripts.filter(
    (script) =>
      script.enabled &&
      script.runAt === "document_start" &&
      urlMatchesPattern(url, script.targetUrl)
  );

  // Execute document_start scripts
  for (const script of documentStartScripts) {
    injectScriptDirectly(details.tabId, script.code);
  }
});

// Listen for DOM content loaded events
chrome.webNavigation.onDOMContentLoaded.addListener(async (details) => {
  // Ignore iframes and non-main frames
  if (details.frameId !== 0) return;

  const url = details.url;
  const { scripts = [] } = await chrome.storage.local.get("scripts");

  // Find matching scripts that should run at document_end
  const documentEndScripts = scripts.filter(
    (script) =>
      script.enabled &&
      script.runAt === "document_end" &&
      urlMatchesPattern(url, script.targetUrl)
  );

  // Execute document_end scripts
  for (const script of documentEndScripts) {
    injectScriptDirectly(details.tabId, script.code);
  }
});

// Listen for page load complete events
chrome.webNavigation.onCompleted.addListener(async (details) => {
  // Ignore iframes and non-main frames
  if (details.frameId !== 0) return;

  const url = details.url;
  const { scripts = [] } = await chrome.storage.local.get("scripts");

  // Find matching scripts that should run at document_idle
  const documentIdleScripts = scripts.filter(
    (script) =>
      script.enabled &&
      script.runAt === "document_idle" &&
      urlMatchesPattern(url, script.targetUrl)
  );

  // Execute document_idle scripts
  for (const script of documentIdleScripts) {
    injectScriptDirectly(details.tabId, script.code);
  }

  // Handle element_ready scripts separately
  const elementReadyScripts = scripts.filter(
    (script) =>
      script.enabled &&
      script.runAt === "element_ready" &&
      urlMatchesPattern(url, script.targetUrl)
  );

  // For element_ready scripts, inject a content script that will wait for the element
  if (elementReadyScripts.length > 0) {
    // Send a message to the content script to handle element-ready scripts
    chrome.tabs
      .sendMessage(details.tabId, {
        action: "waitForElements",
        scripts: elementReadyScripts,
      })
      .catch((error) => {
        console.error(
          "Error sending element-ready scripts to content script:",
          error
        );
      });
  }
});

// Function to inject a script directly using the scripting API with MAIN world
function injectScriptDirectly(tabId, code) {
  chrome.scripting
    .executeScript({
      target: { tabId: tabId },
      world: "MAIN", // This is the key part - run in the same JavaScript context as the page
      func: runCode,
      args: [code],
    })
    .catch((error) => {
      console.error("Error injecting script:", error);
    });
}

// Function that runs in the page context
function runCode(code) {
  try {
    console.log("Executing code:", code); // Log the code for debugging

    // Validate the code by attempting to parse it
    new Function(code); // Throws a SyntaxError if the code is invalid

    // Use eval in the page context
    return eval(code);
  } catch (error) {
    console.error("Error executing injected script:", error, "Code:", code);

    // Return detailed error information
    return { error: error.message, code };
  }
}

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
    // Scripts will be executed on the next navigation event
    sendResponse({ status: "received" });
  }
  return true; // Keep the message channel open for async responses
});
