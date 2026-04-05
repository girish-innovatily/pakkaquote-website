# Multilingual Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add build-time multilingual support (Tamil, Hindi, Marathi, Gujarati) to the PakkaQuote static website using Google Cloud Translation API.

**Architecture:** A Node.js build script extracts visible text from 4 English HTML source files, translates via Google Cloud Translation API (with file-based caching), and generates static HTML in language subdirectories (`/ta/`, `/hi/`, `/mr/`, `/gu/`). English pages stay at root as the source of truth. A language switcher dropdown is added to the navbar.

**Tech Stack:** Node.js, cheerio (HTML parsing), Google Cloud Translation REST API v2, Node built-in test runner (`node --test`)

**Spec:** `docs/superpowers/specs/2026-04-05-multilingual-design.md`

---

## File Map

**Create:**
- `scripts/lib/extract.js` — Extracts translatable text nodes and attributes from HTML
- `scripts/lib/translator.js` — Google Translation API wrapper with file-based caching
- `scripts/lib/inject.js` — Injects translated text back into cloned HTML, fixes paths/links
- `scripts/lib/sitemap.js` — Generates multilingual sitemap.xml
- `scripts/translate.js` — CLI orchestrator that wires all modules together
- `scripts/test/extract.test.js` — Tests for extract module
- `scripts/test/translator.test.js` — Tests for translator module
- `scripts/test/inject.test.js` — Tests for inject module
- `scripts/test/sitemap.test.js` — Tests for sitemap module
- `scripts/test/integration.test.js` — End-to-end test with real HTML
- `i18n/no-translate.json` — Brand terms to skip during translation
- `i18n/cache/.gitkeep` — Ensures cache directory exists in git

**Modify:**
- `package.json` — Add cheerio dependency and npm scripts
- `.gitignore` — Add generated language directories
- `css/styles.css` — Add language switcher styles
- `index.html` — Add language switcher HTML to nav
- `features.html` — Add language switcher HTML to nav
- `about.html` — Add language switcher HTML to nav
- `faq.html` — Add language switcher HTML to nav

---

### Task 1: Project Setup

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`
- Create: `i18n/no-translate.json`
- Create: `i18n/cache/.gitkeep`
- Create: `scripts/lib/` (directory)
- Create: `scripts/test/` (directory)

- [ ] **Step 1: Install cheerio**

```bash
cd /Users/girish/Workspace/projects/PakkaQuote/Website
npm install cheerio
```

Expected: `cheerio` added to `package.json` dependencies.

- [ ] **Step 2: Create `i18n/no-translate.json`**

```json
{
  "terms": [
    "PakkaQuote",
    "Pakka Quote",
    "Pakka",
    "PAKKA",
    "QUOTE",
    "WhatsApp",
    "PDF",
    "GTM",
    "GA4",
    "HubSpot",
    "API",
    "GST",
    "GSTIN",
    "Innovatily",
    "TMT",
    "INR",
    "Rs.",
    "B2B",
    "CRM",
    "ERP",
    "FMCG",
    "SMB",
    "RFQ"
  ]
}
```

- [ ] **Step 3: Create cache directory**

```bash
mkdir -p i18n/cache
touch i18n/cache/.gitkeep
```

- [ ] **Step 4: Create script directories**

```bash
mkdir -p scripts/lib scripts/test
```

- [ ] **Step 5: Update `.gitignore`**

Add these lines to the end of `.gitignore`:

```
# Generated language directories
ta/
hi/
mr/
gu/
```

- [ ] **Step 6: Add npm scripts to `package.json`**

Add to the `"scripts"` section:

```json
{
  "scripts": {
    "start": "serve . -l $PORT -s",
    "translate": "node scripts/translate.js",
    "test:translate": "node --test scripts/test/"
  }
}
```

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json .gitignore i18n/ scripts/
git commit -m "chore: set up multilingual build infrastructure"
```

---

### Task 2: Text Extraction Module

**Files:**
- Create: `scripts/lib/extract.js`
- Create: `scripts/test/extract.test.js`

- [ ] **Step 1: Write the failing test**

Create `scripts/test/extract.test.js`:

```javascript
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { extractTexts } = require('../lib/extract.js');

describe('extractTexts', () => {
  it('extracts visible text nodes from HTML', () => {
    const html = '<html><body><h1>Hello World</h1><p>Some text</p></body></html>';
    const result = extractTexts(html);
    const texts = result.map(r => r.text);
    assert.ok(texts.includes('Hello World'));
    assert.ok(texts.includes('Some text'));
  });

  it('skips script and style tags', () => {
    const html = '<html><body><script>var x = 1;</script><style>.a{}</style><p>Visible</p></body></html>';
    const result = extractTexts(html);
    const texts = result.map(r => r.text);
    assert.ok(texts.includes('Visible'));
    assert.ok(!texts.includes('var x = 1;'));
    assert.ok(!texts.includes('.a{}'));
  });

  it('extracts placeholder, alt, aria-label, title attributes', () => {
    const html = '<html><body><input placeholder="Enter name"><img alt="Logo"><div aria-label="Close" title="Close button">X</div></body></html>';
    const result = extractTexts(html);
    const texts = result.map(r => r.text);
    assert.ok(texts.includes('Enter name'));
    assert.ok(texts.includes('Logo'));
    assert.ok(texts.includes('Close'));
    assert.ok(texts.includes('Close button'));
  });

  it('skips whitespace-only text nodes', () => {
    const html = '<html><body><div>  \n  </div><p>Real text</p></body></html>';
    const result = extractTexts(html);
    const texts = result.map(r => r.text);
    assert.ok(!texts.some(t => t.trim() === ''));
    assert.ok(texts.includes('Real text'));
  });

  it('skips JSON-LD script blocks', () => {
    const html = '<html><head><script type="application/ld+json">{"name":"Pakka Quote"}</script></head><body><p>Body text</p></body></html>';
    const result = extractTexts(html);
    const texts = result.map(r => r.text);
    assert.ok(texts.includes('Body text'));
    assert.ok(!texts.includes('{"name":"Pakka Quote"}'));
  });

  it('extracts meta description and og:title content', () => {
    const html = '<html><head><meta name="description" content="A great product"><meta property="og:title" content="My Title"></head><body></body></html>';
    const result = extractTexts(html);
    const texts = result.map(r => r.text);
    assert.ok(texts.includes('A great product'));
    assert.ok(texts.includes('My Title'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node --test scripts/test/extract.test.js
```

Expected: FAIL — `Cannot find module '../lib/extract.js'`

- [ ] **Step 3: Implement extract module**

Create `scripts/lib/extract.js`:

