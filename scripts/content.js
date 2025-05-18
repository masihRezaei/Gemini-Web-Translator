// --- Gemini Translator Content Script (Refactored & Optimized) ---
let preloadedCache = false;
let pageTranslated = false;
let currentUrl = window.location.href;
let currentDomain = extractDomain(currentUrl);
let lastCheckedUrl = currentUrl;
let urlChangeInterval = null;

console.log("Content script loaded on page:", currentUrl);
console.log("Current domain:", currentDomain);

// --- Utility Functions ---
function extractDomain(url) {
  try {
    return new URL(url).hostname;
  } catch (e) {
    console.error("Error extracting domain:", e);
    return "";
  }
}

function preloadCache() {
  if (preloadedCache) return;
  initializeCache().then(() => {
    preloadedCache = true;
    console.log("Translation cache preloaded for faster performance");
  });
}

// --- Auto Translation Logic ---
function checkForAutoTranslation() {
  console.log("Checking for auto-translation on domain:", currentDomain);
  pageTranslated = false;
  setTimeout(() => {
    const textNodes = document.body.querySelectorAll(
      "p, h1, h2, h3, h4, h5, h6, span, div, a, button, li"
    );
    if (textNodes.length < 5) {
      console.log(
        "Not enough content to translate yet, will retry in 1 second"
      );
      setTimeout(checkForAutoTranslation, 1000);
      return;
    }
    browser.storage.local
      .get(["domainTranslationSettings", "persistentTranslationEnabled"])
      .then((result) => {
        if (
          !(
            result.persistentTranslationEnabled &&
            result.domainTranslationSettings
          )
        )
          return;
        try {
          const domainSettings = JSON.parse(result.domainTranslationSettings);
          const settings = domainSettings[currentDomain];
          if (!settings)
            return console.log(
              "No translation settings found for domain:",
              currentDomain
            );
          translatePage(
            settings.targetLanguage,
            settings.apiKey,
            settings.model,
            settings.tone
          )
            .then(() => {
              console.log("Auto-translation completed successfully");
              pageTranslated = true;
            })
            .catch((error) => {
              console.error("Auto-translation failed:", error);
              pageTranslated = false;
              setTimeout(checkForAutoTranslation, 3000);
            });
        } catch (error) {
          console.error("Error parsing domain settings:", error);
        }
      })
      .catch((error) =>
        console.error("Error checking for auto-translation:", error)
      );
  }, 500);
}

// --- SPA/URL Change Detection ---
function startUrlChangeDetection() {
  // Clear any existing interval
  if (urlChangeInterval) {
    clearInterval(urlChangeInterval);
  }

  // Set up a MutationObserver to detect DOM changes that might indicate page navigation in SPAs
  const observer = new MutationObserver((mutations) => {
    // Check if significant DOM changes occurred (potential page navigation in SPA)
    let significantChanges = false;

    for (const mutation of mutations) {
      // Check for added nodes that might indicate page content changes
      if (mutation.addedNodes.length > 5) {
        significantChanges = true;
        break;
      }

      // Check for removed nodes that might indicate page content changes
      if (mutation.removedNodes.length > 5) {
        significantChanges = true;
        break;
      }
    }

    if (significantChanges) {
      console.log("Significant DOM changes detected - possible SPA navigation");

      // Only reset and check if we're on the same domain and URL has changed
      const newUrl = window.location.href;
      if (
        newUrl !== lastCheckedUrl &&
        extractDomain(newUrl) === currentDomain
      ) {
        // Update current URL and last checked URL
        currentUrl = newUrl;
        lastCheckedUrl = newUrl;

        // Reset translation state for the new content
        pageTranslated = false;

        // Force a check for auto-translation with a delay to let the page load
        setTimeout(() => {
          console.log(
            "Checking for auto-translation after significant DOM changes"
          );
          checkForAutoTranslation();
        }, 1000);
      }
    }
  });

  // Start observing the document with the configured parameters
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false,
  });

  // Also check for URL changes every 1000ms (1 second) as a fallback
  urlChangeInterval = setInterval(() => {
    const newUrl = window.location.href;

    // If URL has changed but domain is the same
    if (newUrl !== lastCheckedUrl) {
      console.log("URL changed from", lastCheckedUrl, "to", newUrl);

      // Update current URL and last checked URL
      currentUrl = newUrl;
      lastCheckedUrl = newUrl;

      // Reset translation state for the new page
      pageTranslated = false;

      // Force a check for auto-translation with a delay to let the page load
      setTimeout(() => {
        console.log("Checking for auto-translation after URL change");
        checkForAutoTranslation();
      }, 1000);
    }
  }, 1000);
}

function setupHistoryChangeDetection() {
  // Store original history methods
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  // Override pushState
  history.pushState = function () {
    // Call the original function first
    originalPushState.apply(this, arguments);

    // Then handle the URL change
    const newUrl = window.location.href;
    if (newUrl !== lastCheckedUrl) {
      console.log("History pushState detected, URL changed to:", newUrl);

      // Update URLs
      currentUrl = newUrl;
      lastCheckedUrl = newUrl;

      // Reset translation state
      pageTranslated = false;

      // Check for auto-translation with a delay to let the page render
      setTimeout(() => {
        console.log("Checking for auto-translation after history pushState");
        checkForAutoTranslation();
      }, 1000);
    }
  };

  // Override replaceState
  history.replaceState = function () {
    // Call the original function first
    originalReplaceState.apply(this, arguments);

    // Then handle the URL change
    const newUrl = window.location.href;
    if (newUrl !== lastCheckedUrl) {
      console.log("History replaceState detected, URL changed to:", newUrl);

      // Update URLs
      currentUrl = newUrl;
      lastCheckedUrl = newUrl;

      // Reset translation state
      pageTranslated = false;

      // Check for auto-translation with a delay to let the page render
      setTimeout(() => {
        console.log("Checking for auto-translation after history replaceState");
        checkForAutoTranslation();
      }, 1000);
    }
  };

  // Listen for popstate events (browser back/forward buttons)
  window.addEventListener("popstate", function () {
    const newUrl = window.location.href;
    if (newUrl !== lastCheckedUrl) {
      console.log("Popstate event detected, URL changed to:", newUrl);

      // Update URLs
      currentUrl = newUrl;
      lastCheckedUrl = newUrl;

      // Reset translation state
      pageTranslated = false;

      // Check for auto-translation with a delay to let the page render
      setTimeout(() => {
        console.log("Checking for auto-translation after popstate event");
        checkForAutoTranslation();
      }, 1000);
    }
  });
}

