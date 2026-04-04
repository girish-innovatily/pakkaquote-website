/**
 * PakkaQuote — Marketing & Analytics Infrastructure
 * ==================================================
 * This file sets up the data layer, event tracking, UTM capture,
 * and consent-aware tag firing. All tags (GA4, HubSpot, LinkedIn,
 * Meta, etc.) are managed through Google Tag Manager — this file
 * just pushes structured events to the dataLayer.
 *
 * SETUP REQUIRED:
 *   1. Create a GTM container → paste the GTM-M26CDSJN ID in the HTML
 *   2. Inside GTM, create tags for GA4 / HubSpot / LinkedIn / Meta
 *   3. Each tag uses dataLayer events from this file as triggers
 */

(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════════
  // 1. DATA LAYER INIT
  // ═══════════════════════════════════════════════════════════════

  window.dataLayer = window.dataLayer || [];

  // ═══════════════════════════════════════════════════════════════
  // 2. UTM PARAMETER CAPTURE
  //    Grabs UTM params from URL, stores in sessionStorage so they
  //    persist across page navigations, and pushes to dataLayer.
  //    This lets you attribute waitlist signups to the exact
  //    LinkedIn post, WhatsApp forward, or ad that drove the visit.
  // ═══════════════════════════════════════════════════════════════

  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  var utmData = {};

  // Check URL for fresh UTM params
  var params = new URLSearchParams(window.location.search);
  var hasNewUtm = false;

  UTM_KEYS.forEach(function (key) {
    var val = params.get(key);
    if (val) {
      utmData[key] = val;
      hasNewUtm = true;
    }
  });

  // Store in session if we found new UTMs, otherwise load from session
  if (hasNewUtm) {
    try { sessionStorage.setItem('pq_utm', JSON.stringify(utmData)); } catch (e) { /* private browsing */ }
  } else {
    try {
      var stored = sessionStorage.getItem('pq_utm');
      if (stored) utmData = JSON.parse(stored);
    } catch (e) { /* private browsing */ }
  }

  // Also capture referrer on first visit
  var referrer = document.referrer || '';
  var isFirstPageview = !sessionStorage.getItem('pq_session');
  if (isFirstPageview) {
    try { sessionStorage.setItem('pq_session', '1'); } catch (e) {}
  }

  // Push UTM + referrer data to dataLayer
  window.dataLayer.push({
    event: 'utm_captured',
    utm_source:   utmData.utm_source   || '(direct)',
    utm_medium:   utmData.utm_medium   || '(none)',
    utm_campaign: utmData.utm_campaign || '(not set)',
    utm_term:     utmData.utm_term     || '',
    utm_content:  utmData.utm_content  || '',
    referrer:     referrer,
    landing_page: isFirstPageview ? window.location.pathname : ''
  });


  // ═══════════════════════════════════════════════════════════════
  // 3. PAGE CONTEXT
  //    Pushes structured page data so GTM tags can use it for
  //    segmentation (e.g., "show LinkedIn retarget pixel only on
  //    pricing section visitors")
  // ═══════════════════════════════════════════════════════════════

  var pagePath = window.location.pathname;
  var pageMap = {
    '/':              { name: 'Homepage',  category: 'landing' },
    '/index.html':    { name: 'Homepage',  category: 'landing' },
    '/features.html': { name: 'Features',  category: 'product' },
    '/about.html':    { name: 'About',     category: 'brand' },
    '/faq.html':      { name: 'FAQ',       category: 'support' }
  };

  var pageInfo = pageMap[pagePath] || { name: 'Other', category: 'other' };

  window.dataLayer.push({
    event: 'page_context',
    page_name:     pageInfo.name,
    page_category: pageInfo.category,
    page_path:     pagePath,
    page_title:    document.title
  });


  // ═══════════════════════════════════════════════════════════════
  // 4. EVENT TRACKING
  //    Structured events pushed to dataLayer. GTM triggers pick
  //    these up and fire the appropriate tags (GA4 events,
  //    HubSpot behavioural events, LinkedIn conversions, etc.)
  // ═══════════════════════════════════════════════════════════════

  document.addEventListener('DOMContentLoaded', function () {

    // ── 4a. CTA Button Clicks ──
    // Track every CTA button click with context about which CTA
    // and where on the page it was clicked.

    document.querySelectorAll(
      '.btn-cta, .btn-hero, .btn-hero-outline, .price-btn, .btn-filled, .cta-btn, [data-track-cta]'
    ).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var label = (btn.textContent || '').trim().substring(0, 50);
        var href  = btn.getAttribute('href') || '';
        var section = findParentSection(btn);

        window.dataLayer.push({
          event:       'cta_click',
          cta_text:    label,
          cta_href:    href,
          cta_section: section,
          page_name:   pageInfo.name
        });
      });
    });


    // ── 4b. Waitlist Form Submission ──
    // Fires on successful HubSpot form submit. The actual submission
    // is in main.js — this hooks into the success state.

    var ctaForm = document.querySelector('.cta-form, form[data-form="waitlist"]');
    if (ctaForm) {
      // Use MutationObserver to detect when form shows success state
      var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
          if (m.target.classList && m.target.classList.contains('form-success')) {
            var company = (document.getElementById('cta-company') || {}).value || '';
            window.dataLayer.push({
              event:        'waitlist_signup',
              signup_source: pageInfo.name,
              company_name:  company,
              utm_source:    utmData.utm_source || '(direct)',
              utm_campaign:  utmData.utm_campaign || '(not set)'
            });
          }
        });
      });
      observer.observe(ctaForm, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

      // Also listen for custom event dispatched from main.js
      document.addEventListener('pq:waitlist_success', function (e) {
        var detail = e.detail || {};
        window.dataLayer.push({
          event:        'waitlist_signup',
          signup_source: pageInfo.name,
          company_name:  detail.company || '',
          utm_source:    utmData.utm_source || '(direct)',
          utm_campaign:  utmData.utm_campaign || '(not set)'
        });
      });
    }


    // ── 4c. FAQ Accordion Opens ──
    // Tracks which questions people actually open — useful for
    // understanding objections and improving the page.

    document.querySelectorAll('.faq-question').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var parent = btn.parentElement;
        // Only track opens, not closes
        if (!parent.classList.contains('open')) {
          var question = (btn.textContent || '').trim().replace(/\s+/g, ' ').substring(0, 100);
          window.dataLayer.push({
            event:        'faq_open',
            faq_question: question,
            page_name:    pageInfo.name
          });
        }
      });
    });


    // ── 4d. Nav Link Clicks ──
    // Understand navigation patterns

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


    // ── 4e. Scroll Depth Tracking ──
    // Fires at 25%, 50%, 75%, 90% scroll milestones.
    // Helps understand if people read the full page or bounce early.

    var scrollMilestones = [25, 50, 75, 90];
    var firedMilestones  = {};

    function getScrollPercent() {
      var h = document.documentElement;
      var body = document.body;
      var scrollTop = h.scrollTop || body.scrollTop;
      var scrollHeight = (h.scrollHeight || body.scrollHeight) - h.clientHeight;
      if (scrollHeight <= 0) return 0;
      return Math.round((scrollTop / scrollHeight) * 100);
    }

    var scrollTimer = null;
    window.addEventListener('scroll', function () {
      if (scrollTimer) return;
      scrollTimer = setTimeout(function () {
        scrollTimer = null;
        var pct = getScrollPercent();
        scrollMilestones.forEach(function (milestone) {
          if (pct >= milestone && !firedMilestones[milestone]) {
            firedMilestones[milestone] = true;
            window.dataLayer.push({
              event:          'scroll_depth',
              scroll_percent: milestone,
              page_name:      pageInfo.name
            });
          }
        });
      }, 200);
    });


    // ── 4f. Outbound Link Clicks ──
    // Track clicks to external sites (email links, etc.)

    document.querySelectorAll('a[href^="http"], a[href^="mailto:"]').forEach(function (link) {
      var href = link.getAttribute('href') || '';
      // Skip internal links
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


    // ── 4g. Pricing Section Visibility ──
    // Track when users see the pricing section — useful for
    // building "pricing page viewers" audiences for retargeting.

    var pricingSection = document.getElementById('pricing');
    if (pricingSection && 'IntersectionObserver' in window) {
      var pricingObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            window.dataLayer.push({
              event:     'section_view',
              section:   'pricing',
              page_name: pageInfo.name
            });
            pricingObserver.disconnect();
          }
        });
      }, { threshold: 0.3 });

      pricingObserver.observe(pricingSection);
    }


    // ── 4h. Time on Page ──
    // Fires at 30s, 60s, 120s — signals engaged visitors

    var timeThresholds = [30, 60, 120];
    var firedTimes = {};

    timeThresholds.forEach(function (seconds) {
      setTimeout(function () {
        if (!document.hidden) {
          firedTimes[seconds] = true;
          window.dataLayer.push({
            event:          'time_on_page',
            seconds_on_page: seconds,
            page_name:       pageInfo.name
          });
        }
      }, seconds * 1000);
    });

  }); // end DOMContentLoaded


  // ═══════════════════════════════════════════════════════════════
  // 5. COOKIE CONSENT
  //    Lightweight consent banner. Stores preference in localStorage.
  //    Pushes consent_granted / consent_denied to dataLayer so GTM
  //    can use consent mode to gate tag firing.
  // ═══════════════════════════════════════════════════════════════

  // Default: grant analytics (India has no GDPR-style requirement).
  // Ad storage stays denied until explicit consent for future ad pixels.
  window.dataLayer.push({
    event: 'consent_default',
    analytics_storage: 'granted',
    ad_storage: 'denied'
  });

  // Also set GA4 consent mode defaults
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  gtag('consent', 'default', {
    analytics_storage: 'granted',
    ad_storage: 'denied',
    wait_for_update: 500
  });

  var CONSENT_KEY = 'pq_cookie_consent';

  function getConsent() {
    try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; }
  }

  function setConsent(value) {
    try { localStorage.setItem(CONSENT_KEY, value); } catch (e) {}
  }

  function grantConsent() {
    setConsent('granted');
    window.dataLayer.push({
      event: 'consent_update',
      analytics_storage: 'granted',
      ad_storage: 'granted'
    });
    gtag('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: 'granted'
    });
    hideBanner();
  }

  function denyConsent() {
    setConsent('denied');
    window.dataLayer.push({
      event: 'consent_update',
      analytics_storage: 'denied',
      ad_storage: 'denied'
    });
    hideBanner();
  }

  function hideBanner() {
    var banner = document.getElementById('cookie-consent');
    if (banner) {
      banner.style.opacity = '0';
      banner.style.transform = 'translateY(20px)';
      setTimeout(function () { banner.remove(); }, 300);
    }
  }

  // Check existing consent
  var existingConsent = getConsent();
  if (existingConsent === 'granted') {
    // Already consented — update immediately
    window.dataLayer.push({
      event: 'consent_update',
      analytics_storage: 'granted',
      ad_storage: 'granted'
    });
    gtag('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: 'granted'
    });
  } else if (existingConsent !== 'denied') {
    // No decision yet — show banner after page loads
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(showConsentBanner, 1500);
    });
  }

  function showConsentBanner() {
    var banner = document.createElement('div');
    banner.id = 'cookie-consent';
    banner.innerHTML =
      '<div class="cc-inner">' +
        '<p class="cc-text">We use cookies to understand how you find us and improve your experience. No personal data is sold.</p>' +
        '<div class="cc-actions">' +
          '<button class="cc-btn cc-accept" id="cc-accept">Accept</button>' +
          '<button class="cc-btn cc-decline" id="cc-decline">Decline</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(banner);

    // Animate in
    requestAnimationFrame(function () {
      banner.style.opacity = '1';
      banner.style.transform = 'translateY(0)';
    });

    document.getElementById('cc-accept').addEventListener('click', grantConsent);
    document.getElementById('cc-decline').addEventListener('click', denyConsent);
  }

  // Expose for external use
  window.pqConsent = { grant: grantConsent, deny: denyConsent };


  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

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

})();
