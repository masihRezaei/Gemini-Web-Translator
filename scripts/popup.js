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

// Function to detect if we're in a browser extension popup
function isExtensionPopup() {
  // Check if we're in a browser extension popup (small viewport)
  return window.innerWidth < 600 && window.innerHeight < 600;
}

// Function to detect if we're on a mobile device
function isMobileDevice() {
  // Check for mobile device using user agent
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
    userAgent.toLowerCase()
  );
}

document.addEventListener("DOMContentLoaded", function () {
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

  // Close button functionality
  const closeButton = document.getElementById("closeBtn");
  if (closeButton) {
    closeButton.addEventListener("click", () => {
      window.close(); // Close the popup window
    });
  }

  // Toggle page translation mode button
  const togglePageTranslationBtn = document.getElementById("togglePageTranslation");
  if (togglePageTranslationBtn) {
    togglePageTranslationBtn.addEventListener("click", () => {
      const container = document.getElementById("translatePopup");
      const pageTranslationMode = document.getElementById("pageTranslationMode");
      const textTranslationMode = document.getElementById("textTranslationMode");

      // Toggle simple mode class
      container.classList.toggle("simple-mode");

      // Update button title based on current state
      if (container.classList.contains("simple-mode")) {
        togglePageTranslationBtn.title = "Show full interface";

        // Make sure the page translation mode is visible
        if (pageTranslationMode) {
          pageTranslationMode.classList.remove("hidden");
        }

        // Hide text translation mode
        if (textTranslationMode) {
          textTranslationMode.classList.add("hidden");
        }

        // Update source and target language names in the page translation text
        const sourceLanguageName = document.getElementById("sourceLanguageName");
        const targetLanguageName = document.getElementById("targetLanguageName");
        const sourceLang = document.getElementById("sourceLang").value;
        const targetLang = document.getElementById("targetLang").value;

        if (sourceLanguageName && targetLanguageName) {
          sourceLanguageName.textContent = getLanguageName(sourceLang);
          targetLanguageName.textContent = getLanguageName(targetLang);
        }
      } else {
        togglePageTranslationBtn.title = "Enable page translation";

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

  // Translate page button in header
  const translatePageBtn = document.getElementById("translatePageBtn");
  if (translatePageBtn) {
    translatePageBtn.addEventListener("click", () => {
      // Enable simple mode
      const container = document.getElementById("translatePopup");
      const togglePageTranslationBtn = document.getElementById("togglePageTranslation");

      // If not already in simple mode, switch to it
      if (!container.classList.contains("simple-mode") && togglePageTranslationBtn) {
        togglePageTranslationBtn.click();
      } else {
        // If already in simple mode, just make sure the page translation mode is visible
        const pageTranslationMode = document.getElementById("pageTranslationMode");
        if (pageTranslationMode) {
          pageTranslationMode.classList.remove("hidden");
        }
      }

      // Show the translate page section
      const tabButtons = document.querySelectorAll(".tab-btn");
      const tabContents = document.querySelectorAll(".section");

      // Remove active class from all buttons and hide all contents
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      tabContents.forEach((content) => content.classList.add("hidden"));

      // Activate the translation tab
      const translateButton = document.querySelector(
        '[data-tab="translationSection"]'
      );
      if (translateButton) {
        translateButton.classList.add("active");
      }

      const translationSection = document.getElementById("translationSection");
      if (translationSection) {
        translationSection.classList.remove("hidden");
      }

      // Get the target language and save it
      const targetLanguage = document.getElementById("targetLang").value;
      browser.storage.local.set({ lastTargetLang: targetLanguage });
      console.log("Target language saved from header button:", targetLanguage);

      // Trigger the translate page button
      const translatePageButton = document.getElementById(
        "translate-page-button"
      );
      if (translatePageButton) {
        translatePageButton.click();
      }
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
      lastTargetLang: sourceValue
    });
    console.log("Languages swapped and saved:", targetValue, sourceValue);

    // Add animation effect
    swapLanguagesBtn.classList.add("rotate");
    setTimeout(() => {
      swapLanguagesBtn.classList.remove("rotate");
    }, 500);
  });

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
  browser.storage.local.get([
    "geminiApiKey",
    "geminiModel",
    "lastSourceLang",
    "lastTargetLang"
  ]).then((result) => {
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
    });
  }

  if (targetLangSelect) {
    targetLangSelect.addEventListener("change", () => {
      browser.storage.local.set({ lastTargetLang: targetLangSelect.value });
      console.log("Target language saved:", targetLangSelect.value);
    });
  }

  // Save AI model selection when it changes
  if (aiModelSelect) {
    aiModelSelect.addEventListener("change", () => {
      browser.storage.local.set({ geminiModel: aiModelSelect.value });
      console.log("AI model saved:", aiModelSelect.value);
    });
  }

  // Function to translate text
  function translateText() {
    const inputText = document.getElementById("sourceText").value.trim();
    const sourceLanguage = document.getElementById("sourceLang").value;
    const targetLanguage = document.getElementById("targetLang").value;
    const outputText = document.getElementById("translatedText");

    // Save the language selections
    browser.storage.local.set({
      lastSourceLang: sourceLanguage,
      lastTargetLang: targetLanguage
    });
    console.log("Languages saved from text translation:", sourceLanguage, targetLanguage);

    if (!inputText) {
      outputText.textContent = "Translation will appear here";
      return;
    }

    // Check if API key is available
    browser.storage.local
      .get(["geminiApiKey", "geminiModel"])
      .then((result) => {
        if (!result.geminiApiKey) {
          outputText.value = "Please enter your Gemini API key first.";
          return;
        }

        outputText.value = "Translating...";

        // Create a prompt for translation
        let prompt = `Translate the following text`;

        if (sourceLanguage !== "auto") {
          prompt += ` from ${getLanguageName(sourceLanguage)}`;
        }

        prompt += ` to ${getLanguageName(
          targetLanguage
        )}. Return ONLY the translated text without any explanations, options, or additional information:\n\n"${inputText}"`;

        // Call the Gemini API directly
        // Make sure model name is in the correct format
        let modelName = result.geminiModel || "gemini-pro";

        // Map friendly names to API model names if needed
        const modelMap = {
          "Gemini 1.5 Flash": "gemini-1.5-flash",
          "Gemini Pro": "gemini-pro",
          "Gemini 1.0 Pro": "gemini-1.0-pro",
          "Gemini Pro Vision": "gemini-pro-vision",
          "Gemini 2.0 Flash": "gemini-1.5-flash", // Fallback to 1.5 Flash
          "Gemini 2.5 Pro Preview 03-25": "gemini-pro", // Fallback to Pro
          "Gemini 2.5 Flash Preview 04-17": "gemini-1.5-flash", // Fallback to 1.5 Flash
        };

        if (modelMap[modelName]) {
          modelName = modelMap[modelName];
          console.log(
            `Mapped model name from ${result.geminiModel} to ${modelName}`
          );
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent`;
        console.log(`Using Gemini model for translation: ${modelName}`);

        fetch(`${apiUrl}?key=${result.geminiApiKey}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 1024,
            },
          }),
        })
          .then((response) => {
            console.log("API response status:", response.status);
            if (!response.ok) {
              return response.json().then((errorData) => {
                const errorMessage =
                  errorData.error?.message || response.statusText;
                throw new Error(errorMessage);
              });
            }
            return response.json();
          })
          .then((data) => {
            console.log(
              "API response data:",
              JSON.stringify(data).substring(0, 200) + "..."
            );

            if (
              data.candidates &&
              data.candidates[0] &&
              data.candidates[0].content &&
              data.candidates[0].content.parts &&
              data.candidates[0].content.parts[0]
            ) {
              let translation = data.candidates[0].content.parts[0].text;

              // Clean up the translation (remove quotes, asterisks, and other formatting)
              translation = translation.replace(/^["']|["']$/g, ""); // Remove quotes
              translation = translation.replace(/\*\*(.*?)\*\*/g, "$1"); // Remove bold formatting
              translation = translation.replace(/\*(.*?)\*/g, "$1"); // Remove italic formatting
              translation = translation.replace(/Option \d+.*?:/g, ""); // Remove option labels
              translation = translation.replace(
                /^(Here's|The) (translation|translated).*?:/i,
                ""
              ); // Remove intro phrases
              translation = translation.trim();

              outputText.value = translation;
            } else if (data.error) {
              // Handle API error
              outputText.value = "Translation failed: " + data.error.message;
              console.error("API error:", data.error);
            } else {
              console.error("Unexpected API response format:", data);
              outputText.value =
                "Translation failed. Please try again with a different model.";
            }
          })
          .catch((error) => {
            console.error("Translation error:", error);

            // Check for specific error types
            if (error.message.includes("quota")) {
              outputText.value =
                "Error: API quota exceeded. Please try a different model or check your API key.";
            } else if (error.message.includes("not found")) {
              outputText.value =
                "Error: Selected model not available. Please try a different model.";
            } else if (error.message.includes("invalid")) {
              outputText.value =
                "Error: Invalid API key. Please check your API key.";
            } else {
              outputText.value = "Error: " + error.message;
            }
          });
      });
  }

  // Add input event listener for auto-translation
  const inputTextArea = document.getElementById("sourceText");
  let translationTimeout;

  inputTextArea.addEventListener("input", () => {
    // Clear previous timeout
    clearTimeout(translationTimeout);

    // Set a new timeout to translate after 1 second of inactivity
    translationTimeout = setTimeout(translateText, 1000);
  });

  // Add clear text functionality
  document.getElementById("clear-text").addEventListener("click", () => {
    document.getElementById("sourceText").value = "";
    document.getElementById("translatedText").value =
      "Translation will appear here";
  });

  // Add copy text functionality
  document.getElementById("copy-text").addEventListener("click", () => {
    const text = document.getElementById("translatedText").value;
    if (
      text &&
      text !== "Translation will appear here" &&
      text !== "Translating..."
    ) {
      navigator.clipboard.writeText(text).then(() => {
        // Show a temporary "Copied!" message
        const outputArea = document.querySelector(".textarea-container");
        const notification = document.createElement("div");
        notification.className = "copy-notification";
        notification.textContent = "Copied!";
        outputArea.appendChild(notification);

        setTimeout(() => {
          notification.remove();
        }, 2000);
      });
    }
  });

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

  // Translate page button click handler
  document
    .getElementById("translate-page-button")
    .addEventListener("click", () => {
      const targetLanguage = document.getElementById("targetLang").value;

      // Save the target language selection
      browser.storage.local.set({ lastTargetLang: targetLanguage });
      console.log("Target language saved for page translation:", targetLanguage);

      // If we're in simple mode, make sure the page translation mode is visible
      const container = document.getElementById("translatePopup");
      if (container && container.classList.contains("simple-mode")) {
        const pageTranslationMode = document.getElementById("pageTranslationMode");
        if (pageTranslationMode) {
          pageTranslationMode.classList.remove("hidden");
        }
      }

      // Check if API key is available
      browser.storage.local
        .get(["geminiApiKey", "geminiModel"])
        .then((result) => {
          if (!result.geminiApiKey) {
            alert(
              "Please enter your Gemini API key first in the settings tab."
            );
            return;
          }

          // Send message to content script to get page content
          browser.tabs
            .query({ active: true, currentWindow: true })
            .then((tabs) => {
              if (!tabs || tabs.length === 0) {
                alert("No active tab found. Please try again.");
                return;
              }

              browser.tabs
                .sendMessage(tabs[0].id, {
                  action: "translate",
                  targetLanguage: targetLanguage,
                  apiKey: result.geminiApiKey,
                  model: result.geminiModel || "gemini-pro", // Default to gemini-pro if not set
                })

                .catch((error) => {
                  alert("Translation failed: " + error.message);
                });
            });
        });
    });

  // Ask question button click handler
  const questionForm = document.getElementById("questionForm");
  if (questionForm) {
    questionForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const questionInput = document.getElementById("questionInput");
      const question = questionInput.value.trim();
      if (!question) {
        return;
      }

      // Get the selected AI model
      const selectedAiModel = document.getElementById("ai-model").value;
      console.log("Selected AI model:", selectedAiModel);

      // Check if API key is available
      browser.storage.local
        .get(["geminiApiKey", "geminiModel"])
        .then((result) => {
          if (!result.geminiApiKey) {
            // Show error in conversation box
            const conversationBox = document.getElementById("conversationBox");

            // Clear any existing messages
            if (conversationBox.querySelector(".empty-conversation")) {
              conversationBox.innerHTML = "";
            }

            // Add error message
            const errorMessageDiv = document.createElement("div");
            errorMessageDiv.className = "message ai-message";
            errorMessageDiv.textContent =
              "Please enter your Gemini API key first in the settings tab.";
            conversationBox.appendChild(errorMessageDiv);
            return;
          }

          // Add user message to conversation
          const conversationBox = document.getElementById("conversationBox");

          // Check if the conversation box has the default empty message
          if (conversationBox.querySelector(".empty-conversation")) {
            // Clear the empty conversation message
            conversationBox.innerHTML = "";
          }

          // Add new message to existing conversation
          const userMessageDiv = document.createElement("div");
          userMessageDiv.className = "message user-message";
          userMessageDiv.textContent = question;
          conversationBox.appendChild(userMessageDiv);

          const aiMessageDiv = document.createElement("div");
          aiMessageDiv.className = "message ai-message";
          aiMessageDiv.textContent = "Thinking...";
          conversationBox.appendChild(aiMessageDiv);

          // Scroll to the bottom of the conversation
          conversationBox.scrollTop = conversationBox.scrollHeight;

          // Clear the input
          questionInput.value = "";

          // Send message to content script to get page content and ask question
          browser.tabs
            .query({ active: true, currentWindow: true })
            .then((tabs) => {
              if (!tabs || tabs.length === 0) {
                const aiMessage = conversationBox.querySelector(".ai-message");
                aiMessage.textContent =
                  "No active tab found. Please try again.";
                return;
              }

              browser.tabs
                .sendMessage(tabs[0].id, {
                  action: "askQuestion",
                  question: question,
                  apiKey: result.geminiApiKey,
                  model: selectedAiModel || result.geminiModel || "gemini-pro", // Use selected model, fallback to saved model, then default
                })
                .then((response) => {
                  // Get the last AI message (the "Thinking..." message)
                  const aiMessages =
                    conversationBox.querySelectorAll(".ai-message");
                  const lastAiMessage = aiMessages[aiMessages.length - 1];

                  if (response && response.success) {
                    lastAiMessage.textContent = response.answer;
                    console.log(
                      "Answer received:",
                      response.answer.substring(0, 50) + "..."
                    );

                    // Add click event to copy the answer
                    lastAiMessage.addEventListener("click", function () {
                      navigator.clipboard
                        .writeText(this.textContent)
                        .then(() => {
                          // Show a temporary "Copied!" message
                          const notification = document.createElement("div");
                          notification.className = "copy-notification";
                          notification.textContent = "Copied!";
                          this.appendChild(notification);

                          setTimeout(() => {
                            notification.remove();
                          }, 2000);
                        });
                    });
                  } else {
                    lastAiMessage.textContent =
                      "Failed to get answer: " +
                      (response ? response.error : "Unknown error");
                    console.error(
                      "Failed to get answer:",
                      response ? response.error : "Unknown error"
                    );
                  }

                  // Scroll to the bottom of the conversation
                  conversationBox.scrollTop = conversationBox.scrollHeight;
                })
                .catch((error) => {
                  // Get the last AI message (the "Thinking..." message)
                  const aiMessages =
                    conversationBox.querySelectorAll(".ai-message");
                  const lastAiMessage = aiMessages[aiMessages.length - 1];

                  lastAiMessage.textContent = "Error: " + error.message;

                  // Scroll to the bottom of the conversation
                  conversationBox.scrollTop = conversationBox.scrollHeight;
                });
            });
        });
    });
  }

  // Enable/disable send button based on input
  const questionInput = document.getElementById("questionInput");
  const sendBtn = document.getElementById("sendBtn");

  if (questionInput && sendBtn) {
    questionInput.addEventListener("input", () => {
      sendBtn.disabled = questionInput.value.trim() === "";
    });
  }

  // Clear conversation button functionality
  const clearConversationBtn = document.getElementById("clearConversation");
  if (clearConversationBtn) {
    clearConversationBtn.addEventListener("click", () => {
      const conversationBox = document.getElementById("conversationBox");
      if (conversationBox) {
        // Reset to empty state
        conversationBox.innerHTML = `
          <div class="empty-conversation">
            Ask a question to start a conversation
          </div>
        `;
      }
    });
  }
});
