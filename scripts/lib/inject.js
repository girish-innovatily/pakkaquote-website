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

const INTERNAL_PAGES = ['index.html', 'features.html', 'about.html', 'faq.html'];

function injectTranslations(html, translations, { lang, page, baseUrl, languages }) {
  const hasHead = /<head[\s>]/i.test(html);
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
    if (href.startsWith('http') || href.startsWith('//') || href.startsWith('#') || href.startsWith('mailto:')) return;

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

  // 10. Add hreflang tags (only if original HTML had a <head> tag)
  if (hasHead) {
    const hreflangs = [];
    for (const l of languages) {
      const href = l === 'en'
        ? `${baseUrl}/${page}`
        : `${baseUrl}/${l}/${page}`;
      hreflangs.push(`<link rel="alternate" hreflang="${l}" href="${href}">`);
    }
    hreflangs.push(`<link rel="alternate" hreflang="x-default" href="${baseUrl}/${page}">`);
    $('head').append('\n' + hreflangs.join('\n') + '\n');
  }

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
