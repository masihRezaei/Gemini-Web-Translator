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
  };
const browserAPI = typeof browser !== "undefined" ? browser : chrome;
// Function to detect if we're in a browser extension popup
function isExtensionPopup() {
  // Check if we're in a browser extension popup (small viewport)
  return window.innerWidth < 600 && window.innerHeight < 600;
}

// Function to optimize translation performance
function optimizeTranslationPerformance() {
  // Use a more efficient model for translations
  browser.storage.local.get(["geminiModel"]).then((result) => {
    // If no model is set or it's not a flash model, use a flash model
    if (!result.geminiModel || !result.geminiModel.includes("flash")) {
      console.log("Optimizing translation performance by using a flash model");

      // Determine the best model to use based on what's available
      // Prefer newer models for better performance
      const bestModel = "gemini-2.0-flash";

      // Set the model to a flash model for better performance
      browser.storage.local.set({ geminiModel: bestModel });

      // Update the UI if the model selector exists
      const modelSelector = document.getElementById("ai-model");
      if (modelSelector) {
        modelSelector.value = bestModel;
      }
    }
  });
}

// Function to detect if we're on a mobile device
function isMobileDevice() {
  // Check for mobile device using user agent only, not window size
  const userAgent = navigator.userAgent || window.opera;
  const isMobile =
    /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
      userAgent.toLowerCase()
    );
  console.log("Popup detected mobile device:", isMobile);
  return isMobile;
}

