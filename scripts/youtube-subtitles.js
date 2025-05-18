// YouTube Subtitles Translator
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Global state
const state = {
  apiKey: '',
  targetLanguage: 'fa',
  subtitleCache: {},
  lastSubtitleText: '',
  isEnabled: true,
  isTranslating: false,
  currentSubtitleElement: null,
  translationTone: 'neutral',
  subtitleTimers: {},
  currentSubtitleId: 0
};

// DOM elements
let translationDiv = null;
let subtitleElement = null;

// Load settings and initialize
browserAPI.storage.local.get([
  'geminiApiKey', 
  'lastTargetLang', 
  'youtubeSubtitlesEnabled',
  'videoTranslateTone'
], (result) => {
  state.apiKey = result.geminiApiKey || '';
  state.targetLanguage = result.lastTargetLang || 'fa';
  state.isEnabled = result.youtubeSubtitlesEnabled !== false;
  state.translationTone = result.videoTranslateTone || 'neutral';
  
  // Start monitoring YouTube
  if (window.location.hostname.includes('youtube.com')) {
    setupTranslator();
  }
});

/**
 * Sets up the subtitle translator UI and monitoring
 */
function setupTranslator() {
  createTranslationUI();
  loadCustomizationSettings();
  setupEventListeners();
  checkForVideoPage();
}

/**
 * Creates the translation UI elements
 */
function createTranslationUI() {
  // Create translation display container
  translationDiv = document.createElement('div');
  translationDiv.style.position = 'fixed';
  translationDiv.style.bottom = '120px';
  translationDiv.style.left = '0';
  translationDiv.style.width = '100%';
  translationDiv.style.textAlign = 'center';
  translationDiv.style.zIndex = '9999';
  translationDiv.style.pointerEvents = 'none';
  document.body.appendChild(translationDiv);
  
  // Create subtitle element
  subtitleElement = document.createElement('span');
  subtitleElement.style.backgroundColor = 'rgba(26, 115, 232, 0.8)';
  subtitleElement.style.color = 'white';
  subtitleElement.style.padding = '8px 12px';
  subtitleElement.style.borderRadius = '4px';
  subtitleElement.style.display = 'inline-block';
  subtitleElement.style.maxWidth = '80%';
  subtitleElement.style.fontSize = '16px';
  subtitleElement.style.lineHeight = '1.4';
  subtitleElement.style.fontFamily = 'Tahoma, Arial, sans-serif';
  subtitleElement.style.textShadow = '1px 1px 1px rgba(0, 0, 0, 0.5)';
  subtitleElement.dir = 'rtl';
  
  translationDiv.appendChild(subtitleElement);
}

/**
 * Loads customization settings for subtitles
 */
function loadCustomizationSettings() {
  browserAPI.storage.local.get([
    'subtitleFontSize',
    'subtitleBgColor',
    'subtitleTextColor',
    'subtitleOpacity'
  ], (result) => {
    applyCustomization({
      fontSize: result.subtitleFontSize,
      bgColor: result.subtitleBgColor,
      textColor: result.subtitleTextColor,
      opacity: result.subtitleOpacity
    });
  });
}

/**
 * Applies customization settings to subtitle element
 * @param {Object} settings - Customization settings
 */
function applyCustomization(settings) {
  if (!subtitleElement) return;
  
  if (settings.fontSize) subtitleElement.style.fontSize = settings.fontSize;
  if (settings.bgColor) subtitleElement.style.backgroundColor = settings.bgColor;
  if (settings.textColor) subtitleElement.style.color = settings.textColor;
  if (settings.opacity) subtitleElement.style.opacity = settings.opacity;
}

/**
 * Sets up event listeners for URL changes and extension messages
 */
function setupEventListeners() {
  // Check for URL changes
  let lastUrl = window.location.href;
  setInterval(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      resetSubtitleState();
      setTimeout(checkForVideoPage, 1000);
    }
  }, 1000);
  
  // Listen for messages from popup
  browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "updateYouTubeSubtitlesSettings") {
      handleSettingsUpdate(message);
      sendResponse({ success: true });
      return true;
    }
    
    if (message.action === "updateSubtitleCustomization") {
      handleCustomizationUpdate(message);
      sendResponse({ success: true });
      return true;
    }
  });
}

/**
 * Handles settings updates from the popup
 * @param {Object} message - Settings message
 */
function handleSettingsUpdate(message) {
  state.isEnabled = message.enabled;
  
  if (message.targetLanguage) {
    const languageChanged = message.targetLanguage !== state.targetLanguage;
    state.targetLanguage = message.targetLanguage;
    
    // Clear cache when language changes
    if (languageChanged) {
      state.subtitleCache = {};
    }
  }
  
  if (message.tone) state.translationTone = message.tone;
  
  // Hide subtitles if disabled
  if (!state.isEnabled) {
    translationDiv.style.display = 'none';
  }
}

/**
 * Handles customization updates from the popup
 * @param {Object} message - Customization message
 */
function handleCustomizationUpdate(message) {
  applyCustomization({
    fontSize: message.fontSize,
    bgColor: message.bgColor,
    textColor: message.textColor,
    opacity: message.opacity
  });
  
  // Save settings
  browserAPI.storage.local.set({
    subtitleFontSize: message.fontSize,
    subtitleBgColor: message.bgColor,
    subtitleTextColor: message.textColor,
    subtitleOpacity: message.opacity
  });
}

/**
 * Resets subtitle state when navigating to a new page
 */