```javascript
const cheerio = require('cheerio');

const SKIP_TAGS = new Set(['script', 'style', 'code', 'noscript', 'iframe']);
const TRANSLATABLE_ATTRS = ['placeholder', 'alt', 'aria-label', 'title'];
const TRANSLATABLE_META = [
  { attr: 'name', values: ['description'], content: 'content' },
  { attr: 'property', values: ['og:title', 'og:description'], content: 'content' },
  { attr: 'name', values: ['twitter:title', 'twitter:description'], content: 'content' },
];

/**
 * Extract all translatable text from an HTML string.
 * Returns an array of { text, type, selector } objects.
 * - type: 'text' | 'attr' | 'meta' | 'jsonld'
 * - selector: enough info to locate and replace the text during injection
 */
function extractTexts(html) {
  const $ = cheerio.load(html, { decodeEntities: false });
  const results = [];
  const seen = new Set();

  function addUnique(text, type, selector) {
    const trimmed = text.trim();
    if (!trimmed) return;
    // Key by text + type + selector to allow same text in different locations
    const key = `${type}:${selector}:${trimmed}`;
    if (seen.has(key)) return;
    seen.add(key);
    results.push({ text: trimmed, type, selector });
  }

  // 1. Walk text nodes
  function walkNodes(nodes) {
    nodes.each(function () {
      const el = $(this);

      if (this.type === 'text') {
        const parent = el.parent();
        const tagName = parent.length ? parent.prop('tagName')?.toLowerCase() : '';
        if (SKIP_TAGS.has(tagName)) return;
        const text = el.text();
        if (text.trim()) {
          // Build a selector path for this text node
          const path = getPath($, parent);
          addUnique(text.trim(), 'text', path);
        }
        return;
      }

      if (this.type !== 'tag') return;

      const tagName = this.tagName?.toLowerCase();
      if (SKIP_TAGS.has(tagName)) return;

      // 2. Check translatable attributes
      for (const attr of TRANSLATABLE_ATTRS) {
        const val = el.attr(attr);
        if (val && val.trim()) {
          const path = getPath($, el);
          addUnique(val.trim(), 'attr', `${path}[${attr}]`);
        }
      }

      // Recurse into children
      walkNodes(el.contents());
    });
  }

  // 3. Extract meta tag content
  for (const meta of TRANSLATABLE_META) {
    for (const val of meta.values) {
      const selector = `meta[${meta.attr}="${val}"]`;
      const el = $(selector);
      const content = el.attr(meta.content);
      if (content && content.trim()) {
        addUnique(content.trim(), 'meta', selector);
      }
    }
  }

  // 4. Extract title tag
  const titleText = $('title').text();
  if (titleText && titleText.trim()) {
    addUnique(titleText.trim(), 'meta', 'title');
  }

  // 5. Extract JSON-LD translatable fields
  $('script[type="application/ld+json"]').each(function (i) {
    try {
      const json = JSON.parse($(this).html());
      if (json.name) addUnique(json.name, 'jsonld', `ld+json[${i}].name`);
      if (json.description) addUnique(json.description, 'jsonld', `ld+json[${i}].description`);
      // FAQ page questions/answers
      if (json.mainEntity && Array.isArray(json.mainEntity)) {
        json.mainEntity.forEach((item, j) => {
          if (item.name) addUnique(item.name, 'jsonld', `ld+json[${i}].mainEntity[${j}].name`);
          if (item.acceptedAnswer?.text) {
            addUnique(item.acceptedAnswer.text, 'jsonld', `ld+json[${i}].mainEntity[${j}].acceptedAnswer.text`);
          }
        });
      }
    } catch {
      // Skip malformed JSON-LD
    }
  });

  // Walk body for text nodes
  walkNodes($('body').contents());

  return results;
}

/**
 * Build a simple CSS-like path for an element (for debugging/identification).
 */
function getPath($, el) {
  const parts = [];
  let current = el;
  while (current.length && current.prop('tagName')) {
    const tag = current.prop('tagName').toLowerCase();
    if (tag === 'html' || tag === 'body') break;
    const id = current.attr('id');
    const cls = current.attr('class')?.split(/\s+/)[0];
    if (id) {
      parts.unshift(`${tag}#${id}`);
      break;
    } else if (cls) {
      parts.unshift(`${tag}.${cls}`);
    } else {
      parts.unshift(tag);
    }
    current = current.parent();
  }
  return parts.join(' > ');
}

module.exports = { extractTexts };
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
node --test scripts/test/extract.test.js
```

Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/extract.js scripts/test/extract.test.js
git commit -m "feat: add text extraction module for multilingual build"
```

---

### Task 3: Translation API Wrapper with Caching

**Files:**
- Create: `scripts/lib/translator.js`
- Create: `scripts/test/translator.test.js`

- [ ] **Step 1: Write the failing test**

Create `scripts/test/translator.test.js`:

```javascript
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { Translator } = require('../lib/translator.js');
const fs = require('node:fs');
const path = require('node:path');

const TEST_CACHE_DIR = path.join(__dirname, '../../i18n/cache-test');

describe('Translator', () => {
  beforeEach(() => {
    // Clean test cache
    if (fs.existsSync(TEST_CACHE_DIR)) {
      fs.rmSync(TEST_CACHE_DIR, { recursive: true });
    }
    fs.mkdirSync(TEST_CACHE_DIR, { recursive: true });
  });

  it('returns cached translations without calling API', async () => {
    // Pre-populate cache
    const cache = { 'Hello': 'வணக்கம்' };
    fs.writeFileSync(path.join(TEST_CACHE_DIR, 'ta.json'), JSON.stringify(cache));

    const translator = new Translator({
      apiKey: 'fake-key',
      cacheDir: TEST_CACHE_DIR,
    });

    const result = await translator.translate(['Hello'], 'ta');
    assert.deepStrictEqual(result, ['வணக்கம்']);
  });

  it('identifies uncached strings that need API translation', () => {
    const cache = { 'Hello': 'வணக்கம்' };
    fs.writeFileSync(path.join(TEST_CACHE_DIR, 'ta.json'), JSON.stringify(cache));

    const translator = new Translator({
      apiKey: 'fake-key',
      cacheDir: TEST_CACHE_DIR,
    });
    translator.loadCache('ta');

    const uncached = ['Hello', 'Goodbye'].filter(t => !translator.getCached(t, 'ta'));
    assert.deepStrictEqual(uncached, ['Goodbye']);
  });

  it('wraps no-translate terms in notranslate spans', () => {
    const translator = new Translator({
      apiKey: 'fake-key',
      cacheDir: TEST_CACHE_DIR,
      noTranslateTerms: ['PakkaQuote', 'WhatsApp'],
    });

    const wrapped = translator.wrapNoTranslate('Try PakkaQuote on WhatsApp today');
    assert.ok(wrapped.includes('<span class="notranslate">PakkaQuote</span>'));
    assert.ok(wrapped.includes('<span class="notranslate">WhatsApp</span>'));
  });

  it('unwraps notranslate spans from translated text', () => {
    const translator = new Translator({
      apiKey: 'fake-key',
      cacheDir: TEST_CACHE_DIR,
      noTranslateTerms: ['PakkaQuote'],
    });

    const translated = 'முயற்சி <span class="notranslate">PakkaQuote</span> இன்று';
    const clean = translator.unwrapNoTranslate(translated);
    assert.strictEqual(clean, 'முயற்சி PakkaQuote இன்று');
  });

  it('saves translations to cache file', () => {
    const translator = new Translator({
      apiKey: 'fake-key',
      cacheDir: TEST_CACHE_DIR,
    });
    translator.loadCache('ta');
    translator.setCached('Hello', 'வணக்கம்', 'ta');
    translator.saveCache('ta');

    const saved = JSON.parse(fs.readFileSync(path.join(TEST_CACHE_DIR, 'ta.json'), 'utf-8'));
    assert.strictEqual(saved['Hello'], 'வணக்கம்');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node --test scripts/test/translator.test.js
```

