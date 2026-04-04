/**
 * PakkaQuote Website - Shared JavaScript
 * ----------------------------------------
 * 1. Smooth scrolling for in-page anchor links
 * 2. FAQ accordion
 * 3. HubSpot waitlist form submission
 */

document.addEventListener('DOMContentLoaded', function () {

  // =========================================================================
  // 1. Smooth Scroll for Anchor Links
  // =========================================================================

  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var targetId = this.getAttribute('href');

      // Ignore bare "#" links
      if (targetId === '#') return;

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
  // 3. HubSpot Waitlist Form Submission
  // =========================================================================

  var HUBSPOT_PORTAL_ID = '245789604';
  var HUBSPOT_FORM_ID  = 'b1a4a7b4-bddf-4c87-b1a3-7af4b9fd9a31';

  var companyInput = document.getElementById('cta-company');
  var phoneInput   = document.getElementById('cta-phone');
  var ctaForm      = companyInput && phoneInput
    ? companyInput.closest('form') || phoneInput.closest('form')
    : null;

  // Only wire up if the waitlist form elements exist on this page
  if (ctaForm && companyInput && phoneInput) {
    ctaForm.addEventListener('submit', function (e) {
      e.preventDefault();

      var company = companyInput.value.trim();
      var phone   = phoneInput.value.trim();

      // Basic validation
      if (!company || !phone) {
        showFormError('Please fill in both fields.');
        return;
      }

      // Disable the submit button while request is in flight
      var submitBtn = ctaForm.querySelector('button[type="submit"], input[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      var endpoint =
        'https://api-na2.hsforms.com/submissions/v3/integration/submit/' +
        HUBSPOT_PORTAL_ID + '/' + HUBSPOT_FORM_ID;

      var payload = {
        fields: [
          { name: 'company',  value: company },
          { name: 'phone',    value: phone },
          { name: 'message',  value: 'PakkaQuote waitlist signup' }
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
          showFormSuccess('Thank you! You have been added to the waitlist.');
        })
        .catch(function (err) {
          console.error('HubSpot form error:', err);
          showFormError('Something went wrong. Please try again.');
        })
        .finally(function () {
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }

  // -----------------------------------------------------------------------
  // Form feedback helpers
  // -----------------------------------------------------------------------

  /**
   * Display a success message inside the form, replacing its contents.
   */
  function showFormSuccess(message) {
    if (!ctaForm) return;

    // Remove any previous status message
    clearFormStatus();

    var msg = document.createElement('div');
    msg.className = 'form-status form-success';
    msg.textContent = message;
    ctaForm.appendChild(msg);

    // Hide the form fields so the success message stands alone
    Array.from(ctaForm.children).forEach(function (child) {
      if (child !== msg) child.style.display = 'none';
    });
  }

  /**
   * Display an error message below the form fields.
   */
  function showFormError(message) {
    if (!ctaForm) return;

    // Remove any previous status message
    clearFormStatus();

    var msg = document.createElement('div');
    msg.className = 'form-status form-error';
    msg.textContent = message;
    ctaForm.appendChild(msg);
  }

  /**
   * Remove existing status messages from the form.
   */
  function clearFormStatus() {
    if (!ctaForm) return;
    ctaForm.querySelectorAll('.form-status').forEach(function (el) {
      el.remove();
    });
  }

});
