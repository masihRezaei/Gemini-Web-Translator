// Mobile popup overlay for Gemini Web Translator
console.log("Mobile popup overlay script loaded");

// Add this at the top of your file to provide a fallback for browser API
const browser = window.browser ||
  window.chrome || {
    storage: {
      local: {
        get: () => Promise.resolve({}),
        set: () => Promise.resolve(),
      },
    },
    tabs: {
      query: () => Promise.resolve([]),
      sendMessage: () => Promise.resolve(),
    },
    runtime: {
      getURL: (path) => path,
    },
  };

// Function to detect if we're on a mobile device
function isMobileDevice() {
  // Check for mobile device using user agent only, not window size
  const userAgent = navigator.userAgent || window.opera;
  const isMobile =
    /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
      userAgent.toLowerCase()
    );
  console.log("Mobile popup detected mobile device:", isMobile);
  return isMobile;
}

// Variable to track if the popup is currently shown
let popupShown = false;
let popupContainer = null;

// Variable to track backdrop element
let backdropElement = null;

// Function to create and show the mobile popup overlay
function showMobilePopup() {
  // If popup is already shown or we're not on mobile, do nothing
  if (popupShown || !isMobileDevice()) {
    return;
  }

  console.log("Creating mobile popup overlay");

  // Create backdrop first
  backdropElement = document.createElement("div");
  backdropElement.className = "gemini-mobile-popup-backdrop";
  // Add click handler to close popup when clicking on backdrop
  backdropElement.addEventListener("click", (event) => {
    // Only close if clicking directly on the backdrop, not its children
    if (event.target === backdropElement) {
      hideMobilePopup();
    }
  });
  document.body.appendChild(backdropElement);

  // Create container for the popup
  popupContainer = document.createElement("div");
  popupContainer.id = "gemini-mobile-popup-container";
  popupContainer.className = "gemini-mobile-popup-container";

  // Add styles for the popup container
  const style = document.createElement("style");
  style.textContent = `
    .gemini-mobile-popup-container {
      position: fixed;
      bottom: 0;
      left: 0;
      width: 100%;
      max-height: 90vh;
      background-color: #ffffff;
      z-index: 2147483647;
      border-top-left-radius: 0.75rem;
      border-top-right-radius: 0.75rem;
      box-shadow: 0 -4px 10px -1px rgba(0, 0, 0, 0.2), 0 -2px 6px -1px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: transform 0.3s ease-in-out, opacity 0.3s ease-in-out;
      transform: translateY(0);
      opacity: 1;
    }
    .gemini-mobile-popup-container.hidden {
      transform: translateY(100%);
      opacity: 0;
    }
    .gemini-mobile-popup-header {
      background-color: #2563eb;
      color: white;
      padding: 0.75rem 1rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .gemini-mobile-popup-content {
      padding: 0;
      overflow-y: auto;
      flex-grow: 1;
      -webkit-overflow-scrolling: touch;
    }
    .gemini-mobile-popup-iframe {
      width: 100%;
      height: 100%;
      border: none;
      min-height: 450px;
      max-height: calc(90vh - 3.5rem);
    }
    .gemini-mobile-popup-close {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 0.5rem;
      margin: -0.5rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.2s;
    }
    .gemini-mobile-popup-close:hover, .gemini-mobile-popup-close:focus {
      background-color: rgba(255, 255, 255, 0.1);
      outline: none;
    }
    .gemini-mobile-popup-title {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 500;
      display: flex;
      align-items: center;
    }
    .gemini-mobile-popup-title svg {
      margin-right: 0.625rem;
    }
    /* Add a subtle backdrop */
    .gemini-mobile-popup-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.3);
      z-index: 2147483646;
      opacity: 1;
      transition: opacity 0.3s ease-in-out;
    }
    .gemini-mobile-popup-backdrop.hidden {
      opacity: 0;
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);

  // Create header
  const header = document.createElement("div");
  header.className = "gemini-mobile-popup-header";

  // Add title with icon
  const title = document.createElement("div");
  title.className = "gemini-mobile-popup-title";
  title.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
      <path d="M2 12h20"></path>
    </svg>
    <h3>Gemini Web Translator</h3>
  `;

  // Add close button
  const closeButton = document.createElement("button");
  closeButton.className = "gemini-mobile-popup-close";
  closeButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  `;
  closeButton.addEventListener("click", hideMobilePopup);

  header.appendChild(title);
  header.appendChild(closeButton);

  // Create content area with iframe
  const content = document.createElement("div");
  content.className = "gemini-mobile-popup-content";

  // Create iframe to load the popup content
  const iframe = document.createElement("iframe");
  iframe.className = "gemini-mobile-popup-iframe";
  // Make sure we have a valid URL for the popup
  const popupUrl = browser.runtime.getURL ?
    browser.runtime.getURL("popup/popup.html") :
    chrome.runtime.getURL ?
      chrome.runtime.getURL("popup/popup.html") :
      "popup/popup.html";
  iframe.src = popupUrl;

  content.appendChild(iframe);

  // Assemble the popup
  popupContainer.appendChild(header);
  popupContainer.appendChild(content);

  // Add to the page
  document.body.appendChild(popupContainer);

  // Mark as shown
  popupShown = true;
}

// Function to hide the mobile popup
function hideMobilePopup() {
  if (!popupShown || !popupContainer) {
    return;
  }

  console.log("Hiding mobile popup overlay");

  // Add hidden class first for animation
  popupContainer.classList.add("hidden");

  // Also hide the backdrop
  if (backdropElement) {
    backdropElement.classList.add("hidden");
  }

  // Remove after animation completes
  setTimeout(() => {
    // Remove popup container
    if (popupContainer && popupContainer.parentNode) {
      popupContainer.parentNode.removeChild(popupContainer);
    }

    // Remove backdrop
    if (backdropElement && backdropElement.parentNode) {
      backdropElement.parentNode.removeChild(backdropElement);
    }

    // Reset variables
    popupShown = false;
    popupContainer = null;
    backdropElement = null;
  }, 300);
}

// Listen for messages from background script or popup
browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "showMobilePopup" && isMobileDevice()) {
    showMobilePopup();
    sendResponse({ success: true });
    return true;
  } else if (message.action === "hideMobilePopup" && isMobileDevice()) {
    hideMobilePopup();
    sendResponse({ success: true });
    return true;
  }
});

// Listen for messages from the iframe
window.addEventListener("message", (event) => {
  if (event.data && event.data.action === "closePopup") {
    hideMobilePopup();
  }
});

// Initialize
console.log("Mobile popup overlay initialized");

// Initialize the mobile popup functionality
// The popup will be shown when the browser action is clicked
// This is handled by the background script
