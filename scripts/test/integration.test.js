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
    assert.ok(extracted.length >= 30, `Expected >= 30 strings, got ${extracted.length}`);
  });

  it('extracts meta description from index.html', () => {
    const extracted = extractTexts(indexHtml);
    const texts = extracted.map(e => e.text);
    assert.ok(texts.some(t => t.includes('WhatsApp inquiries into professional PDF proposals')));
  });

  it('produces valid HTML after injection with mock translations', () => {
    const extracted = extractTexts(indexHtml);
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

    assert.ok(result.includes('lang="ta"'));
    assert.ok(result.includes('hreflang="en"'));
    assert.ok(result.includes('hreflang="ta"'));
    assert.ok(result.includes('href="/css/styles.css"'));
    assert.ok(result.includes('href="/ta/features.html"'));
    assert.ok(result.includes('[TA]'));
  });

  it('generates sitemap with correct structure', () => {
    const xml = generateSitemap({ baseUrl: BASE_URL, pages: PAGES, languages: LANGS });
    assert.ok(xml.includes('<?xml'));
    const urlCount = (xml.match(/<url>/g) || []).length;
    assert.strictEqual(urlCount, 20);
  });
});
