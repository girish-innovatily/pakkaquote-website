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
const cheerio = require('cheerio');
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
      const $ = cheerio.load(translatedHtml, { decodeEntities: false });
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

  // ── Phase 5: Update English pages with hreflang tags ──
  console.log('\n🏷️  Phase 5: Adding hreflang tags to English pages...\n');

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

  const totalPages = opts.langs.length * PAGES.length;
  console.log(`\n✅ Done! Generated ${totalPages} translated pages across ${opts.langs.length} language(s).\n`);
}

main().catch(err => {
  console.error('Translation build failed:', err);
  process.exit(1);
});
