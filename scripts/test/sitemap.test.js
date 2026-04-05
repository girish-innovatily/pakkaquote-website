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
    assert.ok(xml.includes('hreflang="ta"'));
    assert.ok(xml.includes('hreflang="hi"'));
    assert.ok(xml.includes('hreflang="x-default"'));
    assert.ok(xml.includes('https://pakkaquote.com/ta/features.html'));
  });

  it('generates correct number of URL entries', () => {
    const xml = generateSitemap({ baseUrl: BASE_URL, pages: PAGES, languages: LANGS });
    const urlCount = (xml.match(/<url>/g) || []).length;
    assert.strictEqual(urlCount, 20);
  });
});
