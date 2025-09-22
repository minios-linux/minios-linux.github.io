/*
 * This script is used to translate the text content of HTML elements based on the user's language parameter in the URL or browser language.
 * It fetches a JSON file containing translations based on the user's language.
 * It then selects all elements with title, span, a, p, h1, h2, h3, h4, h5, h6 tags and replaces their text content with the appropriate translation.
 * Additionally, it updates all links (<a>) on the page to include the "lang" parameter.
 * The translations are taken from the 'translations' section in the JSON file.
 */

// Get the user's language from the URL
let urlParams = new URLSearchParams(window.location.search);

// Debug mode flag - enabled when 'debug' parameter is present in URL
const DEBUG_MODE = urlParams.has('debug');
let userLanguage = urlParams.get('lang');
let languages = navigator.languages;
if (DEBUG_MODE) console.log(`Supported languages: ${languages}`);

if (!userLanguage) {
    if (DEBUG_MODE) console.log("No 'lang' parameter in URL, falling back to browser language.");
    userLanguage = navigator.language || navigator.userLanguage;
    if (DEBUG_MODE) console.log(`Browser language detected: ${userLanguage}`);
}

if (!userLanguage) {
    if (DEBUG_MODE) console.warn("No language detected. Falling back to 'en' as default.");
    userLanguage = "en"; // Default to English
}

let languageNames = new Intl.DisplayNames(['en'], { type: 'language' });
let fullLanguageName = userLanguage ? languageNames.of(userLanguage.substr(0, 2)) : 'Unknown';

if (DEBUG_MODE) console.log(`Detected language: ${userLanguage}`);
if (DEBUG_MODE) console.log(`Language name: ${fullLanguageName}`);


// If no language parameter is provided in the URL, get the user's language from the browser
if (!userLanguage) {
    userLanguage = navigator.language || navigator.userLanguage;
}

// Store original language code and short language code
let originalLanguage = userLanguage;
let shortLanguage = userLanguage.substr(0, 2); // Use only the language code (e.g., "en", "ru")

// Determine the language file to use based on the user's language
// First try the full language code (e.g., "en-US"), then fallback to short code (e.g., "en")
let languageFile = `translations/${originalLanguage}.json`;

// Function to try loading translation file
async function loadTranslations() {
    try {
        if (DEBUG_MODE) console.log(`Trying to load: ${languageFile}`);
        let response = await fetch(languageFile);
        if (!response.ok) {
            throw new Error('Full language file not found');
        }
        return await response.json();
    } catch (error) {
        // If full language file not found, try short language code
        if (originalLanguage !== shortLanguage) {
            if (DEBUG_MODE) console.log(`Full language file not found, trying short: translations/${shortLanguage}.json`);
            languageFile = `translations/${shortLanguage}.json`;
            let response = await fetch(languageFile);
            if (!response.ok) {
                throw new Error('Translation file not found');
            }
            return await response.json();
        } else {
            throw error;
        }
    }
}

loadTranslations()
    .then((translations) => {
        // Select all elements with title, span, a, p, h1, h2, h3, h4, h5, h6, li, strong tags
        let elements = document.querySelectorAll(
            'title, span, a, p, h1, h2, h3, h4, h5, h6, li, strong'
        );
        elements.forEach((element) => {
            // Get all child nodes of the element
            let childNodes = element.childNodes;

            childNodes.forEach((node) => {
                // Check if the node is a text node
                if (node.nodeType === Node.TEXT_NODE) {
                    // Get the translation key from the node's text content
                    let translationKey = node.nodeValue.trim();

                    // Check if the translation key is a single non-breaking space, dot, asterisk, space, or empty
                    if ([' ', '.', '*', '\xa0', ''].includes(translationKey)) {
                        return; // Skip this iteration
                    }

                    // If a translation exists for the key, replace the node's text content
                    if (translations['translations'][translationKey]) {
                        // Preserve leading and trailing whitespace from original nodeValue
                        const originalNodeValue = node.nodeValue;
                        const leadingWhitespace = originalNodeValue.match(/^\s*/)[0];
                        const trailingWhitespace = originalNodeValue.match(/\s*$/)[0];
                        
                        // Replace only the trimmed content, keeping original whitespace
                        node.nodeValue = leadingWhitespace + translations['translations'][translationKey] + trailingWhitespace;
                    }

                    if (DEBUG_MODE) console.log('TK:', translationKey);
                    if (DEBUG_MODE) console.log('TR:', translations['translations'][translationKey]);
                }
            });
        });

        // Update all <a> tags to include the "lang" parameter only for links to other pages
        document.querySelectorAll('a').forEach(link => {
            let href = link.getAttribute('href');

            // Skip if no href attribute or if it's an anchor (#) or external resource
            if (!href || href.startsWith('#') || href.includes('mailto:') || href.includes('tel:') || 
                href.startsWith('http://') || href.startsWith('https://')) {
                return;
            }

            // Ensure the link points to another page and avoid duplicate "lang" parameters
            if (!href.includes('lang=')) {
                let updatedHref = href.includes('?')
                    ? `${href}&lang=${shortLanguage}`
                    : `${href}?lang=${shortLanguage}`;
                link.setAttribute('href', updatedHref);
            }
        });

    })
    // If the translation file is not found, log an error
    .catch((error) => {
        if (DEBUG_MODE) console.log('Translation not performed:', error);
    });
