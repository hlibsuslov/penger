/**
 * PENGER — Client-side Analytics Layer
 *
 * All user actions push to window.dataLayer.
 * GTM listens to dataLayer events and routes them to GA4, Meta Pixel, Google Ads, etc.
 *
 * No direct gtag() or fbq() calls — everything goes through dataLayer → GTM.
 *
 * Events:
 *   PAGE:        page_view
 *   SECTION:     view_section
 *   ENGAGEMENT:  scroll_25, scroll_50, scroll_75, scroll_90, time_30s, time_60s, time_120s
 *   CTA:         cta_visible, cta_hover, cta_click, buy_click
 *   FUNNEL:      view_offer, view_pricing, checkout_start, payment_success
 *   ECOMMERCE:   view_item, begin_checkout, purchase, generate_lead, checkout_error
 *   CONFIG:      config_change
 *   UX:          exit_intent, rage_click, text_select, copy_text, fast_scroll, slow_scroll
 *   HOVER:       product_image_hover, nav_hover
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

  function getScrollPercent() {
    var docH = document.documentElement.scrollHeight - window.innerHeight;
    if (docH <= 0) return 100;
    return Math.round((window.scrollY / docH) * 100);
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
      device_type: getDeviceType(),
      scroll_depth: getScrollPercent()
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

  /* ===== SCROLL VELOCITY (fast_scroll / slow_scroll) ===== */
  (function () {
    var lastY = window.scrollY;
    var lastTime = Date.now();
    var fastFired = false;
    var slowFired = false;

    window.addEventListener('scroll', function () {
      var now = Date.now();
      var dt = now - lastTime;
      if (dt < 100) return; // sample every 100ms min

      var dy = Math.abs(window.scrollY - lastY);
      var velocity = (dy / dt) * 1000; // px/sec

      lastY = window.scrollY;
      lastTime = now;

      if (velocity > 1500 && !fastFired) {
        fastFired = true;
        push('fast_scroll', { scroll_velocity: Math.round(velocity) });
      }

      if (velocity > 0 && velocity < 300 && !slowFired) {
        slowFired = true;
        push('slow_scroll', { scroll_velocity: Math.round(velocity) });
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

  /* ===== SECTION VIEWS (IntersectionObserver: 50% visible for 1s) ===== */
  (function () {
    if (!('IntersectionObserver' in window)) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var el = entry.target;
        if (entry.isIntersecting) {
          el._sectionTimer = setTimeout(function () {
            var sectionId = el.getAttribute('data-section') || el.id;
            push('view_section', { page_section: sectionId });
            observer.unobserve(el);
          }, 1000);
        } else if (el._sectionTimer) {
          clearTimeout(el._sectionTimer);
        }
      });
    }, { threshold: 0.5 });

    var els = document.querySelectorAll('[data-section]');
    els.forEach(function (el) { observer.observe(el); });
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

  /* ===== CTA VISIBLE (IntersectionObserver: visible for 1s) ===== */
  (function () {
    var ctas = document.querySelectorAll('[data-track]');
    if (!ctas.length || !('IntersectionObserver' in window)) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var el = entry.target;
        if (entry.isIntersecting) {
          el._ctaVisTimer = setTimeout(function () {
            push('cta_visible', {
              cta_id: el.getAttribute('data-cta-id') || '',
              cta_text: (el.textContent || '').trim().substring(0, 100),
              placement: el.getAttribute('data-section') || getSectionFromElement(el)
            });
            observer.unobserve(el);
          }, 1000);
        } else if (el._ctaVisTimer) {
          clearTimeout(el._ctaVisTimer);
        }
      });
    }, { threshold: 0.5 });

    ctas.forEach(function (el) { observer.observe(el); });
  })();

  /* ===== CTA HOVER (mouseenter) ===== */
  document.addEventListener('mouseenter', function (e) {
    var btn = e.target.closest('[data-track]');
    if (!btn) return;

    push('cta_hover', {
      cta_id: btn.getAttribute('data-cta-id') || '',
      cta_text: (btn.textContent || '').trim().substring(0, 100),
      page_section: btn.getAttribute('data-section') || getSectionFromElement(btn)
    });
  }, true);

  /* ===== CTA / BUTTON CLICKS (delegated) ===== */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-track]');
    if (!btn) return;
    if (btn._pengerTracked) return;
    btn._pengerTracked = true;
    setTimeout(function () { btn._pengerTracked = false; }, 100);

    var trackType = btn.getAttribute('data-track');
    var payload = {
      page_section: btn.getAttribute('data-section') || getSectionFromElement(btn),
      cta_id: btn.getAttribute('data-cta-id') || '',
      cta_text: (btn.textContent || '').trim().substring(0, 100),
      offer_id: btn.getAttribute('data-offer-id') || '',
      product_id: btn.getAttribute('data-product-id') || '',
      placement: btn.getAttribute('data-placement') || btn.getAttribute('data-section') || getSectionFromElement(btn)
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

  /* ===== NAV CLICKS ===== */
  document.addEventListener('click', function (e) {
    var link = e.target.closest('.site-nav .nav-link, .site-nav .nav-dropdown-link');
    if (!link) return;

    push('nav_click', {
      link_url: link.getAttribute('href') || '',
      link_text: (link.textContent || '').trim().substring(0, 100)
    });
  });

  /* ===== NAV HOVER (hover ≥ 500ms) ===== */
  (function () {
    var navEl = document.querySelector('.site-nav');
    if (!navEl) return;

    var timer = null;
    navEl.addEventListener('mouseenter', function (e) {
      var link = e.target.closest('.nav-link, .nav-dropdown-link');
      if (!link) return;

      timer = setTimeout(function () {
        push('nav_hover', {
          link_url: link.getAttribute('href') || '',
          link_text: (link.textContent || '').trim().substring(0, 100)
        });
      }, 500);
    }, true);

    navEl.addEventListener('mouseleave', function (e) {
      var link = e.target.closest('.nav-link, .nav-dropdown-link');
      if (!link) return;
      if (timer) { clearTimeout(timer); timer = null; }
    }, true);
  })();

  /* ===== PRODUCT IMAGE HOVER (hover ≥ 500ms) ===== */
  (function () {
    var targets = document.querySelectorAll('.lp-hero-image, .lp-plate-stage, .lp-cta-product');

    targets.forEach(function (el) {
      var timer = null;
      var fired = false;

      el.addEventListener('mouseenter', function () {
        if (fired) return;
        timer = setTimeout(function () {
          fired = true;
          push('product_image_hover', {
            page_section: getSectionFromElement(el),
            product_id: 'penger-v1'
          });
        }, 500);
      });

      el.addEventListener('mouseleave', function () {
        if (timer) { clearTimeout(timer); timer = null; }
      });
    });
  })();

  /* ===== CHECKOUT START (click on buy/order links) ===== */
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href*="/order"], [data-track="checkout_start"]');
    if (!link) return;

    push('checkout_start', {
      product_id: link.getAttribute('data-product-id') || 'penger-v1',
      page_section: link.getAttribute('data-section') || getSectionFromElement(link),
      cta_id: link.getAttribute('data-cta-id') || ''
    });
  });

  /* ===== ECOMMERCE HELPERS ===== */
  function buildEcommerceItem(order) {
    var item = {
      item_id: 'penger-v1',
      item_name: 'PENGER v1.0',
      item_brand: 'PENGER',
      item_category: 'titanium_backup',
      price: 49,
      quantity: 1
    };
    if (order) {
      if (order.finish) item.item_variant = order.finish;
      if (order.plates) item.quantity = Number(order.plates) || 1;
    }
    return item;
  }

  function getOrderFromStorage() {
    try {
      var raw = sessionStorage.getItem('penger_order');
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  /* ===== VIEW ITEM (fires on /order page) ===== */
  if (getPageType() === 'order') {
    push('view_item', {
      ecommerce: {
        currency: 'EUR',
        value: 49,
        items: [buildEcommerceItem()]
      }
    });
  }

  /* ===== PAYMENT SUCCESS (fires on thank-you page) ===== */
  if (getPageType() === 'thank_you') {
    var order = getOrderFromStorage();
    var params = new URLSearchParams(window.location.search);
    var orderId = params.get('order_id') || '';
    var totalVal = order ? Number(order.value) || 49 : 49;

    /* GA4 purchase event (counted as conversion → order count + revenue) */
    push('purchase', {
      order_id: orderId,
      ecommerce: {
        transaction_id: orderId,
        value: totalVal,
        currency: 'EUR',
        shipping: 0,
        items: [buildEcommerceItem(order)]
      }
    });

    /* generate_lead for lead value tracking in GA4 / Google Ads */
    push('generate_lead', {
      order_id: orderId,
      value: totalVal,
      currency: 'EUR',
      lead_source: 'checkout',
      config_finish: order ? order.finish : '',
      config_plates: order ? order.plates : 1,
      config_case_color: order ? order.caseColor : '',
      config_punch: order ? order.punch : false
    });

    /* Legacy event for backward compat */
    push('payment_success', {
      order_id: orderId,
      product_id: 'penger-v1',
      value: totalVal,
      currency: 'EUR'
    });

    /* Clean up */
    try { sessionStorage.removeItem('penger_order'); } catch (e) {}
  }

  /* ===== CHECKOUT ERROR (fires on payment-failed page) ===== */
  if (getPageType() === 'payment_failed') {
    var failOrder = getOrderFromStorage();
    var failParams = new URLSearchParams(window.location.search);
    var failOrderId = failParams.get('order_id') || '';
    var failTotal = failOrder ? Number(failOrder.value) || 49 : 49;

    push('checkout_error', {
      order_id: failOrderId,
      value: failTotal,
      currency: 'EUR',
      config_finish: failOrder ? failOrder.finish : '',
      config_plates: failOrder ? failOrder.plates : 1,
      config_case_color: failOrder ? failOrder.caseColor : '',
      config_punch: failOrder ? failOrder.punch : false,
      product_id: 'penger-v1'
    });
  }

  /* ===== EXIT INTENT (desktop only, cursor Y ≤ 10px) ===== */
  (function () {
    if (getDeviceType() === 'mobile') return;

    var fired = false;
    document.addEventListener('mousemove', function (e) {
      if (fired) return;
      if (e.clientY <= 10) {
        fired = true;
        push('exit_intent', {
          page_section: getSectionFromElement(document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2))
        });
      }
    }, { passive: true });
  })();

  /* ===== TEXT SELECT & COPY (selection > 15 chars) ===== */
  (function () {
    var selectTimer = null;

    document.addEventListener('selectionchange', function () {
      if (selectTimer) clearTimeout(selectTimer);
      selectTimer = setTimeout(function () {
        var sel = window.getSelection();
        var text = sel ? sel.toString().trim() : '';
        if (text.length > 15) {
          var anchorNode = sel.anchorNode;
          var el = anchorNode && anchorNode.nodeType === 3 ? anchorNode.parentElement : anchorNode;
          push('text_select', {
            page_section: getSectionFromElement(el),
            selected_length: text.length
          });
        }
      }, 500);
    });

    document.addEventListener('copy', function () {
      var sel = window.getSelection();
      var text = sel ? sel.toString().trim() : '';
      if (text.length > 15) {
        var anchorNode = sel.anchorNode;
        var el = anchorNode && anchorNode.nodeType === 3 ? anchorNode.parentElement : anchorNode;
        push('copy_text', {
          page_section: getSectionFromElement(el),
          copied_length: text.length
        });
      }
    });
  })();

  /* ===== RAGE CLICKS (≥3 clicks on same element within 1s) ===== */
  (function () {
    var clicks = [];

    document.addEventListener('click', function (e) {
      var target = e.target;
      var now = Date.now();

      // Remove clicks older than 1s
      clicks = clicks.filter(function (c) { return now - c.time < 1000; });

      clicks.push({ target: target, time: now });

      // Count clicks on same element within window
      var count = 0;
      for (var i = 0; i < clicks.length; i++) {
        if (clicks[i].target === target) count++;
      }

      if (count >= 3) {
        push('rage_click', {
          page_section: getSectionFromElement(target),
          element_tag: target.tagName.toLowerCase(),
          element_class: (target.className || '').toString().substring(0, 100)
        });
        clicks = []; // reset after firing
      }
    });
  })();

})();
