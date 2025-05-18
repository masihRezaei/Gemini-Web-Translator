// Selected Text Translation Feature for Gemini Web Translator
console.log("Selected text translation handler loaded - Enhanced Version");

// Set up browser API with compatibility for Chrome and Firefox
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Load CSS file for styling
function loadStyles() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = browserAPI.runtime.getURL('styles/selection-translator.css');
  document.head.appendChild(link);
  console.log("Selection translator styles loaded");
}

// Variables to track state
let translationPopup = null;
let isTranslating = false;

// Initialize when the DOM is fully loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSelectionTranslator);
} else {
  initSelectionTranslator();
}

// Main initialization function
function initSelectionTranslator() {
  console.log("Initializing selection translator");

  // Load CSS styles
  loadStyles();

  // Create popup element
  createPopup();

  // Add event listeners
  document.addEventListener("mouseup", handleTextSelection);
  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("contextmenu", handleContextMenu);

  // Add click listener to close popup when clicking outside
  document.addEventListener("mousedown", (event) => {
    if (translationPopup && translationPopup.style.display === "block") {
      if (!translationPopup.contains(event.target)) {
        hidePopup();
      }
    }
  });

  // Show notification that the feature is active
  showNotification("Gemini Text Selection Translator is active", 5000);
}

// Create the translation popup
function createPopup() {
  // Create popup container
  translationPopup = document.createElement("div");
  translationPopup.id = "gemini-selection-translator";
  translationPopup.style.display = "none";

  // Create header
  const header = document.createElement("div");
  header.id = "gemini-selection-translator-header";

  // Create title with icon
  const title = document.createElement("div");
  title.id = "gemini-translation-title";
  title.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
    </svg>
    Gemini Translator
  `;

  // Create close button
  const closeBtn = document.createElement("div");
  closeBtn.id = "gemini-translation-close";
  closeBtn.textContent = "×";
  closeBtn.addEventListener("click", hidePopup);

  // Add title and close button to header
  header.appendChild(title);
  header.appendChild(closeBtn);

  // Create loading indicator
  const loading = document.createElement("div");
  loading.id = "gemini-translation-loading";
  loading.textContent = "Translating...";

  // Create content area
  const content = document.createElement("div");
  content.id = "gemini-translation-content";

  // Create copy button
  const copyBtn = document.createElement("button");
  copyBtn.id = "gemini-translation-copy";
  copyBtn.textContent = "Copy";
  copyBtn.addEventListener("click", () => {
    const text = content.textContent;
    navigator.clipboard.writeText(text).then(() => {
      copyBtn.textContent = "Copied!";
      setTimeout(() => {
        copyBtn.textContent = "Copy";
      }, 2000);
    });
  });

  // Add elements to popup
  translationPopup.appendChild(header);
  translationPopup.appendChild(loading);
  translationPopup.appendChild(content);
  translationPopup.appendChild(copyBtn);

  // Add popup to document
  document.body.appendChild(translationPopup);
}

// Handle text selection
function handleTextSelection(event) {
  // Get selected text
  const selection = window.getSelection();
  const text = selection.toString().trim();

  // If no text is selected or it's too short, do nothing
  if (!text || text.length < 3) {
    return;
  }

  // If text is too long, don't translate
  if (text.length > 1000) {
    showPopup(selection);
    updateContent("Selected text is too long (max 1000 characters)");
    return;
  }

  // Show popup and translate
  showPopup(selection);
  showLoading();
  translateText(text);
}

// Handle keyboard shortcuts
function handleKeyDown(event) {
  // Alt+T to translate selected text
  if (event.altKey && (event.key === 't' || event.key === 'T')) {
    const selection = window.getSelection();
    const text = selection.toString().trim();

    if (text) {
      event.preventDefault();
      showPopup(selection);
      showLoading();
      translateText(text);
    }
  }

  // Escape to close popup
  if (event.key === 'Escape' && translationPopup.style.display === 'block') {
    hidePopup();
  }
}

// Handle context menu
function handleContextMenu(event) {
  const selection = window.getSelection();
  const text = selection.toString().trim();

  // If no text is selected, return
  if (!text) {
    return;
  }

  // Create context menu item
  const menu = document.createElement('div');
  menu.className = 'gemini-context-menu';
  menu.style.left = event.pageX + 'px';
  menu.style.top = event.pageY + 'px';

  // Create menu item
  const item = document.createElement('div');
  item.className = 'gemini-context-menu-item';
  item.textContent = 'Translate with Gemini';

  // Add click handler
  item.addEventListener('click', () => {
    // Remove menu
    document.body.removeChild(menu);

    // Show popup and translate
    showPopup(selection);
    showLoading();
    translateText(text);
  });

  // Add item to menu
  menu.appendChild(item);
  document.body.appendChild(menu);

  // Close menu when clicking outside
  document.addEventListener('mousedown', function closeMenu(e) {
    if (!menu.contains(e.target)) {
      if (document.body.contains(menu)) {
        document.body.removeChild(menu);
      }
      document.removeEventListener('mousedown', closeMenu);
    }
  });

  // Prevent default context menu
  event.preventDefault();
}

// Show popup at selection
function showPopup(selection) {
  if (!translationPopup) return;

  // Get selection coordinates
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  // Position popup below selection
  const top = window.scrollY + rect.bottom + 10;
  const left = window.scrollX + rect.left;

  // Set position
  translationPopup.style.top = top + 'px';
  translationPopup.style.left = left + 'px';

  // Show popup
  translationPopup.style.display = 'block';
}

// Hide popup
function hidePopup() {
  if (translationPopup) {
    translationPopup.style.display = 'none';
  }
}

// Show loading indicator
function showLoading() {
  const loading = document.getElementById('gemini-translation-loading');
  const content = document.getElementById('gemini-translation-content');
  const copyBtn = document.getElementById('gemini-translation-copy');

  if (loading && content && copyBtn) {
    loading.style.display = 'block';
    content.textContent = '';
    copyBtn.style.display = 'none';
  }
}

// Show notification
function showNotification(message, duration = 5000) {
  // Check if there's already a notification
  const existingNotification = document.querySelector('.gemini-translator-notification');
  if (existingNotification) {
    existingNotification.remove();
  }

  // Create notification container
  const notification = document.createElement('div');
  notification.className = 'gemini-translator-notification';

  // Create content container with icon
  const contentContainer = document.createElement('div');
  contentContainer.className = 'gemini-translator-notification-content';

  // Add icon
  const icon = document.createElement('div');
  icon.className = 'gemini-translator-notification-icon';
  icon.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
    </svg>
  `;

  // Add message text
  const text = document.createElement('span');
  text.textContent = message;

  // Add close button
  const closeButton = document.createElement('button');
  closeButton.className = 'gemini-translator-notification-close';
  closeButton.innerHTML = '&times;';
  closeButton.addEventListener('click', () => {
    hideNotification(notification);
  });

  // Assemble notification
  contentContainer.appendChild(icon);
  contentContainer.appendChild(text);
  notification.appendChild(contentContainer);
  notification.appendChild(closeButton);

  // Add to document
  document.body.appendChild(notification);

  // Set timeout to hide notification
  if (duration > 0) {
    setTimeout(() => {
      hideNotification(notification);
    }, duration);
  }

  return notification;
}

