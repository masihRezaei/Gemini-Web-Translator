
// Listen for messages from the popup
browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'translate') {
    translatePage(message.targetLanguage, message.apiKey, message.model)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // Required for async sendResponse
  }
  else if (message.action === 'askQuestion') {
    console.log('Received askQuestion action with model:', message.model);
    const pageContent = getPageContent();
    console.log('Page content extracted, title:', pageContent.title);
    askGemini(pageContent, message.question, message.apiKey, message.model)
      .then(answer => {
        console.log('Got answer from Gemini API');
        sendResponse({ success: true, answer: answer });
      })
      .catch(error => {
        console.error('Error in askQuestion:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Required for async sendResponse
  }
});

// Function to get the content of the page
function getPageContent() {
  // Get the title of the page
  const title = document.title;

  // Get meta description if available
  let metaDescription = '';
  const metaDescElement = document.querySelector('meta[name="description"]');
  if (metaDescElement) {
    metaDescription = metaDescElement.getAttribute('content');
  }

  // Get all text nodes and their parent elements
  const textNodes = [];
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        // Skip empty text nodes or nodes with only whitespace
        if (node.nodeValue.trim() === '') {
          return NodeFilter.FILTER_REJECT;
        }
        // Skip script and style content
        if (node.parentNode.tagName === 'SCRIPT' ||
            node.parentNode.tagName === 'STYLE' ||
            node.parentNode.tagName === 'NOSCRIPT') {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  let node;
  while (node = walker.nextNode()) {
    textNodes.push({
      node: node,
      text: node.nodeValue.trim(),
      parentElement: node.parentNode
    });
  }

  // Combine all the content for the API request
  const bodyText = textNodes.map(item => item.text).join('\n');

  return {
    title: title,
    metaDescription: metaDescription,
    content: bodyText,
    textNodes: textNodes
  };
}

// Function to add RTL support to the page for Persian/Arabic content
function addRTLSupport(targetLanguage) {
  if (targetLanguage === 'fa' || targetLanguage === 'ar') {
    // Add a style element to the head with RTL support
    const styleElement = document.createElement('style');
    styleElement.id = 'gemini-translator-rtl-style';
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
    document.documentElement.setAttribute('dir', 'rtl');
  }
}

// Function to remove RTL support when restoring original content
function removeRTLSupport() {
  // Remove the style element
  const styleElement = document.getElementById('gemini-translator-rtl-style');
  if (styleElement) {
    styleElement.remove();
  }

  // Remove RTL direction from the html element
  document.documentElement.removeAttribute('dir');

  // Remove data attributes from all elements
  const translatedElements = document.querySelectorAll('[data-gemini-translated="true"]');
  translatedElements.forEach(element => {
    element.removeAttribute('data-gemini-translated');
  });
}

// Translation cache to avoid re-translating the same text
const translationCache = new Map();

// Function to get cached translation or null if not found
function getCachedTranslation(text, targetLanguage, model) {
  const cacheKey = `${text}|${targetLanguage}|${model}`;
  return translationCache.get(cacheKey);
}

// Function to add translation to cache
function cacheTranslation(text, translation, targetLanguage, model) {
  const cacheKey = `${text}|${targetLanguage}|${model}`;
  translationCache.set(cacheKey, translation);
}

// Function to translate the page using Gemini API
async function translatePage(targetLanguage, apiKey, model = 'gemini-pro') {
  const pageContent = getPageContent();

  // Save original text nodes for restoration
  const originalTextNodes = pageContent.textNodes.map(item => ({
    node: item.node,
    text: item.text
  }));

  // Save original title
  const originalTitle = document.title;

  // Store original content for restoration
  browser.storage.local.set({
    originalTextNodes: JSON.stringify(originalTextNodes.map(item => item.text)),
    originalTitle: originalTitle
  });

  // Add RTL support for Persian/Arabic
  if (targetLanguage === 'fa' || targetLanguage === 'ar') {
    addRTLSupport(targetLanguage);
  }

  // First translate the title
  try {
    // Check if title is cached
    const cachedTitle = getCachedTranslation(pageContent.title, targetLanguage, model);
    let translatedTitle;

    if (cachedTitle) {
      translatedTitle = cachedTitle;
    } else {
      // Translate the title
      const titlePrompt = `Translate this title from its original language to ${getLanguageName(targetLanguage)}: "${pageContent.title}"`;
      translatedTitle = await callGeminiAPI(titlePrompt, apiKey, model);
      // Cache the translated title
      cacheTranslation(pageContent.title, translatedTitle, targetLanguage, model);
    }

    // Update the page title
    document.title = cleanTranslatedText(translatedTitle, targetLanguage);

    // Show translation in progress indicator
    const progressIndicator = document.createElement('div');
    progressIndicator.textContent = targetLanguage === 'fa' ? 'در حال ترجمه...' : 'Translation in progress...';
    progressIndicator.style.position = 'fixed';
    progressIndicator.style.top = '50%';
    progressIndicator.style.left = '50%';
    progressIndicator.style.transform = 'translate(-50%, -50%)';
    progressIndicator.style.padding = '20px';
    progressIndicator.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    progressIndicator.style.color = 'white';
    progressIndicator.style.borderRadius = '10px';
    progressIndicator.style.zIndex = '10000';
    progressIndicator.id = 'translation-progress';

    // Add RTL support for Persian
    if (targetLanguage === 'fa') {
      progressIndicator.style.fontFamily = 'Tahoma, Arial, sans-serif';
      progressIndicator.dir = 'rtl';
    }

    document.body.appendChild(progressIndicator);

    // Translate text in chunks to avoid token limits
    const chunkSize = 50; // Process 50 text nodes at a time (increased from 20)

    // Prepare all chunks for processing
    const chunks = [];
    for (let i = 0; i < pageContent.textNodes.length; i += chunkSize) {
      chunks.push(pageContent.textNodes.slice(i, i + chunkSize));
    }

    // Process chunks in batches to avoid overwhelming the API but still get parallelism
    const batchSize = 3; // Process 3 chunks in parallel

    for (let batchIndex = 0; batchIndex < chunks.length; batchIndex += batchSize) {
      // Update progress indicator
      const progress = Math.min((batchIndex / chunks.length) * 100, 100).toFixed(0);
      if (targetLanguage === 'fa') {
        progressIndicator.textContent = `در حال ترجمه... ${progress}٪ تکمیل شده`;
      } else {
        progressIndicator.textContent = `Translation in progress... ${progress}% complete`;
      }

      const currentBatch = chunks.slice(batchIndex, batchIndex + batchSize);
      const batchPromises = [];

      // Process each chunk in the current batch
      for (let i = 0; i < currentBatch.length; i++) {
        const chunk = currentBatch[i];
        const chunkPromise = processChunk(chunk, targetLanguage, apiKey, model);
        batchPromises.push(chunkPromise);
      }

      // Wait for all chunks in this batch to complete
      await Promise.all(batchPromises);
    }

    // Remove progress indicator
    document.getElementById('translation-progress').remove();

    // Add a button to restore the original content
    const restoreButton = document.createElement('button');
    restoreButton.textContent = targetLanguage === 'fa' ? 'بازگرداندن متن اصلی' : 'Restore Original';
    restoreButton.style.position = 'fixed';
    restoreButton.style.top = '10px';
    restoreButton.style.right = '10px';
    restoreButton.style.zIndex = '9999';
    restoreButton.style.padding = '8px 12px';
    restoreButton.style.backgroundColor = '#1a73e8';
    restoreButton.style.color = 'white';
    restoreButton.style.border = 'none';
    restoreButton.style.borderRadius = '4px';
    restoreButton.style.cursor = 'pointer';

    // Add RTL support for Persian
    if (targetLanguage === 'fa') {
      restoreButton.style.fontFamily = 'Tahoma, Arial, sans-serif';
      restoreButton.dir = 'rtl';
    }

    restoreButton.addEventListener('click', () => {
      // Restore original title
      browser.storage.local.get(['originalTextNodes', 'originalTitle']).then(result => {
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
              acceptNode: function(node) {
                if (node.nodeValue.trim() === '') {
                  return NodeFilter.FILTER_REJECT;
                }
                if (node.parentNode.tagName === 'SCRIPT' ||
                    node.parentNode.tagName === 'STYLE' ||
                    node.parentNode.tagName === 'NOSCRIPT') {
                  return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
              }
            }
          );

          let node;
          let i = 0;
          while (node = walker.nextNode()) {
            if (i < originalTexts.length) {
              node.nodeValue = originalTexts[i];
              i++;
            }
          }

          // Remove any spans we created for RTL support
          const translatedSpans = document.querySelectorAll('span[data-gemini-translated="true"]');
          translatedSpans.forEach(span => {
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
        }
      });
    });

    document.body.appendChild(restoreButton);

    return true;
  } catch (error) {
    console.error('Translation error:', error);

    // Remove progress indicator if it exists
    const progressIndicator = document.getElementById('translation-progress');
    if (progressIndicator) {
      progressIndicator.remove();
    }

    throw error;
  }
}

// Helper function to process a chunk of text nodes
async function processChunk(chunk, targetLanguage, apiKey, model) {
  try {
    // Create a JSON structure for translation to maintain exact mapping
    const textsToTranslate = chunk.map((item, index) => ({
      id: index + 1,
      text: item.text,
      isEnglish: isEnglishText(item.text) // Use our improved English detection function
    }));

    // Filter out English texts if target language is English to avoid unnecessary translations
    // Also check cache for existing translations
    const textsNeedingTranslation = [];
    const cachedTranslations = [];

    for (const item of textsToTranslate) {
      // Skip English texts if target language is English
      if (targetLanguage === 'en' && item.isEnglish) {
        continue;
      }

      // Check cache
      const cachedTranslation = getCachedTranslation(item.text, targetLanguage, model);
      if (cachedTranslation) {
        cachedTranslations.push({
          id: item.id,
          text: cachedTranslation
        });
      } else {
        textsNeedingTranslation.push(item);
      }
    }

    // Apply cached translations immediately
    for (const item of cachedTranslations) {
      const originalIndex = item.id - 1;
      if (originalIndex >= 0 && originalIndex < chunk.length) {
        chunk[originalIndex].node.nodeValue = cleanTranslatedText(item.text, targetLanguage);
      }
    }

    // If no texts need translation, we're done with this chunk
    if (textsNeedingTranslation.length === 0) {
      return;
    }

    // Create a more compact prompt to reduce token usage
    const prompt = `Translate to ${getLanguageName(targetLanguage)}. Return valid JSON array with same structure.
    ${JSON.stringify(textsNeedingTranslation)}`;

    // Get translations
    const translatedTextsJson = await callGeminiAPI(prompt, apiKey, model);

    // Try to parse the JSON response
    let translatedItems = [];

    // Extract JSON from the response (in case the API returns additional text)
    const jsonMatch = translatedTextsJson.match(/\[\s*\{.*\}\s*\]/s) ||
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
        const lines = translatedTextsJson.split('\n');
        for (let j = 0; j < textsNeedingTranslation.length; j++) {
          const id = textsNeedingTranslation[j].id;
          const lineRegex = new RegExp(`"id"\\s*:\\s*${id}\\s*,\\s*"text"\\s*:\\s*"([^"]*)"`);
          const matchingLine = lines.find(line => lineRegex.test(line));

          if (matchingLine) {
            const match = matchingLine.match(lineRegex);
            if (match && match[1]) {
              translatedItems.push({
                id: id,
                text: match[1].replace(/\\"/g, '"')
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
        const cleanedText = cleanTranslatedText(translatedItem.text, targetLanguage);

        // Get the parent element for RTL support
        const parentElement = chunk[originalIndex].parentElement;

        // Add RTL support for Persian/Arabic text
        if (targetLanguage === 'fa' || targetLanguage === 'ar') {
          // Mark the parent element as translated for RTL styling
          if (parentElement) {
            parentElement.setAttribute('data-gemini-translated', 'true');

            // Handle mixed content (English words in Persian text)
            if (cleanedText.match(/[a-zA-Z0-9]+/)) {
              // If parent is not a text-only element, we can use a safer DOM approach
              if (parentElement.children.length > 0) {
                // Create a temporary span to hold the text
                const tempSpan = document.createElement('span');
                tempSpan.setAttribute('data-gemini-translated', 'true');

                // Split the text by English words and create appropriate nodes
                const parts = cleanedText.split(/([a-zA-Z0-9]+)/);

                for (let i = 0; i < parts.length; i++) {
                  if (parts[i].match(/^[a-zA-Z0-9]+$/)) {
                    // This is an English word, create a span with LTR class
                    const ltrSpan = document.createElement('span');
                    ltrSpan.className = 'gemini-ltr';
                    ltrSpan.textContent = parts[i];
                    tempSpan.appendChild(ltrSpan);
                  } else if (parts[i]) {
                    // This is non-English text, add as a text node
                    tempSpan.appendChild(document.createTextNode(parts[i]));
                  }
                }

                // Replace the text node with our new span
                chunk[originalIndex].node.parentNode.replaceChild(tempSpan, chunk[originalIndex].node);
                continue; // Skip the normal text node update
              }
            }
          }
        }

        // Normal update for non-RTL or simple text
        chunk[originalIndex].node.nodeValue = cleanedText;

        // Cache the translation
        const originalText = chunk[originalIndex].text;
        cacheTranslation(originalText, translatedItem.text, targetLanguage, model);
      }
    }

    // For English texts when target is English, keep them as is
    if (targetLanguage === 'en') {
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

// Function to ask Gemini a question about the page
async function askGemini(pageContent, question, apiKey, model = 'gemini-pro') {
  // Extract the most relevant content from the page
  const contentExcerpt = pageContent.content.substring(0, 10000); // Increased limit for better context

  // Create a more detailed prompt for Gemini to answer the question
  const prompt = `You are an AI assistant helping a user understand the content of a web page.

  Web Page Information:
  Title: ${pageContent.title}
  Description: ${pageContent.metaDescription}

  Page Content (excerpt):
  ${contentExcerpt}

  User Question: ${question}

  Instructions:
  1. Answer the question based ONLY on the information provided in the web page content above.
  2. If the answer cannot be found in the provided content, clearly state that the information is not available on this page.
  3. Format your answer with proper paragraphs, bullet points, or numbered lists when appropriate.
  4. If the question is about code or technical content, format code examples properly.
  5. Provide a comprehensive but concise answer.
  6. Do not make up information that is not present in the page content.

  Your answer:`;

  try {
    const answer = await callGeminiAPI(prompt, apiKey, model);
    return answer;
  } catch (error) {
    console.error('Question answering error:', error);
    throw error;
  }
}

// Function to call the Gemini API
async function callGeminiAPI(prompt, apiKey, model = 'gemini-pro') {
  // Construct the API URL with the selected model
  // Make sure model name is in the correct format
  let modelName = model;

  // Log the original model name
  console.log(`Original model name: ${model}`);

  // Map friendly names to API model names if needed
  const modelMap = {
    'Gemini 1.5 Flash': 'gemini-1.5-flash',
    'Gemini Pro': 'gemini-pro',
    'Gemini 1.0 Pro': 'gemini-1.0-pro',
    'Gemini Pro Vision': 'gemini-pro-vision',
    'Gemini 2.0 Flash': 'gemini-1.5-flash', // Fallback to 1.5 Flash
    'Gemini 2.5 Pro Preview 03-25': 'gemini-pro', // Fallback to Pro
    'Gemini 2.5 Flash Preview 04-17': 'gemini-1.5-flash' // Fallback to 1.5 Flash
  };

  if (modelMap[model]) {
    modelName = modelMap[model];
    console.log(`Mapped model name from ${model} to ${modelName}`);
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent`;

  console.log(`Using Gemini model: ${modelName}`);

  const requestData = {
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
      temperature: 0.2,
      maxOutputTokens: 4096
    }
  };

  try {
    console.log(`Making API request to ${apiUrl} with model: ${modelName}`);

    const response = await fetch(`${apiUrl}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });

    console.log('API response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.error?.message || response.statusText;

      // Check for specific error types and provide more helpful messages
      if (errorMessage.includes("quota")) {
        throw new Error(`Your API quota has been exhausted. Please check your Google AI Studio account and verify your quota status or try a different model.`);
      } else if (errorMessage.includes("not found")) {
        throw new Error(`The selected model (${modelName}) is not available for your API key. Please try a different model.`);
      } else if (errorMessage.includes("invalid")) {
        throw new Error(`Invalid API key. Please check your API key or create a new one.`);
      } else {
        throw new Error(`API Error: ${errorMessage}`);
      }
    }

    const data = await response.json();

    // Extract the text from the response
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
      return data.candidates[0].content.parts[0].text;
    } else {
      throw new Error('Unexpected API response format. Please try again or try a different model.');
    }
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
}

// Helper function to get language name from code
function getLanguageName(langCode) {
  const languages = {
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

// Helper function to detect if text is primarily English
function isEnglishText(text) {
  if (!text || text.trim() === '') return true;

  // Count English characters vs. non-English characters
  const englishChars = text.match(/[a-zA-Z0-9\s\.,\?!;:'"\(\)\-]/g) || [];

  // If more than 70% of characters are English, consider it English text
  return englishChars.length > (text.length * 0.7);
}

// Helper function to clean up translated text and fix formatting issues
function cleanTranslatedText(text, targetLanguage) {
  if (!text) return '';

  // Remove extra quotes that might be added by the API
  let cleaned = text.replace(/^["']|["']$/g, '');

  // Fix common formatting issues
  cleaned = cleaned.replace(/\\n/g, '\n');
  cleaned = cleaned.replace(/\\"/g, '"');
  cleaned = cleaned.replace(/\\'/g, "'");

  // Fix spacing issues that often occur in translations
  if (targetLanguage === 'fa' || targetLanguage === 'ar') {
    // For RTL languages, fix common spacing issues
    cleaned = cleaned.replace(/ ([،؛؟!])/g, '$1'); // Remove space before punctuation
    cleaned = cleaned.replace(/([،؛؟!])([^\s])/g, '$1 $2'); // Add space after punctuation if needed
  } else {
    // For LTR languages
    cleaned = cleaned.replace(/([.,;?!])([^\s])/g, '$1 $2'); // Add space after punctuation if needed
  }

  return cleaned;
}
