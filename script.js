/* ================================================================
   KINGADS — script.js
   Vanilla JS only. No dependencies.
================================================================ */
(() => {
  'use strict';

  /* ---------------------------------------------------------
     Config
  --------------------------------------------------------- */
  const TELEGRAM_CHANNEL_URL = 'https://t.me/YOURCHANNEL'; // <-- replace YOURCHANNEL
  const REDIRECT_SECONDS = 15;

  /* ---------------------------------------------------------
     Utility: safe event tracking (Meta Pixel + GA4)
     Fails silently if PIXEL_ID / GA_MEASUREMENT_ID are placeholders
     or the scripts were blocked (ad blockers, etc).
  --------------------------------------------------------- */
  function trackEvent(name, params = {}) {
    try {
      if (window.fbq) window.fbq('track', name, params);
    } catch (e) { /* pixel blocked or not ready */ }
    try {
      if (window.gtag) window.gtag('event', name, params);
    } catch (e) { /* ga blocked or not ready */ }
  }

  /* ---------------------------------------------------------
     UTM capture -> localStorage (for attribution on Telegram
     hand-off, since Telegram itself won't carry query params)
  --------------------------------------------------------- */
  function captureUTMs() {
    const params = new URLSearchParams(window.location.search);
    const keys = ['utm_source', 'utm_campaign', 'utm_medium', 'utm_content', 'utm_term'];
    const stored = {};
    let found = false;

    keys.forEach((key) => {
      const value = params.get(key);
      if (value) {
        stored[key] = value;
        found = true;
      }
    });

    if (found) {
      stored.landing_time = new Date().toISOString();
      try {
        localStorage.setItem('kingads_utm', JSON.stringify(stored));
      } catch (e) { /* localStorage unavailable (private mode, etc) */ }
    }
  }

  /* ---------------------------------------------------------
     Track ViewContent on load + Button Click / Lead on CTAs
  --------------------------------------------------------- */
  function bindConversionTracking() {
    trackEvent('ViewContent', { content_name: 'KINGADS Landing Page' });

    document.querySelectorAll('[data-track]').forEach((el) => {
      el.addEventListener('click', () => {
        const action = el.dataset.track;
        trackEvent('ButtonClick', { action });
        // Any tap on the two primary CTAs counts as a qualified Lead
        if (action.includes('message') || action.includes('telegram')) {
          trackEvent('Lead', { action });
        }
      });
    });
  }

  /* ---------------------------------------------------------
     Sticky nav background on scroll
  --------------------------------------------------------- */
  function initStickyNav() {
    const nav = document.getElementById('nav');
    if (!nav) return;
    const onScroll = () => {
      nav.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------------------------------------------------------
     Button ripple effect
  --------------------------------------------------------- */
  function initRipple() {
    document.querySelectorAll('.btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        btn.classList.remove('is-rippling');
        // Force reflow so the animation can re-trigger on repeat clicks
        void btn.offsetWidth;
        btn.classList.add('is-rippling');
      });
    });
  }

  /* ---------------------------------------------------------
     Scroll-reveal animations (IntersectionObserver)
  --------------------------------------------------------- */
  function initScrollReveal() {
    const targets = document.querySelectorAll('[data-anim]');
    if (!targets.length) return;

    // Stagger index for grid children
    ['.why__grid', '.services__grid'].forEach((selector) => {
      const grid = document.querySelector(selector);
      if (!grid) return;
      Array.from(grid.children).forEach((child, i) => child.style.setProperty('--i', i));
    });

    if (!('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    );

    targets.forEach((el) => observer.observe(el));
  }

  /* ---------------------------------------------------------
     Animated number counters (stats + dashboard)
  --------------------------------------------------------- */
  function animateCount(el) {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const duration = 1800;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = target * eased;
      el.textContent = value.toFixed(decimals) + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function initCounters() {
    const counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    if (!('IntersectionObserver' in window)) {
      counters.forEach(animateCount);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );

    counters.forEach((el) => observer.observe(el));
  }

  /* ---------------------------------------------------------
     FAQ accordion
  --------------------------------------------------------- */
  function initAccordion() {
    const items = document.querySelectorAll('.accordion__item');
    items.forEach((item) => {
      const trigger = item.querySelector('.accordion__trigger');
      const panel = item.querySelector('.accordion__panel');

      trigger.addEventListener('click', () => {
        const isOpen = item.classList.contains('is-open');

        // Close all other items (single-open accordion)
        items.forEach((other) => {
          other.classList.remove('is-open');
          other.querySelector('.accordion__trigger').setAttribute('aria-expanded', 'false');
          other.querySelector('.accordion__panel').style.maxHeight = null;
        });

        if (!isOpen) {
          item.classList.add('is-open');
          trigger.setAttribute('aria-expanded', 'true');
          panel.style.maxHeight = panel.scrollHeight + 'px';
        }
      });
    });
  }

  /* ---------------------------------------------------------
     Countdown redirect card
     - Counts down from REDIRECT_SECONDS
     - Redirects to the Telegram channel automatically
     - Cancels if the visitor clicks ANY button on the page,
       or the explicit "Stay on page" link
  --------------------------------------------------------- */
  function initCountdown() {
    const card = document.getElementById('countdown');
    const numberEl = document.getElementById('countdownNumber');
    const barEl = document.getElementById('countdownBar');
    const cancelBtn = document.getElementById('countdownCancel');
    if (!card || !numberEl || !barEl) return;

    let remaining = REDIRECT_SECONDS;
    let cancelled = false;
    numberEl.textContent = remaining;

    const interval = setInterval(() => {
      if (cancelled) return;
      remaining -= 1;

      if (remaining <= 0) {
        clearInterval(interval);
        window.location.href = TELEGRAM_CHANNEL_URL;
        return;
      }

      numberEl.textContent = remaining;
      barEl.style.width = (remaining / REDIRECT_SECONDS) * 100 + '%';
    }, 1000);

    function cancelRedirect() {
      if (cancelled) return;
      cancelled = true;
      clearInterval(interval);
      card.classList.add('is-cancelled');
    }

    cancelBtn.addEventListener('click', cancelRedirect);

    // Any button/link click anywhere on the page cancels the auto-redirect
    document.querySelectorAll('a, button').forEach((el) => {
      if (el === cancelBtn) return;
      el.addEventListener('click', cancelRedirect);
    });
  }

  /* ---------------------------------------------------------
     Init
  --------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    captureUTMs();
    bindConversionTracking();
    initStickyNav();
    initRipple();
    initScrollReveal();
    initCounters();
    initAccordion();
    initCountdown();
  });
})();
