/**
 * PakkaQuote — Analytics & Event Tracking
 * ========================================
 * Pushes structured events to the dataLayer for GTM to pick up.
 * GTM routes these to GA4, HubSpot, LinkedIn, Meta, etc.
 *
 * Each tracker is a self-contained function. Nothing leaks into global
 * scope except window.dataLayer (required by GTM) and window.pqTracking
 * (so main.js can read UTM data for the waitlist_signup event).
 */

(function () {
  'use strict';

  window.dataLayer = window.dataLayer || [];

  // ── Page metadata (used by every tracker) ────────────────────────
  var pagePath = window.location.pathname;
  var pageMap = {
    '/':              { name: 'Homepage',  category: 'landing' },
    '/index.html':    { name: 'Homepage',  category: 'landing' },
    '/features.html': { name: 'Features',  category: 'product' },
    '/about.html':    { name: 'About',     category: 'brand' },
    '/faq.html':      { name: 'FAQ',       category: 'support' }
  };
  var pageInfo = pageMap[pagePath] || { name: 'Other', category: 'other' };

  // Push page context so GTM tags can segment on it
  window.dataLayer.push({
    event:         'page_context',
    page_name:     pageInfo.name,
    page_category: pageInfo.category,
    page_path:     pagePath,
    page_title:    document.title
  });


  // ═══════════════════════════════════════════════════════════════════
  // Consent Mode Defaults
  // ═══════════════════════════════════════════════════════════════════

  function initConsent() {
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    gtag('consent', 'default', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      wait_for_update: 500
    });
  }


  // ═══════════════════════════════════════════════════════════════════
  // UTM Capture
  // ═══════════════════════════════════════════════════════════════════

  function captureUtm() {
    var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    var utmData = {};
    var params = new URLSearchParams(window.location.search);
    var hasNew = false;

    UTM_KEYS.forEach(function (key) {
      var val = params.get(key);
      if (val) { utmData[key] = val; hasNew = true; }
    });

    if (hasNew) {
      try { sessionStorage.setItem('pq_utm', JSON.stringify(utmData)); } catch (e) {}
    } else {
      try {
        var stored = sessionStorage.getItem('pq_utm');
        if (stored) utmData = JSON.parse(stored);
      } catch (e) {}
    }

    window.dataLayer.push({
      event:        'utm_captured',
      utm_source:   utmData.utm_source   || '(direct)',
      utm_medium:   utmData.utm_medium   || '(none)',
      utm_campaign: utmData.utm_campaign || '(not set)',
      utm_term:     utmData.utm_term     || '',
      utm_content:  utmData.utm_content  || ''
    });

    return utmData;
  }


  // ═══════════════════════════════════════════════════════════════════
  // CTA Click Tracking
  // ═══════════════════════════════════════════════════════════════════

  function trackCtaClicks() {
    var selector = '.btn-cta, .btn-hero, .btn-hero-outline, .price-btn, .cta-btn, [data-track-cta]';

    document.querySelectorAll(selector).forEach(function (btn) {
      btn.addEventListener('click', function () {
        window.dataLayer.push({
          event:       'cta_click',
          cta_text:    (btn.textContent || '').trim().substring(0, 50),
          cta_section: findParentSection(btn),
          page_name:   pageInfo.name
        });
      });
    });
  }


  // ═══════════════════════════════════════════════════════════════════
  // FAQ Accordion Open Tracking
  // ═══════════════════════════════════════════════════════════════════

  function trackFaqOpens() {
    document.querySelectorAll('.faq-question').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var parent = btn.parentElement;
        // Only track opens, not closes
        if (!parent.classList.contains('open')) {
          window.dataLayer.push({
            event:        'faq_open',
            faq_question: (btn.textContent || '').trim().replace(/\s+/g, ' ').substring(0, 100),
            page_name:    pageInfo.name
          });
        }
      });
    });
  }


  // ═══════════════════════════════════════════════════════════════════
  // Scroll Depth Tracking (25%, 50%, 75%, 100%)
  // ═══════════════════════════════════════════════════════════════════

  function trackScrollDepth() {
    var milestones = [25, 50, 75, 100];
    var fired = {};

    function getScrollPercent() {
      var h = document.documentElement;
      var scrollTop = h.scrollTop || document.body.scrollTop;
      var scrollHeight = (h.scrollHeight || document.body.scrollHeight) - h.clientHeight;
      if (scrollHeight <= 0) return 100;
      return Math.round((scrollTop / scrollHeight) * 100);
    }

    var timer = null;
    window.addEventListener('scroll', function () {
      if (timer) return;
      timer = setTimeout(function () {
        timer = null;
        var pct = getScrollPercent();
        milestones.forEach(function (m) {
          if (pct >= m && !fired[m]) {
            fired[m] = true;
            window.dataLayer.push({
              event:          'scroll_depth',
              scroll_percent: m,
              page_name:      pageInfo.name
            });
          }
        });
      }, 200);
    });
  }


  // ═══════════════════════════════════════════════════════════════════
  // Section View Tracking (IntersectionObserver)
  // ═══════════════════════════════════════════════════════════════════

  function trackSectionViews() {
    if (!('IntersectionObserver' in window)) return;

    var sections = document.querySelectorAll('section[id]');
    if (!sections.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          window.dataLayer.push({
            event:     'section_view',
            section:   entry.target.id,
            page_name: pageInfo.name
          });
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }


  // ═══════════════════════════════════════════════════════════════════
  // Time on Page Tracking (30s, 60s, 120s, 300s)
  // ═══════════════════════════════════════════════════════════════════

  function trackTimeOnPage() {
    var thresholds = [30, 60, 120, 300];

    thresholds.forEach(function (seconds) {
      setTimeout(function () {
        if (!document.hidden) {
          window.dataLayer.push({
            event:           'time_on_page',
            seconds_on_page: seconds,
            page_name:       pageInfo.name
          });
        }
      }, seconds * 1000);
    });
  }


  // ═══════════════════════════════════════════════════════════════════
  // Nav Link Click Tracking
  // ═══════════════════════════════════════════════════════════════════

  function trackNavClicks() {
    document.querySelectorAll('.nav-links a').forEach(function (link) {
      link.addEventListener('click', function () {
        window.dataLayer.push({
          event:     'nav_click',
          nav_text:  (link.textContent || '').trim(),
          nav_href:  link.getAttribute('href') || '',
          page_name: pageInfo.name
        });
      });
    });
  }


  // ═══════════════════════════════════════════════════════════════════
  // Outbound Link Click Tracking
  // ═══════════════════════════════════════════════════════════════════

  function trackOutboundClicks() {
    document.querySelectorAll('a[href^="http"], a[href^="mailto:"]').forEach(function (link) {
      var href = link.getAttribute('href') || '';
      if (href.indexOf(window.location.hostname) !== -1) return;
      if (href.indexOf('pakkaquote.com') !== -1) return;

      link.addEventListener('click', function () {
        window.dataLayer.push({
          event:     'outbound_click',
          link_url:  href,
          link_text: (link.textContent || '').trim().substring(0, 50),
          page_name: pageInfo.name
        });
      });
    });
  }


  // ═══════════════════════════════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════════════════════════════

  function findParentSection(el) {
    var node = el;
    while (node && node !== document.body) {
      if (node.tagName === 'SECTION') {
        return node.id || node.className.split(' ')[0] || 'unknown';
      }
      node = node.parentElement;
    }
    return 'unknown';
  }


  // ═══════════════════════════════════════════════════════════════════
  // Init
  // ═══════════════════════════════════════════════════════════════════

  initConsent();
  var utmData = captureUtm();

  // Expose UTM data so main.js can include it in the waitlist_signup event
  window.pqTracking = {
    utmData: utmData,
    pageInfo: pageInfo
  };

  document.addEventListener('DOMContentLoaded', function () {
    trackCtaClicks();
    trackFaqOpens();
    trackScrollDepth();
    trackSectionViews();
    trackTimeOnPage();
    trackNavClicks();
    trackOutboundClicks();
  });

})();