document.addEventListener("DOMContentLoaded", function () {
  // Optimize translation performance
  optimizeTranslationPerformance();

  // Set appropriate classes based on device detection
  const container = document.getElementById("translatePopup");

  if (isExtensionPopup()) {
    // We're in a browser extension popup
    container.classList.remove("mobile-view");
    container.classList.add("extension-popup");
  } else if (isMobileDevice()) {
    console.log(container.classList);
    // We're on a mobile device
    container.classList.remove("extension-popup");
    container.classList.add("mobile-view");
  }

  // Handle window resize events
  window.addEventListener("resize", function () {
    if (isExtensionPopup()) {
      container.classList.add("extension-popup");
      container.classList.remove("mobile-view");
    } else if (isMobileDevice()) {
      container.classList.add("mobile-view");
      container.classList.remove("extension-popup");
    }
  });

  // Initialize Ask AI functionality
  initializeAskAI();

  // Close button functionality
  const closeButton = document.getElementById("closeBtn");
  if (closeButton) {
    closeButton.addEventListener("click", () => {
      // Check if we're in a mobile popup iframe
      const isMobilePopup = window.self !== window.top && isMobileDevice();

      if (isMobilePopup) {
        // We're in an iframe inside the mobile popup
        // Send a message to the parent window to close the popup
        window.parent.postMessage({ action: "closePopup" }, "*");
      } else {
        // We're in a regular popup window
        window.close();
      }
    });
  }

  // Translate page button in header
  const translatePageBtn = document.getElementById("translatePageBtn");
  if (translatePageBtn) {
    translatePageBtn.addEventListener("click", () => {
      const container = document.getElementById("translatePopup");
      const pageTranslationMode = document.getElementById(
        "pageTranslationMode"
      );
      const textTranslationMode = document.getElementById(
        "textTranslationMode"
      );

      // Toggle simple mode class
      container.classList.toggle("simple-mode");

      // Update button title based on current state
      if (container.classList.contains("simple-mode")) {
        // Make sure the page translation mode is visible
        if (pageTranslationMode) {
          pageTranslationMode.classList.remove("hidden");
        }

        // Hide text translation mode
        if (textTranslationMode) {
          textTranslationMode.classList.add("hidden");
        }

        // Update source and target language names in the page translation text
        const sourceLanguageName =
          document.getElementById("sourceLanguageName");
        const targetLanguageName =
          document.getElementById("targetLanguageName");
        const sourceLang = document.getElementById("sourceLang").value;
        const targetLang = document.getElementById("targetLang").value;

        if (sourceLanguageName && targetLanguageName) {
          sourceLanguageName.textContent = getLanguageName(sourceLang);
          targetLanguageName.textContent = getLanguageName(targetLang);
        }
      } else {
        // Restore normal view - show text translation mode and hide page translation mode
        if (textTranslationMode) {
          textTranslationMode.classList.remove("hidden");
        }

        if (pageTranslationMode) {
          pageTranslationMode.classList.add("hidden");
        }
      }
    });
  }

  // Add event listener for the translate page button inside the page translation mode
  const translatePageButton = document.getElementById("translate-page-button");
  if (translatePageButton) {
    translatePageButton.addEventListener("click", () => {
      // Get the API key and model
      browser.storage.local
        .get(["geminiApiKey", "geminiModel", "translationTone"])
        .then((result) => {
          if (!result.geminiApiKey) {
            alert("Please set your Gemini API key in the settings first.");
            return;
          }

          // Get the target language
          const targetLang = document.getElementById("targetLang").value;
          const tone = result.translationTone || "neutral";

          // Send message to translate the current page
          browser.tabs
            .query({ active: true, currentWindow: true })
            .then((tabs) => {
              if (tabs.length === 0) {
                alert("Could not connect to the current tab.");
                return;
              }

              browser.tabs
                .sendMessage(tabs[0].id, {
                  action: "translate",
                  targetLanguage: targetLang,
                  apiKey: result.geminiApiKey,
                  model: result.geminiModel || "gemini-1.5-flash",
                  tone: tone,
                })
                .catch((error) => {
                  console.error("Error sending translation message:", error);
                  alert(
                    "Error: Could not send translation request to the page."
                  );
                });
            });
        });
    });
  }

  // Language swap button functionality
  const swapLanguagesBtn = document.getElementById("switchLangs");
  const sourceLanguageSelect = document.getElementById("sourceLang");
  const targetLanguageSelect = document.getElementById("targetLang");

  swapLanguagesBtn.addEventListener("click", () => {
    // Don't swap if source is auto-detect
    if (sourceLanguageSelect.value === "auto") {
      return;
    }

    // Get current values
    const sourceValue = sourceLanguageSelect.value;
    const targetValue = targetLanguageSelect.value;

    // Swap values
    sourceLanguageSelect.value = targetValue;
    targetLanguageSelect.value = sourceValue;

    // Save the swapped language selections
    browser.storage.local.set({
      lastSourceLang: targetValue,
      lastTargetLang: sourceValue,
    });
    console.log("Languages swapped and saved:", targetValue, sourceValue);

    // Add animation effect
    swapLanguagesBtn.classList.add("rotate");
    setTimeout(() => {
      swapLanguagesBtn.classList.remove("rotate");
    }, 500);
  });

  // Tab functionality
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".section");

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      // Remove active class from all buttons and hide all contents
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      tabContents.forEach((content) => content.classList.add("hidden"));

      // Add active class to clicked button and show corresponding content
      button.classList.add("active");
      const tabId = button.getAttribute("data-tab");
      const activeContent = document.getElementById(tabId);
      if (activeContent) {
        activeContent.classList.remove("hidden");
      }
    });
  });

  // Load saved settings
  const apiKeyInput = document.getElementById("apiKeyInput");
  const aiModelSelect = document.getElementById("ai-model");
  const modelSelect = aiModelSelect; // Use the same model selector
  const sourceLangSelect = document.getElementById("sourceLang");
  const targetLangSelect = document.getElementById("targetLang");

  // Load all saved settings
  browser.storage.local
    .get([
      "geminiApiKey",
      "geminiModel",
      "lastSourceLang",
      "lastTargetLang",
      "persistentTranslationEnabled",
      "keyboardShortcut",
      "translationTone",
      "aiTone",
    ])
    .then((result) => {
      if (result.geminiApiKey) {
        apiKeyInput.value = result.geminiApiKey;
        console.log("API key loaded from storage");
      } else {
        console.log("No API key found in storage");
        // Show a message to the user
        document.getElementById("api-key-status").textContent =
          "Please enter your Gemini API key and save settings before using the extension.";
        document.getElementById("api-key-status").className = "status error";
      }

      // Set default model if none is saved
      const defaultModel = "gemini-1.5-flash";
      const savedModel = result.geminiModel || defaultModel;

      // Set the model in both selects
      modelSelect.value = savedModel;
      console.log("Model set to:", savedModel);

      // Also set the AI model select to match
      if (aiModelSelect) {
        aiModelSelect.value = savedModel;
      }

      // Save the default model if none was saved before
      if (!result.geminiModel) {
        browser.storage.local.set({ geminiModel: defaultModel });
      }

      // Set source language if saved
      if (result.lastSourceLang && sourceLangSelect) {
        sourceLangSelect.value = result.lastSourceLang;
        console.log("Source language set to:", result.lastSourceLang);
      }

      // Set target language if saved
      if (result.lastTargetLang && targetLangSelect) {
        targetLangSelect.value = result.lastTargetLang;
        console.log("Target language set to:", result.lastTargetLang);
      }

      // Set translation tone if saved
      const translationToneSelect = document.getElementById("translationTone");
      if (result.translationTone && translationToneSelect) {
        translationToneSelect.value = result.translationTone;
        console.log("Translation tone set to:", result.translationTone);
      }

      // Set AI tone if saved
      const aiToneSelect = document.getElementById("aiTone");
      if (result.aiTone && aiToneSelect) {
        aiToneSelect.value = result.aiTone;
        console.log("AI tone set to:", result.aiTone);
      }

      // Load keyboard shortcut settings
      if (result.keyboardShortcut) {
        try {
          const shortcutSettings = JSON.parse(result.keyboardShortcut);
          console.log("Keyboard shortcut settings loaded:", shortcutSettings);

          // Update UI with saved shortcut settings
          const enableShortcutsCheckbox =
            document.getElementById("enableShortcuts");
          const shortcutShiftCheckbox =
            document.getElementById("shortcutShift");
          const shortcutCtrlCheckbox = document.getElementById("shortcutCtrl");
          const shortcutAltCheckbox = document.getElementById("shortcutAlt");
          const shortcutKeyInput = document.getElementById("shortcutKey");

          if (enableShortcutsCheckbox)
            enableShortcutsCheckbox.checked = shortcutSettings.enabled;
          if (shortcutShiftCheckbox)
            shortcutShiftCheckbox.checked = shortcutSettings.shift;
          if (shortcutCtrlCheckbox)
            shortcutCtrlCheckbox.checked = shortcutSettings.ctrl;
          if (shortcutAltCheckbox)
            shortcutAltCheckbox.checked = shortcutSettings.alt;
          if (shortcutKeyInput) shortcutKeyInput.value = shortcutSettings.key;
        } catch (error) {
          console.error("Error parsing keyboard shortcut settings:", error);
        }
      }

      // Make sure the keyboard shortcuts section is visible (regardless of window size)
      const keyboardShortcutsSection = document.getElementById(
        "keyboardShortcutsSection"
      );
      if (keyboardShortcutsSection) {
        // Only hide on actual mobile devices, not small windows
        if (isMobileDevice()) {
          keyboardShortcutsSection.style.display = "none";
        } else {
          keyboardShortcutsSection.style.display = "block";
        }
      }
    });

  // Save settings
  document.getElementById("saveApiKey").addEventListener("click", () => {
    const apiKey = apiKeyInput.value.trim();
    const selectedModel = modelSelect.value;

    if (apiKey) {
      browser.storage.local
        .set({
          geminiApiKey: apiKey,
          geminiModel: selectedModel,
        })
        .then(() => {
          // Update the AI model select to match
          if (aiModelSelect) {
            aiModelSelect.value = selectedModel;
          }

          const statusElement = document.getElementById("api-key-status");
          statusElement.textContent = "Settings saved successfully!";
          statusElement.className = "status success";

          setTimeout(() => {
            statusElement.textContent = "";
            statusElement.className = "status";
          }, 3000);
        });
    } else {
      const statusElement = document.getElementById("api-key-status");
      statusElement.textContent = "Please enter a valid API key";
      statusElement.className = "status error";

      setTimeout(() => {
        statusElement.textContent = "";
        statusElement.className = "status";
      }, 3000);
    }
  });

  // Save language selections when they change
  if (sourceLangSelect) {
    sourceLangSelect.addEventListener("change", () => {
      browser.storage.local.set({ lastSourceLang: sourceLangSelect.value });
      console.log("Source language saved:", sourceLangSelect.value);

      // If we're in text translation mode, retranslate with the new language
      const sourceText = document.getElementById("sourceText");
      if (sourceText && sourceText.value.trim() !== "") {
        translateText();
      }
    });
  }

  if (targetLangSelect) {
    targetLangSelect.addEventListener("change", () => {
      browser.storage.local.set({ lastTargetLang: targetLangSelect.value });
      console.log("Target language saved:", targetLangSelect.value);

      // If we're in text translation mode, retranslate with the new language
      const sourceText = document.getElementById("sourceText");
      if (sourceText && sourceText.value.trim() !== "") {
        translateText();
      }
    });
  }

  // Save AI model selection when it changes
  if (aiModelSelect) {
    aiModelSelect.addEventListener("change", () => {
      browser.storage.local.set({ geminiModel: aiModelSelect.value });
      console.log("AI model saved:", aiModelSelect.value);
    });
  }

  // Save translation tone selection when it changes
  const translationToneSelect = document.getElementById("translationTone");
  if (translationToneSelect) {
    translationToneSelect.addEventListener("change", () => {
      browser.storage.local.set({
        translationTone: translationToneSelect.value,
      });
      console.log("Translation tone saved:", translationToneSelect.value);

      // If we're in text translation mode, retranslate with the new tone
      const sourceText = document.getElementById("sourceText");
      if (sourceText && sourceText.value.trim() !== "") {
        translateText();
      }
    });
  }

  // Save AI tone selection when it changes
  const aiToneSelect = document.getElementById("aiTone");
  if (aiToneSelect) {
    aiToneSelect.addEventListener("change", () => {
      browser.storage.local.set({ aiTone: aiToneSelect.value });
      console.log("AI tone saved:", aiToneSelect.value);
    });
  }

  // Handle keyboard shortcut settings
  const saveShortcutButton = document.getElementById("saveShortcut");
  if (saveShortcutButton) {
    saveShortcutButton.addEventListener("click", () => {
      const enableShortcuts =
        document.getElementById("enableShortcuts").checked;
      const shortcutShift = document.getElementById("shortcutShift").checked;
      const shortcutCtrl = document.getElementById("shortcutCtrl").checked;
      const shortcutAlt = document.getElementById("shortcutAlt").checked;
      const shortcutKey = document
        .getElementById("shortcutKey")
        .value.toUpperCase();

      // Validate the key input
      if (!shortcutKey || shortcutKey.length !== 1) {
        const statusElement = document.getElementById("shortcut-status");
        statusElement.textContent =
          "Please enter a valid key (single character)";
        statusElement.className = "shortcut-status error";

        setTimeout(() => {
          statusElement.textContent = "";
          statusElement.className = "shortcut-status";
        }, 3000);

        return;
      }

      // Create the shortcut object
      const shortcutSettings = {
        enabled: enableShortcuts,
        shift: shortcutShift,
        ctrl: shortcutCtrl,
        alt: shortcutAlt,
        key: shortcutKey,
      };

      // Save the shortcut settings
      browser.runtime
        .sendMessage({
          action: "updateKeyboardShortcut",
          shortcut: shortcutSettings,
        })
        .then(() => {
          const statusElement = document.getElementById("shortcut-status");
          statusElement.textContent = "Keyboard shortcut saved!";
          statusElement.className = "shortcut-status";

          setTimeout(() => {
            statusElement.textContent = "";
          }, 3000);
        })
        .catch((error) => {
          console.error("Error saving keyboard shortcut:", error);

          const statusElement = document.getElementById("shortcut-status");
          statusElement.textContent = "Error saving shortcut: " + error.message;
          statusElement.className = "shortcut-status error";

          setTimeout(() => {
            statusElement.textContent = "";
            statusElement.className = "shortcut-status";
          }, 3000);
        });
    });
  }

  // Handle shortcut key input validation
  const shortcutKeyInput = document.getElementById("shortcutKey");
  if (shortcutKeyInput) {
    shortcutKeyInput.addEventListener("input", () => {
      // Force uppercase and limit to 1 character
      shortcutKeyInput.value = shortcutKeyInput.value.toUpperCase().slice(0, 1);
    });
  }

  // Handle enable/disable shortcuts checkbox
  const enableShortcutsCheckbox = document.getElementById("enableShortcuts");
  if (enableShortcutsCheckbox) {
    enableShortcutsCheckbox.addEventListener("change", () => {
      const shortcutControls = document.querySelectorAll(
        ".shortcut-key-container input, .shortcut-key-container button"
      );

      // Enable/disable the shortcut controls based on checkbox state
      shortcutControls.forEach((control) => {
        control.disabled = !enableShortcutsCheckbox.checked;
      });
    });

    // Initialize state on page load
    const shortcutControls = document.querySelectorAll(
      ".shortcut-key-container input, .shortcut-key-container button"
    );
    shortcutControls.forEach((control) => {
      control.disabled = !enableShortcutsCheckbox.checked;
    });
  }

  // Helper function to get language name
  function getLanguageName(langCode) {
    const languages = {
      auto: "Auto-detect",
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
});
// Function to initialize Ask AI functionality
function initializeAskAI() {
  const questionForm = document.getElementById("questionForm");
  const questionInput = document.getElementById("questionInput");
  const sendBtn = document.getElementById("sendBtn");
  const conversationBox = document.getElementById("conversationBox");
  const aiResponseLang = document.getElementById("aiResponseLang");
  const aiTone = document.getElementById("aiTone");
  const clearConversationBtn = document.getElementById("clearConversation");
  const aiModelSelect = document.getElementById("ai-model");

  // Enable/disable send button based on input
  if (questionInput) {
    questionInput.addEventListener("input", () => {
      sendBtn.disabled = questionInput.value.trim() === "";
    });
  }

  // Handle form submission
  if (questionForm) {
    questionForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const question = questionInput.value.trim();
      if (!question) return;

      // Get API key and model
      browser.storage.local
        .get(["geminiApiKey", "geminiModel"])
        .then((result) => {
          if (!result.geminiApiKey) {
            // Show error if no API key is set
            addMessageToConversation(
              "Please set your Gemini API key in the settings first.",
              "error"
            );
            return;
          }

          // Add user question to conversation
          addMessageToConversation(question, "user");

          // Clear input
          questionInput.value = "";
          sendBtn.disabled = true;

          // Add loading indicator
          const loadingId = addLoadingIndicator();

          // Get the selected model and response language
          const selectedModel = aiModelSelect
            ? aiModelSelect.value
            : result.geminiModel;
          const responseLang = aiResponseLang ? aiResponseLang.value : "en";
          const tone = aiTone ? aiTone.value : "neutral";

          // Send message to content script to ask Gemini
          browser.tabs
            .query({ active: true, currentWindow: true })
            .then((tabs) => {
              if (tabs.length === 0) {
                removeLoadingIndicator(loadingId);
                addMessageToConversation(
                  "Error: Could not connect to the current tab.",
                  "error"
                );
                return;
              }

              browser.tabs
                .sendMessage(tabs[0].id, {
                  action: "askQuestion",
                  question: question,
                  apiKey: result.geminiApiKey,
                  model: selectedModel,
                  responseLang: responseLang,
                  tone: tone,
                })
                .then((response) => {
                  removeLoadingIndicator(loadingId);

                  if (response.success) {
                    addMessageToConversation(response.answer, "ai");
                  } else {
                    addMessageToConversation(
                      `Error: ${response.error || "Unknown error"}`,
                      "error"
                    );
                  }
                })
                .catch((error) => {
                  removeLoadingIndicator(loadingId);
                  addMessageToConversation(
                    `Error: ${
                      error.message || "Could not connect to the page."
                    }`,
                    "error"
                  );
                });
            });
        });
    });
  }

  // Clear conversation
  if (clearConversationBtn) {
    clearConversationBtn.addEventListener("click", () => {
      conversationBox.innerHTML = `
        <div class="empty-conversation">
          Ask any question to start a conversation
        </div>
      `;
    });
  }

  // Function to add a message to the conversation
  function addMessageToConversation(message, type) {
    // Remove empty conversation placeholder if present
    const emptyConversation = conversationBox.querySelector(
      ".empty-conversation"
    );
    if (emptyConversation) {
      emptyConversation.remove();
    }

    const messageElement = document.createElement("div");
    messageElement.className = `message ${type}-message`;

    if (type === "ai" || type === "error") {
      // For AI responses, preserve formatting
      message = message.replace(/\n/g, "<br>");

      // Format code blocks
      message = message.replace(
        /```([a-z]*)\n([\s\S]*?)\n```/g,
        '<pre class="code-block"><code>$2</code></pre>'
      );

      // Format inline code
      message = message.replace(
        /`([^`]+)`/g,
        '<code class="inline-code">$1</code>'
      );

      messageElement.innerHTML = message;
    } else {
      // For user messages, use textContent for security
      messageElement.textContent = message;
    }

    conversationBox.appendChild(messageElement);

    // Scroll to the bottom
    conversationBox.scrollTop = conversationBox.scrollHeight;
  }

  // Function to add a loading indicator
  function addLoadingIndicator() {
    const loadingId = "loading-" + Date.now();
    const loadingElement = document.createElement("div");
    loadingElement.className = "message ai-message loading";
    loadingElement.id = loadingId;
    loadingElement.innerHTML = `
      <div class="loading-dots">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </div>
    `;
    conversationBox.appendChild(loadingElement);
    conversationBox.scrollTop = conversationBox.scrollHeight;
    return loadingId;
  }

  // Function to remove loading indicator
  function removeLoadingIndicator(loadingId) {
    const loadingElement = document.getElementById(loadingId);
    if (loadingElement) {
      loadingElement.remove();
    }
  }
}

// Function to call the Gemini API directly from the popup
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

  const requestData = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 2048,
      topK: 40,
      topP: 0.95,
    },
  };

  try {
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

// Add event listener for source text input to enable real-time translation
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM content loaded, initializing translation functionality");

  const sourceText = document.getElementById("sourceText");
  const clearTextBtn = document.getElementById("clear-text");
  const copyTextBtn = document.getElementById("copy-text");

  if (sourceText) {
    // Add debounce to avoid too many API calls
    let debounceTimer;
    sourceText.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        // Auto-translate on input
        translateText();
        console.log("Translating text:", sourceText.value);
      }, 500); // Reduced to 500ms for faster response
    });
  }

  // Clear text button functionality
  if (clearTextBtn) {
    clearTextBtn.addEventListener("click", () => {
      if (sourceText) {
        sourceText.value = "";
        document.getElementById("translatedText").value = "";
      }
    });
  }

  // Copy text button functionality
  if (copyTextBtn) {
    copyTextBtn.addEventListener("click", () => {
      const translatedText = document.getElementById("translatedText");
      if (translatedText) {
        // Use modern Clipboard API if available
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(translatedText.value)
            .then(() => {
              // Show feedback
              const originalText = copyTextBtn.innerHTML;
              copyTextBtn.innerHTML = '<span class="material-icons">check</span>';
              setTimeout(() => {
                copyTextBtn.innerHTML = originalText;
              }, 2000);
            })
            .catch(err => {
              console.error('Could not copy text: ', err);
              // Fallback to old method if clipboard API fails
              translatedText.select();
              document.execCommand("copy");
            });
        } else {
          // Fallback for browsers that don't support Clipboard API
          translatedText.select();
          document.execCommand("copy");

          // Show feedback
          const originalText = copyTextBtn.innerHTML;
          copyTextBtn.innerHTML = '<span class="material-icons">check</span>';
          setTimeout(() => {
            copyTextBtn.innerHTML = originalText;
          }, 2000);
        }
      }
    });
  }
});
// Override the translateText function to use the direct translation
function translateText() {
  // Get the text to translate
  const sourceText = document.getElementById("sourceText").value.trim();
  const translatedTextArea = document.getElementById("translatedText");

  if (!sourceText) {
    if (translatedTextArea) translatedTextArea.value = "";
    return;
  }

  console.log("Starting translation process");

  // Show loading indicator with animation
  if (translatedTextArea) {
    translatedTextArea.value = "Translating...";
    translatedTextArea.classList.add("translating");
  }

  browser.storage.local
    .get(["geminiApiKey", "geminiModel", "translationTone"])
    .then((result) => {
      if (!result.geminiApiKey) {
        if (translatedTextArea) {
          translatedTextArea.value = "Error: Please set your Gemini API key in the settings first.";
          translatedTextArea.classList.remove("translating");
          translatedTextArea.classList.add("error");

          // Remove error class after 3 seconds
          setTimeout(() => {
            translatedTextArea.classList.remove("error");
          }, 3000);
        }
        return;
      }

      // Get the source and target languages
      const targetLang = document.getElementById("targetLang").value;
      const sourceLang = document.getElementById("sourceLang").value;
      const tone = result.translationTone || "neutral";

      // Use the most efficient model available
      const model = result.geminiModel || "gemini-2.0-flash";

      // Send message to translate the current page
      browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
        if (tabs.length === 0) {
          if (translatedTextArea) {
            translatedTextArea.value = "Error: Could not connect to the current tab.";
            translatedTextArea.classList.remove("translating");
            translatedTextArea.classList.add("error");

            // Remove error class after 3 seconds
            setTimeout(() => {
              translatedTextArea.classList.remove("error");
            }, 3000);
          }
          return;
        }

        browser.tabs
          .sendMessage(tabs[0].id, {
            action: "translateText",
            targetLanguage: targetLang,
            sourceLanguage: sourceLang,
            apiKey: result.geminiApiKey,
            model: model,
            sourceText: sourceText,
            tone: tone,
          })
          .then((response) => {
            if (translatedTextArea) {
              translatedTextArea.classList.remove("translating");

              if (response && response.success && response.translatedText) {
                translatedTextArea.value = response.translatedText;
                translatedTextArea.classList.add("success");

                // Remove success class after 1 second
                setTimeout(() => {
                  translatedTextArea.classList.remove("success");
                }, 1000);
              } else if (response && response.error) {
                translatedTextArea.value = `Error: ${response.error}`;
                translatedTextArea.classList.add("error");

                // Remove error class after 3 seconds
                setTimeout(() => {
                  translatedTextArea.classList.remove("error");
                }, 3000);
              } else {
                translatedTextArea.value = "Error: Translation failed.";
                translatedTextArea.classList.add("error");

                // Remove error class after 3 seconds
                setTimeout(() => {
                  translatedTextArea.classList.remove("error");
                }, 3000);
              }
            }
          })
          .catch((error) => {
            console.error("Error sending translation message:", error);

            if (translatedTextArea) {
              translatedTextArea.value = "Error: Could not send translation request to the page.";
              translatedTextArea.classList.remove("translating");
              translatedTextArea.classList.add("error");

              // Remove error class after 3 seconds
              setTimeout(() => {
                translatedTextArea.classList.remove("error");
              }, 3000);
            }
          });
      });
    })
    .catch((error) => {
      console.error("Error getting settings:", error);

      if (translatedTextArea) {
        translatedTextArea.value = "Error: Could not load translation settings.";
        translatedTextArea.classList.remove("translating");
        translatedTextArea.classList.add("error");

        // Remove error class after 3 seconds
        setTimeout(() => {
          translatedTextArea.classList.remove("error");
        }, 3000);
      }
    });
}
