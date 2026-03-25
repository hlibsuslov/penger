(function () {
  'use strict';

  var root = document.documentElement;

  // ---- THEME ----

  function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function loadPref(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  function savePref(key, val) {
    try { localStorage.setItem(key, val); } catch {}
  }

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    savePref('penger-theme', theme);

    document.querySelectorAll('#themeToggle, #themeToggleFooter').forEach(function (btn) {
      var sun = btn.querySelector('.icon-sun');
      var moon = btn.querySelector('.icon-moon');
      if (sun && moon) {
        sun.style.display = theme === 'dark' ? 'block' : 'none';
        moon.style.display = theme === 'light' ? 'block' : 'none';
      }
    });

    track('theme_switch', { theme: theme });
  }

  applyTheme(loadPref('penger-theme') || getSystemTheme());

  document.querySelectorAll('#themeToggle, #themeToggleFooter').forEach(function (btn) {
    btn.addEventListener('click', function () {
      applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
  });

  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', function () {
    if (!loadPref('penger-theme')) applyTheme(getSystemTheme());
  });

  // ---- LANGUAGE ----

  function applyLang(lang) {
    root.setAttribute('data-lang', lang);
    root.setAttribute('lang', lang);
    savePref('penger-lang', lang);
    track('lang_switch', { lang: lang });
  }

  var storedLang = loadPref('penger-lang');
  if (storedLang) applyLang(storedLang);

  var langBtn = document.getElementById('langToggle');
  if (langBtn) {
    langBtn.addEventListener('click', function () {
      applyLang(root.getAttribute('data-lang') === 'ru' ? 'en' : 'ru');
    });
  }

  // ---- FAQ ACCORDION ----

  document.querySelectorAll('.faq-item').forEach(function (item) {
    var trigger = item.querySelector('.faq-trigger');
    var panel = item.querySelector('.faq-panel');
    if (!trigger || !panel) return;

    trigger.addEventListener('click', function () {
      var isOpen = item.getAttribute('data-open') === 'true';

      if (!isOpen) {
        document.querySelectorAll('.faq-item[data-open="true"]').forEach(function (other) {
          if (other !== item) {
            other.setAttribute('data-open', 'false');
            other.querySelector('.faq-trigger').setAttribute('aria-expanded', 'false');
            other.querySelector('.faq-panel').style.maxHeight = '0';
          }
        });
      }

      var next = !isOpen;
      item.setAttribute('data-open', String(next));
      trigger.setAttribute('aria-expanded', String(next));
      panel.style.maxHeight = next ? panel.scrollHeight + 'px' : '0';

      if (next) track('faq_open', { question: trigger.textContent.trim().substring(0, 60) });
    });
  });

  // ---- SMOOTH SCROLL ----

  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var id = this.getAttribute('href');
      if (id === '#') return;
      var target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        window.scrollTo({
          top: target.getBoundingClientRect().top + window.pageYOffset - 60,
          behavior: 'smooth'
        });
      }
    });
  });

  // ---- SCROLL TRACKING ----

  var milestones = { 50: false, 90: false };
  var scrollTimer = null;

  window.addEventListener('scroll', function () {
    if (scrollTimer) return;
    scrollTimer = setTimeout(function () {
      scrollTimer = null;
      var pct = (window.pageYOffset / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      if (pct >= 50 && !milestones[50]) { milestones[50] = true; track('scroll_50'); }
      if (pct >= 90 && !milestones[90]) { milestones[90] = true; track('scroll_90'); }
    }, 250);
  }, { passive: true });

  // ---- SECTION VIEW TRACKING ----

  if ('IntersectionObserver' in window) {
    var seen = new Set();
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && e.target.id && !seen.has(e.target.id)) {
          seen.add(e.target.id);
          track('view_section', { section: e.target.id });
        }
      });
    }, { threshold: 0.2 });

    document.querySelectorAll('section[id]').forEach(function (s) { obs.observe(s); });
  }

  // ---- CTA CLICK TRACKING ----

  document.querySelectorAll('[data-track]').forEach(function (el) {
    if (el.tagName === 'A' || el.tagName === 'BUTTON') {
      el.addEventListener('click', function () {
        track(el.getAttribute('data-track'));
      });
    }
  });

  // ---- ANALYTICS STUB ----

  function track(name, data) {
    if (typeof window.gtag === 'function') window.gtag('event', name, data || {});
    if (typeof window.dataLayer !== 'undefined') window.dataLayer.push({ event: name, eventData: data || {} });
  }

})();
