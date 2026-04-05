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
