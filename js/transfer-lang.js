/**
 * transfer-lang.js
 * This script adds the "lang" parameter to all links on the page
 * based on the user's language specified in the URL or the browser's settings.
 */

// Determine the user's language
let urlParams = new URLSearchParams(window.location.search);
let userLanguage = urlParams.get('lang') || navigator.language || navigator.userLanguage;
userLanguage = userLanguage.substr(0, 2); // Use only the language code (e.g., "en", "ru")

// Update links to add the "lang" parameter
document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('a').forEach(link => {
        let href = link.getAttribute('href');
        if (href && !href.includes('lang=')) { // Avoid duplicate parameters
            let updatedHref = href.includes('?')
                ? `${href}&lang=${userLanguage}`
                : `${href}?lang=${userLanguage}`;
            link.setAttribute('href', updatedHref);
        }
    });
});