function resetSubtitleState() {
  state.lastSubtitleText = '';
  state.currentSubtitleElement = null;
  state.currentSubtitleId = 0;
  
  // Clear all subtitle timers
  Object.keys(state.subtitleTimers).forEach(id => {
    clearTimeout(state.subtitleTimers[id]);
  });
  state.subtitleTimers = {};
}

/**
 * Checks if current page is a video page and starts monitoring
 */
function checkForVideoPage() {
  if (window.location.pathname.includes('/watch')) {
    startSubtitleMonitoring();
  } else {
    translationDiv.style.display = 'none';
  }
}

/**
 * Starts monitoring for subtitles
 */
function startSubtitleMonitoring() {
  setInterval(() => {
    if (!state.isEnabled) return;
    
    const ytSubtitleElement = document.querySelector('.ytp-caption-segment');
    if (!ytSubtitleElement) return;
    
    // If this is a new subtitle element, start observing it
    if (ytSubtitleElement !== state.currentSubtitleElement) {
      state.currentSubtitleElement = ytSubtitleElement;
      observeSubtitleElement(ytSubtitleElement);
    }
    
    const subtitleText = ytSubtitleElement.textContent.trim();
    if (!subtitleText) return;
    
    // If subtitle text hasn't changed, do nothing
    if (subtitleText === state.lastSubtitleText) return;
    
    processNewSubtitle(subtitleText);
  }, 100);
}

/**
 * Processes a new subtitle
 * @param {string} subtitleText - The subtitle text
 */
function processNewSubtitle(subtitleText) {
  state.lastSubtitleText = subtitleText;
  state.currentSubtitleId++;
  const thisSubtitleId = state.currentSubtitleId;
  
  // Check if we have this subtitle in cache
  if (state.subtitleCache[subtitleText]) {
    showTranslation(subtitleText, state.subtitleCache[subtitleText], thisSubtitleId);
    return;
  }
  
  // Translate the new text
  translateSubtitle(subtitleText, thisSubtitleId);
}

/**
 * Observes changes to a subtitle element
 * @param {Element} element - The subtitle element to observe
 */
function observeSubtitleElement(element) {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'characterData' || mutation.type === 'childList') {
        const subtitleText = element.textContent.trim();
        
        // If subtitle text hasn't changed, do nothing
        if (subtitleText === state.lastSubtitleText) return;
        
        processNewSubtitle(subtitleText);
      }
    });
  });
  
  // Start observing the subtitle element
  observer.observe(element, {
    characterData: true,
    childList: true,
    subtree: true
  });
}

/**
 * Translates a subtitle
 * @param {string} text - The subtitle text to translate
 * @param {number} subtitleId - The ID of the subtitle
 */
function translateSubtitle(text, subtitleId) {
  if (!state.apiKey || state.isTranslating) return;
  
  state.isTranslating = true;
  
  // Create translation prompt with tone
  let prompt = `Translate this YouTube subtitle to ${getLanguageName(state.targetLanguage)}`;
  
  // Add tone instructions if not neutral
  if (state.translationTone !== 'neutral') {
    const toneInstructions = {
      "casual": "Use a casual, friendly, and conversational tone.",
      "formal": "Use a formal, professional, and polite tone.",
      "simple": "Use simple, clear language that's easy to understand.",
      "literary": "Use a literary, poetic, and expressive tone."
    };
    
    if (toneInstructions[state.translationTone]) {
      prompt += `. ${toneInstructions[state.translationTone]}`;
    }
  }
  
  prompt += `. Return ONLY the translated text: "${text}"`;
  
  // Use AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);
  
  fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${state.apiKey}`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Priority': 'high'
    },
    signal: controller.signal,
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { 
        temperature: 0.1, 
        maxOutputTokens: 1024
      }
    })
  })
  .then(response => response.json())
  .then(data => {
    clearTimeout(timeoutId);
    if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
      // Get translated text
      let translatedText = data.candidates[0].content.parts[0].text;
      
      // Clean up text (remove quotes, etc.)
      translatedText = translatedText.replace(/^[\"']|[\"']$/g, '');
      
      // Cache the translation
      state.subtitleCache[text] = translatedText;
      
      // Only show if this is still the current subtitle or within 2 subtitles
      if (subtitleId >= state.currentSubtitleId - 2) {
        showTranslation(text, translatedText, subtitleId);
      }
    }
  })
  .catch(error => {
    if (error.name !== 'AbortError') {
      console.error('Translation error:', error);
    }
  })
  .finally(() => {
    state.isTranslating = false;
  });
}

/**
 * Shows a translation
 * @param {string} originalText - The original subtitle text
 * @param {string} translatedText - The translated text
 * @param {number} subtitleId - The ID of the subtitle
 */
function showTranslation(originalText, translatedText, subtitleId) {
  // Clear any existing timer for this subtitle
  if (state.subtitleTimers[subtitleId]) {
    clearTimeout(state.subtitleTimers[subtitleId]);
  }
  
  // Calculate display time based on text length (minimum 2 seconds, maximum 6 seconds)
  const displayTime = Math.min(Math.max(originalText.length * 80, 2000), 6000);
  
  // Show the translation
  subtitleElement.textContent = translatedText;
  translationDiv.style.display = 'block';
  
  // Set timer to hide this subtitle
  state.subtitleTimers[subtitleId] = setTimeout(() => {
    // Only hide if this is still the current subtitle
    if (subtitleId === state.currentSubtitleId) {
      translationDiv.style.display = 'none';
    }
    delete state.subtitleTimers[subtitleId];
  }, displayTime);
}

/**
 * Gets the language name from a language code
 * @param {string} langCode - The language code
 * @returns {string} The language name
 */
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