// --- Init ---
preloadCache();
setTimeout(() => {
  checkForAutoTranslation();
  startUrlChangeDetection();
  setupHistoryChangeDetection();
}, 1000);

// Function to detect URL changes and DOM mutations for SPA (Single Page Applications)
function startUrlChangeDetection() {
  // Clear any existing interval
  if (urlChangeInterval) {
    clearInterval(urlChangeInterval);
  }

  // Set up a MutationObserver to detect DOM changes that might indicate page navigation in SPAs
  const observer = new MutationObserver((mutations) => {
    // Check if significant DOM changes occurred (potential page navigation in SPA)
    let significantChanges = false;

    for (const mutation of mutations) {
      // Check for added nodes that might indicate page content changes
      if (mutation.addedNodes.length > 5) {
        significantChanges = true;
        break;
      }

      // Check for removed nodes that might indicate page content changes
      if (mutation.removedNodes.length > 5) {
        significantChanges = true;
        break;
      }
    }

    if (significantChanges) {
      console.log("Significant DOM changes detected - possible SPA navigation");

      // Only reset and check if we're on the same domain and URL has changed
      const newUrl = window.location.href;
      if (
        newUrl !== lastCheckedUrl &&
        extractDomain(newUrl) === currentDomain
      ) {
        // Update current URL and last checked URL
        currentUrl = newUrl;
        lastCheckedUrl = newUrl;

        // Reset translation state for the new content
        pageTranslated = false;

        // Force a check for auto-translation with a delay to let the page load
        setTimeout(() => {
          console.log(
            "Checking for auto-translation after significant DOM changes"
          );
          checkForAutoTranslation();
        }, 1000);
      }
    }
  });

  // Start observing the document with the configured parameters
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false,
  });

  // Also check for URL changes every 1000ms (1 second) as a fallback
  urlChangeInterval = setInterval(() => {
    const newUrl = window.location.href;

    // If URL has changed but domain is the same
    if (newUrl !== lastCheckedUrl) {
      console.log("URL changed from", lastCheckedUrl, "to", newUrl);

      // Update current URL and last checked URL
      currentUrl = newUrl;
      lastCheckedUrl = newUrl;

      // Reset translation state for the new page
      pageTranslated = false;

      // Force a check for auto-translation with a delay to let the page load
      setTimeout(() => {
        console.log("Checking for auto-translation after URL change");
        checkForAutoTranslation();
      }, 1000);
    }
  }, 1000);
}

// Preload cache when the page loads
preloadCache();

// Monitor history state changes (used by many SPAs for navigation)
function setupHistoryChangeDetection() {
  // Store original history methods
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  // Override pushState
  history.pushState = function () {
    // Call the original function first
    originalPushState.apply(this, arguments);

    // Then handle the URL change
    const newUrl = window.location.href;
    if (newUrl !== lastCheckedUrl) {
      console.log("History pushState detected, URL changed to:", newUrl);

      // Update URLs
      currentUrl = newUrl;
      lastCheckedUrl = newUrl;

      // Reset translation state
      pageTranslated = false;

      // Check for auto-translation with a delay to let the page render
      setTimeout(() => {
        console.log("Checking for auto-translation after history pushState");
        checkForAutoTranslation();
      }, 1000);
    }
  };

  // Override replaceState
  history.replaceState = function () {
    // Call the original function first
    originalReplaceState.apply(this, arguments);

    // Then handle the URL change
    const newUrl = window.location.href;
    if (newUrl !== lastCheckedUrl) {
      console.log("History replaceState detected, URL changed to:", newUrl);

      // Update URLs
      currentUrl = newUrl;
      lastCheckedUrl = newUrl;

      // Reset translation state
      pageTranslated = false;

      // Check for auto-translation with a delay to let the page render
      setTimeout(() => {
        console.log("Checking for auto-translation after history replaceState");
        checkForAutoTranslation();
      }, 1000);
    }
  };

  // Listen for popstate events (browser back/forward buttons)
  window.addEventListener("popstate", function () {
    const newUrl = window.location.href;
    if (newUrl !== lastCheckedUrl) {
      console.log("Popstate event detected, URL changed to:", newUrl);

      // Update URLs
      currentUrl = newUrl;
      lastCheckedUrl = newUrl;

      // Reset translation state
      pageTranslated = false;

      // Check for auto-translation with a delay to let the page render
      setTimeout(() => {
        console.log("Checking for auto-translation after popstate event");
        checkForAutoTranslation();
      }, 1000);
    }
  });
}