Expected: FAIL — `Cannot find module '../lib/translator.js'`

- [ ] **Step 3: Implement translator module**

Create `scripts/lib/translator.js`:

```javascript
const fs = require('node:fs');
const path = require('node:path');

class Translator {
  /**
   * @param {Object} opts
   * @param {string} opts.apiKey - Google Cloud Translation API key
   * @param {string} opts.cacheDir - Directory for translation cache files
   * @param {string[]} [opts.noTranslateTerms] - Terms to preserve untranslated
   */
  constructor({ apiKey, cacheDir, noTranslateTerms = [] }) {
    this.apiKey = apiKey;
    this.cacheDir = cacheDir;
    this.noTranslateTerms = noTranslateTerms;
    // Sort by length descending so longer terms match first
    this.noTranslateTerms.sort((a, b) => b.length - a.length);
    this.caches = {};
  }

  loadCache(lang) {
    const file = path.join(this.cacheDir, `${lang}.json`);
    if (fs.existsSync(file)) {
      this.caches[lang] = JSON.parse(fs.readFileSync(file, 'utf-8'));
    } else {
      this.caches[lang] = {};
    }
  }

  saveCache(lang) {
    const file = path.join(this.cacheDir, `${lang}.json`);
    fs.mkdirSync(this.cacheDir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(this.caches[lang], null, 2), 'utf-8');
  }

  getCached(text, lang) {
    return this.caches[lang]?.[text];
  }

  setCached(text, translation, lang) {
    if (!this.caches[lang]) this.caches[lang] = {};
    this.caches[lang][text] = translation;
  }

  /**
   * Wrap no-translate terms in <span class="notranslate"> for Google Translate API.
   */
  wrapNoTranslate(text) {
    let result = text;
    for (const term of this.noTranslateTerms) {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'g');
      result = result.replace(regex, `<span class="notranslate">${term}</span>`);
    }
    return result;
  }

  /**
   * Remove notranslate wrapper spans from translated output.
   */
  unwrapNoTranslate(text) {
    return text.replace(/<span class="notranslate">([^<]+)<\/span>/g, '$1');
  }

  /**
   * Translate an array of strings to a target language.
   * Uses cache first, then calls Google Cloud Translation API for uncached strings.
   * @param {string[]} texts - English strings to translate
   * @param {string} targetLang - Language code (ta, hi, mr, gu)
   * @returns {Promise<string[]>} - Translated strings in same order
   */
  async translate(texts, targetLang) {
    this.loadCache(targetLang);

    const results = new Array(texts.length);
    const uncachedIndices = [];
    const uncachedTexts = [];

    // Check cache first
    for (let i = 0; i < texts.length; i++) {
      const cached = this.getCached(texts[i], targetLang);
      if (cached) {
        results[i] = cached;
      } else {
        uncachedIndices.push(i);
        uncachedTexts.push(texts[i]);
      }
    }

    // Call API for uncached strings
    if (uncachedTexts.length > 0) {
      const translated = await this.callApi(uncachedTexts, targetLang);
      for (let j = 0; j < uncachedIndices.length; j++) {
        const originalIdx = uncachedIndices[j];
        results[originalIdx] = translated[j];
        this.setCached(texts[originalIdx], translated[j], targetLang);
      }
      this.saveCache(targetLang);
    }

    return results;
  }

  /**
   * Call Google Cloud Translation API v2 in batches.
   * @param {string[]} texts - Texts to translate
   * @param {string} targetLang - Target language code
   * @returns {Promise<string[]>} - Translated texts
   */
  async callApi(texts, targetLang) {
    const BATCH_SIZE = 100;
    const allTranslated = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const wrapped = batch.map(t => this.wrapNoTranslate(t));

      const url = `https://translation.googleapis.com/language/translate/v2?key=${this.apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: wrapped,
          target: targetLang,
          source: 'en',
          format: 'html',
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Google Translate API error (${response.status}): ${errBody}`);
      }

      const data = await response.json();
      const translations = data.data.translations.map(t =>
        this.unwrapNoTranslate(t.translatedText)
      );
      allTranslated.push(...translations);
    }

    return allTranslated;
  }
}

module.exports = { Translator };
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
node --test scripts/test/translator.test.js
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/translator.js scripts/test/translator.test.js
git commit -m "feat: add translation API wrapper with file-based caching"
```

---

### Task 4: Text Injection Module

**Files:**
- Create: `scripts/lib/inject.js`
- Create: `scripts/test/inject.test.js`

- [ ] **Step 1: Write the failing test**

Create `scripts/test/inject.test.js`:

