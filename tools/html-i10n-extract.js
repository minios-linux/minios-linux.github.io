#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { program } = require('commander');

class HTMLTextExtractor {
    constructor(htmlFile) {
        this.htmlFile = htmlFile;
    }

    extractText() {
        if (!fs.existsSync(this.htmlFile)) {
            throw new Error(`The file ${this.htmlFile} does not exist.`);
        }

        const contents = fs.readFileSync(this.htmlFile, 'utf8');
        if (!contents) {
            throw new Error(`The file ${this.htmlFile} is empty or cannot be read.`);
        }

        const $ = cheerio.load(contents);
        const texts = [];

        // Select all elements with the same tags as JavaScript translate.js
        const tags = ['title', 'span', 'a', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'strong'];
        
        tags.forEach(tag => {
            $(tag).each(function() {
                console.log(`Processing tag: ${tag}`);
                
                // Get all child nodes of the element (mimicking JavaScript childNodes)
                $(this).contents().each(function() {
                    // Check if the node is a text node (nodeType === 3 in browser)
                    if (this.type === 'text') {
                        // Get the translation key from the node's text content (nodeValue in browser)
                        let translationKey = this.data ? this.data.trim() : '';
                        
                        // Check if the translation key is a single non-breaking space, dot, asterisk, space, or empty
                        // This matches the exact logic from translate.js lines 91-93
                        if ([' ', '.', '*', '\xa0', ''].includes(translationKey)) {
                            return; // Skip this iteration
                        }
                        
                        // Only add non-empty translation keys
                        if (translationKey) {
                            texts.push(translationKey);
                            console.log(`Extracted text: ${translationKey}`);
                        }
                    }
                });
            });
        });

        console.log(`Finished extracting text from ${this.htmlFile}`);
        
        // Remove duplicates and return sorted array
        const uniqueTexts = [...new Set(texts)].sort();
        console.log(`Found ${texts.length} total texts, ${uniqueTexts.length} unique`);
        return uniqueTexts;
    }
}

class JSONConverter {
    constructor(texts, jsonFile, keepMissing) {
        this.texts = texts;
        this.jsonFile = jsonFile;
        this.keepMissing = keepMissing;
    }

    convertToJSON() {
        let existingData = { "translations": {}, "legacy": {} };
        
        try {
            if (fs.existsSync(this.jsonFile)) {
                const fileContent = fs.readFileSync(this.jsonFile, 'utf8');
                existingData = JSON.parse(fileContent);
            }
        } catch (error) {
            console.warn(`Warning: Could not read existing JSON file: ${error.message}`);
        }

        // Ensure existing_data is a dict and has required keys
        if (typeof existingData !== 'object') {
            existingData = { "translations": {}, "legacy": {} };
        }
        existingData.translations = existingData.translations || {};
        existingData.legacy = existingData.legacy || {};

        // Trim keys and values
        const existingTranslations = {};
        const existingLegacy = {};
        
        Object.keys(existingData.translations).forEach(k => {
            const key = k.trim();
            const value = typeof existingData.translations[k] === 'string' ? 
                existingData.translations[k].trim() : existingData.translations[k];
            existingTranslations[key] = value;
        });

        Object.keys(existingData.legacy).forEach(k => {
            const key = k.trim();
            const value = typeof existingData.legacy[k] === 'string' ? 
                existingData.legacy[k].trim() : existingData.legacy[k];
            existingLegacy[key] = value;
        });

        const newTranslations = {};
        
        this.texts.forEach(text => {
            if (text) {
                const translation = existingTranslations[text] || existingLegacy[text] || "";
                newTranslations[text] = translation;
                
                if (translation) {
                    console.log(`Found existing translation: ${text} -> ${translation}`);
                } else {
                    console.log(`No translation found for: ${text}`);
                }
            }
        });

        let missingTranslations = {};
        let legacyTranslations = {};

        if (this.keepMissing) {
            missingTranslations = {};
            Object.keys(existingTranslations).forEach(k => {
                if (!(k in newTranslations)) {
                    missingTranslations[k] = existingTranslations[k];
                }
            });
            
            legacyTranslations = { ...existingLegacy };
            Object.assign(newTranslations, missingTranslations);
        } else {
            Object.keys(existingTranslations).forEach(k => {
                if (!(k in newTranslations)) {
                    missingTranslations[k] = existingTranslations[k];
                }
            });
            
            Object.keys(existingLegacy).forEach(k => {
                if (!(k in newTranslations)) {
                    legacyTranslations[k] = existingLegacy[k];
                }
            });
            
            Object.assign(legacyTranslations, missingTranslations);
        }

        Object.keys(legacyTranslations).forEach(text => {
            console.log(`Legacy translation: ${text} -> ${legacyTranslations[text]}`);
        });

        const translationData = {
            "_comment": "This is a generated JSON file. Modify with care.",
            "translations": newTranslations,
            "legacy": legacyTranslations
        };

        try {
            fs.writeFileSync(this.jsonFile, JSON.stringify(translationData, null, 4), 'utf8');
        } catch (error) {
            throw new Error(`Could not write to file ${this.jsonFile}: ${error.message}`);
        }

        console.log(`Saved translated text to ${this.jsonFile}`);
    }
}

function main() {
    program
        .description('Extract text from HTML files for translation using Node.js')
        .requiredOption('-i, --input <files...>', 'The HTML file(s) to translate. Each file must have an .html extension.')
        .requiredOption('-o, --output <file>', 'The JSON file to store extracted text. The file must have a .json extension.')
        .option('-k, --keep-missing', 'Keep missing translations in the translations section instead of moving them to legacy.')
        .option('-v, --verbose', 'Increase output verbosity')
        .addHelpText('after', `
Requirements:
For Node.js, install required packages with:
    npm install cheerio commander

For other systems, ensure the following Node.js modules are installed:
    cheerio, commander`);

    program.parse();
    const options = program.opts();

    if (!options.verbose) {
        // Suppress console.log if not verbose
        console.log = () => {};
    }

    // Validate input files
    options.input.forEach(inputFile => {
        if (!inputFile.toLowerCase().endsWith('.html')) {
            console.error(`Error: The input file ${inputFile} must have an .html extension.`);
            process.exit(1);
        }
    });

    if (!options.output.toLowerCase().endsWith('.json')) {
        console.error('Error: The output file must have a .json extension.');
        process.exit(1);
    }

    try {
        const allTexts = [];
        
        options.input.forEach(inputFile => {
            const extractor = new HTMLTextExtractor(inputFile);
            const texts = extractor.extractText();
            allTexts.push(...texts);
        });

        const converter = new JSONConverter(allTexts, options.output, options.keepMissing);
        converter.convertToJSON();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { HTMLTextExtractor, JSONConverter };
