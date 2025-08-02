# MiniOS Website (minios.dev)

This repository contains the official MiniOS website with internationalization support.

## Translation Guide

To translate the site into your language, you can use the files in the **translations** folder as an example.

## Text Extraction Tool

The `tools/` directory contains a Node.js utility to extract translatable text from HTML files:

### Installation and Usage

```bash
# Install dependencies
cd tools && npm install

# Extract text for translation from both HTML files
node html-i10n-extract.js -i ../index.html ../download.html -o ../translations/your-language.json -v

# Update existing translation file
node html-i10n-extract.js -i ../index.html ../download.html -o ../translations/ru.json -v
```

**Features:**
- ✅ Accurate text extraction matching browser behavior
- ✅ Multi-file processing (extracts from `index.html` and `download.html`)
- ✅ Whitespace-aware extraction

### Command Line Options

The extraction tool supports the following options:

- `-i, --input <files...>` - HTML file(s) to process (required)
- `-o, --output <file>` - JSON file for extracted text (required)  
- `-k, --keep-missing` - Keep missing translations in main section
- `-v, --verbose` - Show detailed processing information

### Usage Examples

```bash
# Extract from single file
node tools/html-i10n-extract.js -i index.html -o translations/new-lang.json -v

# Extract from both website files (recommended)
node tools/html-i10n-extract.js -i index.html download.html -o translations/new-lang.json -v

# Update existing translations (moves unused to legacy section)
node tools/html-i10n-extract.js -i index.html download.html -o translations/ru.json -v

# Keep all existing translations 
node tools/html-i10n-extract.js -i index.html download.html -o translations/ru.json -k -v
```

## Translation Workflow

1. **Extract translatable text:**
   ```bash
   node tools/html-i10n-extract.js -i index.html download.html -o translations/new-language.json -v
   ```

2. **Translate the text:** Edit the JSON file and add translations for empty strings

3. **Test your translation:** Open the website with `?lang=your-language-code` parameter

4. **Update when HTML changes:** Re-run the extraction tool to update the translation file

## Translation File Structure

Translation files use this JSON structure:

```json
{
    "_comment": "This is a generated JSON file. Modify with care.",
    "translations": {
        "Hello World": "Hola Mundo",
        "Welcome": "Bienvenido"
    },
    "legacy": {
        "Old Text": "Texto Antiguo"
    }
}
```

- **translations**: Current active translations used by the website
- **legacy**: Deprecated translations (automatically moved when text changes)

## Browser Integration

The website uses `js/translate.js` to automatically detect and apply translations based on:
- URL parameter: `?lang=es` 
- Browser language settings
- Fallback to English if translation not found

Add `?debug` to the URL to see translation debugging information in the console.

## Development Tools

The `tools/` directory contains several utilities for translation development and quality assurance:

### 🔍 String Extraction
- **`html-i10n-extract.js`** - Main extraction tool for translatable strings

### 🧪 Testing & Analysis Tools
- **`console-debug-simulator.js`** - Simulate browser console output for translation debugging
- **`website-text-comparison.js`** - Compare English vs translated versions with detailed statistics

### 🗺️ SEO Tools
- **`update-sitemap.js`** - Generate sitemap.xml based on available translations

### 📊 Analysis Commands

```bash
# Compare translation coverage
node tools/website-text-comparison.js ru

# Debug translation extraction
node tools/console-debug-simulator.js

# Update sitemap with current translations
node tools/update-sitemap.js

# Validate translation files
node tools/update-sitemap.js --validate
```

## Technical Details

The translation system processes text nodes from HTML elements (`title`, `span`, `a`, `p`, `h1-h6`, `li`, `strong`) and preserves original formatting while replacing content with translations.
