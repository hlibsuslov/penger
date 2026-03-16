/**
 * PENGER — Client-side Analytics Layer
 *
 * All user actions push to window.dataLayer.
 * GTM listens to dataLayer events and routes them to GA4, Meta Pixel, Google Ads, etc.
 *
 * No direct gtag() or fbq() calls — everything goes through dataLayer → GTM.
 */
(function () {
  'use strict';

  var dl = window.dataLayer = window.dataLayer || [];

  /* ===== HELPERS ===== */

  function getPageType() {
    var p = window.location.pathname.replace(/^\/uk/, '') || '/';
    if (p === '/') return 'landing';
    if (p === '/payment-success') return 'thank_you';
    if (p === '/payment-failed') return 'payment_failed';
    if (p.indexOf('/guides/') === 0) return 'guide';
    return p.replace(/^\//, '').replace(/[/-]/g, '_');
  }

  function getDeviceType() {
    var w = window.innerWidth;
    if (w < 768) return 'mobile';
    if (w < 1024) return 'tablet';
    return 'desktop';
  }

  function getSectionFromElement(el) {
    if (!el) return '';
    var section = el.closest('[data-section]');
    if (section) return section.getAttribute('data-section');
    var s = el.closest('section[id]');
    return s ? s.id : '';
  }

  function push(event, extra) {
    var data = {
      event: event,
      page_type: getPageType(),
      device_type: getDeviceType()
    };
    if (extra) {
      for (var k in extra) {
        if (extra.hasOwnProperty(k)) data[k] = extra[k];
      }
    }
    dl.push(data);
  }

  /* ===== PAGE VIEW ===== */
  push('page_view');

  /* ===== SCROLL DEPTH ===== */
  (function () {
    var thresholds = [25, 50, 75, 90];
    var fired = {};

    function getScrollPercent() {
      var docH = document.documentElement.scrollHeight - window.innerHeight;
      if (docH <= 0) return 100;
      return Math.round((window.scrollY / docH) * 100);
    }

    window.addEventListener('scroll', function () {
      var pct = getScrollPercent();
      for (var i = 0; i < thresholds.length; i++) {
        var t = thresholds[i];
        if (pct >= t && !fired[t]) {
          fired[t] = true;
          push('scroll_' + t, { scroll_depth: t });
        }
      }
    }, { passive: true });
  })();

  /* ===== TIME ON PAGE ===== */
  (function () {
    var milestones = [30, 60, 120];

    milestones.forEach(function (sec) {
      setTimeout(function () {
        push('time_' + sec + 's', { time_seconds: sec });
      }, sec * 1000);
    });
  })();

  /* ===== VIEW OFFER (IntersectionObserver: 50% visible for 1s) ===== */
  (function () {
    var offers = document.querySelectorAll('[data-track-offer]');
    if (!offers.length || !('IntersectionObserver' in window)) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var el = entry.target;
        if (entry.isIntersecting) {
          el._offerTimer = setTimeout(function () {
            push('view_offer', {
              page_section: getSectionFromElement(el),
              offer_id: el.getAttribute('data-offer-id') || '',
              product_id: el.getAttribute('data-product-id') || ''
            });
            observer.unobserve(el);
          }, 1000);
        } else if (el._offerTimer) {
          clearTimeout(el._offerTimer);
        }
      });
    }, { threshold: 0.5 });

    offers.forEach(function (el) { observer.observe(el); });
  })();

  /* ===== CTA / BUTTON CLICKS (delegated) ===== */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-track]');
    if (!btn) return;

    var trackType = btn.getAttribute('data-track');
    var payload = {
      page_section: btn.getAttribute('data-section') || getSectionFromElement(btn),
      cta_id: btn.getAttribute('data-cta-id') || '',
      cta_text: (btn.textContent || '').trim().substring(0, 100),
      offer_id: btn.getAttribute('data-offer-id') || '',
      product_id: btn.getAttribute('data-product-id') || '',
      placement: btn.getAttribute('data-placement') || ''
    };

    push(trackType, payload);
  });

  /* ===== OUTBOUND CLICKS ===== */
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href]');
    if (!link) return;
    var href = link.getAttribute('href') || '';

    // Telegram / messenger clicks
    if (/t\.me\//i.test(href) || link.hasAttribute('data-track-messenger')) {
      push('messenger_click', {
        page_section: getSectionFromElement(link),
        cta_id: link.getAttribute('data-cta-id') || '',
        cta_text: (link.textContent || '').trim().substring(0, 100),
        outbound_url: href
      });
      return;
    }

    // Outbound clicks (external links)
    if (/^https?:\/\//i.test(href) && link.hostname !== window.location.hostname) {
      push('outbound_click', {
        page_section: getSectionFromElement(link),
        outbound_url: href,
        link_text: (link.textContent || '').trim().substring(0, 100)
      });
    }
  });

  /* ===== FAQ EXPAND ===== */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.faq-q-btn');
    if (!btn) return;
    var item = btn.closest('.faq-item');
    if (!item) return;

    // Only fire when opening (not closing)
    if (!item.classList.contains('open')) {
      push('faq_expand', {
        page_section: getSectionFromElement(btn),
        content_name: (btn.textContent || '').trim().substring(0, 150)
      });
    }
  });

  /* ===== PRICING EXPAND ===== */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-track-pricing]');
    if (!btn) return;

    push('pricing_expand', {
      page_section: getSectionFromElement(btn),
      content_id: btn.getAttribute('data-pricing-id') || '',
      content_name: (btn.textContent || '').trim().substring(0, 100)
    });
  });

  /* ===== VIDEO TRACKING ===== */
  (function () {
    var videos = document.querySelectorAll('video');
    videos.forEach(function (video) {
      var startFired = false;
      var progressFired = {};

      video.addEventListener('play', function () {
        if (!startFired) {
          startFired = true;
          push('video_start', {
            page_section: getSectionFromElement(video),
            content_id: video.getAttribute('data-video-id') || video.getAttribute('src') || ''
          });
        }
      });

      video.addEventListener('timeupdate', function () {
        if (!video.duration) return;
        var pct = Math.round((video.currentTime / video.duration) * 100);
        var milestones = [25, 50, 75, 90];
        for (var i = 0; i < milestones.length; i++) {
          var m = milestones[i];
          if (pct >= m && !progressFired[m]) {
            progressFired[m] = true;
            push('video_progress', {
              page_section: getSectionFromElement(video),
              content_id: video.getAttribute('data-video-id') || '',
              video_percent: m
            });
          }
        }
      });
    });
  })();

  /* ===== FORM TRACKING ===== */
  (function () {
    var forms = document.querySelectorAll('form[data-form-id]');
    forms.forEach(function (form) {
      var formId = form.getAttribute('data-form-id');
      var startFired = false;

      form.addEventListener('focusin', function () {
        if (!startFired) {
          startFired = true;
          push('form_start', {
            form_id: formId,
            page_section: getSectionFromElement(form)
          });
        }
      });

      form.addEventListener('submit', function () {
        push('form_submit', {
          form_id: formId,
          page_section: getSectionFromElement(form)
        });
      });
    });
  })();

  /* ===== SECTION VIEWS (IntersectionObserver: 30% visible for 0.5s) ===== */
  (function () {
    var sectionMap = {
      'problem': 'view_problem',
      'social-proof': 'view_privacy',
      'benefits': 'view_benefits',
      'how-it-works': 'view_how_it_works',
      'encoding-guide': 'view_encoding_guide',
      'pricing': 'view_pricing'
    };

    if (!('IntersectionObserver' in window)) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var el = entry.target;
        if (entry.isIntersecting) {
          el._sectionTimer = setTimeout(function () {
            var sectionId = el.getAttribute('data-section') || el.id;
            var eventName = sectionMap[sectionId];
            if (eventName) {
              push(eventName, { page_section: sectionId });
              observer.unobserve(el);
            }
          }, 500);
        } else if (el._sectionTimer) {
          clearTimeout(el._sectionTimer);
        }
      });
    }, { threshold: 0.3 });

    Object.keys(sectionMap).forEach(function (id) {
      var el = document.getElementById(id) || document.querySelector('[data-section="' + id + '"]');
      if (el) observer.observe(el);
    });
  })();

  /* ===== NAV CLICKS ===== */
  document.addEventListener('click', function (e) {
    var link = e.target.closest('.site-nav .nav-link, .site-nav .nav-dropdown-link');
    if (!link) return;

    push('nav_click', {
      link_url: link.getAttribute('href') || '',
      link_text: (link.textContent || '').trim().substring(0, 100)
    });
  });

  /* ===== CHECKOUT START (click on buy links pointing to #order) ===== */
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href*="#order"]');
    if (!link) return;

    push('checkout_start', {
      product_id: link.getAttribute('data-product-id') || 'penger-v1',
      page_section: link.getAttribute('data-section') || getSectionFromElement(link),
      cta_id: link.getAttribute('data-cta-id') || ''
    });
  });

  /* ===== PAYMENT SUCCESS (fires on thank-you page) ===== */
  if (getPageType() === 'thank_you') {
    push('payment_success', {
      product_id: 'penger-v1',
      value: '75.00',
      currency: 'USD'
    });
  }

  /* ===== EXIT INTENT (desktop only) ===== */
  (function () {
    var fired = false;
    document.addEventListener('mouseleave', function (e) {
      if (fired) return;
      if (e.clientY <= 0) {
        fired = true;
        push('exit_intent');
      }
    });
  })();

})();
