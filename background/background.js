// Background script for the Gemini Web Translator extension

// Listen for installation
browser.runtime.onInstalled.addListener(() => {
  console.log('Gemini Web Translator extension installed');

  // Show the page action for all tabs
  showPageActionForAllTabs();
});

// Show the page action icon in the address bar for all tabs
function showPageActionForAllTabs() {
  browser.tabs.query({}).then((tabs) => {
    for (let tab of tabs) {
      browser.pageAction.show(tab.id);
    }
  });
}

// Show the page action when a new tab is created or updated
browser.tabs.onCreated.addListener((tab) => {
  browser.pageAction.show(tab.id);
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only show for http and https pages
  if (tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
    browser.pageAction.show(tabId);

    // If the page has completed loading, check if we should auto-translate
    if (changeInfo.status === 'complete') {
      // Send a message to the content script to check for domain-specific translation
      browser.tabs.sendMessage(tabId, {
        action: 'checkDomainTranslation'
      }).catch(error => {
        // Ignore errors - content script might not be ready yet
        console.log('Content script not ready yet:', error);
      });
    }
  }
});

// Listen for messages from content scripts
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateTranslationParams') {
    console.log('Received translation parameters update:', message);

    // Store the translation parameters for future use
    browser.storage.local.get(['persistentTranslationEnabled']).then(result => {
      // Only update if persistent translation is enabled
      if (result.persistentTranslationEnabled) {
        console.log('Persistent translation is enabled, updating settings');
      }
    });

    sendResponse({ success: true });
    return true;
  }
  else if (message.action === 'setPersistentTranslation') {
    console.log('Setting persistent translation:', message.enabled);

    // Update the persistent translation setting
    browser.storage.local.set({ persistentTranslationEnabled: message.enabled });

    sendResponse({ success: true });
    return true;
  }
  else if (message.action === 'translatePage') {
    console.log('Received keyboard shortcut translation request');

    // Get the active tab
    browser.tabs.query({ active: true, currentWindow: true })
      .then(tabs => {
        if (!tabs || tabs.length === 0) {
          console.error('No active tab found');
          return;
        }

        // Send the translation message to the content script
        browser.tabs.sendMessage(tabs[0].id, {
          action: 'translate',
          targetLanguage: message.targetLanguage,
          apiKey: message.apiKey,
          model: message.model
        }).catch(error => {
          console.error('Error sending translation message to content script:', error);
        });
      })
      .catch(error => {
        console.error('Error querying tabs:', error);
      });

    sendResponse({ success: true });
    return true;
  }
  else if (message.action === 'updateKeyboardShortcut') {
    console.log('Updating keyboard shortcut settings:', message.shortcut);

    // Save the shortcut settings to storage
    browser.storage.local.set({
      keyboardShortcut: JSON.stringify(message.shortcut)
    }).then(() => {
      // Broadcast the update to all tabs
      browser.tabs.query({}).then(tabs => {
        for (let tab of tabs) {
          browser.tabs.sendMessage(tab.id, {
            action: 'updateKeyboardShortcut',
            shortcut: message.shortcut
          }).catch(() => {
            // Ignore errors - content script might not be loaded in all tabs
          });
        }
      });
    });

    sendResponse({ success: true });
    return true;
  }
});

// Function to detect if we're on a mobile device
function isMobileDevice() {
  // Check for mobile device using user agent only, not window size
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  const isMobile =
    /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
      userAgent.toLowerCase()
    );
  console.log("Background script detected mobile device:", isMobile);
  return isMobile;
}

// Handle browser action clicks
browser.browserAction.onClicked.addListener((tab) => {
  // If we're on mobile, show the mobile popup instead of opening a new page
  if (isMobileDevice()) {
    console.log('Browser action clicked on mobile device, showing mobile popup');
    browser.tabs.sendMessage(tab.id, {
      action: 'showMobilePopup'
    }).catch(error => {
      console.error('Error showing mobile popup:', error);
    });
  }
  // On desktop, the default popup will be shown automatically
});

// This background script handles:
// - Handling API key validation
// - Caching translations
// - Managing user preferences
// - Handling notifications
// - Implementing context menu options
// - Showing page action in address bar
// - Managing persistent translation across pages
// - Showing mobile popup on mobile devices
