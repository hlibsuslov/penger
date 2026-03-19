(function () {
  'use strict';

  var t = window.ORDER_I18N || {};

  /* ===== PRICING ===== */
  var BASE_PRICE = 49;
  var EXTRA_PLATE = 35;

  /* Shipping cost by region */
  var SHIPPING_FREE = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'];
  var SHIPPING_COST = { GB: 5, CH: 5, NO: 5, US: 9, CA: 9, AU: 12, JP: 12, UA: 7 };

  /* Delivery estimates */
  var DELIVERY_ESTIMATES = {
    EU: t.deliveryEU || 'Estimated delivery: <strong>3–5 business days</strong>',
    US: t.deliveryUS || 'Estimated delivery: <strong>7–10 business days</strong>',
    OTHER: t.deliveryOther || 'Estimated delivery: <strong>10–15 business days</strong>'
  };

  /* Promo codes (demo) */
  var PROMO_CODES = {
    'PENGER10': { type: 'percent', value: 10 }
  };

  /* Referral codes (partner program) */
  var REFERRAL_CODES = {
    'CRAFT2026': { type: 'percent', value: 20 }
  };

  /* ===== ADDON PRICES ===== */
  var SLEEVE_PRICE = 10;
  var PUNCH_PRICE = 10;

  /* ===== STATE ===== */
  var plates = 1;
  var sleeveColor = 'black'; // black | white (always included, just pick colour)
  var punchTool = true;       // yes | no
  var payMethod = 'card';
  var currentStep = 'contact'; // contact | delivery | payment
  var shippingCost = 0;
  var discount = 0;
  var appliedPromo = null;
  var isSubmitting = false;

  /* ===== PHONE CODES MAP ===== */
  var phoneCodes = {
    AT:'+43',BE:'+32',BG:'+359',HR:'+385',CY:'+357',CZ:'+420',DK:'+45',
    EE:'+372',FI:'+358',FR:'+33',DE:'+49',GR:'+30',HU:'+36',IE:'+353',
    IT:'+39',LV:'+371',LT:'+370',LU:'+352',MT:'+356',NL:'+31',PL:'+48',
    PT:'+351',RO:'+40',SK:'+421',SI:'+386',ES:'+34',SE:'+46',GB:'+44',
    US:'+1',CA:'+1',AU:'+61',JP:'+81',CH:'+41',NO:'+47',UA:'+380'
  };

  /* Country code → flag emoji */
  function countryFlag(code) {
    if (!code || code.length !== 2) return '';
    return String.fromCodePoint(
      0x1F1E6 + code.charCodeAt(0) - 65,
      0x1F1E6 + code.charCodeAt(1) - 65
    );
  }

  /* ===== EMAIL TYPO MAP ===== */
  var EMAIL_DOMAINS = {
    'gmial.com':'gmail.com','gmal.com':'gmail.com','gmil.com':'gmail.com',
    'gmaill.com':'gmail.com','gmai.com':'gmail.com','gamil.com':'gmail.com',
    'gnail.com':'gmail.com','gmaol.com':'gmail.com','gmail.co':'gmail.com',
    'hotmal.com':'hotmail.com','hotmial.com':'hotmail.com','hotmil.com':'hotmail.com',
    'hotmail.co':'hotmail.com','outloo.com':'outlook.com','outlok.com':'outlook.com',
    'yahooo.com':'yahoo.com','yaho.com':'yahoo.com','yhoo.com':'yahoo.com',
    'iclod.com':'icloud.com','icoud.com':'icloud.com'
  };

  /* ===== ERROR MESSAGES ===== */
  var ERROR_MSGS = {
    required: t.errorRequired || 'This field is required',
    email: t.errorEmail || 'Please check your email address',
    phone: t.errorPhone || 'Please enter a valid phone number'
  };

  /* ===== DOM: PLATES ===== */
  var platesPicker    = document.getElementById('platesPicker');
  var cartPlates      = document.getElementById('cartPlates');
  var cartConfigLines = document.getElementById('cartConfigLines');

  /* Summary refs (sidebar) */
  var rowExtraPlates   = document.getElementById('rowExtraPlates');
  var extraPlatesLabel = document.getElementById('extraPlatesLabel');
  var extraPlatesPrice = document.getElementById('extraPlatesPrice');
  var summaryTotal     = document.getElementById('summaryTotal');
  var rowShippingFree  = document.getElementById('rowShippingFree');
  var rowShippingCost  = document.getElementById('rowShippingCost');
  var shippingCostVal  = document.getElementById('shippingCostVal');
  var rowDiscount      = document.getElementById('rowDiscount');
  var discountVal      = document.getElementById('discountVal');

  /* Summary refs (bottom card) */
  var cartPlatesBottom        = document.getElementById('cartPlatesBottom');
  var rowExtraPlatesBottom    = document.getElementById('rowExtraPlatesBottom');
  var extraPlatesLabelBottom  = document.getElementById('extraPlatesLabelBottom');
  var extraPlatesPriceBottom  = document.getElementById('extraPlatesPriceBottom');
  var summaryTotalBottom      = document.getElementById('summaryTotalBottom');
  var rowShippingFreeBottom   = document.getElementById('rowShippingFreeBottom');
  var rowShippingCostBottom   = document.getElementById('rowShippingCostBottom');
  var shippingCostValBottom   = document.getElementById('shippingCostValBottom');
  var rowDiscountBottom       = document.getElementById('rowDiscountBottom');
  var discountValBottom       = document.getElementById('discountValBottom');

  var txtExtraPlates = t.platesDesc || 'extra plate';

  /* ===== DOM: CHECKOUT STEPS ===== */
  var stepContact    = document.getElementById('stepContact');
  var stepDelivery   = document.getElementById('stepDelivery');
  var stepPayment    = document.getElementById('stepPayment');
  var contactForm    = document.getElementById('contactForm');
  var deliveryForm   = document.getElementById('deliveryForm');
  var contactSummary = document.getElementById('contactSummary');
  var deliverySummary = document.getElementById('deliverySummary');
  var editContact    = document.getElementById('editContact');
  var editDelivery   = document.getElementById('editDelivery');
  var checkoutBtn    = document.getElementById('checkoutBtn');
  var checkoutBtnText = document.getElementById('checkoutBtnText');

  /* Payment */
  var payMethods = document.getElementById('payMethods');
  var cardFields = document.getElementById('cardFields');
  var cardTypeIcons = document.getElementById('cardTypeIcons');
  var helioContainer = document.getElementById('helioCheckoutContainer');
  var helioInitialised = false;

  /* Form fields */
  var countryEl      = document.getElementById('country');
  var cityEl         = document.getElementById('city');
  var zipEl          = document.getElementById('zip');
  var zipSuggestions = document.getElementById('zipSuggestions');
  var phonePrefix    = document.getElementById('phonePrefix');
  var emailEl        = document.getElementById('email');
  var emailSuggestion = document.getElementById('emailSuggestion');

  /* Delivery estimate */
  var deliveryEstimate = document.getElementById('deliveryEstimate');
  var deliveryText     = document.getElementById('deliveryText');


  /* Mobile CTA */
  var mobileCta         = document.getElementById('mobileCta');
  var mobilePrice       = document.getElementById('mobilePrice');
  var mobileContinueBtn = document.getElementById('mobileContinueBtn');

  /* Promo */
  var promoForm   = document.getElementById('promoForm');
  var promoInput  = document.getElementById('promoInput');
  var promoApply  = document.getElementById('promoApply');
  var promoRemove = document.getElementById('promoRemove');
  var promoMsg    = document.getElementById('promoMsg');

  /* Cached promo metadata (for client-side recalc after server validation) */
  var promoType  = null;   // 'percent' | 'fixed'
  var promoValue = null;   // numeric value

  /* ===== HELPERS ===== */
  function getSubtotal() {
    var sub = BASE_PRICE + ((plates - 1) * EXTRA_PLATE);
    sub += SLEEVE_PRICE; // sleeve always included
    if (punchTool) sub += PUNCH_PRICE;
    return sub;
  }

  function getTotal() {
    var sub = getSubtotal();
    var ship = shippingCost || 0;
    var disc = discount || 0;
    var total = sub + ship - disc;
    return Math.max(total, 0);
  }

  /* Format discount text: "-10% (-€7)" for percent, "-€5" for fixed */
  function formatDiscountSuffix(type, value, discEur) {
    if (type === 'percent') {
      return ' -' + value + '% (-\u20AC' + discEur + ')';
    }
    return ' -\u20AC' + discEur;
  }

  /* ===== UPDATE SHIPPING COST ===== */
  function updateShipping() {
    var country = countryEl.value;
    if (!country) {
      shippingCost = 0;
      showFreeShipping(true);
      return;
    }

    if (SHIPPING_FREE.indexOf(country) > -1) {
      shippingCost = 0;
      showFreeShipping(true);
    } else {
      shippingCost = SHIPPING_COST[country] || 15;
      showFreeShipping(false);
      var costText = '+\u20AC' + shippingCost;
      if (shippingCostVal) shippingCostVal.textContent = costText;
      if (shippingCostValBottom) shippingCostValBottom.textContent = costText;
    }
  }

  function showFreeShipping(isFree) {
    if (rowShippingFree) rowShippingFree.style.display = isFree ? '' : 'none';
    if (rowShippingCost) rowShippingCost.style.display = isFree ? 'none' : '';
    if (rowShippingFreeBottom) rowShippingFreeBottom.style.display = isFree ? '' : 'none';
    if (rowShippingCostBottom) rowShippingCostBottom.style.display = isFree ? 'none' : '';
  }

  /* ===== UPDATE DELIVERY ESTIMATE ===== */
  function updateDeliveryEstimate() {
    var country = countryEl.value;
    if (!country || !deliveryEstimate) {
      if (deliveryEstimate) deliveryEstimate.style.display = 'none';
      return;
    }

    deliveryEstimate.style.display = 'flex';
    if (SHIPPING_FREE.indexOf(country) > -1) {
      deliveryText.innerHTML = DELIVERY_ESTIMATES.EU;
    } else if (country === 'US' || country === 'CA') {
      deliveryText.innerHTML = DELIVERY_ESTIMATES.US;
    } else {
      deliveryText.innerHTML = DELIVERY_ESTIMATES.OTHER;
    }
  }

  /* ===== UPDATE UI ===== */
  function updatePlatesPicker(animate) {
    if (!platesPicker) return;
    var opts = platesPicker.querySelectorAll('.plates-option');
    opts.forEach(function (opt) {
      var val = parseInt(opt.getAttribute('data-val'), 10);
      var isActive = val === plates;
      opt.classList.toggle('active', isActive);
      opt.setAttribute('aria-checked', isActive ? 'true' : 'false');
      opt.setAttribute('tabindex', isActive ? '0' : '-1');
    });
    var indicator = platesPicker.querySelector('.plates-slider-indicator');
    if (indicator) {
      indicator.style.transform = 'translateX(' + ((plates - 1) * 100) + '%)';
      /* Pop shadow on click selection */
      if (animate !== false) {
        indicator.classList.add('pop');
        clearTimeout(indicator._popTimer);
        indicator._popTimer = setTimeout(function () {
          indicator.classList.remove('pop');
        }, 500);
      }
    }
  }

  /* Build detailed cart config lines */
  function renderCartConfig() {
    if (!cartConfigLines) return;
    var d = cartConfigLines.dataset;
    var html = '';

    /* ×1 Titanium plate – one line per plate */
    for (var i = 0; i < plates; i++) {
      html += '<div class="cart-config-line">'
            + '<span class="cart-config-qty">&times;1</span>'
            + '<span class="cart-config-label">' + d.plateLabel + '</span>'
            + '</div>';
    }

    /* Divider */
    html += '<div class="cart-config-divider"></div>';

    /* Security sleeve: black/white */
    html += '<div class="cart-config-line">'
          + '<span class="cart-config-label">' + d.sleeveLabel + '</span>'
          + '<span class="cart-config-value">' + sleeveColor + '</span>'
          + '</div>';

    /* Precision center punch tool: Yes/No */
    var punchYes = punchTool;
    html += '<div class="cart-config-line">'
          + '<span class="cart-config-label">' + d.punchLabel + '</span>'
          + '<span class="cart-config-value ' + (punchYes ? 'is-yes' : 'is-no') + '">'
          + (punchYes ? d.yes : d.no)
          + '</span>'
          + '</div>';

    cartConfigLines.innerHTML = html;
  }

  function updateUI() {
    updatePlatesPicker();
    if (cartPlates) cartPlates.textContent = plates;
    if (cartPlatesBottom) cartPlatesBottom.textContent = plates;

    /* Detailed cart config */
    renderCartConfig();

    if (plates > 1) {
      rowExtraPlates.style.display = '';
      var extra = plates - 1;
      var label = '+' + extra + ' ' + txtExtraPlates;
      var price = '+\u20AC' + (extra * EXTRA_PLATE);
      extraPlatesLabel.textContent = label;
      extraPlatesPrice.textContent = price;
      if (rowExtraPlatesBottom) {
        rowExtraPlatesBottom.style.display = '';
        extraPlatesLabelBottom.textContent = label;
        extraPlatesPriceBottom.textContent = price;
      }
    } else {
      rowExtraPlates.style.display = 'none';
      if (rowExtraPlatesBottom) rowExtraPlatesBottom.style.display = 'none';
    }

    /* Sleeve row */
    var rowSleeve = document.getElementById('rowSleeve');
    var rowSleeveBottom = document.getElementById('rowSleeveBottom');
    var sleeveLabel = document.getElementById('sleeveLabel');
    var sleeveLabelBottom = document.getElementById('sleeveLabelBottom');
    if (rowSleeve) {
      sleeveLabel.textContent = 'Sleeve (' + sleeveColor + ')';
      rowSleeve.style.display = '';
    }
    if (rowSleeveBottom) {
      sleeveLabelBottom.textContent = 'Sleeve (' + sleeveColor + ')';
      rowSleeveBottom.style.display = '';
    }

    /* Punch tool row */
    var rowPunch = document.getElementById('rowPunch');
    var rowPunchBottom = document.getElementById('rowPunchBottom');
    if (rowPunch) rowPunch.style.display = punchTool ? '' : 'none';
    if (rowPunchBottom) rowPunchBottom.style.display = punchTool ? '' : 'none';

    /* Recalculate discount if promo / referral is applied */
    if (appliedPromo && promoType && promoValue) {
      var sub = getSubtotal();
      discount = promoType === 'percent' ? Math.round(sub * promoValue / 100) : promoValue;
      discount = Math.min(discount, sub); /* Cap: discount cannot exceed subtotal */
      if (promoMsg && promoMsg.classList.contains('success')) {
        var isRef = !!REFERRAL_CODES[appliedPromo];
        promoMsg.textContent = (isRef
          ? (t.referralApplied || 'Referral discount applied!')
          : (t.promoApplied || 'Promo code applied!')) + formatDiscountSuffix(promoType, promoValue, discount);
      }
    }

    /* Discount row (sidebar + bottom) */
    var discountText = (promoType === 'percent' && promoValue)
      ? '-' + promoValue + '% (-\u20AC' + discount + ')'
      : '-\u20AC' + discount;
    if (discount > 0) {
      if (rowDiscount) { rowDiscount.style.display = ''; discountVal.textContent = discountText; }
      if (rowDiscountBottom) { rowDiscountBottom.style.display = ''; discountValBottom.textContent = discountText; }
    } else {
      if (rowDiscount) rowDiscount.style.display = 'none';
      if (rowDiscountBottom) rowDiscountBottom.style.display = 'none';
    }

    var totalStr = '\u20AC' + getTotal();
    summaryTotal.textContent = totalStr;
    if (summaryTotalBottom) summaryTotalBottom.textContent = totalStr;
    if (mobilePrice) mobilePrice.textContent = totalStr;
  }

  /* ===== PLATES PICKER (click + drag + keyboard) ===== */
  if (platesPicker) {
    /* -- Click -- */
    platesPicker.addEventListener('click', function (e) {
      var opt = e.target.closest('.plates-option');
      if (!opt) return;
      var val = parseInt(opt.getAttribute('data-val'), 10);
      if (val >= 1 && val <= 4 && val !== plates) {
        plates = val;
        updateShipping();
        updateUI();
        saveFormData();
        pushConfig('plates_change');
      }
    });

    /* -- Pointer drag (mouse + touch unified) -- */
    var isDragging = false;
    var track = platesPicker.querySelector('.plates-slider-track');
    var indicator = platesPicker.querySelector('.plates-slider-indicator');

    function getColFromPointer(clientX) {
      var rect = track.getBoundingClientRect();
      var pad = parseFloat(getComputedStyle(platesPicker).getPropertyValue('--_pad')) || 5;
      var innerLeft = rect.left + pad;
      var innerWidth = rect.width - pad * 2;
      var ratio = Math.max(0, Math.min(1, (clientX - innerLeft) / innerWidth));
      return Math.min(4, Math.floor(ratio * 4) + 1);
    }

    function onDragMove(e) {
      if (!isDragging) return;
      var clientX = e.clientX !== undefined ? e.clientX : (e.touches ? e.touches[0].clientX : 0);
      var col = getColFromPointer(clientX);
      if (col >= 1 && col <= 4) {
        /* Live indicator follow during drag */
        indicator.style.transform = 'translateX(' + ((col - 1) * 100) + '%)';
        if (col !== plates) {
          plates = col;
          platesPicker.querySelectorAll('.plates-option').forEach(function (opt) {
            var v = parseInt(opt.getAttribute('data-val'), 10);
            opt.classList.toggle('active', v === plates);
            opt.setAttribute('aria-checked', v === plates ? 'true' : 'false');
            opt.setAttribute('tabindex', v === plates ? '0' : '-1');
          });
        }
      }
    }

    function onDragEnd() {
      if (!isDragging) return;
      isDragging = false;
      platesPicker.classList.remove('is-dragging');
      document.removeEventListener('pointermove', onDragMove);
      document.removeEventListener('pointerup', onDragEnd);
      document.removeEventListener('pointercancel', onDragEnd);
      updateShipping();
      updateUI();
      saveFormData();
      pushConfig('plates_change');
    }

    track.addEventListener('pointerdown', function (e) {
      if (e.button && e.button !== 0) return; /* left click only */
      isDragging = true;
      platesPicker.classList.add('is-dragging');
      track.setPointerCapture(e.pointerId);
      document.addEventListener('pointermove', onDragMove);
      document.addEventListener('pointerup', onDragEnd);
      document.addEventListener('pointercancel', onDragEnd);
      onDragMove(e); /* snap to initial position */
    });

    /* -- Keyboard navigation (arrow keys) -- */
    platesPicker.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      var next = plates + (e.key === 'ArrowRight' ? 1 : -1);
      if (next >= 1 && next <= 4) {
        plates = next;
        updateShipping();
        updateUI();
        saveFormData();
        pushConfig('plates_change');
        var activeOpt = platesPicker.querySelector('.plates-option.active');
        if (activeOpt) activeOpt.focus();
      }
    });
  }

  /* ===== CONFIG OPTIONS: SLEEVE & PUNCH ===== */
  var sleeveOptions = document.getElementById('sleeveOptions');
  var punchToggle   = document.getElementById('punchToggle');

  function initConfigOptions(container, onChange) {
    if (!container) return;
    container.addEventListener('click', function (e) {
      var opt = e.target.closest('.config-opt');
      if (!opt) return;
      var input = opt.querySelector('input');
      if (!input) return;
      container.querySelectorAll('.config-opt').forEach(function (o) { o.classList.remove('active'); });
      opt.classList.add('active');
      input.checked = true;
      onChange(input.value);
    });
  }

  initConfigOptions(sleeveOptions, function (val) {
    sleeveColor = val;
    updateShipping();
    updateUI();
    saveFormData();
    pushConfig('sleeve_change');
  });

  /* Punch toggle */
  if (punchToggle) {
    var punchInput = punchToggle.querySelector('input');
    if (punchInput) {
      punchInput.addEventListener('change', function () {
        punchTool = this.checked;
        updateShipping();
        updateUI();
        saveFormData();
        pushConfig('punch_change');
      });
    }
  }


  /* ===== MOBILE CTA ===== */
  function updateMobileCta() {
    if (!mobileContinueBtn) return;
    if (currentStep === 'contact') {
      mobileContinueBtn.textContent = t.continueToDelivery || 'Continue to Delivery';
    } else if (currentStep === 'delivery') {
      mobileContinueBtn.textContent = t.continueToPayment || 'Continue to Payment';
    } else {
      mobileContinueBtn.textContent = t.payNow || 'Pay Now';
    }
  }

  if (mobileContinueBtn) {
    mobileContinueBtn.addEventListener('click', function () {
      if (currentStep === 'contact') {
        var submitBtn = contactForm.querySelector('.step-continue-btn');
        if (submitBtn) submitBtn.click();
      } else if (currentStep === 'delivery') {
        var submitBtn2 = deliveryForm.querySelector('.step-continue-btn');
        if (submitBtn2) submitBtn2.click();
      } else {
        checkoutBtn.click();
      }
    });
  }

  /* ===== COUNTRY AUTO-DETECT (called after restoreFormData) ===== */
  function detectCountry() {
    if (countryEl.value) return;
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', 'https://ipapi.co/json/', true);
      xhr.timeout = 4000;
      xhr.onload = function () {
        if (xhr.status === 200 && !countryEl.value) {
          try {
            var data = JSON.parse(xhr.responseText);
            var code = (data.country_code || '').toUpperCase();
            if (!code) return;
            /* If country is not in the list, add it */
            if (!countryEl.querySelector('option[value="' + code + '"]')) {
              var name = data.country_name || code;
              var opt = document.createElement('option');
              opt.value = code;
              opt.textContent = code + ' \u2014 ' + name;
              /* Insert after the disabled placeholder */
              var placeholder = countryEl.querySelector('option[disabled]');
              if (placeholder && placeholder.nextSibling) {
                countryEl.insertBefore(opt, placeholder.nextSibling);
              } else {
                countryEl.appendChild(opt);
              }
            }
            countryEl.value = code;
            countryEl.dispatchEvent(new Event('change', { bubbles: true }));
          } catch (e) {}
        }
      };
      xhr.onerror = function () {};
      xhr.send();
    } catch (e) {}
  }

  /* ===== PHONE PREFIX BY COUNTRY ===== */
  function updatePhonePrefix(code) {
    if (phonePrefix) {
      var flag = countryFlag(code);
      var dialCode = phoneCodes[code] || '+';
      phonePrefix.textContent = flag ? flag + ' ' + dialCode : dialCode;
    }
  }

  countryEl.addEventListener('change', function () {
    updatePhonePrefix(this.value);
    updateShipping();
    updateDeliveryEstimate();
    updateUI();
    saveFormData();
  });

  /* ===== EMAIL TYPO DETECTION ===== */
  function checkEmailTypo(email) {
    if (!emailSuggestion) return;
    emailSuggestion.innerHTML = '';
    if (!email || email.indexOf('@') === -1) return;

    var parts = email.split('@');
    var domain = parts[1] ? parts[1].toLowerCase() : '';
    var suggestion = EMAIL_DOMAINS[domain];

    if (suggestion) {
      var corrected = parts[0] + '@' + suggestion;
      emailSuggestion.innerHTML = (t.emailDidYouMean || 'Did you mean') +
        ' <span data-email="' + corrected + '">' + corrected + '</span>?';
    }
  }

  if (emailSuggestion) {
    emailSuggestion.addEventListener('click', function (e) {
      var span = e.target.closest('span[data-email]');
      if (!span) return;
      emailEl.value = span.getAttribute('data-email');
      emailSuggestion.innerHTML = '';
      validateField(emailEl);
      saveFormData();
    });
  }

  /* ===== REAL-TIME FIELD VALIDATION ===== */
  function validateField(input) {
    if (!input.hasAttribute('required') && input.type !== 'email') return;
    var val = input.value.trim();
    input.classList.remove('valid', 'error');
    clearFieldError(input);

    if (input.type === 'email') {
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        input.classList.add('valid');
        checkEmailTypo(val);
      } else if (val.length > 0) {
        input.classList.add('error');
        showFieldError(input, ERROR_MSGS.email);
      }
    } else if (input.id === 'phone') {
      var digits = val.replace(/\D/g, '');
      if (digits.length >= 6) {
        input.classList.add('valid');
      } else if (val.length > 0) {
        input.classList.add('error');
        showFieldError(input, ERROR_MSGS.phone);
      }
    } else if (input.tagName === 'SELECT') {
      if (val) input.classList.add('valid');
    } else {
      if (val.length >= 1) input.classList.add('valid');
    }
  }

  function showFieldError(input, msg) {
    var group = input.closest('.form-group');
    if (!group) return;
    group.classList.add('has-error');
    var errorEl = group.querySelector('.field-error-msg');
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.style.display = 'block';
    }
  }

  function clearFieldError(input) {
    var group = input.closest('.form-group');
    if (!group) return;
    group.classList.remove('has-error');
    var errorEl = group.querySelector('.field-error-msg');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.style.display = 'none';
    }
  }

  /* Attach live validation to all form inputs */
  contactForm.querySelectorAll('.form-input').forEach(function (input) {
    input.addEventListener('blur', function () { validateField(this); saveFormData(); });
    input.addEventListener('input', function () {
      /* Strip country code prefix from phone autocomplete */
      if (this.id === 'phone') {
        var val = this.value;
        var prefix = phonePrefix ? phonePrefix.textContent : '';
        if (prefix && prefix.length > 1 && val.indexOf(prefix) === 0) {
          this.value = val.substring(prefix.length).replace(/^\s+/, '');
        } else if (val.charAt(0) === '+') {
          /* Strip any +XX prefix that autocomplete might insert */
          var digits = val.replace(/[^\d+]/g, '');
          var countryCode = countryEl.value;
          var expectedPrefix = phoneCodes[countryCode] || '';
          if (expectedPrefix && digits.indexOf(expectedPrefix) === 0) {
            this.value = digits.substring(expectedPrefix.length).replace(/^\s+/, '');
          } else if (digits.length > 3 && digits.charAt(0) === '+') {
            /* Generic strip: remove + and up to 3 digits at start */
            this.value = digits.replace(/^\+\d{1,3}/, '').replace(/^\s+/, '');
          }
        }
      }
      if (this.classList.contains('error') || this.classList.contains('valid')) {
        validateField(this);
      }
      saveFormData();
    });
  });

  /* Attach live validation to delivery form inputs */
  if (deliveryForm) {
    deliveryForm.querySelectorAll('.form-input').forEach(function (input) {
      input.addEventListener('blur', function () { validateField(this); saveFormData(); });
      input.addEventListener('input', function () {
        if (this.classList.contains('error') || this.classList.contains('valid')) {
          validateField(this);
        }
        saveFormData();
      });
    });
  }

  /* ===== CITY → ZIP SUGGESTIONS ===== */
  var zipDebounce = null;

  function fetchZipSuggestions(city, country) {
    if (!city || city.length < 2) { closeZipSuggestions(); return; }
    var url = 'https://secure.geonames.org/postalCodeSearchJSON?placename=' +
      encodeURIComponent(city) + '&maxRows=5&username=penger_order';
    if (country) url += '&country=' + encodeURIComponent(country);
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.timeout = 4000;
      xhr.onload = function () {
        if (xhr.status === 200) {
          try {
            var data = JSON.parse(xhr.responseText);
            showZipSuggestions(data.postalCodes || []);
          } catch (e) { closeZipSuggestions(); }
        }
      };
      xhr.onerror = function () { closeZipSuggestions(); };
      xhr.send();
    } catch (e) {}
  }

  function showZipSuggestions(results) {
    if (!results.length) { closeZipSuggestions(); return; }
    var html = '';
    var seen = {};
    results.forEach(function (r) {
      var key = r.postalCode + '|' + r.placeName;
      if (seen[key]) return;
      seen[key] = true;
      html += '<div class="zip-suggestion" data-zip="' + r.postalCode + '" data-city="' + r.placeName + '">' +
        r.placeName + '<span class="zip-code">' + r.postalCode + '</span></div>';
    });
    zipSuggestions.innerHTML = html;
    zipSuggestions.classList.add('open');
  }

  function closeZipSuggestions() {
    zipSuggestions.classList.remove('open');
    zipSuggestions.innerHTML = '';
  }

  if (cityEl) {
    cityEl.addEventListener('input', function () {
      clearTimeout(zipDebounce);
      var val = this.value.trim();
      zipDebounce = setTimeout(function () {
        fetchZipSuggestions(val, countryEl.value);
      }, 400);
    });
  }

  if (zipSuggestions) {
    zipSuggestions.addEventListener('click', function (e) {
      var item = e.target.closest('.zip-suggestion');
      if (!item) return;
      zipEl.value = item.getAttribute('data-zip');
      cityEl.value = item.getAttribute('data-city');
      closeZipSuggestions();
      validateField(zipEl);
      validateField(cityEl);
      saveFormData();
    });
  }

  document.addEventListener('click', function (e) {
    if (!e.target.closest('#zip') && !e.target.closest('#zipSuggestions') && !e.target.closest('#city')) {
      closeZipSuggestions();
    }
  });

  /* ===== STEP MANAGEMENT WITH ANIMATIONS ===== */
  function activateStep(step) {
    step.classList.remove('disabled', 'completed');
    step.classList.add('active', 'step-entering');
    setTimeout(function () { step.classList.remove('step-entering'); }, 350);
  }

  function completeStep(step) {
    step.classList.remove('active');
    step.classList.add('completed');
  }

  function disableStep(step) {
    step.classList.remove('active', 'completed');
    step.classList.add('disabled');
  }

  /* ===== CONTACT FORM: CONTINUE ===== */
  contactForm.addEventListener('submit', function (e) {
    e.preventDefault();

    /* Sync state after browser autofill (autofill doesn't fire change events) */
    if (countryEl.value) {
      updatePhonePrefix(countryEl.value);
      updateShipping();
      updateDeliveryEstimate();
    }

    var inputs = contactForm.querySelectorAll('[required]');
    var valid = true;
    var firstError = null;
    inputs.forEach(function (input) {
      input.classList.remove('error');
      clearFieldError(input);
      if (!input.value.trim()) {
        input.classList.add('error');
        showFieldError(input, ERROR_MSGS.required);
        valid = false;
        if (!firstError) firstError = input;
      }
    });

    if (emailEl.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value)) {
      emailEl.classList.add('error');
      showFieldError(emailEl, ERROR_MSGS.email);
      valid = false;
      if (!firstError) firstError = emailEl;
    }

    /* Scroll to first error */
    if (!valid && firstError) {
      firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstError.focus();
      return;
    }

    var firstName = document.getElementById('firstName').value.trim();
    var lastName  = document.getElementById('lastName').value.trim();
    var email     = emailEl.value.trim();
    var phone     = document.getElementById('phone').value.trim();
    var prefix = phonePrefix ? phonePrefix.textContent : '';
    var countryCode = countryEl.value;
    var countryText = countryEl.options[countryEl.selectedIndex].text.replace(/^[\u{1F1E6}-\u{1F1FF}]{2}\s*/u, '');

    contactSummary.innerHTML =
      '<div class="step-summary-line"><span class="step-summary-label">' + (t.firstName || 'Name') + '</span> ' + firstName + ' ' + lastName + '</div>' +
      '<div class="step-summary-line"><span class="step-summary-label">' + (t.email || 'Email') + '</span> ' + email + '</div>' +
      '<div class="step-summary-line"><span class="step-summary-label">' + (t.phone || 'Phone') + '</span> ' + (phoneCodes[countryCode] || '') + ' ' + phone + '</div>' +
      '<div class="step-summary-line"><span class="step-summary-label">' + (t.country || 'Country') + '</span> ' + countryText + '</div>';

    completeStep(stepContact);
    activateStep(stepDelivery);
    currentStep = 'delivery';
    updateMobileCta();
    stepDelivery.scrollIntoView({ behavior: 'smooth', block: 'start' });
    saveFormData();
  });

  /* ===== DELIVERY FORM: CONTINUE ===== */
  if (deliveryForm) {
    deliveryForm.addEventListener('submit', function (e) {
      e.preventDefault();

      var inputs = deliveryForm.querySelectorAll('[required]');
      var valid = true;
      var firstError = null;
      inputs.forEach(function (input) {
        input.classList.remove('error');
        clearFieldError(input);
        if (!input.value.trim()) {
          input.classList.add('error');
          showFieldError(input, ERROR_MSGS.required);
          valid = false;
          if (!firstError) firstError = input;
        }
      });

      if (!valid && firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstError.focus();
        return;
      }

      var street    = document.getElementById('street').value.trim();
      var apt       = document.getElementById('apt').value.trim();
      var city      = cityEl.value.trim();
      var zip       = zipEl.value.trim();
      var countryText = countryEl.options[countryEl.selectedIndex].text.replace(/^[\u{1F1E6}-\u{1F1FF}]{2}\s*/u, '');

      var addressParts = [street];
      if (apt) addressParts.push(apt);
      addressParts.push(city + ' ' + zip);
      addressParts.push(countryText);

      deliverySummary.innerHTML =
        '<div class="step-summary-line"><span class="step-summary-label">' + (t.address || 'Address') + '</span> ' + addressParts.join(', ') + '</div>';

      completeStep(stepDelivery);
      activateStep(stepPayment);
      currentStep = 'payment';
  
      updateMobileCta();
      stepPayment.scrollIntoView({ behavior: 'smooth', block: 'start' });
      saveFormData();
    });
  }

  /* ===== EDIT CONTACT ===== */
  editContact.addEventListener('click', function () {
    activateStep(stepContact);
    disableStep(stepDelivery);
    disableStep(stepPayment);
    currentStep = 'contact';

    updateMobileCta();
  });

  /* ===== EDIT DELIVERY ===== */
  if (editDelivery) {
    editDelivery.addEventListener('click', function () {
      activateStep(stepDelivery);
      disableStep(stepPayment);
      currentStep = 'delivery';
  
      updateMobileCta();
    });
  }

  /* ===== PAYMENT METHOD SELECTOR ===== */
  function updatePayMethodAria() {
    payMethods.querySelectorAll('.pay-method').forEach(function (m) {
      m.setAttribute('aria-checked', m.classList.contains('active') ? 'true' : 'false');
    });
  }

  payMethods.querySelectorAll('.pay-method').forEach(function (m) {
    m.setAttribute('role', 'radio');
    m.setAttribute('aria-checked', m.classList.contains('active') ? 'true' : 'false');
  });

  payMethods.addEventListener('click', function (e) {
    var method = e.target.closest('.pay-method');
    if (!method) return;
    var input = method.querySelector('input');
    if (!input) return;
    payMethods.querySelectorAll('.pay-method').forEach(function (m) { m.classList.remove('active'); });
    method.classList.add('active');
    input.checked = true;
    payMethod = input.value;
    cardFields.classList.toggle('hidden', payMethod !== 'card');
    helioContainer.classList.toggle('hidden', payMethod !== 'crypto');
    /* When crypto is selected, show Helio inline and hide checkout button */
    if (payMethod === 'crypto') {
      checkoutBtn.style.display = 'none';
      initHelioCheckout();
    } else {
      checkoutBtn.style.display = '';
    }
    updatePayMethodAria();
  });

  /* ===== CARD NUMBER FORMATTING + TYPE DETECTION ===== */
  var cardNumberEl = document.getElementById('cardNumber');
  if (cardNumberEl) {
    cardNumberEl.addEventListener('input', function () {
      var v = this.value.replace(/\D/g, '').substring(0, 16);
      this.value = v.replace(/(\d{4})(?=\d)/g, '$1 ');
      detectCardType(v);
    });
  }

  function detectCardType(num) {
    if (!cardTypeIcons) return;
    var icons = cardTypeIcons.querySelectorAll('span');
    icons.forEach(function (s) { s.classList.remove('detected'); });
    if (!num || num.length < 1) return;
    var first = num.charAt(0);
    var first2 = num.substring(0, 2);
    if (first === '4') {
      cardTypeIcons.querySelector('[data-card="visa"]').classList.add('detected');
    } else if (['51','52','53','54','55'].indexOf(first2) > -1 || (parseInt(first2) >= 22 && parseInt(first2) <= 27)) {
      cardTypeIcons.querySelector('[data-card="mc"]').classList.add('detected');
    } else if (first2 === '34' || first2 === '37') {
      cardTypeIcons.querySelector('[data-card="amex"]').classList.add('detected');
    }
  }

  /* ===== EXPIRY FORMATTING (MM/YY) ===== */
  var cardExpiryEl = document.getElementById('cardExpiry');
  if (cardExpiryEl) {
    cardExpiryEl.addEventListener('input', function () {
      var v = this.value.replace(/\D/g, '').substring(0, 4);
      if (v.length >= 3) v = v.substring(0, 2) + '/' + v.substring(2);
      this.value = v;
    });
  }

  /* ===== CVC LIMIT (3-4 digits) ===== */
  var cardCvcEl = document.getElementById('cardCvc');
  if (cardCvcEl) {
    cardCvcEl.addEventListener('input', function () {
      this.value = this.value.replace(/\D/g, '').substring(0, 4);
    });
  }

  /* ===== TERMS → ENABLE/DISABLE PAY NOW ===== */
  var termsCheck = document.getElementById('agreeTerms');
  if (termsCheck) {
    termsCheck.addEventListener('change', function () {
      this.closest('.form-checkbox').querySelector('.checkbox-box').style.borderColor = '';
      checkoutBtn.disabled = !this.checked;
    });
  }

  /* ===== PROMO CODE ===== */
  if (promoApply) {
    promoApply.addEventListener('click', function () {
      applyPromo();
    });
  }

  if (promoInput) {
    promoInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); applyPromo(); }
    });
  }

  function applyPromo() {
    if (!promoInput) return;
    var code = promoInput.value.trim().toUpperCase();
    if (promoMsg) { promoMsg.className = 'promo-msg'; promoMsg.textContent = ''; }

    if (!code) return;

    /* Show loading state */
    if (promoApply) { promoApply.disabled = true; promoApply.textContent = t.promoLoading || 'Checking...'; }
    if (promoInput) promoInput.disabled = true;

    var subtotal = getSubtotal();
    var controller = new AbortController();
    var fetchTimeout = setTimeout(function () { controller.abort(); }, 5000);

    fetch('/api/validate-promo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code, subtotal: subtotal }),
      signal: controller.signal
    })
    .then(function (res) {
      clearTimeout(fetchTimeout);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      if (data.valid) {
        appliedPromo = code;
        promoType = data.type;
        promoValue = data.value;
        discount = Math.min(data.discount, subtotal);
        var isReferral = !!data.isReferral;
        if (promoMsg) {
          promoMsg.className = 'promo-msg success';
          promoMsg.textContent = (isReferral
            ? (t.referralApplied || 'Referral discount applied!')
            : (t.promoApplied || 'Promo code applied!')) + formatDiscountSuffix(data.type, data.value, discount);
        }
        if (promoInput) promoInput.disabled = true;
        if (promoApply) promoApply.style.display = 'none';
        if (promoRemove) promoRemove.style.display = '';
        updateUI();
        saveFormData();
      } else {
        discount = 0;
        appliedPromo = null;
        promoType = null;
        promoValue = null;
        if (promoInput) promoInput.disabled = false;
        if (promoApply) { promoApply.disabled = false; promoApply.textContent = t.promoApply || 'Apply'; }
        if (promoMsg) {
          promoMsg.className = 'promo-msg error';
          promoMsg.textContent = data.error || t.promoInvalid || 'Invalid promo code';
        }
        updateUI();
      }
    })
    .catch(function () {
      /* Network error — fall back to client-side validation for resilience */
      var promo = PROMO_CODES[code] || REFERRAL_CODES[code];
      if (promo) {
        appliedPromo = code;
        promoType = promo.type;
        promoValue = promo.value;
        if (promo.type === 'percent') {
          discount = Math.round(subtotal * promo.value / 100);
        } else {
          discount = promo.value;
        }
        discount = Math.min(discount, subtotal);
        var isReferral = !!REFERRAL_CODES[code];
        if (promoMsg) {
          promoMsg.className = 'promo-msg success';
          promoMsg.textContent = (isReferral
            ? (t.referralApplied || 'Referral discount applied!')
            : (t.promoApplied || 'Promo code applied!')) + formatDiscountSuffix(promo.type, promo.value, discount);
        }
        if (promoInput) promoInput.disabled = true;
        if (promoApply) promoApply.style.display = 'none';
        if (promoRemove) promoRemove.style.display = '';
        updateUI();
        saveFormData();
      } else {
        discount = 0;
        appliedPromo = null;
        promoType = null;
        promoValue = null;
        if (promoInput) promoInput.disabled = false;
        if (promoApply) { promoApply.disabled = false; promoApply.textContent = t.promoApply || 'Apply'; }
        if (promoMsg) {
          promoMsg.className = 'promo-msg error';
          promoMsg.textContent = t.promoInvalid || 'Invalid promo code';
        }
        updateUI();
      }
    });
  }

  /* ===== REMOVE PROMO CODE ===== */
  function removePromo() {
    appliedPromo = null;
    promoType = null;
    promoValue = null;
    discount = 0;
    if (promoInput) { promoInput.disabled = false; promoInput.value = ''; }
    if (promoApply) { promoApply.style.display = ''; promoApply.disabled = false; promoApply.textContent = t.promoApply || 'Apply'; }
    if (promoRemove) promoRemove.style.display = 'none';
    if (promoMsg) { promoMsg.className = 'promo-msg'; promoMsg.textContent = ''; }
    updateUI();
    saveFormData();
  }

  if (promoRemove) {
    promoRemove.addEventListener('click', removePromo);
  }

  /* ===== FORM DATA PERSISTENCE (sessionStorage) ===== */
  var STORAGE_KEY = 'penger_checkout_form';
  var STORAGE_VERSION = 3;
  var STORAGE_TTL = 30 * 60 * 1000; /* 30 minutes */

  function saveFormData() {
    try {
      var data = {
        _v: STORAGE_VERSION,
        _ts: Date.now(),
        plates: plates,
        sleeveColor: sleeveColor,
        punchTool: punchTool,
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        country: countryEl.value,
        street: document.getElementById('street').value,
        apt: document.getElementById('apt').value,
        city: cityEl.value,
        zip: zipEl.value,
        promo: appliedPromo,
        promoType: promoType,
        promoValue: promoValue
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {}
  }

  function restoreFormData() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);

      /* Discard stale or incompatible data */
      if (data._v !== STORAGE_VERSION || (data._ts && Date.now() - data._ts > STORAGE_TTL)) {
        sessionStorage.removeItem(STORAGE_KEY);
        return;
      }

      if (data.plates && data.plates >= 1 && data.plates <= 4) {
        plates = data.plates;
      }
      if (data.sleeveColor) {
        sleeveColor = data.sleeveColor;
        if (sleeveOptions) {
          sleeveOptions.querySelectorAll('.config-opt').forEach(function (o) {
            var inp = o.querySelector('input');
            if (inp && inp.value === sleeveColor) { o.classList.add('active'); inp.checked = true; }
            else { o.classList.remove('active'); }
          });
        }
      }
      if (typeof data.punchTool !== 'undefined') {
        punchTool = !!data.punchTool;
        if (punchToggle) {
          var punchInp = punchToggle.querySelector('input');
          if (punchInp) punchInp.checked = punchTool;
        }
      }
      if (data.firstName) document.getElementById('firstName').value = data.firstName;
      if (data.lastName) document.getElementById('lastName').value = data.lastName;
      if (data.email) document.getElementById('email').value = data.email;
      if (data.phone) document.getElementById('phone').value = data.phone;
      if (data.country) {
        countryEl.value = data.country;
        updatePhonePrefix(data.country);
      }
      if (data.street) document.getElementById('street').value = data.street;
      if (data.apt) document.getElementById('apt').value = data.apt;
      if (data.city) cityEl.value = data.city;
      if (data.zip) zipEl.value = data.zip;

      /* Restore promo / referral code */
      if (data.promo && data.promoType && data.promoValue) {
        appliedPromo = data.promo;
        promoType = data.promoType;
        promoValue = data.promoValue;
        var sub = getSubtotal();
        discount = promoType === 'percent' ? Math.round(sub * promoValue / 100) : promoValue;
        discount = Math.min(discount, sub); /* Cap: discount cannot exceed subtotal */
        if (promoInput) { promoInput.value = data.promo; promoInput.disabled = true; }
        if (promoApply) promoApply.style.display = 'none';
        if (promoRemove) promoRemove.style.display = '';
        if (promoForm) promoForm.classList.add('open');
        if (promoMsg) {
          var isRef = !!REFERRAL_CODES[data.promo];
          promoMsg.className = 'promo-msg success';
          promoMsg.textContent = (isRef
            ? (t.referralApplied || 'Referral discount applied!')
            : (t.promoApplied || 'Promo code applied!')) + formatDiscountSuffix(promoType, promoValue, discount);
        }
        /* Background re-validate against server (code may have expired).
           Guard: only remove if this code is STILL the active promo when
           the response arrives (autoApplyReferral may have swapped it). */
        var _revalidCode = data.promo;
        var rc = new AbortController();
        var rt = setTimeout(function () { rc.abort(); }, 5000);
        fetch('/api/validate-promo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: _revalidCode, subtotal: sub }),
          signal: rc.signal
        }).then(function (r) {
          clearTimeout(rt);
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        }).then(function (resp) {
          if (!resp.valid && appliedPromo === _revalidCode) { removePromo(); }
        }).catch(function () { /* keep client-side state on network error */ });
      }

      /* Trigger validation on restored fields */
      contactForm.querySelectorAll('.form-input').forEach(function (input) {
        if (input.value) validateField(input);
      });
    } catch (e) {}
  }

  /* ===== ANALYTICS ===== */
  function pushConfig(action) {
    var dl = window.dataLayer = window.dataLayer || [];
    dl.push({
      event: 'config_change',
      config_action: action,
      config_plates: plates,
      config_total: getTotal(),
      product_id: 'penger-v1',
      page_section: 'order'
    });
  }

  /* ===== ORDER ID ===== */
  function generateOrderId() {
    var ts = Date.now().toString(36).toUpperCase();
    var rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return 'PG-' + ts + '-' + rand;
  }

  /* ===== CHECKOUT (PAY NOW) WITH DOUBLE-SUBMIT PROTECTION ===== */

  /* Re-read config state from DOM to catch any bfcache / stale-JS drift */
  function syncConfigFromDOM() {
    /* Plates: read whichever option is marked active */
    if (platesPicker) {
      var activeOpt = platesPicker.querySelector('.plates-option.active');
      if (activeOpt) {
        var domPlates = parseInt(activeOpt.getAttribute('data-val'), 10);
        if (domPlates >= 1 && domPlates <= 4) plates = domPlates;
      }
    }

    /* Sleeve colour */
    if (sleeveOptions) {
      var checkedSleeve = sleeveOptions.querySelector('input:checked');
      if (checkedSleeve) sleeveColor = checkedSleeve.value;
    }

    /* Punch tool */
    if (punchToggle) {
      var punchInp = punchToggle.querySelector('input');
      if (punchInp) punchTool = punchInp.checked;
    }

    /* Payment method */
    if (payMethods) {
      var checkedPay = payMethods.querySelector('input:checked');
      if (checkedPay) payMethod = checkedPay.value;
    }

    /* Recalculate shipping & totals with fresh state */
    updateShipping();
    if (appliedPromo && promoType && promoValue) {
      var sub = getSubtotal();
      discount = promoType === 'percent' ? Math.round(sub * promoValue / 100) : promoValue;
      discount = Math.min(discount, sub);
    }
  }

  /* ===== HELIO CRYPTO CHECKOUT ===== */
  function initHelioCheckout() {
    if (!window.helioCheckout) {
      /* SDK loads as type="module" — retry once after a short delay */
      setTimeout(function () {
        if (window.helioCheckout) initHelioCheckout();
        else console.error('Helio SDK failed to load');
      }, 1500);
      return;
    }

    /* Clear previous instance */
    helioContainer.innerHTML = '';
    helioContainer.classList.remove('hidden');

    var amount = getTotal().toFixed(2);
    var lang = t.langPrefix || '';

    window.helioCheckout(helioContainer, {
      paylinkId: 'zyBtgF4rM1vI~pqSltNzwheqjtL.8E5Oj~vblPO3_hbMF3hcjykrgcyE_9l.eQ6U',
      theme: { themeMode: 'dark' },
      primaryColor: '#6400CC',
      neutralColor: '#5A6578',
      amount: amount,
      display: 'inline',
      onSuccess: function (event) {
        console.log('Helio payment success', event);

        /* Generate order + save to session (same as normal checkout) */
        var orderId = generateOrderId();
        var total = getTotal();
        var prefix = phonePrefix ? phonePrefix.textContent : '';
        var orderData = {
          order_id: orderId,
          plates: plates,
          sleeveColor: sleeveColor,
          punchTool: punchTool,
          value: total,
          currency: 'EUR',
          product_id: 'penger-v1',
          pay_method: 'crypto',
          shipping: shippingCost,
          discount: discount,
          promo: appliedPromo,
          referral: (function () { try { return sessionStorage.getItem('penger_referral') || null; } catch (e) { return null; } })(),
          contact: {
            firstName: (document.getElementById('firstName') || {}).value || '',
            lastName: (document.getElementById('lastName') || {}).value || '',
            email: (document.getElementById('email') || {}).value || '',
            phone: prefix + ((document.getElementById('phone') || {}).value || '')
          },
          address: {
            street: (document.getElementById('street') || {}).value || '',
            apt: (document.getElementById('apt') || {}).value || '',
            city: cityEl ? cityEl.value : '',
            zip: zipEl ? zipEl.value : '',
            country: countryEl ? countryEl.value : ''
          },
          helio_tx: event && event.transactionId ? event.transactionId : '',
          ts: Date.now()
        };
        try { sessionStorage.setItem('penger_order', JSON.stringify(orderData)); } catch (e) {}

        var dl = window.dataLayer = window.dataLayer || [];
        dl.push({
          event: 'purchase',
          order_id: orderId,
          value: total,
          currency: 'EUR',
          payment_method: 'crypto_helio',
          transaction_id: orderData.helio_tx
        });

        window.location.href = lang + '/payment-success?order_id=' + encodeURIComponent(orderId);
      },
      onError: function (event) {
        console.error('Helio payment error', event);
      },
      onPending: function (event) {
        console.log('Helio payment pending', event);
      },
      onCancel: function () {
        console.log('Helio payment cancelled');
      },
      onStartPayment: function () {
        console.log('Helio payment started');
      }
    });

    helioContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  checkoutBtn.addEventListener('click', function () {
    if (isSubmitting) return;

    /* Sync config from DOM before any validation or data collection */
    syncConfigFromDOM();
    updateUI();

    if (!termsCheck.checked) {
      termsCheck.closest('.form-checkbox').querySelector('.checkbox-box').style.borderColor = '#e74c3c';
      return;
    }

    /* Validate card fields if card payment selected */
    if (payMethod === 'card') {
      var cardNum = cardNumberEl ? cardNumberEl.value.replace(/\s/g, '') : '';
      var cardExp = cardExpiryEl ? cardExpiryEl.value : '';
      var cardCvc = cardCvcEl ? cardCvcEl.value : '';
      var cardNm  = document.getElementById('cardName') ? document.getElementById('cardName').value.trim() : '';
      var cardValid = true;
      var firstCardError = null;

      if (cardNumberEl) {
        cardNumberEl.classList.remove('error');
        if (cardNum.length < 13) { cardNumberEl.classList.add('error'); cardValid = false; if (!firstCardError) firstCardError = cardNumberEl; }
      }
      if (cardExpiryEl) {
        cardExpiryEl.classList.remove('error');
        if (!/^\d{2}\/\d{2}$/.test(cardExp)) { cardExpiryEl.classList.add('error'); cardValid = false; if (!firstCardError) firstCardError = cardExpiryEl; }
      }
      if (cardCvcEl) {
        cardCvcEl.classList.remove('error');
        if (cardCvc.length < 3) { cardCvcEl.classList.add('error'); cardValid = false; if (!firstCardError) firstCardError = cardCvcEl; }
      }
      var cardNameEl = document.getElementById('cardName');
      if (cardNameEl) {
        cardNameEl.classList.remove('error');
        if (!cardNm) { cardNameEl.classList.add('error'); cardValid = false; if (!firstCardError) firstCardError = cardNameEl; }
      }

      if (!cardValid && firstCardError) {
        firstCardError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstCardError.focus();
        return;
      }
    }

    /* Double-submit protection */
    isSubmitting = true;
    checkoutBtn.disabled = true;
    if (checkoutBtnText) checkoutBtnText.textContent = t.processing || 'Processing...';

    var orderId = generateOrderId();
    var total = getTotal();
    var prefix = phonePrefix ? phonePrefix.textContent : '';

    var orderData = {
      order_id: orderId,
      plates: plates,
      sleeveColor: sleeveColor,
      punchTool: punchTool,
      value: total,
      currency: 'EUR',
      product_id: 'penger-v1',
      pay_method: payMethod,
      shipping: shippingCost,
      discount: discount,
      promo: appliedPromo,
      referral: (function () { try { return sessionStorage.getItem('penger_referral') || null; } catch (e) { return null; } })(),
      contact: {
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: prefix + document.getElementById('phone').value.trim()
      },
      address: {
        street: document.getElementById('street').value.trim(),
        apt: document.getElementById('apt').value.trim(),
        city: cityEl.value.trim(),
        zip: zipEl.value.trim(),
        country: countryEl.value
      },
      newsletter: document.getElementById('newsletter').checked,
      ts: Date.now()
    };

    try {
      sessionStorage.setItem('penger_order', JSON.stringify(orderData));
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (e) {}

    var dl = window.dataLayer = window.dataLayer || [];
    var refCode = (function () { try { return sessionStorage.getItem('penger_referral') || ''; } catch (e) { return ''; } })();
    dl.push({
      event: 'begin_checkout',
      order_id: orderId,
      ecommerce: {
        currency: 'EUR',
        value: total,
        coupon: appliedPromo || '',
        items: [{
          item_id: 'penger-v1',
          item_name: 'PENGER v1.0',
          item_brand: 'PENGER',
          item_category: 'titanium_backup',
          price: getSubtotal(),
          quantity: 1,
          item_variant: plates + ' plates',
          discount: discount
        }]
      },
      config_plates: plates,
      config_pay_method: payMethod,
      page_section: 'order'
    });

    dl.push({
      event: 'checkout_start',
      order_id: orderId,
      product_id: 'penger-v1',
      config_plates: plates,
      value: total,
      currency: 'EUR',
      coupon: appliedPromo || '',
      discount: discount,
      referral_code: refCode,
      page_section: 'order'
    });

    var langPrefix = t.langPrefix || '';
    window.location.href = langPrefix + '/payment-failed?order_id=' + encodeURIComponent(orderId);
  });

  /* ===== AUTO-APPLY REFERRAL CODE ===== */
  var REF_LOCAL_TTL = 7 * 24 * 60 * 60 * 1000; /* 7 days */

  function getRefCode() {
    /* Try sessionStorage first, then localStorage with TTL check */
    try {
      var ref = sessionStorage.getItem('penger_referral');
      if (ref) return ref;
    } catch (e) {}
    try {
      var raw = localStorage.getItem('penger_referral');
      if (raw) {
        var data = JSON.parse(raw);
        if (data && data.code && data.ts && (Date.now() - data.ts < REF_LOCAL_TTL)) {
          /* Restore into sessionStorage for this session */
          sessionStorage.setItem('penger_referral', data.code);
          return data.code;
        } else {
          localStorage.removeItem('penger_referral');
        }
      }
    } catch (e) {}
    return null;
  }

  function autoApplyReferral() {
    try {
      var ref = getRefCode();
      if (!ref) return;

      /* If a different promo was restored from session but URL carries a fresh
         ?ref= code, override the old promo with the new referral */
      if (appliedPromo && appliedPromo !== ref) {
        removePromo();
      }
      if (appliedPromo) return; /* same code already applied — skip */

      /* Auto-fill AND auto-apply any code passed via ?ref= link.
         Server validates; if code is invalid the error UI clears the field. */
      if (promoInput) promoInput.value = ref;
      applyPromo();
    } catch (e) {}
  }

  /* ===== INIT =====
     Order matters: restoreFormData restores plates/config BEFORE discount calc.
     autoApplyReferral skips if restoreFormData already restored a promo.
     detectCountry → updateShipping must run after country is known.
     updateUI recalculates totals with all state in place. */
  restoreFormData();
  autoApplyReferral();
  detectCountry();
  updateShipping();
  updateDeliveryEstimate();
  updateUI();
  updateMobileCta();

  /* Re-sync UI when page is restored from bfcache (back/forward navigation) */
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) {
      restoreFormData();
      autoApplyReferral();
      updateShipping();
      updateDeliveryEstimate();
      updateUI();
      updateMobileCta();
      saveFormData(); /* Persist restored state back to sessionStorage */
    }
  });
})();
