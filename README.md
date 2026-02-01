# MiniOS Website - Translation Guide

Welcome to the MiniOS website translation project! This document will help you contribute translations to the site in your language.

## 📋 Table of Contents

- [Translation System Overview](#translation-system-overview)
- [Quick Start](#quick-start)
- [Translation Methods](#translation-methods)
- [Translation File Structure](#translation-file-structure)
- [Translation Guidelines](#translation-guidelines)
- [Working with Admin Panel](#working-with-admin-panel)
- [AI Translation](#ai-translation)
- [Frequently Asked Questions](#frequently-asked-questions)

---

## Translation System Overview

The MiniOS website uses an **automatic extraction system** that pulls translatable strings from two sources:

1. **Data files** (`data/*.json`) — site content (edition names, descriptions, features)
2. **Source code** (`src/**/*.tsx`) — UI strings wrapped in `t()` function

All translations are stored in `/public/translations/*.json` files in JSON format.

### Supported Languages

Current languages can be found in the `public/translations/` folder:
- `en.json` — English (base language)
- `es.json` — Spanish
- `ru.json` — Russian
- *...additional languages can be added via admin panel*

---

## Quick Start

### For Non-Technical Translators

1. **Contact the developers** via GitHub Issues or Telegram
2. **Receive the JSON file** for your language (e.g., `ru.json`)
3. **Open the file** in any text editor (VS Code, Notepad++, Sublime Text)
4. **Translate the values** (see [Translation File Structure](#translation-file-structure))
5. **Send the file back** to developers or create a Pull Request

### For Technical Translators

```bash
# 1. Clone the repository
git clone https://github.com/minios-linux/minios-site.git
cd minios-site

# 2. Install dependencies
npm install

# 3. Start dev server
npm run dev

# 4. Open admin panel
# Navigate to http://localhost:5173
# Click "Admin" button in the top right corner

# 5. Translate via web interface or edit files directly
```

---

## Translation Methods

### Method 1: Manual Translation (recommended for accuracy)

**Steps:**

1. Open file `public/translations/{language_code}.json` (e.g., `ru.json`)
2. Find the `"translations": { ... }` object
3. Translate **only the values**, keeping keys unchanged

**Example:**
```json
{
  "_meta": {
    "name": "Español",
    "flag": "🇪🇸"
  },
  "translations": {
    "Get MiniOS": "Obtener MiniOS",
    "Fast. Simple. Reliable.": "Rápido. Simple. Confiable.",
    "Loading...": "Cargando..."
  }
}
```

**Important:**
- ❌ **DO NOT change keys** (left side): `"Get MiniOS"` stays as is
- ✅ **Translate values** (right side): `"Obtener MiniOS"`
- ✅ **Preserve HTML tags**: `"<strong>Important</strong>"` → `"<strong>Importante</strong>"`
- ✅ **Empty strings** (`""`) mean the translation hasn't been done yet

### Method 2: AI Translation (fast, requires review)

**Via admin panel (localhost only):**

1. Open `http://localhost:5173` and click **"Admin"**
2. Navigate to **Translations → AI Auto-Translation**
3. Select **your language** from the dropdown
4. Configure **AI provider** (see [AI Translation](#ai-translation))
5. Click **"Translate"**
6. **Review results** and fix inaccuracies
7. Click **"Download JSON"** to save

### Method 3: Combined Approach (optimal)

1. Use **AI translation** for the first pass (80-90% accuracy)
2. **Manually review** and fix:
   - Technical terms
   - Product names
   - Cultural nuances
   - Tone and style
3. **Save** the final version

---

## Translation File Structure

Each translation file has the following structure:

```json
{
  "_meta": {
    "name": "Español",         // Language name in native language
    "flag": "🇪🇸"               // Country flag emoji
  },
  "translations": {
    "english key": "translation in your language",
    "Add Edition": "Añadir edición",
    "Fast boot": "Arranque rápido",
    "": ""                     // Empty value = not translated
  }
}
```

### `_meta` Fields

- **`name`** — language name in **native language** (not in English!)
  - ✅ `"Español"`, `"Русский"`, `"Deutsch"`
  - ❌ `"Spanish"`, `"Russian"`, `"German"`
- **`flag`** — flag emoji (optional but recommended)
  - Find at: https://emojipedia.org/flags/

### `translations` Field

**Keys (left side):**
- Always in **English**
- These are **identifiers**, do not change them
- Automatically generated from code and data

**Values (right side):**
- **English** (`en.json`): key = value (`"Hello": "Hello"`)
- **Other languages**: key ≠ value (`"Hello": "Hola"`)
- **Empty strings** (`""`) mean missing translation

---

## Translation Guidelines

### ✅ What to Translate

1. **Content and descriptions**
   ```json
   "Fast. Simple. Reliable.": "Rápido. Simple. Confiable."
   ```

2. **Buttons and UI elements**
   ```json
   "Download": "Descargar",
   "Get Started": "Empezar"
   ```

3. **Messages and tooltips**
   ```json
   "Loading...": "Cargando...",
   "Please wait": "Por favor espere"
   ```

### ❌ What NOT to Translate

1. **Brand and product names**
   ```json
   "MiniOS": "MiniOS",           // NOT "МиниОС"
   "Debian": "Debian",           // NOT "Дебиан"
   "XFCE Desktop": "XFCE Desktop"
   ```

2. **Technical terms and formats**
   ```json
   "SquashFS": "SquashFS",
   "USB": "USB",
   "RAM": "RAM",
   "ISO": "ISO"
   ```

3. **HTML tags and attributes**
   ```json
   "<a href=\"https://example.com\">link</a>": "<a href=\"https://example.com\">enlace</a>"
   // ✅ Translate only "link" → "enlace"
   // ❌ DO NOT touch tags and attributes
   ```

4. **Variables and placeholders**
   ```json
   "Version {{version}}": "Versión {{version}}"
   // ✅ {{version}} stays unchanged
   ```

### 📝 Style Recommendations

1. **Tone**: Friendly but professional
2. **Pronouns**: Use formal "you" or informal depending on your language culture
3. **Length**: Try to maintain approximately the same text length (for UI)
4. **Context**: If a key's meaning is unclear, check the website or ask developers

---

## Working with Admin Panel

> ⚠️ **Important:** Admin panel is only accessible on `localhost` (not in production)

### Accessing Admin Panel

1. Start dev server: `npm run dev`
2. Open browser: `http://localhost:5173`
3. Click **"Admin"** button in the top right corner (gear icon)

### "Translations" Section

The admin panel has **two tabs** for working with translations:

#### 1. Stats (Translation Statistics)

**Shows for each language:**
- Total key count
- Translated key count
- Completion percentage
- List of untranslated keys

**"Sync Translations" button:**
- Scans data files and source code
- Adds new keys to all language files
- Removes obsolete keys
- Sorts keys alphabetically

**When to use:** After code or data updates to sync all languages

#### 2. AI Auto-Translation

**Features:**
- Language management (add/edit/delete)
- AI translation of untranslated strings
- Batch processing with configurable chunk size
- Download translation files as JSON

**Interface:**

1. **Language** — select language to translate
2. **AI Provider** — choose AI provider (see below)
3. **Model** — select AI model
4. **API Key** — API key (if required)
5. **Batch size** — chunk size (0 = all at once, 10 = 10 keys at a time)
6. **Timeout per batch** — timeout per batch in seconds

**Buttons:**
- **Translate** — translate selected language
- **Translate All Languages** — translate all languages sequentially
- **Sync Keys** — synchronize keys (same as in Stats)
- **Download JSON** — download current translation file

---

## AI Translation

### Supported AI Providers

#### 1. **OpenCode** (recommended for beginners)

**Advantages:**
- ✅ **Free models** available
- ✅ No API key required for some models
- ✅ Simple setup

**Configuration:**
- AI Provider: `OpenCode`
- Model: Choose from list (e.g., `gemini-2.0-flash-exp`)
- API Key: Leave empty for free models

#### 2. **OpenCode Local** (for advanced users)

**Requirements:**
- Installed CLI: `opencode` in PATH

**Configuration:**
- AI Provider: `OpenCode Local`
- Model: Choose from local models
- Timeout: Increase for large translations (300-600 seconds)

**Install OpenCode CLI:**
```bash
# Follow instructions at https://opencode.ai
```

#### 3. **Google AI** (Gemini)

**Requirements:**
- API key from Google AI Studio
- May require proxy for some countries

**Configuration:**
- AI Provider: `Google AI`
- Model: `gemini-2.0-flash-exp` or `gemini-1.5-pro`
- API Key: Your key from https://aistudio.google.com/apikey
- Proxy URL: `http://your-proxy:port` (optional)

#### 4. **Groq** (fast and free)

**Requirements:**
- Free API key from Groq

**Configuration:**
- AI Provider: `Groq`
- Model: `llama-3.3-70b-versatile` (recommended)
- API Key: Your key from https://console.groq.com/keys

#### 5. **Ollama** (local models)

**Requirements:**
- Ollama installed on `localhost:11434`
- Downloaded models (e.g., `llama2`, `mistral`)

**Configuration:**
- AI Provider: `Ollama`
- Model: Choose from installed models

**Install Ollama:**
```bash
# Download from https://ollama.ai
ollama pull llama2
```

#### 6. **Custom OpenAI-compatible**

For any OpenAI-compatible API (Together AI, Perplexity, etc.)

**Configuration:**
- AI Provider: `Custom OpenAI-compatible`
- API Endpoint: Your provider's URL
- API Key: Your API key
- Model: Model name

### AI Translation Process

1. **Choose provider** and enter credentials
2. **Select language** to translate
3. **Configure batch size:**
   - `0` — translate all at once (fast, but may exceed limits)
   - `10-20` — 10-20 keys at a time (slower but more reliable)
4. **Set timeout:**
   - Small batches (1-20 keys): 60-120 seconds
   - Medium batches (20-50 keys): 120-300 seconds
   - All at once (0): 300-600 seconds
5. **Click "Translate"**
6. **Wait for completion** (progress shown in interface)
7. **Review results** and correct if needed

### AI Translation Quality

**Expected accuracy:**
- ✅ 90-95% for general content
- ✅ 85-90% for technical terms
- ⚠️ 70-80% for culturally-specific phrases

**After AI translation, always check:**
1. Product names (MiniOS, Debian, XFCE)
2. Technical terms (RAM, USB, ISO)
3. Text tone and style
4. HTML tags and formatting
5. Contextual accuracy

---

## Frequently Asked Questions

### How do I add a new language?

**Via admin panel:**
1. Admin → Translations → AI Auto-Translation
2. Click **"Add language"**
3. Enter:
   - **Code**: Language code (e.g., `pl`, `de`, `zh-CN`)
   - **Name**: Name in native language (e.g., `Polski`, `Deutsch`)
   - **Flag**: Flag emoji (e.g., 🇵🇱, 🇩🇪)
4. Click **"Add"**
5. New file will be created in `public/translations/{code}.json`

**Language code format:**
- 2-3 lowercase letters: `en`, `es`, `ru`, `pl`
- With country code: `zh-CN`, `pt-BR`, `en-GB`

### How do I update existing translations?

**Option 1 (admin panel):**
1. Edit via AI Auto-Translation
2. Download JSON and edit manually
3. Upload back to `public/translations/`

**Option 2 (direct editing):**
1. Open `public/translations/{code}.json`
2. Change values in `translations` object
3. Save file
4. Reload page (translations update automatically)

### Translations don't update on the site

**Solutions:**
1. **Clear browser cache**: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
2. **Restart dev server**: Stop (`Ctrl+C`) and start again (`npm run dev`)
3. **Check JSON syntax**: Ensure no errors in file (use JSON validator)
4. **Check browser console**: F12 → Console — look for loading errors

### How do I test my translations before submitting?

1. **Start dev server**: `npm run dev`
2. **Change language**: Click language selector in site header
3. **Check all pages**:
   - Home page
   - Download page (click "Get MiniOS")
   - Admin panel (if you translated UI)
4. **Check different resolutions**: Mobile, tablet, desktop
5. **Look for issues**:
   - Cut-off text
   - Broken layout
   - Incorrect terms
   - Missing translations (text in English)

### How many keys need to be translated?

The number of keys depends on the site version. Typically:
- **Basic content**: ~200-300 keys
- **Full site**: ~400-600 keys
- **With admin panel**: ~700-900 keys

**Check current count:**
1. Admin → Translations → Stats
2. See "Total" for any language

---

## Contact and Support

**Have questions? Found a bug?**

- 🐛 **GitHub Issues**: https://github.com/minios-linux/minios-linux.github.io/issues
- 💬 **Telegram**: [@minios_linux](https://t.me/minios_linux)

**Want to contribute?**

1. **Fork** the repository on GitHub
2. **Create branch**: `git checkout -b translation/your-language`
3. **Translate** files
4. **Commit**: `git commit -m "Add [language] translation"`
5. **Push**: `git push origin translation/your-language`
6. **Create Pull Request** on GitHub

---

## Acknowledgments

Thanks to all translators who help make MiniOS accessible to people around the world! 🌍

Your contribution makes a difference. ❤️
