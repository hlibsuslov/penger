(function () {
  'use strict';

  /* ===== THEME: sync meta theme-color & favicon with system preference ===== */
  var meta = document.querySelector('meta[name="theme-color"]');
  var faviconLink = document.querySelector('link[rel="icon"]');
  function syncTheme(dark) {
    if (meta) meta.content = dark ? '#0A0A0A' : '#FAFAFA';
    if (faviconLink) faviconLink.href = dark ? '/favicon-dark.svg' : '/favicon-light.svg';
  }
  var mql = window.matchMedia('(prefers-color-scheme: dark)');
  syncTheme(mql.matches);
  mql.addEventListener('change', function (e) { syncTheme(e.matches); });

  /* ===== MOBILE NAV HAMBURGER ===== */
  var navHamburger = document.getElementById('navHamburger');
  var siteNav = document.getElementById('siteNav');
  var navOverlay = document.getElementById('navOverlay');

  var hamburgerLabel = navHamburger ? navHamburger.querySelector('.hamburger-label') : null;

  function openNav() {
    if (!siteNav || !navHamburger) return;
    siteNav.classList.add('open');
    navHamburger.setAttribute('aria-expanded', 'true');
    if (hamburgerLabel) hamburgerLabel.textContent = 'Close';
    if (navOverlay) navOverlay.classList.add('visible');
    var scrollbarW = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.setProperty('--scrollbar-w', scrollbarW + 'px');
    document.body.classList.add('nav-open');
  }
  function closeNav() {
    if (!siteNav || !navHamburger) return;
    siteNav.classList.remove('open');
    navHamburger.setAttribute('aria-expanded', 'false');
    if (hamburgerLabel) hamburgerLabel.textContent = 'Menu';
    if (navOverlay) navOverlay.classList.remove('visible');
    document.body.classList.remove('nav-open');
  }

  if (navHamburger) {
    navHamburger.addEventListener('click', function () {
      var expanded = navHamburger.getAttribute('aria-expanded') === 'true';
      expanded ? closeNav() : openNav();
    });
  }
  if (navOverlay) {
    navOverlay.addEventListener('click', closeNav);
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeNav(); }
  });

  /* ===== ACTIVE NAV LINK ===== */
  var currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link[href]').forEach(function (link) {
    var href = link.getAttribute('href');
    if (href === currentPage) {
      link.classList.add('active');
    } else if (currentPage.indexOf('guide-') === 0 && href === 'guides.html') {
      link.classList.add('active');
    } else if (currentPage === 'contacts.html' && (href === 'index.html' || href === '/')) {
      link.classList.add('active');
    }
  });

  /* ===== SCROLL-TRIGGERED FADE-IN ===== */
  (function () {
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var targets = document.querySelectorAll('.anim-fade-in');

    if (reducedMotion || !('IntersectionObserver' in window)) {
      targets.forEach(function (el) { el.classList.add('visible'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -60px 0px'
    });

    targets.forEach(function (el) { observer.observe(el); });
  })();

  /* ===== GUIDE LEVEL TOGGLE (Beginner / Advanced) ===== */
  var levelToggle = document.getElementById('levelToggle');
  if (levelToggle) {
    var levelPills = levelToggle.querySelectorAll('.pill');
    levelPills.forEach(function (pill) {
      pill.addEventListener('click', function () {
        levelPills.forEach(function (p) { p.classList.remove('active'); });
        pill.classList.add('active');
        var level = pill.getAttribute('data-level');
        document.querySelectorAll('.guide-content').forEach(function (panel) {
          panel.classList.remove('active');
        });
        var target = document.getElementById('guide-' + level);
        if (target) target.classList.add('active');
      });
    });
  }

  /* ===== FAQ TYPEWRITER DIALOGUE ===== */
  function initFaqTypewriter() {
    document.querySelectorAll('.faq-chat').forEach(function (chat) {
      chat.addEventListener('click', function (e) {
        var btn = e.target.closest('.faq-q-btn');
        if (!btn) return;
        var item = btn.closest('.faq-item');
        if (!item) return;
        var bubbleWrap = item.querySelector('.faq-bubble-wrap');
        var bubble = item.querySelector('.faq-bubble');
        if (!bubbleWrap || !bubble) return;

        var fullText = bubble.getAttribute('data-text') || '';

        if (item.classList.contains('open')) {
          item.classList.remove('open');
          bubbleWrap.style.maxHeight = '0';
          if (item._typeTimer) { clearInterval(item._typeTimer); item._typeTimer = null; }
          return;
        }

        chat.querySelectorAll('.faq-item.open').forEach(function (other) {
          if (other !== item) {
            other.classList.remove('open');
            var ow = other.querySelector('.faq-bubble-wrap');
            if (ow) ow.style.maxHeight = '0';
            if (other._typeTimer) { clearInterval(other._typeTimer); other._typeTimer = null; }
          }
        });

        item.classList.add('open');
        bubble.innerHTML = '';
        bubbleWrap.style.maxHeight = '60px';

        var cursor = document.createElement('span');
        cursor.className = 'faq-cursor';
        bubble.appendChild(cursor);

        var chars = fullText.split('');
        var idx = 0;
        item._typeTimer = setInterval(function () {
          if (idx >= chars.length) {
            clearInterval(item._typeTimer);
            item._typeTimer = null;
            cursor.remove();
            return;
          }
          cursor.insertAdjacentText('beforebegin', chars[idx]);
          idx++;
          var h = bubble.scrollHeight;
          bubbleWrap.style.maxHeight = Math.max(60, h + 16) + 'px';
        }, 18);
      });
    });
  }

  initFaqTypewriter();

})();
