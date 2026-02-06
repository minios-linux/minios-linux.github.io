import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import { HttpsProxyAgent } from 'https-proxy-agent'
import type { IncomingMessage, ServerResponse } from 'http'
import type { ViteDevServer, Connect } from 'vite'
import matter from 'gray-matter'

// Default timeout for API requests (ms)
const API_TIMEOUT = 30000;

// API response type
interface ApiResponse {
  status: number;
  data: string;
  error?: string;
}

// Helper function to make HTTP requests with timeout and proper error handling
async function apiRequest(
  url: string,
  options: {
    method: 'GET' | 'POST';
    headers?: Record<string, string>;
    body?: string;
    timeout?: number;
    proxyUrl?: string;
  }
): Promise<ApiResponse> {
  const controller = new AbortController();
  const timeout = options.timeout || API_TIMEOUT;
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  console.log(`[API] ${options.method} ${url}${options.proxyUrl ? ` (via proxy)` : ''}`);

  try {
    // Build fetch options
    const fetchOptions: RequestInit & { dispatcher?: unknown } = {
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body,
      signal: controller.signal,
    };

    // Add proxy agent if proxy URL is provided
    if (options.proxyUrl) {
      const agent = new HttpsProxyAgent(options.proxyUrl);
      // Node.js fetch uses 'dispatcher' for custom agents (undici)
      // But we need to use node-fetch or native https for proxy support
      // Using dynamic import to use node's https module with proxy
      const https = await import('https');
      const http = await import('http');
      const { URL } = await import('url');

      return new Promise((resolve) => {
        const parsedUrl = new URL(url);
        const isHttps = parsedUrl.protocol === 'https:';
        const requestModule = isHttps ? https : http;

        const reqOptions = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (isHttps ? 443 : 80),
          path: parsedUrl.pathname + parsedUrl.search,
          method: options.method,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
          agent: agent,
          timeout: timeout,
        };

        const req = requestModule.request(reqOptions, (res) => {
          // Set encoding to UTF-8 to properly handle non-ASCII characters
          res.setEncoding('utf8');
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            clearTimeout(timeoutId);
            console.log(`[API] Response: ${res.statusCode}, ${data.length} bytes`);
            resolve({ status: res.statusCode || 500, data });
          });
        });

        req.on('error', (err) => {
          clearTimeout(timeoutId);
          console.error(`[API] Request failed:`, err.message);
          resolve({
            status: 500,
            data: JSON.stringify({ error: err.message }),
            error: err.message
          });
        });

        req.on('timeout', () => {
          req.destroy();
          clearTimeout(timeoutId);
          console.error(`[API] Request timeout after ${timeout}ms`);
          resolve({
            status: 408,
            data: JSON.stringify({ error: 'Request timeout' }),
            error: 'Request timeout'
          });
        });

        if (options.body) {
          req.write(options.body);
        }
        req.end();
      });
    }

    const response = await fetch(url, fetchOptions);

    clearTimeout(timeoutId);

    const data = await response.text();
    console.log(`[API] Response: ${response.status}, ${data.length} bytes`);

    return { status: response.status, data };
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    const err = error as Error;
    if (err.name === 'AbortError') {
      console.error(`[API] Request timeout after ${timeout}ms`);
      return {
        status: 408,
        data: JSON.stringify({ error: 'Request timeout' }),
        error: 'Request timeout'
      };
    }

    console.error(`[API] Request failed:`, err.message);
    return {
      status: 500,
      data: JSON.stringify({ error: err.message }),
      error: err.message
    };
  }
}

// Helper to parse request body as JSON
function parseRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString('utf8');
    });
    req.on('error', reject);
    req.on('end', () => resolve(body));
  });
}

// Helper to send JSON response
function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(typeof data === 'string' ? data : JSON.stringify(data));
}

// Language metadata extracted from translation files
interface LanguageMeta {
  code: string;
  name: string;
  flag: string;
}

// Get list of available languages with metadata from translation files
function getLanguagesWithMeta(): LanguageMeta[] {
  const translationsDir = path.resolve(__dirname, 'public', 'translations');
  if (!fs.existsSync(translationsDir)) {
    return [{ code: 'en', name: 'English', flag: '🇺🇸' }];
  }

  const files = fs.readdirSync(translationsDir);
  const languages: LanguageMeta[] = [];

  for (const file of files) {
    if (!file.endsWith('.json') || file === 'languages.json') continue;

    const code = file.replace('.json', '');
    const filePath = path.resolve(translationsDir, file);

    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const meta = content._meta || {};

      languages.push({
        code,
        name: meta.name || code.toUpperCase(),
        flag: meta.flag || ''
      });
    } catch {
      // If file can't be parsed, use code as name
      languages.push({ code, name: code.toUpperCase(), flag: '' });
    }
  }

  return languages.sort((a, b) => a.code.localeCompare(b.code));
}

// Extract all translatable strings from data files
function extractTranslatableKeys(): string[] {
  const dataDir = path.resolve(__dirname, 'data');
  const keys = new Set<string>();

  // Fields that contain translation keys in data files
  const translatableFields = [
    // Core content fields
    'description', 'heroDescription', 'title', 'tagline',
    'footerDescription', 'label', 'includesLabel', 'announcement',
    // Edition/Product names
    'name',
    // Edition specifications
    'cpu', 'ram', 'size', 'requirements',
    // Hero section
    'prefix', 'primaryButton', 'secondaryButton',
    // Section headers
    'sectionTitle', 'sectionSubtitle', 'sectionDescription',
    // Download section
    'isoButton', 'galleryButton', 'sizeLabel', 'ramLabel', 'standardFeaturesLabel',
    // Torrent section
    'subtitle', 'note', 'editionsLabel', 'archLabel',
    // Torrent groups
    'header', 'value', 'mobileDescription',
    // Buttons
    'button', 'githubButton', 'telegramButton', 'reviewButton', 'primaryButtonText',
    // Other
    'heroBadge', 'copyright',
    // Thank you page
    'fallbackPrefix', 'fallbackLink', 'fallbackSuffix'
  ];
  const translatableArrayFields = ['features', 'bulletPoints', 'uiStrings'];

  function extractFromObject(obj: unknown): void {
    if (!obj || typeof obj !== 'object') return;

    if (Array.isArray(obj)) {
      obj.forEach(item => extractFromObject(item));
      return;
    }

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && value.trim()) {
        // Check if this field should be translated
        if (translatableFields.includes(key)) {
          keys.add(value);
        }
      } else if (Array.isArray(value)) {
        if (translatableArrayFields.includes(key)) {
          // Array of strings (features, bulletPoints, uiStrings)
          // Also handles mixed arrays (strings and objects)
          value.forEach(item => {
            if (typeof item === 'string' && item.trim()) {
              keys.add(item);
            } else if (typeof item === 'object' && item !== null) {
              // If it's an object, recursively extract from it
              extractFromObject(item);
            }
          });
        } else {
          // Array of objects (links, groups)
          value.forEach(item => extractFromObject(item));
        }
      } else if (typeof value === 'object') {
        extractFromObject(value);
      }
    }
  }

  // Read all data files
  if (fs.existsSync(dataDir)) {
    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const content = JSON.parse(fs.readFileSync(path.resolve(dataDir, file), 'utf-8'));
        extractFromObject(content);
      } catch (e) {
        console.error(`Failed to parse ${file}:`, e);
      }
    }
  }

  return Array.from(keys).sort();
}

