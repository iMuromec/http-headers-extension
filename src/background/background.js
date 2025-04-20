// Store headers for the currently viewed tab
let headerStore = {};

// Initialize extension when installed or updated
chrome.runtime.onInstalled.addListener(() => {
  console.log("Minimal HTTP Headers extension installed");

  // Clear any existing data
  headerStore = {};
});

// Listen for web requests to capture headers
chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (details.tabId === -1) return; // Ignore requests not associated with a tab

    // Only store headers for main_frame requests (the primary webpage)
    if (details.type !== "main_frame") return;

    const responseHeaders = {};
    details.responseHeaders.forEach((header) => {
      responseHeaders[header.name] = header.value;
    });

    // Get or create entry for this tab
    if (!headerStore[details.tabId]) {
      headerStore[details.tabId] = {};
    }

    // Update headers for this tab and URL
    headerStore[details.tabId] = {
      url: details.url,
      statusCode: details.statusCode,
      statusText: details.statusLine.split(" ").slice(1).join(" "),
      responseHeaders: responseHeaders,
      requestType: details.type,
      lastUpdated: Date.now(),
    };

    console.log(`Status code for tab ${details.tabId}: ${details.statusCode}`);

    // Update badge if status code is not 200
    updateBadgeForTab(details.tabId, details.statusCode);
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);

// Function to update badge for tab with status code
function updateBadgeForTab(tabId, statusCode) {
  console.log(`Updating badge for tab ${tabId} with status ${statusCode}`);

  // Only show badge for non-200 status codes
  if (statusCode !== 200) {
    // Set badge text to status code
    chrome.action
      .setBadgeText({
        text: statusCode.toString(),
        tabId: tabId,
      })
      .catch((err) => console.error("Error setting badge text:", err));

    // Set badge color based on status code
    let color = "#22c55e"; // Default green for 2xx

    if (statusCode >= 300 && statusCode < 400) {
      color = "#f97316"; // Orange for 3xx
    } else if (statusCode >= 400) {
      color = "#c30b0b"; // Red for 4xx and 5xx
    }

    chrome.action
      .setBadgeBackgroundColor({
        color: color,
        tabId: tabId,
      })
      .catch((err) => console.error("Error setting badge color:", err));

    // Set badge text color to white
    chrome.action
      .setBadgeTextColor({
        color: "#FFFFFF",
        tabId: tabId,
      })
      .catch((err) => console.error("Error setting badge text color:", err));
  } else {
    // Clear badge for 200 status codes
    chrome.action
      .setBadgeText({
        text: "",
        tabId: tabId,
      })
      .catch((err) => console.error("Error clearing badge:", err));
  }
}

// Update badge on navigation completed
chrome.webNavigation.onCompleted.addListener(
  (details) => {
    // Only consider main frame navigation
    if (details.frameId !== 0) return;

    console.log(`Navigation completed for tab ${details.tabId}`);

    if (headerStore[details.tabId] && headerStore[details.tabId].statusCode) {
      const statusCode = headerStore[details.tabId].statusCode;
      console.log(`Found status code ${statusCode} for tab ${details.tabId}`);
      updateBadgeForTab(details.tabId, statusCode);
    }
  },
  { url: [{ schemes: ["http", "https"] }] }
);

// Handle tab activation to update badge
chrome.tabs.onActivated.addListener((activeInfo) => {
  const tabId = activeInfo.tabId;
  console.log(`Tab activated: ${tabId}`);

  if (headerStore[tabId] && headerStore[tabId].statusCode) {
    const statusCode = headerStore[tabId].statusCode;
    console.log(`Found status ${statusCode} for activated tab ${tabId}`);
    updateBadgeForTab(tabId, statusCode);
  } else {
    // Clear badge if no data for this tab
    chrome.action
      .setBadgeText({
        text: "",
        tabId: tabId,
      })
      .catch((err) =>
        console.error("Error clearing badge on activation:", err)
      );
  }
});

// Listen for tab updates to refresh status
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only act when the page is fully loaded
  if (changeInfo.status === "complete") {
    console.log(`Tab ${tabId} update completed`);
    if (headerStore[tabId] && headerStore[tabId].statusCode) {
      const statusCode = headerStore[tabId].statusCode;
      console.log(`Found status ${statusCode} for updated tab ${tabId}`);
      updateBadgeForTab(tabId, statusCode);
    }
  }
});

// Listen for tab removal to clean up data
chrome.tabs.onRemoved.addListener((tabId) => {
  if (headerStore[tabId]) {
    delete headerStore[tabId];
  }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getHeaderData") {
    // Get current tab ID
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        sendResponse({ success: false, error: "No active tab" });
        return;
      }

      const tabId = tabs[0].id;
      const data = headerStore[tabId];

      if (data) {
        console.log(
          `Sending data for tab ${tabId} with status ${data.statusCode}`
        );
        sendResponse({ success: true, data });
      } else {
        sendResponse({
          success: false,
          error: "No header data for this tab. Try refreshing the page.",
        });
      }
    });

    return true; // Keep the message channel open for sendResponse
  } else if (
    message.action === "updateBadge" &&
    message.tabId &&
    message.statusCode
  ) {
    // Allow popup to request badge update directly
    updateBadgeForTab(message.tabId, message.statusCode);
    sendResponse({ success: true });
    return false;
  }
  return false;
});
