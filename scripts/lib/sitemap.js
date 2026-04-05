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
