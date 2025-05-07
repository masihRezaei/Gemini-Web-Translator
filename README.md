# Gemini Web Translator Firefox Extension

[![GitHub release](https://img.shields.io/github/v/release/masihRezaei/Gemini-Web-Translator)](https://github.com/masihRezaei/Gemini-Web-Translator/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

This Firefox extension allows you to translate web pages and ask questions about web page content using the Google Gemini AI API. Perfect for multilingual browsing, language learning, and understanding content in foreign languages.

🔗 [Install from GitHub](https://github.com/masihRezaei/Gemini-Web-Translator/releases)

## Overview

Gemini Web Translator is a powerful browser extension that leverages Google's Gemini AI models to provide high-quality translations directly within your browser. Unlike traditional translation tools, it preserves the original page layout and design while translating the content.

## Features

- Translate entire web pages to different languages while preserving the original page layout
- In-place translation that replaces text directly in the page (no page restructuring)
- Ask questions about the content of the current web page
- Simple and intuitive user interface
- Support for multiple languages with RTL support for Persian
- Multiple Gemini model options (Gemini Pro, Gemini 1.0 Pro, Gemini 1.5 Pro, Gemini 1.5 Flash)

## Installation

### Prerequisites

- You need a Gemini API key. You can get one from [Google AI Studio](https://ai.google.dev/).

### Creating Icon Files

Before installing the extension, you need to create the icon files:

1. The extension includes an SVG icon file (`icons/icon.svg`)
2. You need to convert this to PNG files of various sizes
3. Use the included HTML converter tool:
   - Open `icons/convert-svg-to-png.html` in your browser
   - Click the "Convert SVG to PNG" button
   - Download all the generated PNG files
   - Save them in the `icons/` directory with their respective names
4. Alternatively, you can use online tools or image editing software
5. The extension needs the following icon files:
   - `icon-16.png`: 16x16 pixels
   - `icon-32.png`: 32x32 pixels
   - `icon-48.png`: 48x48 pixels
   - `icon-64.png`: 64x64 pixels
   - `icon-96.png`: 96x96 pixels
   - `icon-128.png`: 128x128 pixels

Note: The light theme versions (`icon-light-16.png` and `icon-light-32.png`) are not currently used since Firefox doesn't support theme icons for page actions, but you can still create them for future compatibility.

### Installation Steps

1. Download or clone this repository
2. Create the icon PNG files as described above
3. Open Firefox and navigate to `about:debugging`
4. Click on "This Firefox" in the left sidebar
5. Click on "Load Temporary Add-on..."
6. Navigate to the extension directory and select the `manifest.json` file
7. The extension should now be installed and visible in the address bar when you visit a web page

### Extension Icon in the Address Bar

The extension is configured to appear in the address bar (URL bar) of Firefox. This means:

1. The extension icon will appear on the right side of the address bar
2. The icon will only be visible when you're on a web page (http/https URLs)
3. Click on the icon to open the translator popup

This placement makes the extension more accessible and less intrusive than having it in the main toolbar.

### Troubleshooting Icon Visibility

If you don't see the extension icon in the address bar:

1. Make sure you're on a web page (http/https URL)
2. Try restarting Firefox after installation
3. Check if the extension is enabled in Firefox's Add-ons Manager
4. If the icon still doesn't appear, you can manually add it to the toolbar:
   - Right-click on the Firefox toolbar
   - Select "Customize..."
   - Find the Gemini Web Translator icon in the customization panel
   - Drag it to your desired position in the toolbar
   - Click "Done" to save your changes

## Usage

1. Click on the extension icon in the address bar to open the popup
2. Enter your Gemini API key in the field at the bottom
3. Select the Gemini model you want to use from the dropdown menu:
   - **Gemini Pro**: The standard model
   - **Gemini 1.0 Pro**: The Gemini 1.0 Pro model
   - **Gemini 1.5 Pro**: The more advanced Gemini 1.5 Pro model
   - **Gemini 1.5 Flash**: A faster version of Gemini 1.5
4. Click "Save Settings" to save your API key and model selection
5. To translate a page:
   - Select the target language from the dropdown
   - Click "Translate Page"
   - Wait for the translation to complete (you'll see a progress indicator)
   - The text on the page will be translated in-place, preserving the original layout
   - Use the "Restore Original" button that appears on the page to revert to the original content
6. To ask a question about the page:
   - Click on the "Ask Question" tab
   - Type your question in the text area
   - Click "Ask Gemini"
   - The answer will appear below

**Note**: If you encounter errors with one model, try switching to a different model. Different API keys may have access to different models.

## Supported Languages

- Persian (Farsi)
- English
- French
- German
- Spanish
- Arabic
- Chinese
- Russian

## Development

### Project Structure

- `manifest.json`: Extension configuration
- `popup/`: Contains the popup UI files
- `scripts/`: Contains the JavaScript files
- `styles/`: Contains the CSS files
- `background/`: Contains the background scripts
- `icons/`: Contains the extension icons

### Adding More Languages

To add more languages, edit the language dropdown in `popup.html` and update the `getLanguageName` function in `content.js`.

## Notes

- The extension supports multiple Gemini models:
  - Gemini Pro
  - Gemini 1.0 Pro
  - Gemini 1.5 Pro
  - Gemini 1.5 Flash
- The extension now translates text in-place, preserving the original page layout and structure
- Translation is done in chunks to handle large pages efficiently
- Special support for Persian (Farsi) language with RTL text direction
- There are token limits for the Gemini API, so very long pages may be processed in multiple chunks
- The translation quality depends on the Gemini model's capabilities
- The extension uses the Gemini API v1 endpoint (https://generativelanguage.googleapis.com/v1/)
- You need to make sure your API key has access to the model you select
- If you encounter errors about a model not being found, try switching to a different model

## License

This project is open source and available under the MIT License.

## Disclaimer

This extension is not affiliated with Google or the Gemini API. It is an independent project that uses the Gemini API for translation and question answering.

## Keywords

gemini translator, google gemini, web page translator, firefox extension, browser translator, ai translation, gemini api, language translator, multilingual browser, web translation tool, gemini ai, google ai, firefox addon, persian translator, rtl language support, in-place translation, ai powered translation, website translator, gemini 1.5, gemini pro
