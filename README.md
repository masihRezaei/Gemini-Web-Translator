# Gemini Web Translator Firefox Extension

[![GitHub release](https://img.shields.io/github/v/release/masihRezaei/Gemini-Web-Translator)](https://github.com/masihRezaei/Gemini-Web-Translator/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful Firefox extension that uses Google's Gemini AI to translate web pages and answer questions while preserving the original page layout. Perfect for multilingual browsing, language learning, and understanding content in foreign languages.

🔗 [Install from GitHub](https://github.com/masihRezaei/Gemini-Web-Translator/releases)

## Overview

Gemini Web Translator harnesses the power of Google's latest Gemini AI models to deliver high-quality translations directly within your browser. What sets it apart from traditional translation tools is its ability to maintain the original page layout and design while translating the content, providing a seamless browsing experience.

## Key Features

- **In-place Translation**: Translate entire web pages while preserving the original layout and design
- **Multiple AI Models**: Choose from Gemini 1.5 Flash, Gemini 2.0 Flash, and Gemini 2.5 Flash Preview for optimal performance
- **Ask AI**: Ask questions about any topic, not just the current webpage
- **Tone Selection**: Choose from different tones (formal, casual, literary) for translations and AI responses
- **Mobile Support**: Optimized for mobile devices with a compact popup overlay
- **Keyboard Shortcuts**: Customizable keyboard shortcuts for quick translation
- **Text Selection Translation**: Translate selected text with a convenient popup
- **YouTube Subtitles**: Translate video subtitles across multiple platforms
- **RTL Support**: Special support for right-to-left languages like Persian and Arabic

## Installation

### Prerequisites

- You need a Gemini API key from [Google AI Studio](https://ai.google.dev/)
- Firefox browser (version 79.0 or higher)

### Quick Installation

1. Download the latest release from [GitHub Releases](https://github.com/masihRezaei/Gemini-Web-Translator/releases)
2. Open Firefox and navigate to `about:addons`
3. Click the gear icon and select "Install Add-on From File..."
4. Select the downloaded .xpi file
5. The extension will be installed and appear in your address bar when visiting websites

### Developer Installation

If you want to install the extension for development:

1. Clone this repository: `git clone https://github.com/masihRezaei/Gemini-Web-Translator.git`
2. Open Firefox and navigate to `about:debugging`
3. Click "This Firefox" in the left sidebar
4. Click "Load Temporary Add-on..."
5. Navigate to the extension directory and select the `manifest.json` file

### Setting Up Your API Key

1. Click the extension icon in the address bar to open the popup
2. Scroll down to the "Gemini API Key" section
3. Enter your API key in the field
4. Click "Save API Key"
5. Your key will be securely stored in your browser's local storage

### Extension Location

The extension icon appears in the address bar (URL bar) of Firefox when you're on a web page. This makes it easily accessible while browsing without cluttering your main toolbar.

If you don't see the icon:
- Make sure you're on a web page (http/https URL)
- Check if the extension is enabled in Firefox's Add-ons Manager
- You can also add it to your toolbar through Firefox's customization panel

## Usage

### Translating Web Pages

1. Click the extension icon in the address bar to open the popup
2. Select your target language from the dropdown menu
3. Choose a translation tone (Neutral, Casual/Friendly, Formal/Professional, Simple/Clear, or Literary/Poetic)
4. Click "Translate This Page"
5. The page will be translated in-place, preserving the original layout
6. To revert to the original content, click the "Restore Original" button that appears on the page

### Using Keyboard Shortcuts

1. Press `Shift+T` (default) to instantly translate the current page
2. Customize this shortcut in the extension settings:
   - Open the extension popup
   - Scroll down to the "Keyboard Shortcuts" section
   - Select your preferred key combination
   - Click "Save"

### Translating Selected Text

1. Select any text on a webpage
2. A small translation button will appear near your selection
3. Click the button to see the translation in a popup
4. You can copy the translated text or close the popup

### Ask AI Feature

1. Click the extension icon to open the popup
2. Select the "Ask AI" tab
3. Type any question in the input field
4. Select your preferred response language and tone
5. Click the send button
6. The AI will respond with an answer

### YouTube Subtitle Translation

1. Open the extension popup while on YouTube
2. Select the "Video Translate" tab
3. Enable YouTube Subtitles Translation
4. Choose your target language and display preferences
5. Customize subtitle appearance (font size, colors, opacity)
6. Click "Save Settings"
7. Play any YouTube video with subtitles to see the translation

## Supported Languages

- English
- Persian (Farsi)
- Arabic
- French
- German
- Spanish
- Chinese
- Russian

You can easily switch between languages using the language selector in the popup.

## Development

### Project Structure

```
gemini-translator-extension/
├── manifest.json        # Extension configuration
├── background/          # Background scripts
├── popup/               # Popup UI files
├── scripts/             # Content and functionality scripts
│   ├── content.js       # Main content script for page translation
│   ├── keyboard-shortcuts.js  # Keyboard shortcut handling
│   ├── mobile-popup.js  # Mobile device popup overlay
│   ├── popup.js         # Popup functionality
│   ├── selected-text-translation.js  # Text selection translation
│   └── youtube-subtitles.js  # YouTube subtitle translation
├── styles/              # CSS stylesheets
└── icons/               # Extension icons
```

### Adding More Languages

To add more languages:

1. Edit the language dropdowns in `popup/popup.html`:
   ```html
   <select id="targetLang" class="lang-select">
     <option value="en">English</option>
     <!-- Add your new language here -->
     <option value="ja">Japanese</option>
   </select>
   ```

2. Update the `getLanguageName` function in `scripts/popup.js`:
   ```javascript
   function getLanguageName(langCode) {
     const languages = {
       // Existing languages
       ja: "Japanese",
       // Add your new language here
     };
     return languages[langCode] || langCode;
   }
   ```

## Technical Notes

- **Supported Models**: The extension works with Gemini 1.5 Flash, Gemini 2.0 Flash, and Gemini 2.5 Flash Preview
- **Translation Method**: Text is translated in-place, preserving the original page layout and structure
- **Performance Optimization**: Translation is done in chunks to handle large pages efficiently
- **RTL Support**: Special handling for right-to-left languages like Persian and Arabic
- **API Endpoint**: Uses the Gemini API v1 endpoint (https://generativelanguage.googleapis.com/v1/)
- **Token Limits**: Very long pages may be processed in multiple chunks due to API token limits
- **Mobile Detection**: Uses user agent detection for reliable mobile device identification
- **Clipboard Handling**: Uses modern Clipboard API with fallback for older browsers

## Troubleshooting

- **API Key Errors**: Make sure your API key has access to the model you select
- **Model Not Found**: Try switching to a different model (Gemini 1.5 Flash is most widely available)
- **Translation Issues**: For large pages, try translating in smaller sections using the text selection feature
- **Performance**: If translation is slow, try using Gemini 1.5 Flash model which is optimized for speed
- **Mobile Issues**: If the popup doesn't appear correctly on mobile, try refreshing the page

## License

This project is open source and available under the [MIT License](https://opensource.org/licenses/MIT).

## Disclaimer

This extension is not affiliated with Google or the Gemini API. It is an independent project that uses the Gemini API for translation and question answering.
