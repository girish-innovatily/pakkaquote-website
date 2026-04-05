const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { Translator } = require('../lib/translator.js');
const fs = require('node:fs');
const path = require('node:path');

const TEST_CACHE_DIR = path.join(__dirname, '../../i18n/cache-test');

describe('Translator', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_CACHE_DIR)) {
      fs.rmSync(TEST_CACHE_DIR, { recursive: true });
    }
    fs.mkdirSync(TEST_CACHE_DIR, { recursive: true });
  });

  it('returns cached translations without calling API', async () => {
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