// Check for auto-translation after a short delay to ensure the page is fully loaded
setTimeout(() => {
  checkForAutoTranslation();

  // Start monitoring for URL and DOM changes (for SPAs)
  startUrlChangeDetection();

  // Set up history API monitoring
  setupHistoryChangeDetection();
}, 1000);

// Listen for messages from the popup or background script
browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log("Content script received message:", message.action);

  if (message.action === "translate") {
    // If the page is already translated, don't translate again
    if (pageTranslated) {
      console.log("Page already translated, skipping");
      sendResponse({ success: true, alreadyTranslated: true });
      return true;
    }

    console.log(
      "Starting translation with target language:",
      message.targetLanguage
    );

    // Ensure cache is loaded
    if (!preloadedCache) {
      preloadCache();
    }

    // Update the current URL and domain
    currentUrl = window.location.href;
    currentDomain = extractDomain(currentUrl);
    console.log("Updated current domain:", currentDomain);

    translatePage(
      message.targetLanguage,
      message.apiKey,
      message.model,
      message.tone
    )
      .then(() => {
        console.log("Translation completed successfully");

        // Mark this page as translated
        pageTranslated = true;

        // Notify the background script about the successful translation
        browser.runtime
          .sendMessage({
            action: "updateTranslationParams",
            targetLanguage: message.targetLanguage,
            apiKey: message.apiKey,
            model: message.model,
            tone: message.tone,
            domain: currentDomain,
          })
          .catch((error) => {
            console.error("Error updating translation parameters:", error);
          });

        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error("Translation failed:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Required for async sendResponse
  } else if (message.action === "checkDomainTranslation") {
    // Check if we should translate this page based on domain settings
    checkForAutoTranslation();
    sendResponse({ success: true });
    return true;
  } else if (message.action === "askQuestion") {
    console.log(
      "Received askQuestion action with model:",
      message.model,
      "and language:",
      message.responseLang
    );
    // Get page content to provide context for page-related questions
    const pageContent = getPageContent();
    console.log("Page content extracted, title:", pageContent.title);
    // Call askGemini which can now handle both page-specific and general questions
    askGemini(
      pageContent,
      message.question,
      message.apiKey,
      message.model,
      message.responseLang,
      message.tone
    )
      .then((answer) => {
        console.log("Got answer from Gemini API");
        sendResponse({ success: true, answer: answer });
      })
      .catch((error) => {
        console.error("Error in askQuestion:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Required for async sendResponse
  } else if (message.action === "translateText") {
    const targetLang = message.targetLanguage;
    const sourceLang = message.sourceLanguage || "auto";
    const prompt = `Translate the following text from ${getLanguageName(
      sourceLang
    )} to ${getLanguageName(
      targetLang
    )}. Return ONLY the translated text without any explanations or additional information:\n\n"${
      message.sourceText
    }"`;
    callGeminiAPI(prompt, message.apiKey, message.model)
      .then((translatedText) => {
        // Update popup with translation
        sendResponse({
          success: true,
          translatedText: cleanTranslatedText(translatedText, targetLang),
        });
        isTranslating = false;
      })
      .catch((error) => {
        sendResponse({
          success: false,
          error: error.message || error.toString(),
        });
        isTranslating = false;
      });
    return true; // Required for async sendResponse
  }
});

// Function to get the content of the page with optimized performance
function getPageContent() {
  // Get the title of the page
  const title = document.title;

  // Get meta description if available
  let metaDescription = "";
  const metaDescElement = document.querySelector('meta[name="description"]');
  if (metaDescElement) {
    metaDescription = metaDescElement.getAttribute("content");
  }

  // Get all text nodes and their parent elements with optimized filtering
  const textNodes = [];

  // Skip these tags completely for better performance
  const skipTags = new Set([
    "SCRIPT",
    "STYLE",
    "NOSCRIPT",
    "META",
    "LINK",
    "SVG",
    "PATH",
    "IFRAME",
  ]);

  // Use a more efficient TreeWalker configuration
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function (node) {
        // Skip empty text nodes or nodes with only whitespace (faster check)
        if (!node.nodeValue || !node.nodeValue.trim()) {
          return NodeFilter.FILTER_REJECT;
        }

        // Skip nodes in hidden elements
        const parent = node.parentNode;
        if (!parent || skipTags.has(parent.tagName)) {
          return NodeFilter.FILTER_REJECT;
        }

        // Skip elements that are not visible
        const style = window.getComputedStyle(parent);
        if (style.display === "none" || style.visibility === "hidden") {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  // Process nodes in batches for better performance
  let node;

  while ((node = walker.nextNode())) {
    textNodes.push({
      node: node,
      text: node.nodeValue.trim(),
      parentElement: node.parentNode,
    });
  }

  // Combine all the content for the API request
  const bodyText = textNodes.map((item) => item.text).join("\n");

  return {
    title: title,
    metaDescription: metaDescription,
    content: bodyText,
    textNodes: textNodes,
  };
}

// Function to add RTL support to the page for Persian/Arabic content
function addRTLSupport(targetLanguage) {
  if (targetLanguage === "fa" || targetLanguage === "ar") {
    // Add a style element to the head with RTL support
    const styleElement = document.createElement("style");
    styleElement.id = "gemini-translator-rtl-style";
    styleElement.textContent = `
      /* RTL support for Persian/Arabic text */
      [data-gemini-translated="true"] {
        font-family: 'Tahoma', 'Arial', sans-serif !important;
        direction: rtl !important;
        text-align: right !important;
        unicode-bidi: embed !important;
      }

      /* Fix for mixed content (English in Persian text) */
      [data-gemini-translated="true"] span.gemini-ltr {
        direction: ltr !important;
        display: inline-block !important;
        unicode-bidi: embed !important;
      }
    `;
    document.head.appendChild(styleElement);

    // Add RTL direction to the html or body element
    document.documentElement.setAttribute("dir", "rtl");
  }
}

// Function to remove RTL support when restoring original content
function removeRTLSupport() {
  // Remove the style element
  const styleElement = document.getElementById("gemini-translator-rtl-style");
  if (styleElement) {
    styleElement.remove();
  }

  // Remove RTL direction from the html element
  document.documentElement.removeAttribute("dir");

  // Remove data attributes from all elements
  const translatedElements = document.querySelectorAll(
    '[data-gemini-translated="true"]'
  );
  translatedElements.forEach((element) => {
    element.removeAttribute("data-gemini-translated");
  });
}

// Enhanced translation cache with persistent storage
const translationCache = new Map();
let cacheInitialized = false;

// Initialize cache from browser storage
async function initializeCache() {
  if (cacheInitialized) return;

  try {
    const result = await browser.storage.local.get("translationCache");
    if (result.translationCache) {
      const cachedEntries = JSON.parse(result.translationCache);
      for (const [key, value] of Object.entries(cachedEntries)) {
        translationCache.set(key, value);
      }
    }
    cacheInitialized = true;
  } catch (error) {
    console.error("Error initializing translation cache:", error);
  }
}

// Function to get cached translation or null if not found
async function getCachedTranslation(text, targetLanguage, model) {
  await initializeCache();
  const cacheKey = `${text}|${targetLanguage}|${model}`;
  return translationCache.get(cacheKey);
}

// Function to add translation to cache
function cacheTranslation(text, translation, targetLanguage, model) {
  const cacheKey = `${text}|${targetLanguage}|${model}`;
  translationCache.set(cacheKey, translation);

  // Debounced save to storage to avoid excessive writes
  if (!cacheTranslation.saveTimeout) {
    cacheTranslation.saveTimeout = setTimeout(() => {
      const cacheObject = {};
      translationCache.forEach((value, key) => {
        cacheObject[key] = value;
      });
      browser.storage.local.set({
        translationCache: JSON.stringify(cacheObject),
      });
      cacheTranslation.saveTimeout = null;
    }, 2000);
  }
}

// Function to translate the page using Gemini API
async function translatePage(
  targetLanguage,
  apiKey,
  model = "gemini-1.5-flash",
  tone = "neutral"
) {
  const pageContent = getPageContent();

  // Save original text nodes for restoration
  const originalTextNodes = pageContent.textNodes.map((item) => ({
    node: item.node,
    text: item.text,
  }));

  // Save original title
  const originalTitle = document.title;

  // Store original content for restoration
  browser.storage.local.set({
    originalTextNodes: JSON.stringify(
      originalTextNodes.map((item) => item.text)
    ),
    originalTitle: originalTitle,
  });

  // Store domain-specific translation settings for persistent translation
  storeDomainTranslationSettings(targetLanguage, apiKey, model, tone);

  // Add RTL support for Persian/Arabic
  if (targetLanguage === "fa" || targetLanguage === "ar") {
    addRTLSupport(targetLanguage);
  }

  // Function to store domain-specific translation settings
  async function storeDomainTranslationSettings(
    targetLanguage,
    apiKey,
    model,
    tone
  ) {
    try {
      // Get current domain settings
      const result = await browser.storage.local.get([
        "domainTranslationSettings",
      ]);
      let domainSettings = {};

      if (result.domainTranslationSettings) {
        domainSettings = JSON.parse(result.domainTranslationSettings);
      }

      // Update settings for current domain
      domainSettings[currentDomain] = {
        targetLanguage: targetLanguage,
        apiKey: apiKey,
        model: model,
        tone: tone,
        lastTranslated: new Date().toISOString(),
      };

      // Save updated settings
      await browser.storage.local.set({
        domainTranslationSettings: JSON.stringify(domainSettings),
      });

      // Get the current persistent translation setting instead of automatically enabling it
      const persistentSettings = await browser.storage.local.get([
        "persistentTranslationEnabled",
      ]);
      console.log(
        "Current persistent translation setting:",
        persistentSettings.persistentTranslationEnabled
      );

      console.log("Domain translation settings saved for:", currentDomain);
    } catch (error) {
      console.error("Error storing domain translation settings:", error);
    }
  }

  // First translate the title
  try {
    // Initialize cache at the beginning
    await initializeCache();

    // Check if title is cached
    const cachedTitle = await getCachedTranslation(
      pageContent.title,
      targetLanguage,
      model
    );
    let translatedTitle;

    if (cachedTitle) {
      translatedTitle = cachedTitle;
    } else {
      // Translate the title with optimized prompt
      let titlePrompt = `You are a professional translator. Translate to ${getLanguageName(
        targetLanguage
      )}: "${
        pageContent.title
      }". IMPORTANT: Provide ONLY the translated text without any explanations. Do not transliterate - translate the meaning.`;

      // Add tone instructions if a tone is selected
      if (tone && tone !== "neutral") {
        const toneInstructions = {
          casual: "Use a casual, friendly, and conversational tone.",
          formal: "Use a formal, professional, and polite tone.",
          simple: "Use simple, clear language that's easy to understand.",
          literary: "Use a literary, poetic, and expressive tone.",
        };

        if (toneInstructions[tone]) {
          titlePrompt += ` ${toneInstructions[tone]}`;
        }
      }

      translatedTitle = await callGeminiAPI(titlePrompt, apiKey, model);
      // Cache the translated title
      cacheTranslation(
        pageContent.title,
        translatedTitle,
        targetLanguage,
        model
      );
    }

    // Update the page title
    document.title = cleanTranslatedText(translatedTitle, targetLanguage);

    // Show translation in progress indicator
    const progressIndicator = document.createElement("div");
    progressIndicator.textContent =
      targetLanguage === "fa"
        ? "در حال ترجمه..."
        : "Translation in progress...";
    progressIndicator.style.position = "fixed";
    progressIndicator.style.top = "50%";
    progressIndicator.style.left = "50%";
    progressIndicator.style.transform = "translate(-50%, -50%)";
    progressIndicator.style.padding = "20px";
    progressIndicator.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
    progressIndicator.style.color = "white";
    progressIndicator.style.borderRadius = "10px";
    progressIndicator.style.zIndex = "10000";
    progressIndicator.id = "translation-progress";

    // Add RTL support for Persian
    if (targetLanguage === "fa") {
      progressIndicator.style.fontFamily = "Tahoma, Arial, sans-serif";
      progressIndicator.dir = "rtl";
    }

    document.body.appendChild(progressIndicator);

    // Translate text in larger chunks to speed up translation
    const chunkSize = 500; // افزایش سایز chunk برای سرعت بیشتر

    // Prepare all chunks for processing with priority for visible content
    const chunks = [];

    // Function to check if an element is in the viewport
    const isInViewport = (element) => {
      const rect = element.getBoundingClientRect();
      return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <=
          (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <=
          (window.innerWidth || document.documentElement.clientWidth)
      );
    };

    // Separate visible and non-visible content for prioritization
    const visibleNodes = [];
    const nonVisibleNodes = [];

    // Categorize nodes by visibility
    pageContent.textNodes.forEach((node) => {
      if (isInViewport(node.parentElement)) {
        visibleNodes.push(node);
      } else {
        nonVisibleNodes.push(node);
      }
    });

    // Process visible content first
    for (let i = 0; i < visibleNodes.length; i += chunkSize) {
      chunks.push(visibleNodes.slice(i, i + chunkSize));
    }

    // Then process non-visible content
    for (let i = 0; i < nonVisibleNodes.length; i += chunkSize) {
      chunks.push(nonVisibleNodes.slice(i, i + chunkSize));
    }

    // افزایش موازی‌سازی برای سرعت بیشتر
    const concurrencyLimit = 40; // افزایش تعداد chunkهای موازی برای سرعت بیشتر
    const chunkQueue = [...chunks];
    const activePromises = new Map();
    const results = [];

    // Function to update progress
    const updateProgress = () => {
      const progress = Math.min(
        ((chunks.length - chunkQueue.length) / chunks.length) * 100,
        100
      ).toFixed(0);
      if (targetLanguage === "fa") {
        progressIndicator.textContent = `در حال ترجمه... ${progress}٪ تکمیل شده`;
      } else {
        progressIndicator.textContent = `Translation in progress... ${progress}% complete`;
      }
    };

    // Process chunks with controlled concurrency
    while (chunkQueue.length > 0 || activePromises.size > 0) {
      while (chunkQueue.length > 0 && activePromises.size < concurrencyLimit) {
        const chunk = chunkQueue.shift();
        const chunkId = Math.random().toString(36).substring(2, 9);
        const chunkPromise = processChunk(
          chunk,
          targetLanguage,
          apiKey,
          model,
          tone
        ).then((result) => {
          activePromises.delete(chunkId);
          updateProgress();
          return result;
        });
        activePromises.set(chunkId, chunkPromise);
        results.push(chunkPromise);
      }
      if (activePromises.size > 0) {
        await Promise.race(Array.from(activePromises.values()));
      }
      updateProgress();
    }
    await Promise.all(results);

    // Remove progress indicator
    document.getElementById("translation-progress").remove();

    // Add a button to restore the original content
    const restoreButton = document.createElement("button");
    restoreButton.textContent =
      targetLanguage === "fa" ? "بازگرداندن متن اصلی" : "Restore Original";
    restoreButton.style.position = "fixed";
    restoreButton.style.lineHeight = "10px";
    restoreButton.style.top = "10px";
    restoreButton.style.right = "10px";
    restoreButton.style.zIndex = "9999";
    restoreButton.style.padding = "10px";
    restoreButton.style.backgroundColor = "#1a73e8";
    restoreButton.style.color = "white";
    restoreButton.style.border = "none";
    restoreButton.style.borderRadius = "4px";
    restoreButton.style.cursor = "pointer";

    // Add RTL support for Persian
    if (targetLanguage === "fa") {
      restoreButton.style.fontFamily = "Tahoma, Arial, sans-serif";
      restoreButton.dir = "rtl";
    }

    // Use a more reliable click handler with a flag to prevent multiple clicks
    let isRestoring = false;

    restoreButton.addEventListener("click", () => {
      // Prevent multiple clicks from causing issues
      if (isRestoring) {
        console.log("Restoration already in progress, please wait...");
        return;
      }

      isRestoring = true;
      console.log("Starting page restoration process...");

      // Restore original title
      browser.storage.local
        .get([
          "originalTextNodes",
          "originalTitle",
          "persistentTranslationEnabled",
          "domainTranslationSettings",
        ])
        .then((result) => {
          // If persistent translation is enabled, ask the user if they want to disable it
          if (result.persistentTranslationEnabled) {
            const disablePersistent = confirm(
              targetLanguage === "fa"
                ? "آیا می‌خواهید ترجمه خودکار را برای صفحات بعدی نیز غیرفعال کنید؟"
                : "Do you want to disable automatic translation for future pages as well?"
            );

            if (disablePersistent) {
              // Disable persistent translation globally
              browser.storage.local.set({
                persistentTranslationEnabled: false,
              });

              // Remove this domain from the domain settings
              if (result.domainTranslationSettings) {
                try {
                  const domainSettings = JSON.parse(
                    result.domainTranslationSettings
                  );
                  if (domainSettings[currentDomain]) {
                    delete domainSettings[currentDomain];
                    browser.storage.local.set({
                      domainTranslationSettings: JSON.stringify(domainSettings),
                    });
                    console.log(
                      "Removed translation settings for domain:",
                      currentDomain
                    );
                  }
                } catch (error) {
                  console.error(
                    "Error removing domain translation settings:",
                    error
                  );
                }
              }

              browser.runtime
                .sendMessage({
                  action: "setPersistentTranslation",
                  enabled: false,
                  domain: currentDomain,
                })
                .catch((error) => {
                  console.error(
                    "Error disabling persistent translation:",
                    error
                  );
                });
            }
          }

          // Reset the page translated flag
          pageTranslated = false;

          if (result.originalTitle) {
            document.title = result.originalTitle;
          }

          if (result.originalTextNodes) {
            const originalTexts = JSON.parse(result.originalTextNodes);

            // Remove RTL support
            removeRTLSupport();

            // Restore original text nodes
            const walker = document.createTreeWalker(
              document.body,
              NodeFilter.SHOW_TEXT,
              {
                acceptNode: function (node) {
                  if (node.nodeValue.trim() === "") {
                    return NodeFilter.FILTER_REJECT;
                  }
                  if (
                    node.parentNode.tagName === "SCRIPT" ||
                    node.parentNode.tagName === "STYLE" ||
                    node.parentNode.tagName === "NOSCRIPT"
                  ) {
                    return NodeFilter.FILTER_REJECT;
                  }
                  return NodeFilter.FILTER_ACCEPT;
                },
              }
            );

            let node;
            let i = 0;
            while ((node = walker.nextNode())) {
              if (i < originalTexts.length) {
                node.nodeValue = originalTexts[i];
                i++;
              }
            }

            // Remove any spans we created for RTL support
            const translatedSpans = document.querySelectorAll(
              'span[data-gemini-translated="true"]'
            );
            translatedSpans.forEach((span) => {
              // If we have the original text for this node, replace it
              if (i < originalTexts.length) {
                const textNode = document.createTextNode(originalTexts[i]);
                span.parentNode.replaceChild(textNode, span);
                i++;
              } else {
                // Otherwise just remove the span and keep its contents
                const textContent = span.textContent;
                const textNode = document.createTextNode(textContent);
                span.parentNode.replaceChild(textNode, span);
              }
            });

            // Remove the restore button
            restoreButton.remove();

            console.log("Page restored to original content");
          }

          // Reset the restoration flag
          isRestoring = false;
        })
        .catch((error) => {
          console.error("Error during page restoration:", error);
          // Reset the restoration flag even if there's an error
          isRestoring = false;
        });
    });

    document.body.appendChild(restoreButton);

    return true;
  } catch (error) {
    console.error("Translation error:", error);

    // Remove progress indicator if it exists
    const progressIndicator = document.getElementById("translation-progress");
    if (progressIndicator) {
      progressIndicator.remove();
    }

    throw error;
  }
}

// Helper function to process a chunk of text nodes with optimized performance
async function processChunk(
  chunk,
  targetLanguage,
  apiKey,
  model,
  tone = "neutral"
) {
  try {
    // Create a JSON structure for translation to maintain exact mapping
    const textsToTranslate = chunk.map((item, index) => ({
      id: index + 1,
      text: item.text,
      isEnglish: isEnglishText(item.text), // Use our improved English detection function
    }));

    // Filter out English texts if target language is English to avoid unnecessary translations
    // Also check cache for existing translations
    const textsNeedingTranslation = [];
    const cachedTranslations = [];

    // Process all texts in parallel for cache checking
    const cacheCheckPromises = textsToTranslate.map(async (item) => {
      // Skip English texts if target language is English
      if (targetLanguage === "en" && item.isEnglish) {
        return { id: item.id, cached: true, skip: true };
      }

      // Check cache
      const cachedTranslation = await getCachedTranslation(
        item.text,
        targetLanguage,
        model
      );
      if (cachedTranslation) {
        return { id: item.id, cached: true, text: cachedTranslation };
      } else {
        return { id: item.id, cached: false, item };
      }
    });

    // Wait for all cache checks to complete
    const cacheResults = await Promise.all(cacheCheckPromises);

    // Process cache results
    for (const result of cacheResults) {
      if (result.skip) continue;

      if (result.cached) {
        cachedTranslations.push({
          id: result.id,
          text: result.text,
        });
      } else {
        textsNeedingTranslation.push(
          textsToTranslate.find((item) => item.id === result.id)
        );
      }
    }

    // Apply cached translations immediately
    for (const item of cachedTranslations) {
      const originalIndex = item.id - 1;
      if (originalIndex >= 0 && originalIndex < chunk.length) {
        chunk[originalIndex].node.nodeValue = cleanTranslatedText(
          item.text,
          targetLanguage
        );
      }
    }

    // If no texts need translation, we're done with this chunk
    if (textsNeedingTranslation.length === 0) {
      return;
    }

    // Create an ultra-compact prompt for maximum speed
    let prompt = `You are a professional translator. Translate to ${getLanguageName(
      targetLanguage
    )}. IMPORTANT: Provide ONLY the translated text without any explanations. Do not transliterate - translate the meaning.`;

    // Add tone instructions if a tone is selected
    if (tone && tone !== "neutral") {
      const toneInstructions = {
        casual: "Use a casual, friendly, and conversational tone.",
        formal: "Use a formal, professional, and polite tone.",
        simple: "Use simple, clear language that's easy to understand.",
        literary: "Use a literary, poetic, and expressive tone.",
      };

      if (toneInstructions[tone]) {
        prompt += `. ${toneInstructions[tone]}`;
      }
    }

    prompt += `. Return only JSON array.
    ${JSON.stringify(textsNeedingTranslation)}`;

    // Always use the fastest model available for translation
    const fastModel = "gemini-1.5-flash";

    // Get translations with the fastest model for better speed
    const translatedTextsJson = await callGeminiAPI(prompt, apiKey, fastModel);

    // Try to parse the JSON response
    let translatedItems = [];

    // Extract JSON from the response (in case the API returns additional text)
    const jsonMatch =
      translatedTextsJson.match(/\[\s*\{.*\}\s*\]/s) ||
      translatedTextsJson.match(/\[\s*\{[\s\S]*\}\s*\]/g);

    if (jsonMatch) {
      translatedItems = JSON.parse(jsonMatch[0]);
    } else {
      // Try to parse the entire response as JSON
      try {
        translatedItems = JSON.parse(translatedTextsJson);
      } catch (e) {
        console.error("Failed to parse JSON response:", e);
        // Fallback to regex-based parsing
        const lines = translatedTextsJson.split("\n");
        for (let j = 0; j < textsNeedingTranslation.length; j++) {
          const id = textsNeedingTranslation[j].id;
          const lineRegex = new RegExp(
            `"id"\\s*:\\s*${id}\\s*,\\s*"text"\\s*:\\s*"([^"]*)"`
          );
          const matchingLine = lines.find((line) => lineRegex.test(line));

          if (matchingLine) {
            const match = matchingLine.match(lineRegex);
            if (match && match[1]) {
              translatedItems.push({
                id: id,
                text: match[1].replace(/\\"/g, '"'),
              });
            }
          }
        }
      }
    }

    // Update the text nodes with translations and cache them
    for (const translatedItem of translatedItems) {
      const originalIndex = translatedItem.id - 1;
      if (originalIndex >= 0 && originalIndex < chunk.length) {
        // Clean up the translated text before applying it
        const cleanedText = cleanTranslatedText(
          translatedItem.text,
          targetLanguage
        );

        // Get the parent element for RTL support
        const parentElement = chunk[originalIndex].parentElement;

        // Add RTL support for Persian/Arabic text
        if (targetLanguage === "fa" || targetLanguage === "ar") {
          // Mark the parent element as translated for RTL styling
          if (parentElement) {
            parentElement.setAttribute("data-gemini-translated", "true");

            // Handle mixed content (English words in Persian text)
            if (cleanedText.match(/[a-zA-Z0-9]+/)) {
              // If parent is not a text-only element, we can use a safer DOM approach
              if (parentElement.children.length > 0) {
                // Create a temporary span to hold the text
                const tempSpan = document.createElement("span");
                tempSpan.setAttribute("data-gemini-translated", "true");

                // Split the text by English words and create appropriate nodes
                const parts = cleanedText.split(/([a-zA-Z0-9]+)/);

                for (let i = 0; i < parts.length; i++) {
                  if (parts[i].match(/^[a-zA-Z0-9]+$/)) {
                    // This is an English word, create a span with LTR class
                    const ltrSpan = document.createElement("span");
                    ltrSpan.className = "gemini-ltr";
                    ltrSpan.textContent = parts[i];
                    tempSpan.appendChild(ltrSpan);
                  } else if (parts[i]) {
                    // This is non-English text, add as a text node
                    tempSpan.appendChild(document.createTextNode(parts[i]));
                  }
                }

                // Replace the text node with our new span
                chunk[originalIndex].node.parentNode.replaceChild(
                  tempSpan,
                  chunk[originalIndex].node
                );
                continue; // Skip the normal text node update
              }
            }
          }
        }

        // Normal update for non-RTL or simple text
        chunk[originalIndex].node.nodeValue = cleanedText;

        // Cache the translation
        const originalText = chunk[originalIndex].text;
        cacheTranslation(
          originalText,
          translatedItem.text,
          targetLanguage,
          model
        );
      }
    }

    // For English texts when target is English, keep them as is
    if (targetLanguage === "en") {
      for (const item of textsToTranslate) {
        if (item.isEnglish) {
          // Keep English text as is
          const originalIndex = item.id - 1;
          if (originalIndex >= 0 && originalIndex < chunk.length) {
            chunk[originalIndex].node.nodeValue = item.text;
          }
        }
      }
    }
  } catch (error) {
    console.error("Error processing chunk:", error);
    // We don't rethrow the error to allow other chunks to continue processing
  }
}

// Function to ask Gemini a question about the page or any general topic
async function askGemini(
  pageContent,
  question,
  apiKey,
  model = "gemini-pro",
  responseLang = "en",
  tone = "neutral"
) {
  // Extract the most relevant content from the page
  const contentExcerpt = pageContent.content.substring(0, 10000); // Increased limit for better context

  // Get language name for better instructions
  const languageName = getLanguageName(responseLang);

  // Create a more detailed prompt for Gemini to answer the question
  let prompt = `You are an AI assistant helping a user with their questions. You can answer questions about the current web page or any general topic.

  Web Page Information:
  Title: ${pageContent.title}
  Description: ${pageContent.metaDescription}

  Page Content (excerpt):
  ${contentExcerpt}

  User Question: ${question}

  Instructions:
  1. First, determine if the question is about the web page content or a general topic.
  2. If the question appears to be about the web page, answer based on the information provided in the web page content above.
  3. If the question is about a general topic not related to the web page, provide a helpful answer based on your knowledge.
  4. When answering general questions, use your full capabilities and knowledge to provide accurate information.
  5. Format your answer with proper paragraphs, bullet points, or numbered lists when appropriate.
  6. If the question is about code or technical content, format code examples properly.
  7. Provide a comprehensive but concise answer.
  8. IMPORTANT: Your response must be in ${languageName} language.`;

  // Add tone instructions based on the selected tone
  if (tone && tone !== "neutral") {
    const toneInstructions = {
      casual:
        "9. Use a casual, friendly, and conversational tone in your response. Be approachable and use informal language.",
      formal:
        "9. Use a formal, professional, and polite tone in your response. Maintain proper etiquette and use precise language.",
      simple:
        "9. Use simple, clear language that's easy to understand. Avoid complex terminology and explain concepts in straightforward terms.",
      literary:
        "9. Use a literary, poetic, and expressive tone in your response. Employ rich vocabulary and elegant phrasing.",
    };

    if (toneInstructions[tone]) {
      prompt += `\n  ${toneInstructions[tone]}`;
    }
  }

  prompt += `\n\n  Your answer:`;

  try {
    const answer = await callGeminiAPI(prompt, apiKey, model);
    return answer;
  } catch (error) {
    console.error("Question answering error:", error);
    throw error;
  }
}

// Cache for model name mapping to avoid repeated lookups
const modelNameCache = new Map();

// Function to call the Gemini API with optimized performance
async function callGeminiAPI(prompt, apiKey, model = "gemini-pro") {
  // Get model name from cache or map it
  let modelName = modelNameCache.get(model);

  if (!modelName) {
    // Map friendly names to API model names if needed
    const modelMap = {
      "Gemini 1.5 Flash": "gemini-1.5-flash",
      "Gemini Pro": "gemini-pro",
      "Gemini 1.0 Pro": "gemini-1.0-pro",
      "Gemini Pro Vision": "gemini-pro-vision",
      "Gemini 2.0 Flash": "gemini-2.0-flash", // Use actual model name
      "Gemini 2.5 Flash Preview 04-17": "gemini-2.5-flash-preview-04-17", // Use actual model name with date
      "Gemini 2.5 Pro Preview 03-25": "gemini-2.5-pro-preview-03-25", // Use actual model name with date
    };

    modelName = modelMap[model] || model;
    // Cache the model name mapping for future use
    modelNameCache.set(model, modelName);
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent`;

  // Optimize request data for faster processing
  const requestData = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1, // Lower temperature for more deterministic and faster responses
      maxOutputTokens: 4096,
      topK: 1, // Limit token selection for faster generation
      topP: 0.95, // Slightly more focused sampling for faster generation
    },
  };

  try {
    // Make the API request with optimized settings
    const response = await fetch(`${apiUrl}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.error?.message || response.statusText;

      // Check for specific error types and provide more helpful messages
      if (errorMessage.includes("quota")) {
        throw new Error(
          `Your API quota has been exhausted. Please check your Google AI Studio account and verify your quota status or try a different model.`
        );
      } else if (errorMessage.includes("not found")) {
        throw new Error(
          `The selected model (${modelName}) is not available for your API key. Please try a different model.`
        );
      } else if (errorMessage.includes("invalid")) {
        throw new Error(
          `Invalid API key. Please check your API key or create a new one.`
        );
      } else {
        throw new Error(`API Error: ${errorMessage}`);
      }
    }

    const data = await response.json();

    // Extract the text from the response
    if (
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts
    ) {
      return data.candidates[0].content.parts[0].text;
    } else {
      throw new Error(
        "Unexpected API response format. Please try again or try a different model."
      );
    }
  } catch (error) {
    console.error("Gemini API error:", error);
    throw error;
  }
}

// Helper function to get language name from code
function getLanguageName(langCode) {
  const languages = {
    en: "English",
    fa: "Persian (Farsi)",
    fr: "French",
    de: "German",
    es: "Spanish",
    ar: "Arabic",
    zh: "Chinese",
    ru: "Russian",
  };

  return languages[langCode] || langCode;
}

// Helper function to detect if text is primarily English
function isEnglishText(text) {
  if (!text || text.trim() === "") return true;

  // Count English characters vs. non-English characters
  const englishChars = text.match(/[a-zA-Z0-9\s\.,\?!;:'"\(\)\-]/g) || [];

  // If more than 70% of characters are English, consider it English text
  return englishChars.length > text.length * 0.7;
}

// Helper function to clean up translated text and fix formatting issues
function cleanTranslatedText(text, targetLanguage) {
  if (!text) return "";

  // Remove extra quotes that might be added by the API
  let cleaned = text.replace(/^["']|["']$/g, "");

  // Fix common formatting issues
  cleaned = cleaned.replace(/\\n/g, "\n");
  cleaned = cleaned.replace(/\\"/g, '"');
  cleaned = cleaned.replace(/\\'/g, "'");

  // Fix spacing issues that often occur in translations
  if (targetLanguage === "fa" || targetLanguage === "ar") {
    // For RTL languages, fix common spacing issues
    cleaned = cleaned.replace(/ ([،؛؟!])/g, "$1"); // Remove space before punctuation
    cleaned = cleaned.replace(/([،؛؟!])([^\s])/g, "$1 $2"); // Add space after punctuation if needed
  } else {
    // For LTR languages
    cleaned = cleaned.replace(/([.,;?!])([^\s])/g, "$1 $2"); // Add space after punctuation if needed
  }

  return cleaned;
}
