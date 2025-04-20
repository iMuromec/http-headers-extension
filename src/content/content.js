// Minimal content script to support basic extension functionality
// No SPA or redirect tracking

// Tell the background script that the page has loaded
chrome.runtime.sendMessage({
  action: "pageLoaded",
  url: location.href,
});

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getCurrentUrl") {
    sendResponse({ url: location.href });
    return true;
  }

  // Default response for unhandled messages
  return false;
});
