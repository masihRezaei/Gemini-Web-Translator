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

browser.tabs.onUpdated.addListener((tabId, _changeInfo, tab) => {
  // Only show for http and https pages
  if (tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
    browser.pageAction.show(tabId);
  }
});

// This background script handles:
// - Handling API key validation
// - Caching translations
// - Managing user preferences
// - Handling notifications
// - Implementing context menu options
// - Showing page action in address bar