```javascript
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { injectTranslations } = require('../lib/inject.js');

describe('injectTranslations', () => {
  const BASE_URL = 'https://pakkaquote.com';
  const LANGS = ['en', 'ta', 'hi', 'mr', 'gu'];

  it('replaces text nodes with translations', () => {
    const html = '<html lang="en"><body><h1>Hello World</h1></body></html>';
    const translations = { 'Hello World': 'வணக்கம் உலகம்' };
    const result = injectTranslations(html, translations, {
      lang: 'ta',
      page: 'index.html',
      baseUrl: BASE_URL,
      languages: LANGS,
    });
    assert.ok(result.includes('வணக்கம் உலகம்'));
  });

  it('updates html lang attribute', () => {
    const html = '<html lang="en"><body><p>Hi</p></body></html>';
    const result = injectTranslations(html, { 'Hi': 'வணக்கம்' }, {
      lang: 'ta',
      page: 'index.html',
      baseUrl: BASE_URL,
      languages: LANGS,
    });
    assert.ok(result.includes('lang="ta"'));
    assert.ok(!result.includes('lang="en"'));
  });

  it('rewrites relative asset paths to absolute', () => {
    const html = '<html lang="en"><head><link rel="stylesheet" href="css/styles.css"></head><body><script src="js/main.js"></script></body></html>';
    const result = injectTranslations(html, {}, {
      lang: 'ta',
      page: 'index.html',
      baseUrl: BASE_URL,
      languages: LANGS,
    });
    assert.ok(result.includes('href="/css/styles.css"'));
    assert.ok(result.includes('src="/js/main.js"'));
  });

  it('rewrites internal nav links to include language prefix', () => {
    const html = '<html lang="en"><body><a href="features.html">Features</a><a href="index.html#pricing">Pricing</a></body></html>';
    const result = injectTranslations(html, { 'Features': 'அம்சங்கள்', 'Pricing': 'விலை' }, {
      lang: 'ta',
      page: 'index.html',
      baseUrl: BASE_URL,
      languages: LANGS,
    });
    assert.ok(result.includes('href="/ta/features.html"'));
    assert.ok(result.includes('href="/ta/index.html#pricing"'));
  });

  it('adds hreflang tags to head', () => {
    const html = '<html lang="en"><head><title>Test</title></head><body></body></html>';
    const result = injectTranslations(html, { 'Test': 'சோதனை' }, {
      lang: 'ta',
      page: 'index.html',
      baseUrl: BASE_URL,
      languages: LANGS,
    });
    assert.ok(result.includes('hreflang="en"'));
    assert.ok(result.includes('hreflang="ta"'));
    assert.ok(result.includes('hreflang="x-default"'));
    assert.ok(result.includes('href="https://pakkaquote.com/ta/index.html"'));
  });

  it('translates meta description and og tags', () => {
    const html = '<html lang="en"><head><meta name="description" content="A great product"><meta property="og:title" content="My Title"></head><body></body></html>';
    const translations = { 'A great product': 'ஒரு சிறந்த தயாரிப்பு', 'My Title': 'என் தலைப்பு' };
    const result = injectTranslations(html, translations, {
      lang: 'ta',
      page: 'index.html',
      baseUrl: BASE_URL,
      languages: LANGS,
    });
    assert.ok(result.includes('content="ஒரு சிறந்த தயாரிப்பு"'));
    assert.ok(result.includes('content="என் தலைப்பு"'));
  });

  it('keeps external URLs unchanged', () => {
    const html = '<html lang="en"><body><a href="https://google.com">Google</a><a href="#pricing">Pricing</a></body></html>';
    const result = injectTranslations(html, { 'Google': 'கூகிள்', 'Pricing': 'விலை' }, {
      lang: 'ta',
      page: 'index.html',
      baseUrl: BASE_URL,
      languages: LANGS,
    });
    assert.ok(result.includes('href="https://google.com"'));
    assert.ok(result.includes('href="#pricing"'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node --test scripts/test/inject.test.js
```

Expected: FAIL — `Cannot find module '../lib/inject.js'`

- [ ] **Step 3: Implement inject module**

Create `scripts/lib/inject.js`:

