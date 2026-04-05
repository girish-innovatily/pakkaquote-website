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
