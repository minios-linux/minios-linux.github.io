# MiniOS Website (minios.dev)

This repository contains the official MiniOS website with internationalization support.

## Translation Guide

To translate the site into your language, you can use the files in the **translations** folder as an example.

## Text Extraction Tools

The `tools/` directory contains utilities to extract translatable text from HTML files:

### Node.js Version (Recommended)

The Node.js version provides the most accurate extraction that matches browser behavior:

```bash
# Install dependencies
cd tools && npm install

# Extract text for translation
node html-i10n-extract.js -i ../index.html -o ../translations/your-language.json -v

# Update existing translation file
node html-i10n-extract.js -i ../index.html -o ../translations/ru.json -v
```

**Features:**
- ✅ 100% compatibility with browser JavaScript behavior
- ✅ Automatic text node separation (handles `<br>` tags correctly)
- ✅ Accurate DOM processing with Cheerio
- ✅ No preprocessing required

### Python Version

Alternative Python implementation:

```bash
# Install dependencies (Debian/Ubuntu)
sudo apt-get install python3-bs4 python3-colorama

# Extract text for translation
python3 html-i10n-extract -i index.html -o translations/your-language.json -v

# Update existing translation file  
python3 html-i10n-extract -i index.html -o translations/ru.json -v
```

**Note:** The Python version includes preprocessing to handle HTML quirks, but the Node.js version is recommended for better accuracy.

### Command Line Options

Both tools support the same command line interface:

- `-i, --input <files...>` - HTML file(s) to process (required)
- `-o, --output <file>` - JSON file for extracted text (required)  
- `-k, --keep-missing` - Keep missing translations in main section
- `-v, --verbose` - Show detailed processing information

### Usage Examples

```bash
# Extract from single file
node tools/html-i10n-extract.js -i index.html -o translations/new-lang.json -v

# Extract from multiple files
node tools/html-i10n-extract.js -i index.html about.html -o translations/combined.json -v

# Update existing translations (moves unused to legacy section)
node tools/html-i10n-extract.js -i index.html -o translations/ru.json -v

# Keep all existing translations 
node tools/html-i10n-extract.js -i index.html -o translations/ru.json -k -v
```

## Translation Workflow

1. **Extract translatable text:**
   ```bash
   node tools/html-i10n-extract.js -i index.html -o translations/new-language.json -v
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