```javascript
const cheerio = require('cheerio');

const SKIP_TAGS = new Set(['script', 'style', 'code', 'noscript', 'iframe']);
const TRANSLATABLE_ATTRS = ['placeholder', 'alt', 'aria-label', 'title'];
const TRANSLATABLE_META_SELECTORS = [
  'meta[name="description"]',
  'meta[property="og:title"]',
  'meta[property="og:description"]',
  'meta[name="twitter:title"]',
  'meta[name="twitter:description"]',
];

// Relative internal page links to rewrite
const INTERNAL_PAGES = ['index.html', 'features.html', 'about.html', 'faq.html'];

/**
 * Inject translations into a cloned HTML string.
 *
 * @param {string} html - Original English HTML
 * @param {Object} translations - Map of English text -> translated text
 * @param {Object} opts
 * @param {string} opts.lang - Target language code (e.g., 'ta')
 * @param {string} opts.page - Page filename (e.g., 'index.html')
 * @param {string} opts.baseUrl - Base URL (e.g., 'https://pakkaquote.com')
 * @param {string[]} opts.languages - All language codes including 'en'
 * @returns {string} - Translated HTML string
 */
function injectTranslations(html, translations, { lang, page, baseUrl, languages }) {
  const $ = cheerio.load(html, { decodeEntities: false });

  // 1. Update <html lang>
  $('html').attr('lang', lang);

  // 2. Update og:locale
  const localeMap = { ta: 'ta_IN', hi: 'hi_IN', mr: 'mr_IN', gu: 'gu_IN' };
  const ogLocale = $('meta[property="og:locale"]');
  if (ogLocale.length) {
    ogLocale.attr('content', localeMap[lang] || `${lang}_IN`);
  }

  // 3. Translate meta tags
  for (const selector of TRANSLATABLE_META_SELECTORS) {
    const el = $(selector);
    if (el.length) {
      const original = el.attr('content');
      if (original && translations[original.trim()]) {
        el.attr('content', translations[original.trim()]);
      }
    }
  }

  // 4. Translate <title>
  const titleEl = $('title');
  const titleText = titleEl.text().trim();
  if (titleText && translations[titleText]) {
    titleEl.text(translations[titleText]);
  }

  // 5. Translate JSON-LD structured data
  $('script[type="application/ld+json"]').each(function () {
    try {
      const json = JSON.parse($(this).html());
      let changed = false;

      if (json.name && translations[json.name]) {
        json.name = translations[json.name];
        changed = true;
      }
      if (json.description && translations[json.description]) {
        json.description = translations[json.description];
        changed = true;
      }
      if (json.mainEntity && Array.isArray(json.mainEntity)) {
        for (const item of json.mainEntity) {
          if (item.name && translations[item.name]) {
            item.name = translations[item.name];
            changed = true;
          }
          if (item.acceptedAnswer?.text && translations[item.acceptedAnswer.text]) {
            item.acceptedAnswer.text = translations[item.acceptedAnswer.text];
            changed = true;
          }
        }
      }

      if (changed) {
        $(this).html(JSON.stringify(json, null, 2));
      }
    } catch {
      // Skip malformed JSON-LD
    }
  });

  // 6. Replace text nodes in body
  function walkAndReplace(nodes) {
    nodes.each(function () {
      if (this.type === 'text') {
        const parent = $(this).parent();
        const tagName = parent.length ? parent.prop('tagName')?.toLowerCase() : '';
        if (SKIP_TAGS.has(tagName)) return;

        const text = $(this).text().trim();
        if (text && translations[text]) {
          // Replace the text content while preserving surrounding whitespace
          const original = this.data;
          const leading = original.match(/^(\s*)/)[1];
          const trailing = original.match(/(\s*)$/)[1];
          this.data = leading + translations[text] + trailing;
        }
        return;
      }

      if (this.type !== 'tag') return;
      const tagName = this.tagName?.toLowerCase();
      if (SKIP_TAGS.has(tagName)) return;

      // Replace translatable attributes
      const el = $(this);
      for (const attr of TRANSLATABLE_ATTRS) {
        const val = el.attr(attr);
        if (val && val.trim() && translations[val.trim()]) {
          el.attr(attr, translations[val.trim()]);
        }
      }

      walkAndReplace(el.contents());
    });
  }

  walkAndReplace($('body').contents());

  // 7. Rewrite relative asset paths to absolute
  $('link[href]').each(function () {
    const href = $(this).attr('href');
    if (href && !href.startsWith('http') && !href.startsWith('//') && !href.startsWith('/')) {
      $(this).attr('href', '/' + href);
    }
  });
  $('script[src]').each(function () {
    const src = $(this).attr('src');
    if (src && !src.startsWith('http') && !src.startsWith('//') && !src.startsWith('/')) {
      $(this).attr('src', '/' + src);
    }
  });
  $('img[src]').each(function () {
    const src = $(this).attr('src');
    if (src && !src.startsWith('http') && !src.startsWith('//') && !src.startsWith('/')) {
      $(this).attr('src', '/' + src);
    }
  });

  // 8. Rewrite internal nav links to include language prefix
  $('a[href]').each(function () {
    const href = $(this).attr('href');
    if (!href) return;
    // Skip external, hash-only, and mailto links
    if (href.startsWith('http') || href.startsWith('//') || href.startsWith('#') || href.startsWith('mailto:')) return;

    // Match internal page links like "features.html", "index.html#pricing"
    for (const internalPage of INTERNAL_PAGES) {
      if (href === internalPage || href.startsWith(internalPage + '#')) {
        $(this).attr('href', `/${lang}/${href}`);
        return;
      }
    }
  });

  // 9. Rewrite logo link
  $('a.nav-logo').each(function () {
    const href = $(this).attr('href');
    if (href === 'index.html' || href === '/') {
      $(this).attr('href', `/${lang}/index.html`);
    }
  });

  // 10. Add hreflang tags
  const hreflangs = [];
  for (const l of languages) {
    const href = l === 'en'
      ? `${baseUrl}/${page}`
      : `${baseUrl}/${l}/${page}`;
    hreflangs.push(`<link rel="alternate" hreflang="${l}" href="${href}">`);
  }
  hreflangs.push(`<link rel="alternate" hreflang="x-default" href="${baseUrl}/${page}">`);
  $('head').append('\n' + hreflangs.join('\n') + '\n');

  // 11. Update canonical URL
  const canonical = $('link[rel="canonical"]');
  if (canonical.length) {
    canonical.attr('href', `${baseUrl}/${lang}/${page}`);
  }

  // 12. Update og:url
  const ogUrl = $('meta[property="og:url"]');
  if (ogUrl.length) {
    ogUrl.attr('content', `${baseUrl}/${lang}/${page}`);
  }

  return $.html();
}

module.exports = { injectTranslations };
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
node --test scripts/test/inject.test.js
```

Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/inject.js scripts/test/inject.test.js
git commit -m "feat: add translation injection module with path/link rewriting"
```

---

### Task 5: Sitemap Generation

**Files:**
- Create: `scripts/lib/sitemap.js`
- Create: `scripts/test/sitemap.test.js`

- [ ] **Step 1: Write the failing test**

Create `scripts/test/sitemap.test.js`:

```javascript
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { generateSitemap } = require('../lib/sitemap.js');

