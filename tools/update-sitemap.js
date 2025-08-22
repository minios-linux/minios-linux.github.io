#!/usr/bin/env node

/**
 * Sitemap Generator
 * 
 * This script automatically generates sitemap.xml based on existing translation files.
 * It scans the translations folder and creates entries for all available languages.
 */

const fs = require('fs');
const path = require('path');

function getAvailableLanguages() {
    const translationsDir = path.join(__dirname, '../translations');
    const languages = [];
    
    if (!fs.existsSync(translationsDir)) {
        console.error('Error: translations directory not found');
        return [];
    }
    
    const files = fs.readdirSync(translationsDir);
    
    files.forEach(file => {
        if (file.endsWith('.json') && !file.endsWith('.bak')) {
            const langCode = file.replace('.json', '');
            
            // Validate language file has content
            try {
                const content = JSON.parse(fs.readFileSync(path.join(translationsDir, file), 'utf8'));
                if (content.translations && Object.keys(content.translations).length > 0) {
                    languages.push(langCode);
                }
            } catch (error) {
                console.warn(`Warning: Could not parse ${file}: ${error.message}`);
            }
        }
    });
    
    return languages.sort();
}

function generateSitemap(baseUrl = 'https://minios.dev') {
    const languages = getAvailableLanguages();
    const currentDate = new Date();
    const lastmod = currentDate.toISOString().split('.')[0] + '+00:00';
    
    console.log(`Found ${languages.length} translation files: ${languages.join(', ')}`);
    
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
      xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
            http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">

`;

    // Add main page (default language)
    sitemap += `<url>
  <loc>${baseUrl}/</loc>
  <lastmod>${lastmod}</lastmod>
</url>
`;

    // Add language-specific pages
    languages.forEach(lang => {
        sitemap += `<url>
  <loc>${baseUrl}/?lang=${lang}</loc>
  <lastmod>${lastmod}</lastmod>
</url>
`;
    });

    // Add static external links
    const staticLinks = [
        'https://minios.dev/docs',
        'https://t.me/s/minios_news',
        'https://github.com/minios-linux/minios-live',
        'https://github.com/minios-linux/minios-live/wiki'
    ];

    staticLinks.forEach(url => {
        sitemap += `<url>
  <loc>${url}</loc>
  <lastmod>${lastmod}</lastmod>
</url>
`;
    });

    sitemap += `
</urlset>`;

    return sitemap;
}

function updateSitemap(options = {}) {
    const baseUrl = options.baseUrl || 'https://minios.dev';
    const outputPath = options.output || path.join(__dirname, '../sitemap.xml');
    const dryRun = options.dryRun || false;
    
    console.log('=== Sitemap Generator ===\n');
    console.log(`Base URL: ${baseUrl}`);
    console.log(`Output: ${outputPath}`);
    console.log(`Dry run: ${dryRun ? 'Yes' : 'No'}\n`);
    
    const sitemapContent = generateSitemap(baseUrl);
    
    if (dryRun) {
        console.log('Generated sitemap content:\n');
        console.log(sitemapContent);
        return;
    }
    
    try {
        fs.writeFileSync(outputPath, sitemapContent, 'utf8');
        console.log(`✅ Sitemap updated successfully: ${outputPath}`);
        
        // Show summary
        const languages = getAvailableLanguages();
        console.log(`\n📊 Summary:`);
        console.log(`- Languages: ${languages.length}`);
        console.log(`- Total URLs: ${languages.length + 1 + 4}`); // +1 for main page, +4 for static links
        console.log(`- Available languages: ${languages.join(', ')}`);
        
    } catch (error) {
        console.error(`❌ Error writing sitemap: ${error.message}`);
        process.exit(1);
    }
}

function validateTranslations() {
    console.log('\n🔍 Translation Validation:\n');
    
    const translationsDir = path.join(__dirname, '../translations');
    const files = fs.readdirSync(translationsDir);
    
    files.forEach(file => {
        if (file.endsWith('.json') && !file.endsWith('.bak')) {
            try {
                const content = JSON.parse(fs.readFileSync(path.join(translationsDir, file), 'utf8'));
                const translationCount = Object.keys(content.translations || {}).length;
                const legacyCount = Object.keys(content.legacy || {}).length;
                
                console.log(`${file.padEnd(12)} - ${translationCount.toString().padStart(3)} translations, ${legacyCount.toString().padStart(3)} legacy`);
                
            } catch (error) {
                console.log(`${file.padEnd(12)} - ❌ Invalid JSON: ${error.message}`);
            }
        }
    });
}

// Command line interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const options = {};
    
    // Parse command line arguments
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--base-url':
                options.baseUrl = args[++i];
                break;
            case '--output':
                options.output = args[++i];
                break;
            case '--dry-run':
                options.dryRun = true;
                break;
            case '--validate':
                validateTranslations();
                process.exit(0);
                break;
            case '--help':
                console.log(`
Sitemap Generator for MiniOS Website

Usage: node update-sitemap.js [options]

Options:
  --base-url <url>    Base URL for the sitemap (default: https://minios.dev)
  --output <path>     Output file path (default: ../sitemap.xml)
  --dry-run          Show generated content without writing file
  --validate         Validate translation files and show statistics
  --help             Show this help message

Examples:
  node update-sitemap.js                           # Generate sitemap
  node update-sitemap.js --dry-run                 # Preview sitemap
  node update-sitemap.js --validate                # Check translations
  node update-sitemap.js --base-url https://test.com  # Custom base URL
`);
                process.exit(0);
                break;
            default:
                console.error(`Unknown option: ${args[i]}`);
                console.error('Use --help for usage information');
                process.exit(1);
        }
    }
    
    updateSitemap(options);
}

module.exports = { updateSitemap, getAvailableLanguages, generateSitemap };