// Hide notification with animation
function hideNotification(notification) {
  if (!notification || !document.body.contains(notification)) return;

  notification.classList.add('hiding');

  setTimeout(() => {
    if (document.body.contains(notification)) {
      document.body.removeChild(notification);
    }
  }, 500);
}

// Update content with translation
function updateContent(text, language) {
  const loading = document.getElementById('gemini-translation-loading');
  const content = document.getElementById('gemini-translation-content');
  const copyBtn = document.getElementById('gemini-translation-copy');
  const title = document.getElementById('gemini-translation-title');

  if (loading && content && copyBtn && title) {
    // Hide loading
    loading.style.display = 'none';

    // Update content
    content.textContent = text;

    // Update title if language is provided
    if (language) {
      title.textContent = `Translated to ${getLanguageName(language)}`;
    }

    // Show copy button for successful translations
    if (!text.startsWith('Error') && !text.includes('too long') && !text.includes('Please set')) {
      copyBtn.style.display = 'inline-block';
    }

    // Add RTL support for Arabic and Persian
    if (language === 'ar' || language === 'fa') {
      content.style.direction = 'rtl';
      content.style.textAlign = 'right';
      content.style.fontFamily = 'Tahoma, Arial, sans-serif';
    } else {
      content.style.direction = 'ltr';
      content.style.textAlign = 'left';
    }
  }
}

// Translate text
function translateText(text) {
  if (isTranslating) return;

  isTranslating = true;

  // Get translation settings from storage
  browserAPI.storage.local.get(['lastTargetLang', 'geminiApiKey', 'geminiModel'])
    .then(result => {
      if (!result.geminiApiKey) {
        updateContent('Please set your Gemini API key in the extension settings.');
        isTranslating = false;
        return;
      }

      const targetLanguage = result.lastTargetLang || 'en';
      const model = result.geminiModel || 'gemini-pro';

      // Create translation prompt
      const prompt = `Translate the following text to ${getLanguageName(targetLanguage)}. Return ONLY the translated text without any explanations or additional information:\n\n"${text}"`;

      // Call Gemini API
      callGeminiAPI(prompt, result.geminiApiKey, model)
        .then(translatedText => {
          // Clean up translated text
          const cleanedText = cleanTranslatedText(translatedText, targetLanguage);

          // Update popup with translation
          updateContent(cleanedText, targetLanguage);
          isTranslating = false;
        })
        .catch(error => {
          console.error('Translation error:', error);
          updateContent(`Error: ${error.message}`);
          isTranslating = false;
        });
    })
    .catch(error => {
      console.error('Error getting settings:', error);
      updateContent('Error getting translation settings.');
      isTranslating = false;
    });
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

// Helper function to clean up translated text
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

// Function to call the Gemini API
async function callGeminiAPI(prompt, apiKey, model = "gemini-pro") {
  // Map friendly names to API model names if needed
  const modelMap = {
    "Gemini 1.5 Flash": "gemini-1.5-flash",
    "Gemini Pro": "gemini-pro",
    "Gemini 1.0 Pro": "gemini-1.0-pro",
    "Gemini Pro Vision": "gemini-pro-vision",
    "Gemini 2.0 Flash": "gemini-2.0-flash",
    "Gemini 2.5 Flash Preview 04-17": "gemini-2.5-flash-preview-04-17",
    "Gemini 2.5 Pro Preview 03-25": "gemini-2.5-pro-preview-03-25",
  };

  const modelName = modelMap[model] || model;
  const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent`;

  // Optimize request data for faster processing
  const requestData = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 4096,
      topK: 1,
      topP: 0.95,
    },
  };

  try {
    // Make the API request
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
      throw new Error(errorMessage);
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
      throw new Error("Unexpected API response format");
    }
  } catch (error) {
    console.error("Gemini API error:", error);
    throw error;
  }
}