describe('generateSitemap', () => {
  const BASE_URL = 'https://pakkaquote.com';
  const PAGES = ['index.html', 'features.html', 'about.html', 'faq.html'];
  const LANGS = ['en', 'ta', 'hi', 'mr', 'gu'];

  it('generates valid XML with all pages and languages', () => {
    const xml = generateSitemap({ baseUrl: BASE_URL, pages: PAGES, languages: LANGS });
    assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
    assert.ok(xml.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"'));
  });

  it('includes xhtml:link alternates for each page', () => {
    const xml = generateSitemap({ baseUrl: BASE_URL, pages: PAGES, languages: LANGS });
    // Each page should have 5 language alternates + x-default
    assert.ok(xml.includes('hreflang="ta"'));
    assert.ok(xml.includes('hreflang="hi"'));
    assert.ok(xml.includes('hreflang="x-default"'));
    assert.ok(xml.includes('https://pakkaquote.com/ta/features.html'));
  });

  it('generates correct number of URL entries', () => {
    const xml = generateSitemap({ baseUrl: BASE_URL, pages: PAGES, languages: LANGS });
    // 4 pages x 5 languages = 20 URL entries
    const urlCount = (xml.match(/<url>/g) || []).length;
    assert.strictEqual(urlCount, 20);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node --test scripts/test/sitemap.test.js
```

Expected: FAIL — `Cannot find module '../lib/sitemap.js'`

- [ ] **Step 3: Implement sitemap module**

Create `scripts/lib/sitemap.js`:

```javascript
/**
 * Generate a multilingual sitemap.xml with xhtml:link alternates.
 *
 * @param {Object} opts
 * @param {string} opts.baseUrl - e.g., 'https://pakkaquote.com'
 * @param {string[]} opts.pages - e.g., ['index.html', 'features.html', ...]
 * @param {string[]} opts.languages - e.g., ['en', 'ta', 'hi', 'mr', 'gu']
 * @returns {string} - Complete sitemap XML
 */
function generateSitemap({ baseUrl, pages, languages }) {
  const today = new Date().toISOString().split('T')[0];

  const priorityMap = {
    'index.html': '1.0',
    'features.html': '0.9',
    'faq.html': '0.8',
    'about.html': '0.7',
  };

  let urls = '';

  for (const lang of languages) {
    for (const page of pages) {
      const loc = lang === 'en'
        ? `${baseUrl}/${page}`
        : `${baseUrl}/${lang}/${page}`;

      // Build xhtml:link alternates for this page
      let alternates = '';
      for (const altLang of languages) {
        const altHref = altLang === 'en'
          ? `${baseUrl}/${page}`
          : `${baseUrl}/${altLang}/${page}`;
        alternates += `    <xhtml:link rel="alternate" hreflang="${altLang}" href="${altHref}"/>\n`;
      }
      alternates += `    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}/${page}"/>\n`;

      urls += `  <url>\n`;
      urls += `    <loc>${loc}</loc>\n`;
      urls += `    <lastmod>${today}</lastmod>\n`;
      urls += `    <changefreq>${page === 'index.html' ? 'weekly' : 'monthly'}</changefreq>\n`;
      urls += `    <priority>${priorityMap[page] || '0.5'}</priority>\n`;
      urls += alternates;
      urls += `  </url>\n`;
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}</urlset>\n`;
}

module.exports = { generateSitemap };
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
node --test scripts/test/sitemap.test.js
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/sitemap.js scripts/test/sitemap.test.js
git commit -m "feat: add multilingual sitemap generator"
```

---

### Task 6: Language Switcher CSS

**Files:**
- Modify: `css/styles.css:619` (before the cookie consent section)

- [ ] **Step 1: Add language switcher styles to `css/styles.css`**

Insert before the `/* Cookie Consent Banner */` comment (line 622):

```css
/* ══════════════════════════════════════════════════════════════
   Language Switcher
   ══════════════════════════════════════════════════════════════ */

.lang-switcher {
  position: relative;
}

.lang-switcher-btn {
  font-family: var(--font-l);
  font-size: 12px;
  font-weight: 500;
  color: var(--secondary);
  background: none;
  border: 1.5px solid var(--outline-variant);
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: border-color 0.15s, color 0.15s;
}

.lang-switcher-btn:hover {
  border-color: var(--outline);
  color: var(--on-surface);
}

.lang-switcher-btn svg {
  width: 10px;
  height: 10px;
  transition: transform 0.2s;
}

.lang-switcher.open .lang-switcher-btn svg {
  transform: rotate(180deg);
}

.lang-dropdown {
  display: none;
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  background: var(--surface-container-lowest);
  border: 1px solid var(--outline-variant);
  border-radius: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  min-width: 140px;
  z-index: 200;
  overflow: hidden;
}

.lang-switcher.open .lang-dropdown {
  display: block;
}

.lang-option {
  display: block;
  width: 100%;
  padding: 10px 14px;
  font-family: var(--font-l);
  font-size: 13px;
  color: var(--on-surface);
  text-decoration: none;
  transition: background 0.1s;
}

.lang-option:hover {
  background: var(--surface-container-low);
}

.lang-option.active {
  color: var(--primary);
  font-weight: 600;
  pointer-events: none;
}
```

- [ ] **Step 2: Commit**

```bash
git add css/styles.css
git commit -m "style: add language switcher dropdown styles"
```

---

### Task 7: Add Language Switcher to English Source Pages

**Files:**
- Modify: `index.html:222-226`
- Modify: `features.html` (nav section)
- Modify: `about.html:119-124`
- Modify: `faq.html:290-295`

The language switcher HTML to insert inside each `<nav>`, replacing the existing `.nav-actions` div:

```html
<div class="nav-actions">
  <div class="lang-switcher">
    <button class="lang-switcher-btn" aria-expanded="false" aria-label="Select language">
      EN
      <svg viewBox="0 0 10 6" fill="none" aria-hidden="true"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
    <div class="lang-dropdown" role="menu">
      <a href="/index.html" class="lang-option active" role="menuitem">English</a>
      <a href="/ta/index.html" class="lang-option" role="menuitem">தமிழ்</a>
      <a href="/hi/index.html" class="lang-option" role="menuitem">हिन्दी</a>
      <a href="/mr/index.html" class="lang-option" role="menuitem">मराठी</a>
      <a href="/gu/index.html" class="lang-option" role="menuitem">ગુજરાતી</a>
    </div>
  </div>
  <a href="#" class="btn-login">Login</a>
  <a href="#waitlist" class="btn-cta">Get Started</a>
</div>
```

**Important:** The `href` in each `.lang-option` must match the current page. For example, in `features.html`, the links should be `/features.html`, `/ta/features.html`, `/hi/features.html`, etc.

- [ ] **Step 1: Update `index.html` nav-actions**

In `index.html`, replace the existing `.nav-actions` div (lines 222-225):

Old:
```html
  <div class="nav-actions">
    <a href="#" class="btn-login">Login</a>
    <a href="#waitlist" class="btn-cta">Get Started</a>
  </div>
```

New:
```html
  <div class="nav-actions">
    <div class="lang-switcher">
      <button class="lang-switcher-btn" aria-expanded="false" aria-label="Select language">
        EN
        <svg viewBox="0 0 10 6" fill="none" aria-hidden="true"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <div class="lang-dropdown" role="menu">
        <a href="/index.html" class="lang-option active" role="menuitem">English</a>
        <a href="/ta/index.html" class="lang-option" role="menuitem">தமிழ்</a>
        <a href="/hi/index.html" class="lang-option" role="menuitem">हिन्दी</a>
        <a href="/mr/index.html" class="lang-option" role="menuitem">मराठी</a>
        <a href="/gu/index.html" class="lang-option" role="menuitem">ગુજરાતી</a>
      </div>
    </div>
    <a href="#" class="btn-login">Login</a>
    <a href="#waitlist" class="btn-cta">Get Started</a>
  </div>
```

- [ ] **Step 2: Update `features.html` nav-actions**

Same pattern, but lang-option hrefs point to `/features.html`, `/ta/features.html`, etc.

- [ ] **Step 3: Update `about.html` nav-actions**

Same pattern, hrefs point to `/about.html`, `/ta/about.html`, etc. The CTA links should stay as `index.html#waitlist`.

- [ ] **Step 4: Update `faq.html` nav-actions**

Same pattern, hrefs point to `/faq.html`, `/ta/faq.html`, etc.

- [ ] **Step 5: Add language switcher toggle JS to `js/main.js`**

Add at the end of the `DOMContentLoaded` callback (before the closing `});`):

```javascript
  // =========================================================================
  // 4. Language Switcher Toggle
  // =========================================================================

  var langSwitcher = document.querySelector('.lang-switcher');
  var langBtn = document.querySelector('.lang-switcher-btn');

  if (langSwitcher && langBtn) {
    langBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = langSwitcher.classList.toggle('open');
      langBtn.setAttribute('aria-expanded', isOpen);
    });

    // Close on outside click
    document.addEventListener('click', function (e) {
      if (!langSwitcher.contains(e.target)) {
        langSwitcher.classList.remove('open');
        langBtn.setAttribute('aria-expanded', 'false');
      }
    });

    // Close on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && langSwitcher.classList.contains('open')) {
        langSwitcher.classList.remove('open');
        langBtn.setAttribute('aria-expanded', 'false');
        langBtn.focus();
      }
    });
  }
```

- [ ] **Step 6: Commit**

```bash
git add index.html features.html about.html faq.html js/main.js
git commit -m "feat: add language switcher to navigation on all pages"
```

---

### Task 8: Main Orchestrator Script

**Files:**
- Create: `scripts/translate.js`

- [ ] **Step 1: Create the orchestrator script**

Create `scripts/translate.js`:

```javascript
#!/usr/bin/env node

/**
 * PakkaQuote Multilingual Build Script
 *
 * Usage:
 *   node scripts/translate.js              # Translate all languages
 *   node scripts/translate.js --lang ta    # Translate Tamil only
 *   node scripts/translate.js --dry-run    # Extract strings, show count, skip API
 */

const fs = require('node:fs');
const path = require('node:path');
const { extractTexts } = require('./lib/extract.js');
const { Translator } = require('./lib/translator.js');
const { injectTranslations } = require('./lib/inject.js');
const { generateSitemap } = require('./lib/sitemap.js');

// ── Config ──────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');
const BASE_URL = 'https://pakkaquote.com';
const PAGES = ['index.html', 'features.html', 'about.html', 'faq.html'];
const ALL_LANGS = ['ta', 'hi', 'mr', 'gu'];
const ALL_LANGS_WITH_EN = ['en', ...ALL_LANGS];
const CACHE_DIR = path.join(ROOT, 'i18n', 'cache');

// Language display names (native script) for switcher
const LANG_NAMES = {
  en: 'English',
  ta: 'தமிழ்',
  hi: 'हिन्दी',
  mr: 'मराठी',
  gu: 'ગુજરાતી',
};

const LANG_CODES = {
  en: 'EN',
  ta: 'த',
  hi: 'हि',
  mr: 'म',
  gu: 'ગુ',
};

// ── Load .env ───────────────────────────────────────────────────────────────

function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

// ── CLI Args ────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { langs: ALL_LANGS, dryRun: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--lang' && args[i + 1]) {
      opts.langs = [args[++i]];
    }
    if (args[i] === '--dry-run') {
      opts.dryRun = true;
    }
  }
  return opts;
}

// ── Language Switcher HTML ──────────────────────────────────────────────────

function buildSwitcherHtml(currentLang, currentPage) {
  const options = ALL_LANGS_WITH_EN.map(l => {
    const href = l === 'en' ? `/${currentPage}` : `/${l}/${currentPage}`;
    const active = l === currentLang ? ' active' : '';
    return `      <a href="${href}" class="lang-option${active}" role="menuitem">${LANG_NAMES[l]}</a>`;
  }).join('\n');

  return `    <div class="lang-switcher">
      <button class="lang-switcher-btn" aria-expanded="false" aria-label="Select language">
        ${LANG_CODES[currentLang]}
        <svg viewBox="0 0 10 6" fill="none" aria-hidden="true"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <div class="lang-dropdown" role="menu">
${options}
      </div>
    </div>`;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  loadEnv();
  const opts = parseArgs();
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;

  if (!apiKey && !opts.dryRun) {
    console.error('ERROR: GOOGLE_TRANSLATE_API_KEY not set in .env');
    process.exit(1);
  }

  // Load no-translate terms
  const noTranslatePath = path.join(ROOT, 'i18n', 'no-translate.json');
  const noTranslateTerms = JSON.parse(fs.readFileSync(noTranslatePath, 'utf-8')).terms;

  const translator = new Translator({
    apiKey: apiKey || '',
    cacheDir: CACHE_DIR,
    noTranslateTerms,
  });

  // ── Phase 1: Extract ──
  console.log('\n📝 Phase 1: Extracting text from English pages...\n');

  const pageExtractions = {};
  const allTexts = new Set();

  for (const page of PAGES) {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf-8');
    const extracted = extractTexts(html);
    pageExtractions[page] = { html, extracted };
    for (const item of extracted) {
      allTexts.add(item.text);
    }
    console.log(`  ${page}: ${extracted.length} strings`);
  }

  const uniqueTexts = [...allTexts];
  console.log(`\n  Total unique strings: ${uniqueTexts.length}`);

  if (opts.dryRun) {
    console.log('\n🏁 Dry run complete. No translations performed.');
    return;
  }

  // ── Phase 2: Translate ──
  console.log('\n🌐 Phase 2: Translating...\n');

  const translationMaps = {};

  for (const lang of opts.langs) {
    translator.loadCache(lang);
    const uncached = uniqueTexts.filter(t => !translator.getCached(t, lang));
    console.log(`  ${lang} (${LANG_NAMES[lang]}): ${uncached.length} new strings to translate, ${uniqueTexts.length - uncached.length} cached`);

    const translated = await translator.translate(uniqueTexts, lang);
    const map = {};
    for (let i = 0; i < uniqueTexts.length; i++) {
      map[uniqueTexts[i]] = translated[i];
    }
    translationMaps[lang] = map;
  }

  // ── Phase 3: Inject & Write ──
  console.log('\n📦 Phase 3: Generating translated pages...\n');

  for (const lang of opts.langs) {
    const langDir = path.join(ROOT, lang);
    fs.mkdirSync(langDir, { recursive: true });

    for (const page of PAGES) {
      const { html } = pageExtractions[page];
      const translatedHtml = injectTranslations(html, translationMaps[lang], {
        lang,
        page,
        baseUrl: BASE_URL,
        languages: ALL_LANGS_WITH_EN,
      });

      // Replace the language switcher with the correct active language
      const $ = require('cheerio').load(translatedHtml, { decodeEntities: false });
      const existingSwitcher = $('.lang-switcher');
      if (existingSwitcher.length) {
        existingSwitcher.replaceWith(buildSwitcherHtml(lang, page));
      }

      const outPath = path.join(langDir, page);
      fs.writeFileSync(outPath, $.html(), 'utf-8');
      console.log(`  ✓ ${lang}/${page}`);
    }
  }

  // ── Phase 4: Sitemap ──
  console.log('\n🗺️  Phase 4: Generating sitemap...\n');

  const sitemapXml = generateSitemap({
    baseUrl: BASE_URL,
    pages: PAGES,
    languages: ALL_LANGS_WITH_EN,
  });
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemapXml, 'utf-8');
  console.log('  ✓ sitemap.xml updated');

  // ── Done ──
  const totalPages = opts.langs.length * PAGES.length;
  console.log(`\n✅ Done! Generated ${totalPages} translated pages across ${opts.langs.length} language(s).\n`);
}

main().catch(err => {
  console.error('Translation build failed:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Verify dry-run mode works**

```bash
node scripts/translate.js --dry-run
```

Expected: Prints extraction stats for each page, total unique strings, then "Dry run complete."

- [ ] **Step 3: Commit**

```bash
git add scripts/translate.js
git commit -m "feat: add main translation build orchestrator script"
```

---

### Task 9: DataLayer Language Property

**Files:**
- Modify: `scripts/lib/inject.js`

- [ ] **Step 1: Add dataLayer language push to inject module**

In `scripts/lib/inject.js`, add after the hreflang injection (step 10) and before the return:

```javascript
  // 13. Add language to dataLayer for GA4 segmentation
  const langScript = `<script>window.dataLayer = window.dataLayer || []; window.dataLayer.push({'page_language': '${lang}'});</script>`;
  $('head').append(langScript + '\n');
```

- [ ] **Step 2: Commit**

```bash
git add scripts/lib/inject.js
git commit -m "feat: add page_language to dataLayer for GA4 segmentation"
```

---

### Task 10: Add hreflang to English Source Pages

**Files:**
- Modify: `scripts/translate.js`

The orchestrator should also add hreflang tags to the English source pages so search engines see the alternates from the English pages too. Add this after the sitemap generation phase.

- [ ] **Step 1: Add English hreflang injection to orchestrator**

Add after the sitemap phase in `scripts/translate.js`, before the "Done" log:

```javascript
  // ── Phase 5: Update English pages with hreflang tags ──
  console.log('\n🏷️  Phase 5: Adding hreflang tags to English pages...\n');

  const cheerio = require('cheerio');
  for (const page of PAGES) {
    const htmlPath = path.join(ROOT, page);
    const html = fs.readFileSync(htmlPath, 'utf-8');
    const $ = cheerio.load(html, { decodeEntities: false });

    // Remove any existing hreflang tags (from previous runs)
    $('link[rel="alternate"][hreflang]').remove();

    // Add fresh hreflang tags
    const hreflangs = [];
    for (const l of ALL_LANGS_WITH_EN) {
      const href = l === 'en'
        ? `${BASE_URL}/${page}`
        : `${BASE_URL}/${l}/${page}`;
      hreflangs.push(`<link rel="alternate" hreflang="${l}" href="${href}">`);
    }
    hreflangs.push(`<link rel="alternate" hreflang="x-default" href="${BASE_URL}/${page}">`);
    $('head').append('\n' + hreflangs.join('\n') + '\n');

    fs.writeFileSync(htmlPath, $.html(), 'utf-8');
    console.log(`  ✓ ${page} (hreflang added)`);
  }
```

- [ ] **Step 2: Commit**

```bash
git add scripts/translate.js
git commit -m "feat: add hreflang tags to English source pages during build"
```

---

### Task 11: Integration Test

**Files:**
- Create: `scripts/test/integration.test.js`

- [ ] **Step 1: Write integration test**

Create `scripts/test/integration.test.js`:

```javascript
const { describe, it, before } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { extractTexts } = require('../lib/extract.js');
const { injectTranslations } = require('../lib/inject.js');
const { generateSitemap } = require('../lib/sitemap.js');

const ROOT = path.resolve(__dirname, '../..');
const BASE_URL = 'https://pakkaquote.com';
const PAGES = ['index.html', 'features.html', 'about.html', 'faq.html'];
const LANGS = ['en', 'ta', 'hi', 'mr', 'gu'];

describe('Integration: extract → inject roundtrip', () => {
  let indexHtml;

  before(() => {
    indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');
  });

  it('extracts a reasonable number of strings from index.html', () => {
    const extracted = extractTexts(indexHtml);
    // index.html has substantial content — expect at least 30 strings
    assert.ok(extracted.length >= 30, `Expected >= 30 strings, got ${extracted.length}`);
  });

  it('extracts meta description from index.html', () => {
    const extracted = extractTexts(indexHtml);
    const texts = extracted.map(e => e.text);
    assert.ok(texts.some(t => t.includes('WhatsApp inquiries into professional PDF proposals')));
  });

  it('produces valid HTML after injection with mock translations', () => {
    const extracted = extractTexts(indexHtml);
    // Create mock translations (just prefix with [TA])
    const mockTranslations = {};
    for (const item of extracted) {
      mockTranslations[item.text] = `[TA] ${item.text}`;
    }

    const result = injectTranslations(indexHtml, mockTranslations, {
      lang: 'ta',
      page: 'index.html',
      baseUrl: BASE_URL,
      languages: LANGS,
    });

    // Should have lang="ta"
    assert.ok(result.includes('lang="ta"'));
    // Should have hreflang tags
    assert.ok(result.includes('hreflang="en"'));
    assert.ok(result.includes('hreflang="ta"'));
    // Should have absolute asset paths
    assert.ok(result.includes('href="/css/styles.css"'));
    // Should have prefixed nav links
    assert.ok(result.includes('href="/ta/features.html"'));
    // Should contain mock translated text
    assert.ok(result.includes('[TA]'));
  });

  it('generates sitemap with correct structure', () => {
    const xml = generateSitemap({ baseUrl: BASE_URL, pages: PAGES, languages: LANGS });
    assert.ok(xml.includes('<?xml'));
    // 4 pages x 5 languages = 20 URLs
    const urlCount = (xml.match(/<url>/g) || []).length;
    assert.strictEqual(urlCount, 20);
  });
});
```

- [ ] **Step 2: Run all tests**

```bash
node --test scripts/test/
```

Expected: All tests across all test files PASS.

- [ ] **Step 3: Commit**

```bash
git add scripts/test/integration.test.js
git commit -m "test: add integration test for extract-inject roundtrip"
```

---

### Task 12: Final Verification

- [ ] **Step 1: Run all tests one more time**

```bash
npm run test:translate
```

Expected: All tests PASS.

- [ ] **Step 2: Run dry-run to verify extraction**

```bash
npm run translate -- --dry-run
```

Expected: Shows extraction stats for all 4 pages, reasonable string counts.

- [ ] **Step 3: Test with real API (requires API key)**

Add `GOOGLE_TRANSLATE_API_KEY=your-key` to `.env`, then:

```bash
npm run translate -- --lang ta
```

Expected: Tamil translations generated in `ta/` directory. Verify:
- `ta/index.html` has `lang="ta"`
- `ta/index.html` has Tamil text
- `ta/index.html` has absolute asset paths (`/css/styles.css`)
- `ta/index.html` has prefixed nav links (`/ta/features.html`)
- `ta/index.html` has hreflang tags
- Language switcher shows "த" and Tamil is marked active
- `sitemap.xml` updated with all language alternates

- [ ] **Step 4: Run full build for all languages**

```bash
npm run translate
```

Expected: All 16 translated pages generated (4 pages x 4 languages). Sitemap updated.

- [ ] **Step 5: Commit any remaining changes**

```bash
git add -A
git commit -m "feat: complete multilingual build pipeline"
```
