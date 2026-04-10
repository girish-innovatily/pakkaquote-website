/**
 * PakkaQuote Website - Shared JavaScript
 * ----------------------------------------
 * 1. Smooth scrolling for in-page anchor links
 * 2. FAQ accordion
 * 3. Waitlist modal (form + HubSpot submission)
 * 4. Language switcher toggle
 */

document.addEventListener('DOMContentLoaded', function () {

  // =========================================================================
  // 1. Smooth Scroll for Anchor Links
  // =========================================================================

  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var targetId = this.getAttribute('href');

      // Ignore bare "#" links and #waitlist (handled by modal)
      if (targetId === '#' || targetId === '#waitlist') return;

      var target = document.querySelector(targetId);
      if (!target) return;

      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // =========================================================================
  // 2. FAQ Accordion
  // =========================================================================

  var faqQuestions = document.querySelectorAll('.faq-question');

  faqQuestions.forEach(function (question) {
    question.addEventListener('click', function () {
      var parent = this.parentElement;
      var answer = parent.querySelector('.faq-answer');

      if (!answer) return;

      var isOpen = parent.classList.contains('open');

      // Close every other FAQ item first
      faqQuestions.forEach(function (q) {
        var p = q.parentElement;
        var a = p.querySelector('.faq-answer');
        if (p !== parent && p.classList.contains('open')) {
          p.classList.remove('open');
          if (a) a.style.maxHeight = null;
        }
      });

      // Toggle the clicked item
      if (isOpen) {
        parent.classList.remove('open');
        answer.style.maxHeight = null;
      } else {
        parent.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });

  // =========================================================================
  // 3. Waitlist Modal
  // =========================================================================

  var HUBSPOT_PORTAL_ID = '245789604';
  var HUBSPOT_FORM_ID  = 'b1a4a7b4-bddf-4c87-b1a3-7af4b9fd9a31';

  // ── 3a. Create modal DOM ──

  var backdrop = document.createElement('div');
  backdrop.className = 'wl-modal-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');
  backdrop.innerHTML =
    '<div class="wl-modal" role="dialog" aria-modal="true" aria-label="Join the waitlist">' +
      '<button class="wl-modal-close" aria-label="Close">&times;</button>' +
      '<h3>Join the <em>waitlist</em></h3>' +
      '<p class="wl-modal-sub">We\'re onboarding 10 businesses this month. Leave your details and we\'ll WhatsApp you within 24 hours.</p>' +
      '<div class="cta-form">' +
        '<label for="wl-company" class="sr-only">Company name</label>' +
        '<input type="text" class="cta-input" id="wl-company" placeholder="Company name">' +
        '<label for="wl-phone" class="sr-only">WhatsApp number</label>' +
        '<input type="tel" class="cta-input" id="wl-phone" placeholder="WhatsApp number">' +
        '<button class="cta-btn" id="wl-submit">Join waitlist</button>' +
      '</div>' +
      '<div class="cta-fine">No spam. We\'ll WhatsApp you directly. That\'s the whole product.</div>' +
    '</div>';

  document.body.appendChild(backdrop);

  var modal = backdrop.querySelector('.wl-modal');
  var closeBtn = backdrop.querySelector('.wl-modal-close');
  var companyInput = document.getElementById('wl-company');
  var phoneInput = document.getElementById('wl-phone');
  var submitBtn = document.getElementById('wl-submit');
  var previousFocus = null;

  // ── 3b. Open / close helpers ──

  function openModal() {
    previousFocus = document.activeElement;
    backdrop.setAttribute('aria-hidden', 'false');
    backdrop.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Trigger transition after display is set
    requestAnimationFrame(function () {
      backdrop.classList.add('is-visible');
    });

    companyInput.focus();

    // Push tracking event
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'modal_open',
      modal_name: 'waitlist'
    });
  }

  function closeModal() {
    backdrop.classList.remove('is-visible');
    document.body.style.overflow = '';

    // Wait for transition to finish before hiding
    setTimeout(function () {
      backdrop.style.display = 'none';
      backdrop.setAttribute('aria-hidden', 'true');
    }, 200);

    // Restore focus
    if (previousFocus) previousFocus.focus();

    // Push tracking event
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'modal_close',
      modal_name: 'waitlist'
    });
  }

  // ── 3c. Event listeners for open/close ──

  // Close on X button
  closeBtn.addEventListener('click', closeModal);

  // Close on backdrop click
  backdrop.addEventListener('click', function (e) {
    if (e.target === backdrop) closeModal();
  });

  // Close on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && backdrop.classList.contains('is-visible')) {
      closeModal();
    }
  });

  // Focus trap inside modal
  modal.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab') return;

    var focusable = modal.querySelectorAll('input, button');
    var first = focusable[0];
    var last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  // ── 3d. Hook up all CTA buttons to open modal ──

  // On index.html: intercept #waitlist anchor clicks
  document.querySelectorAll('a[href="#waitlist"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      openModal();
    });
  });

  // On other pages: intercept links to index.html#waitlist
  document.querySelectorAll('a[href="index.html#waitlist"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      openModal();
    });
  });

  // ── 3e. Form submission (HubSpot) ──

  submitBtn.addEventListener('click', function (e) {
    e.preventDefault();

    var company = companyInput.value.trim();
    var phone = phoneInput.value.trim();

    if (!company || !phone) {
      showModalStatus('Please fill in both fields.', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    var endpoint =
      'https://api-na2.hsforms.com/submissions/v3/integration/submit/' +
      HUBSPOT_PORTAL_ID + '/' + HUBSPOT_FORM_ID;

    var payload = {
      fields: [
        { objectTypeId: '0-2', name: 'name',    value: company },
        { objectTypeId: '0-1', name: 'phone',   value: phone },
        { objectTypeId: '0-1', name: 'message',  value: 'PakkaQuote waitlist signup' }
      ],
      context: {
        pageUri:  window.location.href,
        pageName: document.title
      }
    };

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Submission failed (' + response.status + ')');
        }
        return response.json();
      })
      .then(function () {
        // Push waitlist_signup to dataLayer
        var utm = (window.pqTracking && window.pqTracking.utmData) || {};
        var page = (window.pqTracking && window.pqTracking.pageInfo) || {};
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          event:         'waitlist_signup',
          signup_source: page.name || document.title,
          company_name:  company,
          utm_source:    utm.utm_source   || '(direct)',
          utm_campaign:  utm.utm_campaign || '(not set)'
        });

        showModalStatus('Thank you! We\'ll WhatsApp you within 24 hours.', 'success');
      })
      .catch(function (err) {
        console.error('HubSpot form error:', err);
        showModalStatus('Something went wrong. Please try again.', 'error');
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Join waitlist';
      });
  });

  function showModalStatus(message, type) {
    // Remove existing status
    var existing = modal.querySelector('.form-status');
    if (existing) existing.remove();

    var msg = document.createElement('div');
    msg.className = 'form-status form-' + type;
    msg.textContent = message;

    var form = modal.querySelector('.cta-form');
    form.insertAdjacentElement('afterend', msg);

    if (type === 'success') {
      // Hide form, show success
      form.style.display = 'none';
      var fine = modal.querySelector('.cta-fine');
      if (fine) fine.style.display = 'none';
    }
  }

  // =========================================================================
  // 3f. Inline form fallback (bottom of index.html)
  // =========================================================================
  // The #waitlist section at the bottom still has an inline form.
  // Wire it up too so it works for users who scroll there naturally.

  var inlineCompany = document.getElementById('cta-company');
  var inlinePhone = document.getElementById('cta-phone');
  var inlineBtn = document.querySelector('.cta-section .cta-btn');
  var inlineForm = inlineCompany && inlinePhone
    ? inlineCompany.closest('.cta-form') || inlineCompany.closest('form')
    : null;

  if (inlineBtn && inlineCompany && inlinePhone) {
    inlineBtn.addEventListener('click', function (e) {
      e.preventDefault();

      var company = inlineCompany.value.trim();
      var phone = inlinePhone.value.trim();

      if (!company || !phone) {
        showInlineStatus('Please fill in both fields.', 'error');
        return;
      }

      inlineBtn.disabled = true;

      var endpoint =
        'https://api-na2.hsforms.com/submissions/v3/integration/submit/' +
        HUBSPOT_PORTAL_ID + '/' + HUBSPOT_FORM_ID;

      var payload = {
        fields: [
          { objectTypeId: '0-2', name: 'name',    value: company },
          { objectTypeId: '0-1', name: 'phone',   value: phone },
          { objectTypeId: '0-1', name: 'message',  value: 'PakkaQuote waitlist signup' }
        ],
        context: {
          pageUri:  window.location.href,
          pageName: document.title
        }
      };

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (response) {
          if (!response.ok) throw new Error('Submission failed');
          return response.json();
        })
        .then(function () {
          var utm = (window.pqTracking && window.pqTracking.utmData) || {};
          var page = (window.pqTracking && window.pqTracking.pageInfo) || {};
          window.dataLayer = window.dataLayer || [];
          window.dataLayer.push({
            event:         'waitlist_signup',
            signup_source: page.name || document.title,
            company_name:  company,
            utm_source:    utm.utm_source   || '(direct)',
            utm_campaign:  utm.utm_campaign || '(not set)'
          });

          showInlineStatus('Thank you! You have been added to the waitlist.', 'success');
        })
        .catch(function (err) {
          console.error('HubSpot form error:', err);
          showInlineStatus('Something went wrong. Please try again.', 'error');
        })
        .finally(function () {
          inlineBtn.disabled = false;
        });
    });
  }

  function showInlineStatus(message, type) {
    if (!inlineForm) return;
    inlineForm.querySelectorAll('.form-status').forEach(function (el) { el.remove(); });

    var msg = document.createElement('div');
    msg.className = 'form-status form-' + type;
    msg.textContent = message;
    inlineForm.appendChild(msg);

    if (type === 'success') {
      Array.from(inlineForm.children).forEach(function (child) {
        if (child !== msg) child.style.display = 'none';
      });
    }
  }

  // =========================================================================
  // 4. Language Switcher Toggle
  // =========================================================================

  var langSwitcher = document.querySelector('.lang-switcher');
  var langBtn = document.querySelector('.lang-switcher-btn');

  if (langSwitcher && langBtn) {
    langBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = langSwitcher.classList.toggle('open');
      langBtn.setAttribute('aria-expanded', isOpen);
    });

    document.addEventListener('click', function (e) {
      if (!langSwitcher.contains(e.target)) {
        langSwitcher.classList.remove('open');
        langBtn.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && langSwitcher.classList.contains('open')) {
        langSwitcher.classList.remove('open');
        langBtn.setAttribute('aria-expanded', 'false');
        langBtn.focus();
      }
    });
  }

});
