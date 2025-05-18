// Keyboard shortcuts handler for Gemini Web Translator
console.log("Keyboard shortcuts handler loaded");

// Default shortcut configuration
const DEFAULT_SHORTCUT = {
  key: "T",
  shift: true,
  ctrl: false,
  alt: false,
  enabled: true
};

// Variables to track shortcut state
let currentShortcut = DEFAULT_SHORTCUT;
let isMobileDevice = false;

// Function to check if the device is mobile
function checkIfMobile() {
  // Only use user agent for mobile detection, not window size
  const userAgent = navigator.userAgent || window.opera;
  const isMobileByAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent.toLowerCase());

  isMobileDevice = isMobileByAgent;
  console.log("Device is mobile (based on user agent only):", isMobileDevice);

  return isMobileDevice;
}

// Load shortcut settings from storage
function loadShortcutSettings() {
  browser.storage.local.get(["keyboardShortcut"])
    .then(result => {
      if (result.keyboardShortcut) {
        try {
          currentShortcut = JSON.parse(result.keyboardShortcut);
          console.log("Loaded keyboard shortcut settings:", currentShortcut);
        } catch (error) {
          console.error("Error parsing keyboard shortcut settings:", error);
          currentShortcut = DEFAULT_SHORTCUT;
        }
      } else {
        console.log("No keyboard shortcut settings found, using defaults");
        currentShortcut = DEFAULT_SHORTCUT;
      }
    })
    .catch(error => {
      console.error("Error loading keyboard shortcut settings:", error);
      currentShortcut = DEFAULT_SHORTCUT;
    });
}

// Function to handle keydown events
function handleKeyDown(event) {
  // Skip if on mobile device
  if (isMobileDevice) {
    return;
  }

  // Skip if shortcuts are disabled
  if (!currentShortcut.enabled) {
    return;
  }

  // Check if the pressed key matches our shortcut
  if (
    event.key.toUpperCase() === currentShortcut.key.toUpperCase() &&
    event.shiftKey === currentShortcut.shift &&
    event.ctrlKey === currentShortcut.ctrl &&
    event.altKey === currentShortcut.alt
  ) {
    // Prevent default behavior (like typing 'T' in an input field)
    event.preventDefault();

    console.log("Keyboard shortcut triggered: Translating page");

    // Get the target language from storage
    browser.storage.local.get(["lastTargetLang", "geminiApiKey", "geminiModel"])
      .then(result => {
        if (!result.geminiApiKey) {
          console.error("No API key found, cannot translate");
          // Show a notification to the user
          showNotification("Please set your Gemini API key in the extension settings first.");
          return;
        }

        const targetLanguage = result.lastTargetLang || "en";
        const model = result.geminiModel || "gemini-pro";

        // Send message to translate the page
        browser.runtime.sendMessage({
          action: "translatePage",
          targetLanguage: targetLanguage,
          apiKey: result.geminiApiKey,
          model: model
        }).catch(error => {
          console.error("Error sending translation message:", error);
        });
      })
      .catch(error => {
        console.error("Error getting translation settings:", error);
      });
  }
}

// Function to show a notification to the user
function showNotification(message) {
  // Create a notification element
  const notification = document.createElement("div");
  notification.className = "gemini-translator-notification";
  notification.textContent = message;

  // Style the notification
  notification.style.position = "fixed";
  notification.style.top = "20px";
  notification.style.right = "20px";
  notification.style.backgroundColor = "#2563eb";
  notification.style.color = "white";
  notification.style.padding = "10px 15px";
  notification.style.borderRadius = "5px";
  notification.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.2)";
  notification.style.zIndex = "9999";
  notification.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  notification.style.fontSize = "14px";

  // Add the notification to the page
  document.body.appendChild(notification);

  // Remove the notification after 3 seconds
  setTimeout(() => {
    notification.style.opacity = "0";
    notification.style.transition = "opacity 0.5s";
    setTimeout(() => {
      notification.remove();
    }, 500);
  }, 3000);
}

// Initialize
function init() {
  // Check if we're on a mobile device
  checkIfMobile();

  // Don't set up keyboard shortcuts on mobile
  if (isMobileDevice) {
    console.log("Mobile device detected, keyboard shortcuts disabled");
    return;
  }

  // Load shortcut settings
  loadShortcutSettings();

  // Add event listener for keydown
  document.addEventListener("keydown", handleKeyDown);

  // Listen for messages from popup to update shortcut settings
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "updateKeyboardShortcut") {
      console.log("Updating keyboard shortcut:", message.shortcut);
      currentShortcut = message.shortcut;
      sendResponse({ success: true });
    }
  });

  // Listen for window resize events to update mobile detection
  window.addEventListener("resize", checkIfMobile);
}

// Run initialization
init();