// Extract t('...') calls from source files
function extractCodeTranslationKeys(): string[] {
  const srcDir = path.resolve(__dirname, 'src');
  const keys = new Set<string>();

  // Regex patterns for t('...') and t("...")
  // Matches: t('string'), t("string"), t(`string`)
  const directPatterns = [
    /\bt\(\s*'([^']+)'\s*\)/g,   // t('...')
    /\bt\(\s*"([^"]+)"\s*\)/g,   // t("...")
    /\bt\(\s*`([^`]+)`\s*\)/g,   // t(`...`)
  ];

  // Patterns for fallback strings in t() calls
  // Matches: t(variable || 'fallback'), t(expr || "fallback")
  const fallbackPatterns = [
    /\bt\([^)]+\|\|\s*'([^']+)'\s*\)/g,   // t(... || '...')
    /\bt\([^)]+\|\|\s*"([^"]+)"\s*\)/g,   // t(... || "...")
  ];

  // Patterns for translation keys in config objects
  // Matches: labelKey: 'string', descriptionKey: "string", etc.
  const configPatterns = [
    /(?:labelKey|descriptionKey|titleKey|textKey|messageKey):\s*'([^']+)'/g,
    /(?:labelKey|descriptionKey|titleKey|textKey|messageKey):\s*"([^"]+)"/g,
  ];

  // Patterns for labels objects (e.g., const labels = { key: 'value' })
  // These are objects where values are passed to t() later
  const labelsObjectPattern = /const\s+labels\s*=\s*\{([^}]+)\}/g;
  const labelValuePatterns = [
    /\w+:\s*'([^']+)'/g,   // key: 'value'
    /\w+:\s*"([^"]+)"/g,   // key: "value"
  ];

  function scanFile(filePath: string) {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Extract direct t() calls
    for (const pattern of directPatterns) {
      let match;
      // Reset regex lastIndex for each file
      pattern.lastIndex = 0;
      while ((match = pattern.exec(content)) !== null) {
        const key = match[1];
        // Skip if key contains ${} (template literal with variables)
        if (!key.includes('${')) {
          keys.add(key);
        }
      }
    }

    // Extract keys from config objects (labelKey, descriptionKey, etc.)
    for (const pattern of configPatterns) {
      let match;
      pattern.lastIndex = 0;
      while ((match = pattern.exec(content)) !== null) {
        keys.add(match[1]);
      }
    }

    // Extract fallback strings from t(variable || 'fallback') patterns
    for (const pattern of fallbackPatterns) {
      let match;
      pattern.lastIndex = 0;
      while ((match = pattern.exec(content)) !== null) {
        keys.add(match[1]);
      }
    }

    // Extract keys from labels objects (const labels = { key: 'value' })
    labelsObjectPattern.lastIndex = 0;
    let labelsMatch;
    while ((labelsMatch = labelsObjectPattern.exec(content)) !== null) {
      const labelsContent = labelsMatch[1];
      for (const pattern of labelValuePatterns) {
        let valueMatch;
        pattern.lastIndex = 0;
        while ((valueMatch = pattern.exec(labelsContent)) !== null) {
          keys.add(valueMatch[1]);
        }
      }
    }
  }

  function scanDir(dir: string) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const itemPath = path.resolve(dir, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        // Skip node_modules and hidden directories
        if (!item.startsWith('.') && item !== 'node_modules') {
          scanDir(itemPath);
        }
      } else if (stat.isFile() && (item.endsWith('.tsx') || item.endsWith('.ts'))) {
        scanFile(itemPath);
      }
    }
  }

  scanDir(srcDir);

  console.log(`[i18n] Extracted ${keys.size} translation keys from source code`);
  return Array.from(keys).sort();
}

// Get all translation keys (from data files + source code)
function getAllTranslationKeys(): string[] {
  const dataKeys = extractTranslatableKeys();
  const codeKeys = extractCodeTranslationKeys();

  const allKeys = new Set([...dataKeys, ...codeKeys]);
  return Array.from(allKeys).sort();
}

// Sync translation files - add missing keys to all translation files
function syncTranslations(): { added: number; removed: number; total: number; files: string[] } {
  const translationsDir = path.resolve(__dirname, 'public', 'translations');
  const keys = getAllTranslationKeys(); // Use combined keys from data + code
  const keysSet = new Set(keys);
  const files = fs.readdirSync(translationsDir).filter(f => f.endsWith('.json') && f !== 'languages.json');

  let totalAdded = 0;
  let totalRemoved = 0;
  const updatedFiles: string[] = [];

  for (const file of files) {
    const filePath = path.resolve(translationsDir, file);
    const langCode = file.replace('.json', '');

    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const translations = content.translations || {};
      let addedCount = 0;
      let removedCount = 0;

      // Add missing keys
      for (const key of keys) {
        if (!(key in translations)) {
          // For English, use the key as value; for others, use empty string
          translations[key] = langCode === 'en' ? key : '';
          addedCount++;
        }
      }

      // Remove obsolete keys (keys that no longer exist in data files or code)
      for (const existingKey of Object.keys(translations)) {
        if (!keysSet.has(existingKey)) {
          delete translations[existingKey];
          removedCount++;
        }
      }

      if (addedCount > 0 || removedCount > 0) {
        // Sort translations alphabetically
        const sortedTranslations: Record<string, string> = {};
        Object.keys(translations).sort().forEach(k => {
          sortedTranslations[k] = translations[k];
        });

        content.translations = sortedTranslations;
        fs.writeFileSync(filePath, JSON.stringify(content, null, 4), 'utf-8');
        totalAdded += addedCount;
        totalRemoved += removedCount;

        const changes: string[] = [];
        if (addedCount > 0) changes.push(`+${addedCount}`);
        if (removedCount > 0) changes.push(`-${removedCount}`);
        updatedFiles.push(`${file} (${changes.join(', ')})`);
      }
    } catch (e) {
      console.error(`Failed to sync ${file}:`, e);
    }
  }

  return { added: totalAdded, removed: totalRemoved, total: keys.length, files: updatedFiles };
}

// Get translation stats - which keys are missing/untranslated
function getTranslationStats(): Record<string, { total: number; translated: number; missing: string[] }> {
  const translationsDir = path.resolve(__dirname, 'public', 'translations');
  const keys = getAllTranslationKeys(); // Use combined keys from data + code
  const files = fs.readdirSync(translationsDir).filter(f => f.endsWith('.json') && f !== 'languages.json');

  const stats: Record<string, { total: number; translated: number; missing: string[] }> = {};

  for (const file of files) {
    const filePath = path.resolve(translationsDir, file);
    const langCode = file.replace('.json', '');

    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const translations = content.translations || {};
      const missing: string[] = [];
      let translated = 0;

      for (const key of keys) {
        const value = translations[key];
        // Consider translated if value exists and is not empty
        if (value && value.trim() !== '') {
          translated++;
        } else {
          missing.push(key);
        }
      }

      stats[langCode] = { total: keys.length, translated, missing };
    } catch {
      stats[langCode] = { total: keys.length, translated: 0, missing: keys };
    }
  }

  return stats;
}

// ═══════════════════════════════════════════════════════════════
// BLOG FUNCTIONS
// ═══════════════════════════════════════════════════════════════

interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author?: string;
  publishedAt: string;
  updatedAt?: string;
  tags?: string[];
  featuredImage?: string;
  published: boolean;
  order?: number;
  telegramDiscussion?: string;
  telegramPostId?: number;
}

// Parse single .md file with YAML frontmatter
function parseBlogPost(filePath: string, slug: string): BlogPost | null {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(fileContent);

    return {
      slug,
      title: data.title || '',
      excerpt: data.excerpt || '',
      content,
      author: data.author,
      publishedAt: data.publishedAt || new Date().toISOString(),
      updatedAt: data.updatedAt,
      tags: data.tags || [],
      featuredImage: data.featuredImage,
      published: data.published !== undefined ? data.published : true,
      order: data.order || 0,
      telegramDiscussion: data.telegramDiscussion,
      telegramPostId: data.telegramPostId
    };
  } catch (error) {
    console.error(`Failed to parse blog post ${slug}:`, error);
    return null;
  }
}

// Get all blog posts from data/blog/posts/
function getAllBlogPosts(includeContent = false, lang?: string): Omit<BlogPost, 'content'>[] | BlogPost[] {
  const postsDir = path.resolve(__dirname, 'data', 'blog', 'posts');

  if (!fs.existsSync(postsDir)) {
    return [];
  }

  const posts: (Omit<BlogPost, 'content'> | BlogPost)[] = [];
  const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'));

  for (const file of files) {
    const slug = file.replace('.md', '');
    let filePath = path.resolve(postsDir, file);

    // Check for translated version if language is specified
    if (lang && lang !== 'en') {
      const translatedPath = path.resolve(postsDir, 'translations', `${slug}.${lang}.md`);
      if (fs.existsSync(translatedPath)) {
        filePath = translatedPath;
      }
    }

    const post = parseBlogPost(filePath, slug);
    if (post) {
      if (includeContent) {
        posts.push(post);
      } else {
        // Remove content for listing - eslint-disable-next-line doesn't work with destructuring
        // so we use omit helper approach
        const { content: _, ...postWithoutContent } = post;
        void _; // Mark as used
        posts.push(postWithoutContent);
      }
    }
  }

  // Sort by publishedAt (newest first)
  posts.sort((a, b) => {
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });

  return posts as (Omit<BlogPost, 'content'>[] | BlogPost[]);
}

// Save blog post (create or update)
function saveBlogPost(slug: string, frontmatter: Record<string, unknown>, content: string, lang?: string): void {
  const postsDir = path.resolve(__dirname, 'data', 'blog', 'posts');

  if (!fs.existsSync(postsDir)) {
    fs.mkdirSync(postsDir, { recursive: true });
  }

  let filePath: string;
  if (lang && lang !== 'en') {
    const translationsDir = path.resolve(postsDir, 'translations');
    if (!fs.existsSync(translationsDir)) {
      fs.mkdirSync(translationsDir, { recursive: true });
    }
    filePath = path.resolve(translationsDir, `${slug}.${lang}.md`);
  } else {
    filePath = path.resolve(postsDir, `${slug}.md`);
  }

  // Build frontmatter + content
  const fileContent = matter.stringify(content, frontmatter);
  fs.writeFileSync(filePath, fileContent, 'utf-8');
}

// Delete blog post
function deleteBlogPost(slug: string): void {
  const postsDir = path.resolve(__dirname, 'data', 'blog', 'posts');
  const filePath = path.resolve(postsDir, `${slug}.md`);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  // Also delete translations
  const translationsDir = path.resolve(postsDir, 'translations');
  if (fs.existsSync(translationsDir)) {
    const files = fs.readdirSync(translationsDir).filter(f => f.startsWith(`${slug}.`));
    for (const file of files) {
      fs.unlinkSync(path.resolve(translationsDir, file));
    }
  }
}

// Delete a specific blog post translation
function deleteBlogTranslation(slug: string, lang: string): void {
  const postsDir = path.resolve(__dirname, 'data', 'blog', 'posts');
  const translationsDir = path.resolve(postsDir, 'translations');
  const filePath = path.resolve(translationsDir, `${slug}.${lang}.md`);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

// Delete all translations for a specific language
function deleteAllBlogTranslationsForLanguage(lang: string): void {
  const postsDir = path.resolve(__dirname, 'data', 'blog', 'posts');
  const translationsDir = path.resolve(postsDir, 'translations');

  if (fs.existsSync(translationsDir)) {
    const files = fs.readdirSync(translationsDir).filter(f => f.endsWith(`.${lang}.md`));
    for (const file of files) {
      fs.unlinkSync(path.resolve(translationsDir, file));
    }
  }
}

// Delete all translations for all languages
function deleteAllBlogTranslations(): void {
  const postsDir = path.resolve(__dirname, 'data', 'blog', 'posts');
  const translationsDir = path.resolve(postsDir, 'translations');

  if (fs.existsSync(translationsDir)) {
    const files = fs.readdirSync(translationsDir);
    for (const file of files) {
      if (file.endsWith('.md')) {
        fs.unlinkSync(path.resolve(translationsDir, file));
      }
    }
  }
}

// Get all unique tags
function getAllBlogTags(): string[] {
  const posts = getAllBlogPosts(false) as Omit<BlogPost, 'content'>[];
  const tagsSet = new Set<string>();

  for (const post of posts) {
    if (post.tags) {
      for (const tag of post.tags) {
        tagsSet.add(tag);
      }
    }
  }

  return Array.from(tagsSet).sort();
}

// Plugin to handle saving JSON data in dev mode and copy data to dist on build
function localDataPlugin() {
  return {
    name: 'local-data-plugin',

    // Run translation sync on startup (both dev and build)
    buildStart() {
      console.log('[i18n] Syncing translation keys...');
      const result = syncTranslations();
      if (result.added > 0 || result.removed > 0) {
        console.log(`[i18n] Updated translations: +${result.added} added, -${result.removed} removed (${result.total} total keys)`);
        if (result.files.length > 0) {
          console.log(`[i18n] Modified files: ${result.files.join(', ')}`);
        }
      } else {
        console.log(`[i18n] Translations up to date (${result.total} keys)`);
      }
    },

    configureServer(server: ViteDevServer) {
      // Serve data folder in dev mode
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
        // Debug logging
        if (req.url?.startsWith('/api/')) {
          console.log('[API Request]', req.method, req.url);
        }

        // API endpoint to get available languages with metadata (dynamic discovery)
        if (req.url === '/api/languages') {
          const languages = getLanguagesWithMeta();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(languages));
          return;
        }

        // API endpoint to sync translations - add missing keys to all translation files
        if (req.method === 'POST' && req.url === '/api/translations/sync') {
          try {
            const result = syncTranslations();
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result));
          } catch {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Failed to sync translations' }));
          }
          return;
        }

        // API endpoint to get translation stats
        if (req.url === '/api/translations/stats') {
          try {
            const stats = getTranslationStats();
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(stats));
          } catch {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Failed to get translation stats' }));
          }
          return;
        }

        // API endpoint to get all translatable keys from data files
        if (req.url === '/api/translations/keys') {
          try {
            const keys = getAllTranslationKeys();
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ keys }));
          } catch {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Failed to get translation keys' }));
          }
          return;
        }

        // API endpoint to update translations for a specific language
        if (req.method === 'POST' && req.url === '/api/translations/update') {
          let body = '';
          req.on('data', (chunk: Buffer) => {
            body += chunk.toString('utf8');
          });
          req.on('end', () => {
            try {
              const { langCode, translations: newTranslations } = JSON.parse(body);

              // Validate langCode
              if (!langCode || typeof langCode !== 'string' || langCode.includes('..') || langCode.includes('/')) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Invalid language code' }));
                return;
              }

              const filePath = path.resolve(__dirname, 'public', 'translations', `${langCode}.json`);

              if (!fs.existsSync(filePath)) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Language file not found' }));
                return;
              }

              // Read existing file to preserve _meta
              const existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

              // Sort translations alphabetically
              const sortedTranslations: Record<string, string> = {};
              Object.keys(newTranslations).sort().forEach(k => {
                sortedTranslations[k] = newTranslations[k];
              });

              // Merge with existing structure (preserve _meta)
              const updated = {
                _meta: existing._meta,
                translations: sortedTranslations
              };

              fs.writeFileSync(filePath, JSON.stringify(updated, null, 4), 'utf-8');

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, updated: Object.keys(newTranslations).length }));
            } catch (error) {
              console.error('Failed to update translations:', error);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Failed to update translations' }));
            }
          });
          return;
        }

        // API endpoint to create a new language
        if (req.method === 'POST' && req.url === '/api/languages/create') {
          let body = '';
          req.on('data', (chunk: Buffer) => {
            body += chunk.toString('utf8');
          });
          req.on('end', () => {
            try {
              const { code, name, flag } = JSON.parse(body);

              // Validate inputs
              if (!code || !name) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Language code and name are required' }));
                return;
              }

              // Validate code format: BCP 47 (e.g., "en", "pt-BR", "zh-Hans")
              if (!/^[a-z]{2,3}(-[A-Z][a-z]{1,3})?(-[A-Z]{2})?$/.test(code)) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Invalid language code format. Use BCP 47 (e.g., "pl", "pt-BR", "zh-Hans")' }));
                return;
              }

              const filePath = path.resolve(__dirname, 'public', 'translations', `${code}.json`);

              // Check if already exists
              if (fs.existsSync(filePath)) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Language already exists' }));
                return;
              }

              // Get all keys from data files and source code
              const keys = getAllTranslationKeys();

              // Create new language file with empty translations (or key=value for English)
              const isEnglish = code === 'en';
              const newContent = {
                _meta: {
                  name: name,
                  flag: flag || ''
                },
                translations: Object.fromEntries(keys.map(k => [k, isEnglish ? k : '']))
              };

              fs.writeFileSync(filePath, JSON.stringify(newContent, null, 4), 'utf-8');

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, code, keys: keys.length }));
            } catch (error) {
              console.error('Failed to create language:', error);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Failed to create language' }));
            }
          });
          return;
        }

        // API endpoint to update language metadata
        if (req.method === 'POST' && req.url === '/api/languages/update') {
          let body = '';
          req.on('data', (chunk: Buffer) => {
            body += chunk.toString('utf8');
          });
          req.on('end', () => {
            try {
              const { code, name, flag } = JSON.parse(body);

              if (!code) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Language code is required' }));
                return;
              }

              const filePath = path.resolve(__dirname, 'public', 'translations', `${code}.json`);

              if (!fs.existsSync(filePath)) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Language not found' }));
                return;
              }

              const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
              content._meta = {
                name: name || content._meta?.name || code,
                flag: flag !== undefined ? flag : (content._meta?.flag || '')
              };

              fs.writeFileSync(filePath, JSON.stringify(content, null, 4), 'utf-8');

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (error) {
              console.error('Failed to update language:', error);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Failed to update language' }));
            }
          });
          return;
        }

        // API endpoint to delete language
        if (req.method === 'POST' && req.url === '/api/languages/delete') {
          let body = '';
          req.on('data', (chunk: Buffer) => {
            body += chunk.toString('utf8');
          });
          req.on('end', () => {
            try {
              const { code } = JSON.parse(body);

              if (!code) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Language code is required' }));
                return;
              }

              const filePath = path.resolve(__dirname, 'public', 'translations', `${code}.json`);

              if (!fs.existsSync(filePath)) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Language not found' }));
                return;
              }

              fs.unlinkSync(filePath);

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (error) {
              console.error('Failed to delete language:', error);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Failed to delete language' }));
            }
          });
          return;
        }

        // API endpoint to proxy AI requests (to avoid CORS)
        if (req.method === 'POST' && req.url === '/api/ai/translate') {
          parseRequestBody(req)
            .then(async (body) => {
              try {
                const { endpoint, headers, body: requestBody, proxyUrl } = JSON.parse(body);

                // Debug: Log request details
                console.log('\n[AI Translate] ═══════════════════════════════════════');
                console.log('[AI Translate] Endpoint:', endpoint);
                console.log('[AI Translate] Proxy:', proxyUrl || '(none)');
                console.log('[AI Translate] Headers:', JSON.stringify(headers, null, 2));

                // Parse and log the request body for debugging
                try {
                  const parsedBody = JSON.parse(requestBody);
                  console.log('[AI Translate] Model:', parsedBody.model);
                  if (parsedBody.messages) {
                    console.log('[AI Translate] Messages count:', parsedBody.messages.length);
                    // Log user message content (the translation request)
                    const userMsg = parsedBody.messages.find((m: { role: string }) => m.role === 'user');
                    if (userMsg) {
                      const content = typeof userMsg.content === 'string'
                        ? userMsg.content
                        : JSON.stringify(userMsg.content);
                      console.log('[AI Translate] User message (first 500 chars):', content.substring(0, 500));
                    }
                  }
                } catch {
                  console.log('[AI Translate] Request body (raw, first 500 chars):', requestBody.substring(0, 500));
                }

                // Check if API key is provided (Authorization header or x-goog-api-key)
                // OpenCode and OpenCode Local don't require API key
                const hasAuth = headers?.['Authorization'] || headers?.['x-goog-api-key'];
                const isOpenCode = endpoint?.includes('opencode.ai') || endpoint?.includes('/api/ai/opencode-local');
                if (!hasAuth && !isOpenCode) {
                  console.log('[AI Translate] ERROR: No API key provided');
                  sendJson(res, 400, { error: 'API key is required' });
                  return;
                }

                console.log('[AI Translate] Sending request...');
                const startTime = Date.now();

                // Check if this is a request to OpenCode Local (local endpoint)
                let response: ApiResponse;
                if (endpoint === '/api/ai/opencode-local' || endpoint.startsWith('/api/ai/opencode-local')) {
                  // OpenCode Local - handle directly instead of proxying
                  console.log('[AI Translate] Redirecting to OpenCode Local handler');
                  try {
                    const { prompt, model, proxyUrl: localProxyUrl } = JSON.parse(requestBody);
                    const timeoutMs = 300 * 1000; // 5 min default

                    console.log('\n[OpenCode Local] ═══════════════════════════════════════');
                    console.log('[OpenCode Local] Model:', model);
                    console.log('[OpenCode Local] Proxy:', localProxyUrl || proxyUrl || '(none)');
                    console.log('[OpenCode Local] Timeout:', (timeoutMs / 1000) + 's');
                    console.log('[OpenCode Local] Prompt (first 300 chars):', prompt.substring(0, 300));

                    const { spawn } = await import('child_process');

                    // Build command arguments
                    const args = ['run', '--format', 'json'];
                    if (model) {
                      args.push('-m', model);
                    }

                    // Build environment with proxy if specified
                    const env = { ...process.env };
                    const effectiveProxy = localProxyUrl || proxyUrl;
                    if (effectiveProxy) {
                      env.HTTPS_PROXY = effectiveProxy;
                      env.HTTP_PROXY = effectiveProxy;
                    }

                    console.log('[OpenCode Local] Running: opencode', args.join(' '));
                    const openCodeStartTime = Date.now();

                    const child = spawn('opencode', args, {
                      env,
                      stdio: ['pipe', 'pipe', 'pipe']
                    });

                    // Send prompt to stdin
                    child.stdin.write(prompt);
                    child.stdin.end();

                    // Collect output
                    const result = await new Promise<{ status: number; data: string }>((resolve) => {
                      let stdout = '';
                      let stderr = '';
                      let responseSent = false;

                      const sendResponse = (status: number, data: unknown) => {
                        if (responseSent) return;
                        responseSent = true;
                        resolve({ status, data: typeof data === 'string' ? data : JSON.stringify(data) });
                      };

                      child.stdout.on('data', (data: Buffer) => {
                        stdout += data.toString();
                      });

                      child.stderr.on('data', (data: Buffer) => {
                        stderr += data.toString();
                      });

                      child.on('close', (code) => {
                        const elapsed = Date.now() - openCodeStartTime;
                        console.log(`[OpenCode Local] Exit code: ${code} (${elapsed}ms)`);

                        if (code !== 0) {
                          console.log('[OpenCode Local] Stderr:', stderr.substring(0, 500));
                          sendResponse(500, { error: `OpenCode exited with code ${code}`, stderr });
                          return;
                        }

                        // Parse JSON events from stdout and extract text
                        try {
                          const lines = stdout.trim().split('\n');
                          let textContent = '';

                          for (const line of lines) {
                            if (!line.trim()) continue;
                            try {
                              const event = JSON.parse(line);
                              if (event.type === 'text' && event.part?.text) {
                                textContent += event.part.text;
                              }
                            } catch {
                              // Skip non-JSON lines
                            }
                          }

                          console.log('[OpenCode Local] Response (first 500 chars):', textContent.substring(0, 500));
                          console.log('[OpenCode Local] ═══════════════════════════════════════\n');

                          // Return in OpenAI-compatible format
                          sendResponse(200, {
                            choices: [{
                              message: {
                                content: textContent,
                                role: 'assistant'
                              }
                            }]
                          });
                        } catch (parseError) {
                          console.error('[OpenCode Local] Parse error:', parseError);
                          sendResponse(500, { error: 'Failed to parse opencode output', stdout });
                        }
                      });

                      child.on('error', (err) => {
                        console.error('[OpenCode Local] Spawn error:', err);
                        sendResponse(500, { error: 'Failed to run opencode: ' + err.message });
                      });

                      // Timeout
                      setTimeout(() => {
                        if (!child.killed) {
                          child.kill();
                          sendResponse(408, { error: `OpenCode request timeout (${timeoutMs / 1000}s)` });
                        }
                      }, timeoutMs);
                    });

                    response = result;
                  } catch (error) {
                    console.error('[OpenCode Local] Exception:', error);
                    response = {
                      status: 500,
                      data: JSON.stringify({ error: 'OpenCode request failed: ' + (error as Error).message }),
                      error: (error as Error).message,
                    };
                  }
                } else {
                  // External endpoint - use apiRequest with proxy support
                  response = await apiRequest(endpoint, {
                    method: 'POST',
                    headers,
                    body: requestBody,
                    timeout: 60000, // 60s for translation requests
                    proxyUrl: proxyUrl || undefined,
                  });
                }

                const elapsed = Date.now() - startTime;
                console.log(`[AI Translate] Response status: ${response.status} (${elapsed}ms)`);

                // Debug: Log response
                if (response.status >= 400) {
                  console.log('[AI Translate] ERROR Response:', response.data.substring(0, 1000));
                } else {
                  // Try to parse and show the translated content
                  try {
                    const parsed = JSON.parse(response.data);
                    const content = parsed.choices?.[0]?.message?.content;
                    if (content) {
                      console.log('[AI Translate] Translation result (first 500 chars):', content.substring(0, 500));
                    } else {
                      console.log('[AI Translate] Response (first 500 chars):', response.data.substring(0, 500));
                    }
                  } catch {
                    console.log('[AI Translate] Response (first 500 chars):', response.data.substring(0, 500));
                  }
                }
                console.log('[AI Translate] ═══════════════════════════════════════\n');

                sendJson(res, response.status, response.data);
              } catch (error) {
                console.error('[AI Translate] Exception:', error);
                sendJson(res, 500, { error: 'AI request failed: ' + (error as Error).message });
              }
            })
            .catch((err) => {
              console.error('[AI Translate] Request parse error:', err);
              sendJson(res, 500, { error: 'Request error: ' + err.message });
            });
          return;
        }

        // API endpoint to proxy AI models list requests (to avoid CORS)
        if (req.method === 'POST' && req.url === '/api/ai/models') {
          parseRequestBody(req)
            .then(async (body) => {
              try {
                const { endpoint, headers, proxyUrl } = JSON.parse(body);

                // Debug: Log request details
                console.log('\n[AI Models] ───────────────────────────────────────');
                console.log('[AI Models] Endpoint:', endpoint);
                console.log('[AI Models] Proxy:', proxyUrl || '(none)');
                console.log('[AI Models] Has Authorization:', !!headers?.['Authorization']);
                console.log('[AI Models] Has x-goog-api-key:', !!headers?.['x-goog-api-key']);

                // Check if API key is provided (some providers don't require key for models list)
                const hasAuth = headers?.['Authorization'] || headers?.['x-goog-api-key'];
                // For Groq and Google, require auth for models list
                const requiresAuth = endpoint?.includes('groq.com') || endpoint?.includes('googleapis.com');
                if (requiresAuth && !hasAuth) {
                  console.log('[AI Models] ERROR: API key required but not provided');
                  sendJson(res, 400, { error: 'API key is required', data: [] });
                  return;
                }

                console.log('[AI Models] Fetching models...');
                const startTime = Date.now();

                const response = await apiRequest(endpoint, {
                  method: 'GET',
                  headers,
                  timeout: 15000, // 15s for models list
                  proxyUrl: proxyUrl || undefined,
                });

                const elapsed = Date.now() - startTime;
                console.log(`[AI Models] Response status: ${response.status} (${elapsed}ms)`);

                // Debug: Log response
                if (response.status >= 400) {
                  console.log('[AI Models] ERROR Response:', response.data.substring(0, 500));
                } else {
                  try {
                    const parsed = JSON.parse(response.data);
                    const models = parsed.data || parsed.models || [];
                    console.log('[AI Models] Models count:', models.length);
                    if (models.length > 0) {
                      console.log('[AI Models] First 5 models:', models.slice(0, 5).map((m: { id?: string; name?: string }) => m.id || m.name).join(', '));
                    }
                  } catch {
                    console.log('[AI Models] Response (first 300 chars):', response.data.substring(0, 300));
                  }
                }
                console.log('[AI Models] ───────────────────────────────────────\n');

                sendJson(res, response.status, response.data);
              } catch (error) {
                console.error('[AI Models] Exception:', error);
                sendJson(res, 500, { error: 'Failed to fetch models: ' + (error as Error).message });
              }
            })
            .catch((err) => {
              console.error('[AI Models] Request parse error:', err);
              sendJson(res, 500, { error: 'Request error: ' + err.message });
            });
          return;
        }

        // API endpoint to run gemini CLI locally for AI translation
        if (req.method === 'POST' && req.url === '/api/ai/gemini-cli') {
          parseRequestBody(req)
            .then(async (body) => {
              try {
                const { prompt, model, projectId } = JSON.parse(body);

                console.log('\n[Gemini CLI] ═══════════════════════════════════════');
                console.log('[Gemini CLI] Model:', model || '(default)');
                console.log('[Gemini CLI] Project ID:', projectId || '(not set)');
                console.log('[Gemini CLI] Prompt (first 300 chars):', prompt.substring(0, 300));

                const { spawn } = await import('child_process');

                // Build command arguments
                const args = ['-y', '-o', 'json'];
                if (model) {
                  args.push('-m', model);
                }
                args.push(prompt);

                // Build environment with project ID
                const env = { ...process.env };
                if (projectId) {
                  env.GOOGLE_CLOUD_PROJECT = projectId;
                }

                console.log('[Gemini CLI] Running: gemini', args.slice(0, 3).join(' '), '...');
                const startTime = Date.now();

                const child = spawn('gemini', args, {
                  env,
                  stdio: ['pipe', 'pipe', 'pipe']
                });

                let stdout = '';
                let stderr = '';
                let responseSent = false;

                const sendResponseOnce = (status: number, data: unknown) => {
                  if (responseSent) return;
                  responseSent = true;
                  sendJson(res, status, data);
                };

                child.stdout.on('data', (data: Buffer) => {
                  stdout += data.toString();
                });

                child.stderr.on('data', (data: Buffer) => {
                  stderr += data.toString();
                });

                child.on('close', (code) => {
                  const elapsed = Date.now() - startTime;
                  console.log(`[Gemini CLI] Exit code: ${code} (${elapsed}ms)`);

                  if (code !== 0) {
                    console.log('[Gemini CLI] Stderr:', stderr.substring(0, 500));
                    sendResponseOnce(500, { error: `Gemini exited with code ${code}`, stderr });
                    return;
                  }

                  // Parse JSON output from gemini CLI
                  try {
                    const result = JSON.parse(stdout);
                    console.log('[Gemini CLI] Response (first 500 chars):', (result.response || '').substring(0, 500));
                    console.log('[Gemini CLI] ═══════════════════════════════════════\n');

                    // Return in OpenAI-compatible format
                    sendResponseOnce(200, {
                      response: result.response,
                      choices: [{
                        message: {
                          content: result.response,
                          role: 'assistant'
                        }
                      }]
                    });
                  } catch (parseError) {
                    console.error('[Gemini CLI] Parse error:', parseError);
                    console.log('[Gemini CLI] Raw stdout:', stdout.substring(0, 500));
                    sendResponseOnce(500, { error: 'Failed to parse gemini output', stdout });
                  }
                });

                child.on('error', (err) => {
                  console.error('[Gemini CLI] Spawn error:', err);
                  sendResponseOnce(500, { error: 'Failed to run gemini: ' + err.message });
                });

                // Timeout 5 min
                setTimeout(() => {
                  if (!child.killed) {
                    child.kill();
                    sendResponseOnce(408, { error: 'Gemini request timeout (5 min)' });
                  }
                }, 300000);

              } catch (error) {
                console.error('[Gemini CLI] Exception:', error);
                sendJson(res, 500, { error: 'Gemini request failed: ' + (error as Error).message });
              }
            })
            .catch((err) => {
              console.error('[Gemini CLI] Request parse error:', err);
              sendJson(res, 500, { error: 'Request error: ' + err.message });
            });
          return;
        }

        // API endpoint to run opencode CLI locally for AI translation
        if (req.method === 'POST' && req.url === '/api/ai/opencode-local') {
          parseRequestBody(req)
            .then(async (body) => {
              try {
                const { prompt, model, proxyUrl, timeout } = JSON.parse(body);
                const timeoutMs = (timeout || 300) * 1000; // default 5 min, convert to ms

                console.log('\n[OpenCode Local] ═══════════════════════════════════════');
                console.log('[OpenCode Local] Model:', model);
                console.log('[OpenCode Local] Proxy:', proxyUrl || '(none)');
                console.log('[OpenCode Local] Timeout:', (timeoutMs / 1000) + 's');
                console.log('[OpenCode Local] Prompt (first 300 chars):', prompt.substring(0, 300));

                const { spawn } = await import('child_process');

                // Build command arguments
                const args = ['run', '--format', 'json'];
                if (model) {
                  args.push('-m', model);
                }

                // Build environment with proxy if specified
                const env = { ...process.env };
                if (proxyUrl) {
                  env.HTTPS_PROXY = proxyUrl;
                  env.HTTP_PROXY = proxyUrl;
                }

                console.log('[OpenCode Local] Running: opencode', args.join(' '));
                const startTime = Date.now();

                const child = spawn('opencode', args, {
                  env,
                  stdio: ['pipe', 'pipe', 'pipe']
                });

                // Send prompt to stdin
                child.stdin.write(prompt);
                child.stdin.end();

                let stdout = '';
                let stderr = '';
                let responseSent = false;

                const sendResponse = (status: number, data: unknown) => {
                  if (responseSent) return;
                  responseSent = true;
                  sendJson(res, status, data);
                };

                child.stdout.on('data', (data: Buffer) => {
                  stdout += data.toString();
                });

                child.stderr.on('data', (data: Buffer) => {
                  stderr += data.toString();
                });

                child.on('close', (code) => {
                  const elapsed = Date.now() - startTime;
                  console.log(`[OpenCode Local] Exit code: ${code} (${elapsed}ms)`);

                  if (code !== 0) {
                    console.log('[OpenCode Local] Stderr:', stderr.substring(0, 500));
                    sendResponse(500, { error: `OpenCode exited with code ${code}`, stderr });
                    return;
                  }

                  // Parse JSON events from stdout and extract text
                  try {
                    const lines = stdout.trim().split('\n');
                    let textContent = '';

                    for (const line of lines) {
                      if (!line.trim()) continue;
                      try {
                        const event = JSON.parse(line);
                        if (event.type === 'text' && event.part?.text) {
                          textContent += event.part.text;
                        }
                      } catch {
                        // Skip non-JSON lines
                      }
                    }

                    console.log('[OpenCode Local] Response (first 500 chars):', textContent.substring(0, 500));
                    console.log('[OpenCode Local] ═══════════════════════════════════════\n');

                    // Return in OpenAI-compatible format
                    sendResponse(200, {
                      choices: [{
                        message: {
                          content: textContent,
                          role: 'assistant'
                        }
                      }]
                    });
                  } catch (parseError) {
                    console.error('[OpenCode Local] Parse error:', parseError);
                    sendResponse(500, { error: 'Failed to parse opencode output', stdout });
                  }
                });

                child.on('error', (err) => {
                  console.error('[OpenCode Local] Spawn error:', err);
                  sendResponse(500, { error: 'Failed to run opencode: ' + err.message });
                });

                // Timeout based on user setting
                setTimeout(() => {
                  if (!child.killed) {
                    child.kill();
                    sendResponse(408, { error: `OpenCode request timeout (${timeoutMs / 1000}s)` });
                  }
                }, timeoutMs);

              } catch (error) {
                console.error('[OpenCode Local] Exception:', error);
                sendJson(res, 500, { error: 'OpenCode request failed: ' + (error as Error).message });
              }
            })
            .catch((err) => {
              console.error('[OpenCode Local] Request parse error:', err);
              sendJson(res, 500, { error: 'Request error: ' + err.message });
            });
          return;
        }

        // API endpoint to get models from local opencode CLI
        if (req.method === 'GET' && req.url === '/api/ai/opencode-local/models') {
          (async () => {
            const { spawn } = await import('child_process');

            console.log('[OpenCode Local Models] Fetching models...');

            const child = spawn('opencode', ['models'], {
              stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';
            let responseSent = false;

            const sendResponse = (status: number, data: unknown) => {
              if (responseSent) return;
              responseSent = true;
              sendJson(res, status, data);
            };

            child.stdout.on('data', (data: Buffer) => {
              stdout += data.toString();
            });

            child.stderr.on('data', (data: Buffer) => {
              stderr += data.toString();
            });

            child.on('close', (code) => {
              if (code !== 0) {
                console.log('[OpenCode Local Models] Error:', stderr);
                sendResponse(500, { error: 'Failed to get models', models: [] });
                return;
              }

              // Parse models - one per line
              const models = stdout.trim().split('\n').filter(m => m.trim());
              console.log('[OpenCode Local Models] Found', models.length, 'models');
              sendResponse(200, { models });
            });

            child.on('error', (err) => {
              console.error('[OpenCode Local Models] Spawn error:', err);
              sendResponse(500, { error: 'opencode not found', models: [] });
            });

            // Timeout after 15 seconds
            setTimeout(() => {
              if (!child.killed) {
                child.kill();
                sendResponse(408, { error: 'Timeout', models: [] });
              }
            }, 15000);
          })();
          return;
        }

        // API endpoint to get models from local Ollama
        if (req.method === 'GET' && req.url === '/api/ai/ollama-models') {
          (async () => {
            try {
              console.log('[Ollama Models] Fetching models from localhost:11434...');

              const response = await fetch('http://localhost:11434/api/tags', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
              });

              if (!response.ok) {
                console.log('[Ollama Models] Error:', response.status);
                sendJson(res, 200, { models: [] });
                return;
              }

              const data = await response.json() as { models?: Array<{ name: string }> };
              console.log('[Ollama Models] Found', data.models?.length || 0, 'models');
              sendJson(res, 200, data);
            } catch {
              console.log('[Ollama Models] Ollama not running or not accessible');
              sendJson(res, 200, { models: [] });
            }
          })();
          return;
        }

        // API endpoint to upload image to /public/assets/img
        if (req.method === 'POST' && req.url === '/api/upload-image') {
          const chunks: Buffer[] = [];
          req.on('data', (chunk: Buffer) => {
            chunks.push(chunk);
          });
          req.on('end', () => {
            try {
              const buffer = Buffer.concat(chunks);

              // Parse multipart form data manually (simple implementation)
              const contentType = req.headers['content-type'] || '';
              const boundaryMatch = contentType.match(/boundary=(.+)$/);

              if (!boundaryMatch) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Invalid content type' }));
                return;
              }

              const boundary = boundaryMatch[1];
              const parts = buffer.toString('binary').split('--' + boundary);

              let filename = '';
              let fileData: Buffer | null = null;
              let subfolder = 'img'; // default subfolder

              for (const part of parts) {
                if (part.includes('Content-Disposition')) {
                  // Check for subfolder field
                  const subfolderMatch = part.match(/name="subfolder"\r\n\r\n(.+?)\r\n/);
                  if (subfolderMatch) {
                    subfolder = subfolderMatch[1].trim();
                    continue;
                  }

                  // Check for file field
                  const filenameMatch = part.match(/filename="(.+?)"/);
                  if (filenameMatch) {
                    filename = filenameMatch[1];

                    // Find the start of file content (after \r\n\r\n)
                    const contentStart = part.indexOf('\r\n\r\n') + 4;
                    const contentEnd = part.lastIndexOf('\r\n');

                    if (contentStart > 3 && contentEnd > contentStart) {
                      fileData = Buffer.from(part.slice(contentStart, contentEnd), 'binary');
                    }
                  }
                }
              }

              if (!filename || !fileData) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'No file provided' }));
                return;
              }

              // Validate filename - only allow safe characters
              const safeFilename = filename.replace(/[^a-zA-Z0-9_\-.]/g, '_');

              // Validate subfolder - only allow specific subfolders and paths
              const allowedSubfolders = ['img', 'svg', 'icons', 'img/blog'];
              // Sanitize subfolder path - remove any ..
              subfolder = subfolder.replace(/\.\./g, '').replace(/^\/+|\/+$/g, '');
              if (!allowedSubfolders.includes(subfolder)) {
                subfolder = 'img';
              }

              // Ensure directory exists
              const uploadDir = path.resolve(__dirname, 'public', 'assets', subfolder);
              if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
              }

              // Generate unique filename if exists
              let finalFilename = safeFilename;
              let filePath = path.resolve(uploadDir, finalFilename);
              let counter = 1;

              while (fs.existsSync(filePath)) {
                const ext = path.extname(safeFilename);
                const base = path.basename(safeFilename, ext);
                finalFilename = `${base}_${counter}${ext}`;
                filePath = path.resolve(uploadDir, finalFilename);
                counter++;
              }

              // Write file
              fs.writeFileSync(filePath, fileData);

              const publicPath = `/assets/${subfolder}/${finalFilename}`;

              console.log(`[Upload] Saved file: ${publicPath}`);

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                path: publicPath,
                filename: finalFilename
              }));
            } catch (error) {
              console.error('Upload error:', error);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Failed to upload file' }));
            }
          });
          return;
        }

        // API endpoint to delete image from /public/assets
        if (req.method === 'POST' && req.url === '/api/delete-image') {
          let body = '';
          req.on('data', (chunk: Buffer) => {
            body += chunk.toString('utf8');
          });
          req.on('end', () => {
            try {
              const { imagePath } = JSON.parse(body);

              // Validate path - must start with /assets/ and not contain ..
              if (!imagePath || !imagePath.startsWith('/assets/') || imagePath.includes('..')) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Invalid image path' }));
                return;
              }

              // Resolve full path
              const relativePath = imagePath.replace(/^\/assets\//, '');
              const filePath = path.resolve(__dirname, 'public', 'assets', relativePath);

              // Delete file if it exists
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`[Delete] Removed file: ${imagePath}`);
              } else {
                console.log(`[Delete] File not found (already deleted or never existed): ${imagePath}`);
              }

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (error) {
              console.error('Delete error:', error);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Failed to delete file' }));
            }
          });
          return;
        }

        // API endpoint to list images in a folder
        if (req.method === 'GET' && req.url?.startsWith('/api/list-images')) {
          try {
            const urlParams = new URL(req.url, `http://${req.headers.host}`);
            let folder = urlParams.searchParams.get('folder') || 'img';

            // Sanitize folder path
            folder = folder.replace(/\.\./g, '').replace(/^\/+|\/+$/g, '');
            const allowedFolders = ['img', 'img/blog', 'svg', 'icons'];
            if (!allowedFolders.some(f => folder === f || folder.startsWith(f + '/'))) {
              folder = 'img';
            }

            const folderPath = path.resolve(__dirname, 'public', 'assets', folder);

            if (!fs.existsSync(folderPath)) {
              sendJson(res, 200, { images: [] });
              return;
            }

            const files = fs.readdirSync(folderPath);
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

            const images = files
              .filter(f => imageExtensions.includes(path.extname(f).toLowerCase()))
              .map(f => ({
                path: `/assets/${folder}/${f}`,
                name: f
              }))
              .sort((a, b) => {
                // Sort by modification time (newest first)
                const aTime = fs.statSync(path.resolve(folderPath, a.name)).mtimeMs;
                const bTime = fs.statSync(path.resolve(folderPath, b.name)).mtimeMs;
                return bTime - aTime;
              });

            sendJson(res, 200, { images });
          } catch (error) {
            console.error('Failed to list images:', error);
            sendJson(res, 500, { error: 'Failed to list images' });
          }
          return;
        }

        // Handle data file requests
        if (req.url?.startsWith('/data/')) {
          const filename = req.url.replace('/data/', '');
          const filePath = path.resolve(__dirname, 'data', filename);

          if (fs.existsSync(filePath)) {
            res.setHeader('Content-Type', 'application/json');
            res.end(fs.readFileSync(filePath, 'utf-8'));
            return;
          }
        }

        // Handle save requests
        if (req.method === 'POST' && req.url === '/__save-data') {
          let body = '';
          req.on('data', (chunk: Buffer) => {
            body += chunk.toString('utf8');
          });
          req.on('end', () => {
            try {
              const { filename, data } = JSON.parse(body);
              const filePath = path.resolve(__dirname, 'data', filename);

              // Validate filename to prevent directory traversal
              if (filename.includes('..') || filename.includes('/')) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Invalid filename' }));
                return;
              }

              fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (error) {
              console.error('Failed to save data:', error);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Failed to save data' }));
            }
          });
        }

        // ═══════════════════════════════════════════════════════════════
        // BLOG API ENDPOINTS
        // ═══════════════════════════════════════════════════════════════

        // GET /api/blog/posts - List all posts (metadata only)
        else if (req.method === 'GET' && req.url?.startsWith('/api/blog/posts')) {
          try {
            const urlParams = new URL(req.url, `http://${req.headers.host}`);
            const tag = urlParams.searchParams.get('tag');
            const lang = urlParams.searchParams.get('lang') || 'en';

            let posts = getAllBlogPosts(false, lang) as Omit<BlogPost, 'content'>[];

            // Filter by tag if specified
            if (tag) {
              posts = posts.filter(p => p.tags?.includes(tag));
            }

            sendJson(res, 200, { posts, total: posts.length });
          } catch (error) {
            console.error('Failed to get blog posts:', error);
            sendJson(res, 500, { error: 'Failed to get blog posts' });
          }
          return;
        }

        // GET /api/blog/posts/:slug - Get single post with content
        else if (req.method === 'GET' && req.url?.match(/^\/api\/blog\/post\/.+/)) {
          try {
            const slug = req.url.split('/api/blog/post/')[1].split('?')[0];
            const urlParams = new URL(req.url, `http://${req.headers.host}`);
            const lang = urlParams.searchParams.get('lang') || 'en';

            const postsDir = path.resolve(__dirname, 'data', 'blog', 'posts');
            let filePath = path.resolve(postsDir, `${slug}.md`);

            // Check for translated version
            if (lang !== 'en') {
              const translatedPath = path.resolve(postsDir, 'translations', `${slug}.${lang}.md`);
              if (fs.existsSync(translatedPath)) {
                filePath = translatedPath;
              }
            }

            const post = parseBlogPost(filePath, slug);

            if (!post) {
              sendJson(res, 404, { error: 'Post not found' });
              return;
            }

            // Get available translations
            const translationsDir = path.resolve(postsDir, 'translations');
            const translations: string[] = [];
            if (fs.existsSync(translationsDir)) {
              const files = fs.readdirSync(translationsDir);
              for (const file of files) {
                if (file.startsWith(`${slug}.`) && file.endsWith('.md')) {
                  const langCode = file.replace(`${slug}.`, '').replace('.md', '');
                  translations.push(langCode);
                }
              }
            }

            sendJson(res, 200, { ...post, translations });
          } catch (error) {
            console.error('Failed to get blog post:', error);
            sendJson(res, 500, { error: 'Failed to get blog post' });
          }
          return;
        }

        // GET /api/blog/tags - Get all unique tags
        else if (req.method === 'GET' && req.url === '/api/blog/tags') {
          try {
            const tags = getAllBlogTags();
            sendJson(res, 200, { tags });
          } catch (error) {
            console.error('Failed to get blog tags:', error);
            sendJson(res, 500, { error: 'Failed to get blog tags' });
          }
          return;
        }

        // GET /api/blog/translations - Get translation status for all posts
        else if (req.method === 'GET' && req.url === '/api/blog/translations') {
          try {
            const posts = getAllBlogPosts(false) as Omit<BlogPost, 'content'>[];
            const postsDir = path.resolve(__dirname, 'data', 'blog', 'posts');
            const translationsDir = path.resolve(postsDir, 'translations');
            const languages = getLanguagesWithMeta().filter(l => l.code !== 'en');

            const result = posts.map(post => {
              // Get original post's updatedAt timestamp
              const originalPath = path.resolve(postsDir, `${post.slug}.md`);
              let originalMtime: Date | null = null;
              try {
                const originalStat = fs.statSync(originalPath);
                originalMtime = originalStat.mtime;
              } catch {
                // File might not exist
              }

              // Check each translation: 'missing' | 'ok' | 'outdated'
              const translations: Record<string, 'missing' | 'ok' | 'outdated'> = {};

              for (const lang of languages) {
                const translatedPath = path.resolve(translationsDir, `${post.slug}.${lang.code}.md`);

                if (!fs.existsSync(translatedPath)) {
                  translations[lang.code] = 'missing';
                } else if (originalMtime) {
                  try {
                    const translatedStat = fs.statSync(translatedPath);
                    // If original was modified after translation, it's outdated
                    translations[lang.code] = originalMtime > translatedStat.mtime ? 'outdated' : 'ok';
                  } catch {
                    translations[lang.code] = 'ok';
                  }
                } else {
                  translations[lang.code] = 'ok';
                }
              }

              return {
                slug: post.slug,
                title: post.title,
                published: post.published,
                updatedAt: post.updatedAt,
                translations
              };
            });

            sendJson(res, 200, { posts: result, languages });
          } catch (error) {
            console.error('Failed to get blog translations:', error);
            sendJson(res, 500, { error: 'Failed to get blog translations' });
          }
          return;
        }

        // POST /__save-blog-post - Create/update blog post (dev only)
        else if (req.method === 'POST' && req.url === '/__save-blog-post') {
          parseRequestBody(req)
            .then(async (body) => {
              try {
                const { slug, frontmatter, content, lang, telegramConfig } = JSON.parse(body);

                if (!slug || !frontmatter || content === undefined) {
                  sendJson(res, 400, { error: 'Missing required fields' });
                  return;
                }

                // Save the blog post first
                saveBlogPost(slug, frontmatter, content, lang);

                // Check if we need to publish to Telegram
                if (telegramConfig?.publishToTelegram &&
                  frontmatter.published &&
                  !frontmatter.telegramPostId &&
                  telegramConfig.botToken &&
                  telegramConfig.chatId) {

                  console.log('\n[Telegram] ═══════════════════════════════════════');
                  console.log('[Telegram] Publishing post:', slug);
                  console.log('[Telegram] Channel:', telegramConfig.chatId);
                  console.log('[Telegram] Delay:', telegramConfig.delayMinutes, 'minutes');

                  try {
                    // Escape Markdown v1 special characters
                    const escapeMarkdown = (text: string): string => {
                      return text
                        .replace(/\*/g, '\\*')
                        .replace(/_/g, '\\_')
                        .replace(/\[/g, '\\[')
                        .replace(/\]/g, '\\]')
                        .replace(/`/g, '\\`');
                    };

                    // Format caption
                    const caption = `*${escapeMarkdown(frontmatter.title || '')}*\n\n${escapeMarkdown(frontmatter.excerpt || '')}\n\nRead: ${telegramConfig.siteUrl}/blog/${slug}`;

                    // Build request body
                    // Check for image: external URL or local path
                    const hasExternalImage = frontmatter.featuredImage?.startsWith('http');
                    const hasLocalImage = frontmatter.featuredImage && !hasExternalImage;

                    // For local images, construct full URL (handle paths with or without leading /)
                    const imageUrl = hasExternalImage
                      ? frontmatter.featuredImage as string
                      : hasLocalImage
                        ? `${telegramConfig.siteUrl}/${(frontmatter.featuredImage as string).replace(/^\//, '')}`
                        : undefined;

                    interface TelegramRequestBody {
                      chat_id: string;
                      parse_mode: string;
                      photo?: string;
                      caption?: string;
                      text?: string;
                      schedule_date?: number;
                    }

                    // Add schedule_date if delay is specified (min 10 minutes for Telegram)
                    const delayMinutes = telegramConfig.delayMinutes || 0;
                    const scheduleDate = delayMinutes >= 10
                      ? Math.floor(Date.now() / 1000) + (delayMinutes * 60)
                      : undefined;

                    if (scheduleDate) {
                      console.log('[Telegram] Scheduled for:', new Date(scheduleDate * 1000).toISOString());
                    }

                    // Helper function to send Telegram message
                    const sendTelegramMessage = async (withPhoto: boolean): Promise<{
                      ok: boolean;
                      result?: { message_id: number };
                      description?: string;
                    }> => {
                      const method = withPhoto ? 'sendPhoto' : 'sendMessage';
                      const body: TelegramRequestBody = withPhoto
                        ? {
                          chat_id: telegramConfig.chatId,
                          photo: imageUrl as string,
                          caption,
                          parse_mode: 'Markdown',
                          ...(scheduleDate && { schedule_date: scheduleDate })
                        }
                        : {
                          chat_id: telegramConfig.chatId,
                          text: caption,
                          parse_mode: 'Markdown',
                          ...(scheduleDate && { schedule_date: scheduleDate })
                        };

                      console.log('[Telegram] Method:', method);
                      if (withPhoto) {
                        console.log('[Telegram] Image URL:', imageUrl);
                      }
                      console.log('[Telegram] Sending request...');

                      const response = await fetch(
                        `https://api.telegram.org/bot${telegramConfig.botToken}/${method}`,
                        {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(body)
                        }
                      );

                      return response.json() as Promise<{
                        ok: boolean;
                        result?: { message_id: number };
                        description?: string;
                      }>;
                    };

                    // Try to send with photo first, fallback to text if image fails
                    let telegramData = imageUrl
                      ? await sendTelegramMessage(true)
                      : await sendTelegramMessage(false);

                    console.log('[Telegram] Response OK:', telegramData.ok);

                    // If photo failed, retry as text message
                    if (!telegramData.ok && imageUrl) {
                      console.log('[Telegram] Photo failed, retrying without image...');
                      console.log('[Telegram] Error was:', telegramData.description);
                      telegramData = await sendTelegramMessage(false);
                      console.log('[Telegram] Retry Response OK:', telegramData.ok);
                    }

                    if (telegramData.ok && telegramData.result?.message_id) {
                      const messageId = telegramData.result.message_id;

                      // Build discussion URL
                      // For channels: https://t.me/channel_name/message_id
                      // For numeric chat_id: https://t.me/c/chat_id_without_100/message_id
                      let discussionUrl: string;
                      const chatId = telegramConfig.chatId;
                      if (chatId.startsWith('@')) {
                        discussionUrl = `https://t.me/${chatId.replace('@', '')}/${messageId}`;
                      } else if (chatId.startsWith('-100')) {
                        // Private channel: -100XXXXXXXXXX -> c/XXXXXXXXXX
                        discussionUrl = `https://t.me/c/${chatId.replace('-100', '')}/${messageId}`;
                      } else {
                        discussionUrl = `https://t.me/c/${chatId.replace('-', '')}/${messageId}`;
                      }

                      console.log('[Telegram] Message ID:', messageId);
                      console.log('[Telegram] Discussion URL:', discussionUrl);
                      console.log('[Telegram] ═══════════════════════════════════════\n');

                      // Update frontmatter with Telegram info and save again
                      frontmatter.telegramPostId = messageId;
                      frontmatter.telegramDiscussion = discussionUrl;
                      saveBlogPost(slug, frontmatter, content, lang);

                      sendJson(res, 200, {
                        success: true,
                        telegramPublished: true,
                        telegramPostId: messageId,
                        telegramDiscussion: discussionUrl
                      });
                      return;
                    } else {
                      console.log('[Telegram] Error:', telegramData.description);
                      console.log('[Telegram] ═══════════════════════════════════════\n');

                      // Post saved but Telegram failed
                      sendJson(res, 200, {
                        success: true,
                        telegramError: telegramData.description || 'Unknown Telegram error'
                      });
                      return;
                    }
                  } catch (telegramError) {
                    console.error('[Telegram] Exception:', telegramError);
                    console.log('[Telegram] ═══════════════════════════════════════\n');

                    // Post saved but Telegram failed
                    sendJson(res, 200, {
                      success: true,
                      telegramError: (telegramError as Error).message
                    });
                    return;
                  }
                }

                // No Telegram publishing, just return success
                sendJson(res, 200, { success: true });
              } catch (error) {
                console.error('Failed to save blog post:', error);
                sendJson(res, 500, { error: 'Failed to save blog post' });
              }
            })
            .catch((err) => {
              console.error('Failed to parse request:', err);
              sendJson(res, 400, { error: 'Invalid request' });
            });
          return;
        }

        // DELETE /api/blog/posts/:slug - Delete blog post (dev only)
        else if (req.method === 'DELETE' && req.url?.startsWith('/api/blog/posts/')) {
          try {
            const slug = req.url.split('/api/blog/posts/')[1];
            deleteBlogPost(slug);
            sendJson(res, 200, { success: true });
          } catch (error) {
            console.error('Failed to delete blog post:', error);
            sendJson(res, 500, { error: 'Failed to delete blog post' });
          }
          return;
        }

        // DELETE /api/blog/translations/:slug/:lang - Delete specific translation
        else if (req.method === 'DELETE' && req.url?.match(/^\/api\/blog\/translations\/[^/]+\/[^/]+$/)) {
          try {
            const parts = req.url.split('/api/blog/translations/')[1].split('/');
            const slug = parts[0];
            const lang = parts[1];
            deleteBlogTranslation(slug, lang);
            sendJson(res, 200, { success: true });
          } catch (error) {
            console.error('Failed to delete translation:', error);
            sendJson(res, 500, { error: 'Failed to delete translation' });
          }
          return;
        }

        // DELETE /api/blog/translations/language/:lang - Delete all translations for a language
        else if (req.method === 'DELETE' && req.url?.startsWith('/api/blog/translations/language/')) {
          try {
            const lang = req.url.split('/api/blog/translations/language/')[1];
            deleteAllBlogTranslationsForLanguage(lang);
            sendJson(res, 200, { success: true });
          } catch (error) {
            console.error('Failed to delete language translations:', error);
            sendJson(res, 500, { error: 'Failed to delete language translations' });
          }
          return;
        }

        // DELETE /api/blog/translations - Delete ALL translations
        else if (req.method === 'DELETE' && req.url === '/api/blog/translations') {
          try {
            deleteAllBlogTranslations();
            sendJson(res, 200, { success: true });
          } catch (error) {
            console.error('Failed to delete all translations:', error);
            sendJson(res, 500, { error: 'Failed to delete all translations' });
          }
          return;
        }

        else {
          next();
        }
      });
    },
    // Copy data folder to dist on build
    writeBundle() {
      const srcDir = path.resolve(__dirname, 'data');
      const destDir = path.resolve(__dirname, 'dist', 'data');

      // Helper function to recursively copy directories
      // Skip blog/posts md files (they are generated as JSON)
      function copyRecursive(src: string, dest: string) {
        if (!fs.existsSync(dest)) {
          fs.mkdirSync(dest, { recursive: true });
        }

        const items = fs.readdirSync(src);
        for (const item of items) {
          const srcPath = path.resolve(src, item);
          const destPath = path.resolve(dest, item);
          const stat = fs.statSync(srcPath);

          // Skip blog/posts directory entirely (md files are converted to JSON)
          if (srcPath.includes('blog/posts') || srcPath.includes('blog\\posts')) {
            continue;
          }

          if (stat.isDirectory()) {
            copyRecursive(srcPath, destPath);
          } else {
            fs.copyFileSync(srcPath, destPath);
          }
        }
      }

      if (fs.existsSync(srcDir)) {
        copyRecursive(srcDir, destDir);
        console.log('✓ Copied data files to dist/data');
      }

      // Generate static blog JSON files for production (for all languages)
      const blogPostsDir = path.resolve(__dirname, 'dist', 'data', 'blog');
      if (!fs.existsSync(blogPostsDir)) {
        fs.mkdirSync(blogPostsDir, { recursive: true });
      }

      const postsJsonDir = path.resolve(blogPostsDir, 'post');
      if (!fs.existsSync(postsJsonDir)) {
        fs.mkdirSync(postsJsonDir, { recursive: true });
      }

      // Get all available languages
      const availableLanguages = getLanguagesWithMeta();
      let totalPostFiles = 0;

      // Generate JSON files for each language
      for (const langMeta of availableLanguages) {
        const lang = langMeta.code;
        const langSuffix = lang === 'en' ? '' : `.${lang}`;

        // Get posts for this language
        const blogPosts = getAllBlogPosts(true, lang) as BlogPost[];

        // Generate posts.json / posts.{lang}.json (list without content)
        const postsListPath = path.resolve(blogPostsDir, `posts${langSuffix}.json`);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const postsList = blogPosts.map(({ content: _content, ...post }) => post);
        fs.writeFileSync(postsListPath, JSON.stringify({ posts: postsList, total: postsList.length }), 'utf-8');

        // Generate individual post JSON files (with content)
        for (const post of blogPosts) {
          const postPath = path.resolve(postsJsonDir, `${post.slug}${langSuffix}.json`);
          fs.writeFileSync(postPath, JSON.stringify(post), 'utf-8');
          totalPostFiles++;
        }
      }

      console.log(`✓ Generated blog JSON for ${availableLanguages.length} languages (${totalPostFiles} post files)`);

      // Generate tags.json
      const tagsPath = path.resolve(blogPostsDir, 'tags.json');
      const tags = getAllBlogTags();
      fs.writeFileSync(tagsPath, JSON.stringify({ tags }), 'utf-8');
      console.log(`✓ Generated tags.json with ${tags.length} tags`);

      // Generate languages.json for production (static file with metadata)
      const languages = getLanguagesWithMeta();
      const langFilePath = path.resolve(__dirname, 'dist', 'translations', 'languages.json');
      fs.writeFileSync(langFilePath, JSON.stringify(languages), 'utf-8');
      console.log(`✓ Generated languages.json with ${languages.length} languages: ${languages.map(l => l.code).join(', ')}`);

      // Load SEO settings from content.json
      const contentPath = path.resolve(__dirname, 'data', 'content.json');
      let seoConfig = {
        title: 'MiniOS - Fast. Simple. Reliable.',
        description: 'MiniOS is a lightweight, fast, and reliable Linux distribution.',
        keywords: 'MiniOS, Linux, lightweight',
        author: 'MiniOS Team',
        canonicalUrl: 'https://minios.dev',
        ogImage: '/assets/img/og-image.png',
        ogSiteName: 'MiniOS',
        ogLocale: 'en_US',
        twitterCard: 'summary_large_image' as const,
        twitterImage: '',
        yandexVerification: '',
        googleVerification: '',
        yandexMetrikaId: '',
        googleAnalyticsId: '',
        structuredData: {
          softwareVersion: '4.0',
          ratingValue: '4.8',
          ratingCount: '150'
        },
        sitemap: {
          includeExternalLinks: true,
          externalLinks: [] as string[]
        }
      };

      if (fs.existsSync(contentPath)) {
        try {
          const content = JSON.parse(fs.readFileSync(contentPath, 'utf-8'));
          if (content.seo) {
            seoConfig = { ...seoConfig, ...content.seo };
          }
        } catch (e) {
          console.error('Failed to load SEO config from content.json:', e);
        }
      }

      const baseUrl = seoConfig.canonicalUrl || 'https://minios.dev';
      const now = new Date().toISOString().split('T')[0];

      // Generate sitemap.xml for SEO
      // Static pages
      const staticPages = [
        { loc: '/', priority: '1.0', changefreq: 'weekly' },
        { loc: '/blog', priority: '0.9', changefreq: 'daily' },
      ];

      // Language variations for main page
      const langPages = languages.map(lang => ({
        loc: `/?lang=${lang.code}`,
        priority: '0.8',
        changefreq: 'weekly'
      }));

      // Blog posts
      const postsDir = path.resolve(__dirname, 'data', 'blog', 'posts');
      const blogPages: Array<{ loc: string; priority: string; changefreq: string }> = [];
      if (fs.existsSync(postsDir)) {
        const postFiles = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'));
        for (const file of postFiles) {
          const slug = file.replace('.md', '');
          blogPages.push({
            loc: `/blog/${slug}`,
            priority: '0.7',
            changefreq: 'monthly'
          });
        }
      }

      // External links from SEO config
      const externalLinks = seoConfig.sitemap?.externalLinks || [];

      // Build sitemap XML
      const allPages = [...staticPages, ...langPages, ...blogPages];
      const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
      xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
            http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">

${allPages.map(page => `<url>
  <loc>${baseUrl}${page.loc}</loc>
  <lastmod>${now}</lastmod>
  <changefreq>${page.changefreq}</changefreq>
  <priority>${page.priority}</priority>
</url>`).join('\n')}

${externalLinks.length > 0 ? externalLinks.map(link => `<url>
  <loc>${link}</loc>
  <lastmod>${now}</lastmod>
</url>`).join('\n') : ''}

</urlset>`;

      const sitemapPath = path.resolve(__dirname, 'dist', 'sitemap.xml');
      fs.writeFileSync(sitemapPath, sitemapContent);
      console.log(`✓ Generated sitemap.xml with ${allPages.length + externalLinks.length} URLs`);

      // Generate index.html with SEO meta tags from content.json
      const indexPath = path.resolve(__dirname, 'dist', 'index.html');
      let indexHtml = fs.readFileSync(indexPath, 'utf-8');

      // Mapping from language code to og:locale format
      const localeMap: Record<string, string> = {
        'en': 'en_US',
        'ru': 'ru_RU',
        'de': 'de_DE',
        'es': 'es_ES',
        'fr': 'fr_FR',
        'it': 'it_IT',
        'pt-BR': 'pt_BR',
        'id': 'id_ID',
        'zh': 'zh_CN',
        'ja': 'ja_JP',
        'ko': 'ko_KR',
        'ar': 'ar_SA',
        'hi': 'hi_IN',
        'tr': 'tr_TR',
        'pl': 'pl_PL',
        'nl': 'nl_NL',
        'uk': 'uk_UA',
        'cs': 'cs_CZ',
        'sv': 'sv_SE',
        'da': 'da_DK',
        'fi': 'fi_FI',
        'no': 'nb_NO',
        'el': 'el_GR',
        'he': 'he_IL',
        'th': 'th_TH',
        'vi': 'vi_VN',
      };

      // Determine primary locale and alternates from available translations
      const availableLangCodes = languages.map(l => l.code);
      const primaryLang = availableLangCodes.includes('en') ? 'en' : availableLangCodes[0] || 'en';
      const primaryLocale = localeMap[primaryLang] || `${primaryLang}_${primaryLang.toUpperCase()}`;

      // Generate og:locale:alternate tags for all other languages
      const ogLocaleAlternates = availableLangCodes
        .filter(code => code !== primaryLang)
        .map(code => {
          const locale = localeMap[code] || `${code}_${code.toUpperCase()}`;
          return `<meta property="og:locale:alternate" content="${locale}" />`;
        })
        .join('\n    ');

      // Build language alternates (hreflang)
      const langAlternates = languages.map(lang =>
        `<link rel="alternate" hreflang="${lang.code}" href="${baseUrl}/?lang=${lang.code}" />`
      ).join('\n    ');

      // Build analytics scripts
      let analyticsScripts = '';

      if (seoConfig.yandexMetrikaId) {
        analyticsScripts += `
    <!-- Yandex.Metrika counter -->
    <script type="text/javascript">
      (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
      m[i].l=1*new Date();
      for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
      k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
      (window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");
      ym(${seoConfig.yandexMetrikaId},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true});
    </script>
    <noscript><div><img src="https://mc.yandex.ru/watch/${seoConfig.yandexMetrikaId}" style="position:absolute;left:-9999px;" alt="" /></div></noscript>
    <!-- /Yandex.Metrika counter -->`;
      }

      if (seoConfig.googleAnalyticsId) {
        analyticsScripts += `
    
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=${seoConfig.googleAnalyticsId}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${seoConfig.googleAnalyticsId}');
    </script>`;
      }

      // Build JSON-LD structured data
      const structuredData = seoConfig.structuredData || {};
      const jsonLd = `
    <!-- JSON-LD Structured Data -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "MiniOS",
      "applicationCategory": "OperatingSystem",
      "operatingSystem": "Linux",
      "description": "${seoConfig.description.replace(/"/g, '\\"')}",
      "url": "${baseUrl}/",
      "downloadUrl": "${baseUrl}/#download",
      "softwareVersion": "${structuredData.softwareVersion || '4.0'}",
      "author": {
        "@type": "Organization",
        "name": "${seoConfig.author}",
        "url": "https://github.com/minios-linux"
      },
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      }${structuredData.ratingValue ? `,
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "${structuredData.ratingValue}",
        "ratingCount": "${structuredData.ratingCount || '100'}"
      }` : ''}
    }
    </script>`;

      // Build complete head content
      const seoHead = `<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="mobile-web-app-capable" content="yes" />
    <link rel="icon" type="image/svg+xml" href="/assets/svg/minios_icon.svg" />
    
    <!-- Primary Meta Tags -->
    <title>${seoConfig.title}</title>
    <meta name="title" content="${seoConfig.title}" />
    <meta name="description" content="${seoConfig.description}" />
    <meta name="keywords" content="${seoConfig.keywords}" />
    <meta name="author" content="${seoConfig.author}" />
    <meta name="robots" content="index, follow" />
    
    <!-- Canonical URL -->
    <link rel="canonical" href="${baseUrl}/" />
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${baseUrl}/" />
    <meta property="og:title" content="${seoConfig.title}" />
    <meta property="og:description" content="${seoConfig.description}" />
    <meta property="og:image" content="${baseUrl}${seoConfig.ogImage}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:site_name" content="${seoConfig.ogSiteName}" />
    <meta property="og:locale" content="${primaryLocale}" />
    ${ogLocaleAlternates}
    
    <!-- Twitter -->
    <meta property="twitter:card" content="${seoConfig.twitterCard}" />
    <meta property="twitter:url" content="${baseUrl}/" />
    <meta property="twitter:title" content="${seoConfig.title}" />
    <meta property="twitter:description" content="${seoConfig.description}" />
    <meta property="twitter:image" content="${baseUrl}${seoConfig.twitterImage || seoConfig.ogImage}" />
    
    <!-- Language Alternates -->
    ${langAlternates}
    <link rel="alternate" hreflang="x-default" href="${baseUrl}/" />
    
    <!-- Theme Color -->
    <meta name="theme-color" content="#0f1115" media="(prefers-color-scheme: dark)" />
    <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
    ${seoConfig.yandexVerification ? `
    <!-- Yandex Verification -->
    <meta name="yandex-verification" content="${seoConfig.yandexVerification}" />` : ''}
    ${seoConfig.googleVerification ? `
    <!-- Google Verification -->
    <meta name="google-site-verification" content="${seoConfig.googleVerification}" />` : ''}
    ${analyticsScripts}
    ${jsonLd}`;

      // Replace the existing <head> content up to the first <link or <script from vite
      indexHtml = indexHtml.replace(/<head>[\s\S]*?(?=<script type="module"|<link rel="modulepreload"|<link rel="stylesheet")/, seoHead + '\n    ');

      fs.writeFileSync(indexPath, indexHtml);
      console.log('✓ Generated index.html with SEO meta tags from content.json');
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig(() => {
  // Use '/' for custom domain (github.minios.dev)
  const base = '/';

  return {
    base,
    plugins: [react(), localDataPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    publicDir: 'public',
    server: {
      fs: {
        allow: ['..'],
      },
    },
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunks - large dependencies
            'vendor-react': ['react', 'react-dom'],
            'vendor-router': ['react-router-dom'],
            'vendor-ui': [
              '@radix-ui/react-popover',
              '@radix-ui/react-tabs',
              '@radix-ui/react-slot',
              '@radix-ui/react-dialog',
              '@radix-ui/react-checkbox',
              '@radix-ui/react-label',
              '@radix-ui/react-select',
              '@radix-ui/react-scroll-area',
            ],
            'vendor-motion': ['framer-motion'],
            'vendor-i18n': ['i18next', 'react-i18next', 'i18next-http-backend', 'i18next-browser-languagedetector'],
            // Blog/Markdown - lazy loaded
            'vendor-markdown': ['react-markdown', 'remark-gfm'],
            'vendor-syntax': ['react-syntax-highlighter'],
            // Mermaid is auto-chunked via dynamic import
            // Admin panel - only loaded when needed (localhost)
            'admin': [
              '@dnd-kit/core',
              '@dnd-kit/sortable',
              '@dnd-kit/utilities',
            ],
          },
        },
      },
    },
  };
});
