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
