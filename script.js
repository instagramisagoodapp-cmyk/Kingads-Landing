/* ================================================================
   KINGADS — script.js (simplified one-page version)
   Vanilla JS only. No dependencies.
================================================================ */
(() => {
  'use strict';

  /* ---------------------------------------------------------
     Safe event tracking (Meta Pixel + GA4)
     Fails silently if IDs are still placeholders or scripts
     are blocked (ad blockers, etc).
  --------------------------------------------------------- */
  function trackEvent(name, params = {}) {
    try { if (window.fbq) window.fbq('track', name, params); } catch (e) {}
    try { if (window.gtag) window.gtag('event', name, params); } catch (e) {}
  }

  /* ---------------------------------------------------------
     UTM capture -> localStorage (Telegram won't carry query
     params, so we store attribution before the visitor leaves)
  --------------------------------------------------------- */
  function captureUTMs() {
    const params = new URLSearchParams(window.location.search);
    const keys = ['utm_source', 'utm_campaign', 'utm_medium', 'utm_content', 'utm_term'];
    const stored = {};
    let found = false;

    keys.forEach((key) => {
      const value = params.get(key);
      if (value) { stored[key] = value; found = true; }
    });

    if (found) {
      stored.landing_time = new Date().toISOString();
      try { localStorage.setItem('kingads_utm', JSON.stringify(stored)); } catch (e) {}
    }
  }

  /* ---------------------------------------------------------
     ViewContent on load + Button Click / Lead on CTA taps
  --------------------------------------------------------- */
  function bindConversionTracking() {
    trackEvent('ViewContent', { content_name: 'KINGADS Landing Page' });

    document.querySelectorAll('[data-track]').forEach((el) => {
      el.addEventListener('click', () => {
        const action = el.dataset.track;
        trackEvent('ButtonClick', { action });
        trackEvent('Lead', { action }); // both CTAs are qualified leads
      });
    });
  }

  /* ---------------------------------------------------------
     Button ripple effect
  --------------------------------------------------------- */
  function initRipple() {
    document.querySelectorAll('.btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        btn.classList.remove('is-rippling');
        void btn.offsetWidth; // force reflow so it can retrigger
        btn.classList.add('is-rippling');
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    captureUTMs();
    bindConversionTracking();
    initRipple();
  });
})();
