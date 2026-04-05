const fs = require('node:fs');
const path = require('node:path');

class Translator {
  constructor({ apiKey, cacheDir, noTranslateTerms = [] }) {
    this.apiKey = apiKey;
    this.cacheDir = cacheDir;
    this.noTranslateTerms = noTranslateTerms;
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

  wrapNoTranslate(text) {
    let result = text;
    for (const term of this.noTranslateTerms) {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'g');
      result = result.replace(regex, `<span class="notranslate">${term}</span>`);
    }
    return result;
  }

  unwrapNoTranslate(text) {
    // Handle both regular quotes and HTML-entity-encoded quotes (&quot;)
    return text
      .replace(/<span class="notranslate">([^<]+)<\/span>/g, '$1')
      .replace(/<span class=&quot;notranslate&quot;>([^<]+)<\/span>/g, '$1')
      .replace(/<span class=&#34;notranslate&#34;>([^<]+)<\/span>/g, '$1');
  }

  async translate(texts, targetLang) {
    this.loadCache(targetLang);

    const results = new Array(texts.length);
    const uncachedIndices = [];
    const uncachedTexts = [];

    for (let i = 0; i < texts.length; i++) {
      const cached = this.getCached(texts[i], targetLang);
      if (cached) {
        results[i] = cached;
      } else {
        uncachedIndices.push(i);
        uncachedTexts.push(texts[i]);
      }
    }

    if (uncachedTexts.length > 0) {
      const translated = await this.callApi(uncachedTexts, targetLang);
      for (let j = 0; j < uncachedIndices.length; j++) {
        const originalIdx = uncachedIndices[j];
        results[originalIdx] = translated[j];
        this.setCached(texts[originalIdx], translated[j], targetLang);
      }
      this.saveCache(targetLang);
    }

    // Safety net: unwrap any lingering notranslate spans (from cache or API)
    return results.map(r => this.unwrapNoTranslate(r));
  }

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
