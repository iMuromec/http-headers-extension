document.addEventListener("DOMContentLoaded", () => {
  // UI Elements
  const contentElement = document.getElementById("content");
  const loadingIndicator = document.getElementById("loading-indicator");
  const errorMessage = document.getElementById("error-message");
  const refreshButton = document.getElementById("refresh-button");

  // Show loading state
  setLoadingState(true);

  // Function to set loading state
  function setLoadingState(isLoading) {
    if (isLoading) {
      loadingIndicator.style.display = "flex";
      contentElement.style.display = "none";
      errorMessage.style.display = "none";
    } else {
      loadingIndicator.style.display = "none";
      contentElement.style.display = "block";
    }
  }

  // Function to show error message
  function showError(message) {
    const errorTextElement = errorMessage.querySelector(".error-text");
    errorTextElement.textContent =
      message || "No data available. Try refreshing the page.";
    errorMessage.style.display = "flex";
    contentElement.style.display = "none";
    loadingIndicator.style.display = "none";
  }

  // Function to copy text to clipboard
  function copyToClipboard(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch((err) => {
          console.error("Could not copy text: ", err);
        });
      } else {
        // Fallback for browsers that don't support clipboard API
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed"; // Avoid scrolling to bottom
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
          const successful = document.execCommand("copy");
          if (!successful) {
            console.error("Failed to copy text using execCommand");
          }
        } catch (err) {
          console.error("Error copying text: ", err);
        }

        document.body.removeChild(textArea);
      }
    } catch (err) {
      console.error("Error during copy operation: ", err);
    }
  }

  // Function to create header row
  function createHeaderRow(name, value) {
    const headerRow = document.createElement("div");
    headerRow.className = "header-row";
    headerRow.title = "Click to copy";

    const nameSpan = document.createElement("div");
    nameSpan.className = "header-name";
    nameSpan.textContent = name + ":";

    const valueSpan = document.createElement("div");
    valueSpan.className = "header-value";
    valueSpan.textContent = value;

    headerRow.appendChild(nameSpan);
    headerRow.appendChild(valueSpan);

    // Add click event to copy header
    headerRow.addEventListener("click", () => {
      const textToCopy = `${name}: ${value}`;
      copyToClipboard(textToCopy);

      // Show copied feedback
      headerRow.style.opacity = "0.7";
      setTimeout(() => {
        headerRow.style.opacity = "1";
      }, 300);
    });

    return headerRow;
  }

  // Function to add headers to container
  function addHeadersToContainer(headers, container) {
    if (!headers || Object.keys(headers).length === 0) {
      container.appendChild(createHeaderRow("", "No headers available"));
      return;
    }

    // Sort headers alphabetically
    const sortedHeaders = Object.keys(headers).sort();

    for (const name of sortedHeaders) {
      container.appendChild(createHeaderRow(name, headers[name]));
    }
  }

  // Function to display response data
  function displayResponseData(data) {
    // Clear content
    contentElement.innerHTML = "";

    if (!data || !data.url) {
      showError("No data available");
      return;
    }

    // Create response section (without title)
    const responseSection = document.createElement("div");
    responseSection.className = "section response-section";

    // Create request line at the top of response section
    const requestLine = document.createElement("div");
    requestLine.className = "request-line";

    const method = document.createElement("span");
    method.className = "request-method";
    method.textContent = data.method || "GET ";

    const url = document.createElement("span");
    url.className = "url-display";
    url.textContent = ": " + data.url;
    url.title = data.url;

    requestLine.appendChild(method);
    requestLine.appendChild(url);
    responseSection.appendChild(requestLine);

    // Create status line
    const statusLine = document.createElement("div");
    statusLine.className = "status-line";

    const httpVersion = document.createElement("span");
    httpVersion.className = "http-version";
    httpVersion.textContent = data.httpVersion || "HTTP/1.1";

    const statusCode = document.createElement("span");
    statusCode.className = "status-code";
    statusCode.textContent = " " + data.statusCode;

    // Add appropriate class based on status code
    if (data.statusCode >= 200 && data.statusCode < 300) {
      statusCode.classList.add("success");
    } else if (data.statusCode >= 300 && data.statusCode < 400) {
      statusCode.classList.add("warning");
    } else if (data.statusCode >= 400) {
      statusCode.classList.add("error");
    }

    const statusText = document.createElement("span");
    statusText.className = "status-text";
    // statusText.textContent = " " + (data.statusText || "");

    statusLine.appendChild(httpVersion);
    statusLine.appendChild(statusCode);
    statusLine.appendChild(statusText);
    responseSection.appendChild(statusLine);

    // Create response headers container
    const responseHeadersContainer = document.createElement("div");
    responseHeadersContainer.className = "headers-container";
    responseSection.appendChild(responseHeadersContainer);

    // Add headers
    addHeadersToContainer(data.responseHeaders, responseHeadersContainer);

    contentElement.appendChild(responseSection);

    // Also explicitly request badge update in the background
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        chrome.runtime.sendMessage({
          action: "updateBadge",
          tabId: tabs[0].id,
          statusCode: data.statusCode,
        });
      }
    });
  }

  // Request data from background script
  chrome.runtime.sendMessage({ action: "getHeaderData" }, (response) => {
    setLoadingState(false);

    if (response && response.success) {
      displayResponseData(response.data);
    } else {
      showError("No data available. Try refreshing the page.");
    }
  });

  // Add refresh button functionality
  // refreshButton.addEventListener("click", () => {
  //   setLoadingState(true);
  //   chrome.runtime.sendMessage({ action: "getHeaderData" }, (response) => {
  //     setLoadingState(false);
  //     if (response && response.success) {
  //       displayResponseData(response.data);
  //     } else {
  //       showError("No data available. Try refreshing the page.");
  //     }
  //   });
  // });
});
