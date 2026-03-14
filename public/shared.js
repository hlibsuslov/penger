(function () {
  'use strict';

  /* ===== MOBILE NAV HAMBURGER ===== */
  var navHamburger = document.getElementById('navHamburger');
  var siteNav = document.getElementById('siteNav');
  var navOverlay = document.getElementById('navOverlay');

  var hamburgerLabel = navHamburger ? navHamburger.querySelector('.hamburger-label') : null;
  var i18n = window.PENGER_I18N || {};
  var menuText = i18n.menu || 'Menu';
  var closeText = i18n.close || 'Close';

  function openNav() {
    if (!siteNav || !navHamburger) return;
    siteNav.classList.add('open');
    navHamburger.setAttribute('aria-expanded', 'true');
    if (hamburgerLabel) hamburgerLabel.textContent = closeText;
    if (navOverlay) navOverlay.classList.add('visible');
    var scrollbarW = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.setProperty('--scrollbar-w', scrollbarW + 'px');
    document.body.classList.add('nav-open');
  }
  function closeNav() {
    if (!siteNav || !navHamburger) return;
    siteNav.classList.remove('open');
    navHamburger.setAttribute('aria-expanded', 'false');
    if (hamburgerLabel) hamburgerLabel.textContent = menuText;
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
  var currentPath = window.location.pathname;
  if (currentPath !== '/' && currentPath.endsWith('/')) {
    currentPath = currentPath.slice(0, -1);
  }

  document.querySelectorAll('.nav-link[href]').forEach(function (link) {
    var href = link.getAttribute('href');
    if (href === currentPath) {
      link.classList.add('active');
    } else if ((currentPath.indexOf('/guides/') !== -1) && (href.endsWith('/guides') || href === '/guides')) {
      link.classList.add('active');
    }
  });
  /* Also mark dropdown links and trigger as active */
  document.querySelectorAll('.nav-dropdown-link[href]').forEach(function (link) {
    var href = link.getAttribute('href');
    if (href === currentPath || ((currentPath.indexOf('/guides/') !== -1) && (href.endsWith('/guides') || href === '/guides'))) {
      link.classList.add('active');
      var trigger = link.closest('.nav-dropdown');
      if (trigger) {
        var btn = trigger.querySelector('.nav-dropdown-trigger');
        if (btn) btn.classList.add('active');
      }
    }
  });

  /* ===== DESKTOP DROPDOWN MENU ===== */
  var dropdowns = document.querySelectorAll('.nav-dropdown');
  dropdowns.forEach(function (dropdown) {
    var trigger = dropdown.querySelector('.nav-dropdown-trigger');
    if (!trigger) return;

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = dropdown.classList.contains('open');
      /* Close all dropdowns first */
      dropdowns.forEach(function (d) { d.classList.remove('open'); });
      if (!isOpen) dropdown.classList.add('open');
    });

    /* Close on mouse leave with delay */
    var closeTimer = null;
    dropdown.addEventListener('mouseenter', function () {
      clearTimeout(closeTimer);
    });
    dropdown.addEventListener('mouseleave', function () {
      closeTimer = setTimeout(function () {
        dropdown.classList.remove('open');
      }, 300);
    });
  });
  /* Close dropdown when clicking outside */
  document.addEventListener('click', function () {
    dropdowns.forEach(function (d) { d.classList.remove('open'); });
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
    /* Save original content before any interaction */
    document.querySelectorAll('.faq-bubble').forEach(function (bubble) {
      var inner = bubble.innerHTML.trim();
      if (inner) {
        /* Bubble has inline content (simulators page) — save it */
        bubble.setAttribute('data-html', bubble.innerHTML);
        bubble.setAttribute('data-text', bubble.textContent.trim());
      }
      /* else: content already in data-text attribute (article pages) — leave as-is */
    });

    document.querySelectorAll('.faq-chat').forEach(function (chat) {
      chat.addEventListener('click', function (e) {
        var btn = e.target.closest('.faq-q-btn');
        if (!btn) return;
        var item = btn.closest('.faq-item');
        if (!item) return;
        var bubbleWrap = item.querySelector('.faq-bubble-wrap');
        var bubble = item.querySelector('.faq-bubble');
        if (!bubbleWrap || !bubble) return;

        var originalHtml = bubble.getAttribute('data-html') || '';
        var fullText = bubble.getAttribute('data-text') || '';
        var hasHtml = /<[a-z][\s\S]*>/i.test(originalHtml.trim());

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

        if (hasHtml) {
          /* HTML content (with examples) — show immediately, animate expand */
          bubble.innerHTML = originalHtml;
          bubbleWrap.style.maxHeight = bubble.scrollHeight + 16 + 'px';
        } else {
          /* Plain text — typewriter effect */
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
        }
      });
    });
  }

  initFaqTypewriter();

})();
