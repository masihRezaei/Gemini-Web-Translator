document.addEventListener("DOMContentLoaded", function () {
  // Tab switching functionality

  const fullscreenIconElm = document.getElementById("fullscreen-icon");
  const translationArea = document.getElementsByClassName('translation-area')[0];
  const pageTranslation = document.getElementsByClassName('page-translation')[0];

  fullscreenIconElm.addEventListener("click", () => {
    if(fullscreenIconElm.textContent === 'fullscreen') {
      fullscreenIconElm.textContent = 'fullscreen_exit';
      translationArea.classList.remove('active');
      pageTranslation.classList.add('active');
    } else {
      fullscreenIconElm.textContent = 'fullscreen';
      translationArea.classList.add('active');
      pageTranslation.classList.remove('active');
    }
  });

  // Close button functionality
  const closeButton = document.getElementById("close-button");
  closeButton.addEventListener("click", () => {
    window.close(); // Close the popup window
  });

  // Language swap button functionality
  const swapLanguagesBtn = document.querySelector('.swap-languages');
  const sourceLanguageSelect = document.getElementById('source-language');
  const targetLanguageSelect = document.getElementById('target-language');

  swapLanguagesBtn.addEventListener('click', () => {
    // Don't swap if source is auto-detect
    if (sourceLanguageSelect.value === 'auto') {
      return;
    }

    // Get current values
    const sourceValue = sourceLanguageSelect.value;
    const targetValue = targetLanguageSelect.value;

    // Swap values
    sourceLanguageSelect.value = targetValue;
    targetLanguageSelect.value = sourceValue;

    // Add animation effect
    swapLanguagesBtn.classList.add('rotate');
    setTimeout(() => {
      swapLanguagesBtn.classList.remove('rotate');
    }, 500);
  });

  const tabButtons = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".tab-content");

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      // Remove active class from all buttons and contents
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      tabContents.forEach((content) => content.classList.remove("active"));

      // Add active class to clicked button and corresponding content
      button.classList.add("active");
      const tabId = button.getAttribute("data-tab");
      document.getElementById(tabId).classList.add("active");
    });
  });

  // Load saved settings
  const apiKeyInput = document.getElementById("api-key");
  const modelSelect = document.getElementById("gemini-model");
  const aiModelSelect = document.getElementById("ai-model");

  browser.storage.local.get(["geminiApiKey", "geminiModel"]).then((result) => {
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
    const defaultModel = "gemini-pro";
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
  });

  // Save settings
  document.getElementById("save-api-key").addEventListener("click", () => {
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

  // Function to translate text
  function translateText() {
    const inputText = document.getElementById("input-text").value.trim();
    const sourceLanguage = document.getElementById("source-language").value;
    const targetLanguage = document.getElementById("target-language").value;
    const outputText = document.getElementById("output-text");

    if (!inputText) {
      outputText.textContent = "Translation will appear here";
      return;
    }

    // Check if API key is available
    browser.storage.local
      .get(["geminiApiKey", "geminiModel"])
      .then((result) => {
        if (!result.geminiApiKey) {
          outputText.textContent = "Please enter your Gemini API key first.";
          return;
        }

        outputText.textContent = "Translating...";

        // Create a prompt for translation
        let prompt = `Translate the following text`;

        if (sourceLanguage !== "auto") {
          prompt += ` from ${getLanguageName(sourceLanguage)}`;
        }

        prompt += ` to ${getLanguageName(targetLanguage)}. Return ONLY the translated text without any explanations, options, or additional information:\n\n"${inputText}"`;

        // Call the Gemini API directly
        const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${result.geminiModel || "gemini-pro"}:generateContent`;

        fetch(`${apiUrl}?key=${result.geminiApiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 1024
            }
          })
        })
        .then(response => response.json())
        .then(data => {
          if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            let translation = data.candidates[0].content.parts[0].text;

            // Clean up the translation (remove quotes, asterisks, and other formatting)
            translation = translation.replace(/^["']|["']$/g, ''); // Remove quotes
            translation = translation.replace(/\*\*(.*?)\*\*/g, '$1'); // Remove bold formatting
            translation = translation.replace(/\*(.*?)\*/g, '$1'); // Remove italic formatting
            translation = translation.replace(/Option \d+.*?:/g, ''); // Remove option labels
            translation = translation.replace(/^(Here's|The) (translation|translated).*?:/i, ''); // Remove intro phrases
            translation = translation.trim();

            outputText.textContent = translation;
          } else {
            outputText.textContent = "Translation failed. Please try again.";
          }
        })
        .catch(error => {
          outputText.textContent = "Error: " + error.message;
        });
      });
  }

  // Add input event listener for auto-translation
  const inputTextArea = document.getElementById("input-text");
  let translationTimeout;

  inputTextArea.addEventListener("input", () => {
    // Clear previous timeout
    clearTimeout(translationTimeout);

    // Set a new timeout to translate after 1 second of inactivity
    translationTimeout = setTimeout(translateText, 1000);
  });

  // Add clear text functionality
  document.querySelector(".clear-text").addEventListener("click", () => {
    document.getElementById("input-text").value = "";
    document.getElementById("output-text").textContent = "Translation will appear here";
  });

  // Add copy text functionality
  document.querySelector(".copy-text").addEventListener("click", () => {
    const text = document.getElementById("output-text").textContent;
    if (text && text !== "Translation will appear here" && text !== "Translating...") {
      navigator.clipboard.writeText(text).then(() => {
        // Show a temporary "Copied!" message
        const outputArea = document.querySelector(".output-area");
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
      'auto': 'Auto-detect',
      'en': 'English',
      'fa': 'Persian (Farsi)',
      'fr': 'French',
      'de': 'German',
      'es': 'Spanish',
      'ar': 'Arabic',
      'zh': 'Chinese',
      'ru': 'Russian'
    };

    return languages[langCode] || langCode;
  }

  // Translate page button click handler
  document.getElementById("translate-page-button").addEventListener("click", () => {
    const targetLanguage = document.getElementById("target-language").value;

    // Check if API key is available
    browser.storage.local
      .get(["geminiApiKey", "geminiModel"])
      .then((result) => {
        if (!result.geminiApiKey) {
          document.getElementById("translation-status").textContent = "Please enter your Gemini API key first.";
          document.getElementById("translation-status").className = "status error";
          return;
        }

        document.getElementById("translation-status").textContent = "Translating page...";
        document.getElementById("translation-status").className = "status";

        // Send message to content script to get page content
        browser.tabs
          .query({ active: true, currentWindow: true })
          .then((tabs) => {
            browser.tabs
              .sendMessage(tabs[0].id, {
                action: "translate",
                targetLanguage: targetLanguage,
                apiKey: result.geminiApiKey,
                model: result.geminiModel || "gemini-pro", // Default to gemini-pro if not set
              })
              .then((response) => {
                if (response && response.success) {
                  document.getElementById("translation-status").textContent = "Translation complete!";
                  document.getElementById("translation-status").className = "status success";
                } else {
                  document.getElementById("translation-status").textContent =
                    "Translation failed: " + (response ? response.error : "Unknown error");
                  document.getElementById("translation-status").className = "status error";
                }
              })
              .catch((error) => {
                document.getElementById("translation-status").textContent = "Error: " + error.message;
                document.getElementById("translation-status").className = "status error";
              });
          });
      });
  });

  // Clear question button click handler
  document.getElementById("clear-question").addEventListener("click", () => {
    document.getElementById("question").value = "";
    document.getElementById("question").focus();
  });

  // Copy answer button click handler
  document.getElementById("copy-answer").addEventListener("click", () => {
    const answerText = document.getElementById("answer").textContent;
    if (answerText && answerText !== "Thinking...") {
      navigator.clipboard.writeText(answerText).then(() => {
        // Show a temporary "Copied!" message
        const copyButton = document.getElementById("copy-answer");
        // Store the original children before replacing
        const originalChildren = Array.from(copyButton.childNodes);

        // Clear the button content
        while (copyButton.firstChild) {
          copyButton.removeChild(copyButton.firstChild);
        }

        // Create and append the check icon safely
        const iconSpan = document.createElement("span");
        iconSpan.className = "material-icons";
        iconSpan.textContent = "check";
        copyButton.appendChild(iconSpan);

        // Restore original content after timeout
        setTimeout(() => {
          // Clear current content
          while (copyButton.firstChild) {
            copyButton.removeChild(copyButton.firstChild);
          }

          // Restore original children
          originalChildren.forEach(child => {
            copyButton.appendChild(child.cloneNode(true));
          });
        }, 2000);
      });
    }
  });

  // Ask question button click handler
  document.getElementById("ask-button").addEventListener("click", () => {
    const question = document.getElementById("question").value.trim();
    if (!question) {
      return;
    }

    // Get the selected AI model
    const selectedAiModel = document.getElementById("ai-model").value;

    // Check if API key is available
    browser.storage.local
      .get(["geminiApiKey", "geminiModel"])
      .then((result) => {
        if (!result.geminiApiKey) {
          document.getElementById("answer").textContent =
            "Please enter your Gemini API key first.";
          document.getElementById("answer-container").style.display = "block";
          return;
        }

        document.getElementById("answer").textContent = "Thinking...";
        document.getElementById("answer-container").style.display = "block";

        // Send message to content script to get page content and ask question
        browser.tabs
          .query({ active: true, currentWindow: true })
          .then((tabs) => {
            browser.tabs
              .sendMessage(tabs[0].id, {
                action: "askQuestion",
                question: question,
                apiKey: result.geminiApiKey,
                model: selectedAiModel || result.geminiModel || "gemini-pro", // Use selected model, fallback to saved model, then default
              })
              .then((response) => {
                // Make sure the answer container is visible
                document.getElementById("answer-container").style.display = "block";

                if (response && response.success) {
                  document.getElementById("answer").textContent = response.answer;
                  console.log("Answer received:", response.answer.substring(0, 50) + "...");
                } else {
                  document.getElementById("answer").textContent =
                    "Failed to get answer: " +
                    (response ? response.error : "Unknown error");
                  console.error("Failed to get answer:", response ? response.error : "Unknown error");
                }
              })
              .catch((error) => {
                document.getElementById("answer").textContent =
                  "Error: " + error.message;
              });
          });
      });
  });
});
