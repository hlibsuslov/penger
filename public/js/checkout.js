(function () {
  'use strict';

  var t = window.ORDER_I18N || {};

  /* ===== PRODUCT CONFIG FROM SESSION ===== */
  var CONFIG_KEY = 'penger_product_config';
  var CONFIG_TTL = 30 * 60 * 1000; /* 30 minutes */

  var configRaw = null;
  try { configRaw = sessionStorage.getItem(CONFIG_KEY); } catch (e) {}
  if (!configRaw) {
    window.location.href = (t.langPrefix || '') + '/order';
    return;
  }
  var productConfig;
  try { productConfig = JSON.parse(configRaw); } catch (e) {
    window.location.href = (t.langPrefix || '') + '/order';
    return;
  }
  if (!productConfig || productConfig._v !== 1 || (productConfig._ts && Date.now() - productConfig._ts > CONFIG_TTL)) {
    try { sessionStorage.removeItem(CONFIG_KEY); } catch (e) {}
    window.location.href = (t.langPrefix || '') + '/order';
    return;
  }

  /* ===== PRICING ===== */
  var BASE_PRICE = 59;
  var EXTRA_PLATE = 35;

  /* Shipping cost by region */
  var SHIPPING_FREE = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','UA'];
  var SHIPPING_COST = { GB: 5, CH: 5, NO: 5, US: 9, CA: 9, AU: 12, JP: 12 };

  /* Delivery estimates */
  var DELIVERY_ESTIMATES = {
    EU: t.deliveryEU || 'Estimated delivery: <strong>3–5 business days</strong>',
    US: t.deliveryUS || 'Estimated delivery: <strong>7–10 business days</strong>',
    OTHER: t.deliveryOther || 'Estimated delivery: <strong>10–15 business days</strong>'
  };

  /* ===== ADDON PRICES ===== */
  var SLEEVE_PRICE = 10;
  var PUNCH_PRICE = 10;

  /* ===== STATE ===== */
  var plates = productConfig.plates || 1;
  var sleeveColors = productConfig.sleeveColors || ['black'];
  /* Pad to 4 for internal use */
  while (sleeveColors.length < 4) sleeveColors.push('black');
  var punchTool = typeof productConfig.punchTool !== 'undefined' ? !!productConfig.punchTool : true;
  var payMethod = 'crypto';
  var currentStep = 'contact'; // contact | delivery | payment
  var shippingCost = 0;
  var discount = 0;
  var appliedPromo = null;
  var promoIsReferral = false;
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

  /* ===== DOM REFS ===== */
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
  var solanaCheckout = document.getElementById('solanaCheckout');

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

  /* Cached promo metadata */
  var promoType  = null;
  var promoValue = null;

  /* ===== HELPERS ===== */
  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  /* Show inline error toast at the bottom of the payment step */
  function showOrderError(msg) {
    var existing = document.getElementById('orderErrorToast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.id = 'orderErrorToast';
    toast.className = 'order-error-toast';
    toast.textContent = msg;
    var payBody = stepPayment.querySelector('.step-body');
    if (payBody) payBody.appendChild(toast);
    toast.offsetHeight; /* force reflow */
    toast.classList.add('visible');
    setTimeout(function () {
      toast.classList.remove('visible');
      setTimeout(function () { toast.remove(); }, 300);
    }, 6000);
  }

  function getSubtotal() {
    var sub = BASE_PRICE + ((plates - 1) * EXTRA_PLATE);
    sub += SLEEVE_PRICE;
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
    }
  }

  function showFreeShipping(isFree) {
    if (rowShippingFree) rowShippingFree.style.display = isFree ? '' : 'none';
    if (rowShippingCost) rowShippingCost.style.display = isFree ? 'none' : '';
  }

  /* ===== UPDATE DELIVERY ESTIMATE ===== */
  function updateDeliveryEstimate() {
    var country = countryEl.value;
    if (!country || !deliveryEstimate) {
      if (deliveryEstimate) deliveryEstimate.style.display = 'none';
      return;
    }

    deliveryEstimate.style.display = 'flex';
    if (country === 'UA') {
      deliveryText.innerHTML = t.uaDeliveryEstimate || 'Nova Poshta delivery: <strong>1–3 business days</strong>';
    } else if (SHIPPING_FREE.indexOf(country) > -1) {
      deliveryText.innerHTML = DELIVERY_ESTIMATES.EU;
    } else if (country === 'US' || country === 'CA') {
      deliveryText.innerHTML = DELIVERY_ESTIMATES.US;
    } else {
      deliveryText.innerHTML = DELIVERY_ESTIMATES.OTHER;
    }
  }

  /* ===== UPDATE UI (cart summary) ===== */
  function renderCartConfig() {
    if (!cartConfigLines) return;
    var d = cartConfigLines.dataset;
    var html = '';

    for (var i = 0; i < plates; i++) {
      html += '<div class="cart-config-line">'
            + '<span class="cart-config-qty">&times;1</span>'
            + '<span class="cart-config-label">' + d.plateLabel + '</span>'
            + '</div>';
    }

    html += '<div class="cart-config-divider"></div>';

    for (var s = 0; s < plates; s++) {
      html += '<div class="cart-config-line">'
            + '<span class="cart-config-label">' + d.sleeveLabel + ' #' + (s + 1) + '</span>'
            + '<span class="cart-config-value">' + (sleeveColors[s] || 'black') + '</span>'
            + '</div>';
    }

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
    renderCartConfig();

    if (plates > 1) {
      rowExtraPlates.style.display = '';
      var extra = plates - 1;
      var label = '+' + extra + ' ' + txtExtraPlates;
      var price = '+\u20AC' + (extra * EXTRA_PLATE);
      extraPlatesLabel.textContent = label;
      extraPlatesPrice.textContent = price;
    } else {
      rowExtraPlates.style.display = 'none';
    }

    /* Sleeve row */
    var rowSleeve = document.getElementById('rowSleeve');
    var sleeveLabel = document.getElementById('sleeveLabel');
    if (rowSleeve) {
      sleeveLabel.textContent = 'Sleeve (' + sleeveColors.slice(0, plates).join(', ') + ')';
      rowSleeve.style.display = '';
    }

    /* Punch tool row */
    var rowPunch = document.getElementById('rowPunch');
    if (rowPunch) rowPunch.style.display = punchTool ? '' : 'none';

    /* Recalculate discount if promo / referral is applied */
    if (appliedPromo && promoType && promoValue) {
      var sub = getSubtotal();
      discount = promoType === 'percent' ? Math.round(sub * promoValue / 100) : promoValue;
      discount = Math.min(discount, sub);
      if (promoMsg && promoMsg.classList.contains('success')) {
        var isRef = promoIsReferral;
        promoMsg.textContent = (isRef
          ? (t.referralApplied || 'Referral discount applied!')
          : (t.promoApplied || 'Promo code applied!')) + formatDiscountSuffix(promoType, promoValue, discount);
      }
    }

    /* Discount row */
    var discountText = (promoType === 'percent' && promoValue)
      ? '-' + promoValue + '% (-\u20AC' + discount + ')'
      : '-\u20AC' + discount;
    if (discount > 0) {
      if (rowDiscount) { rowDiscount.style.display = ''; discountVal.textContent = discountText; }
    } else {
      if (rowDiscount) rowDiscount.style.display = 'none';
    }

    var totalStr = '\u20AC' + getTotal();
    summaryTotal.textContent = totalStr;
    if (mobilePrice) mobilePrice.textContent = totalStr;
  }

  /* ===== MOBILE CTA ===== */
  function updateMobileCta() {
    if (!mobileContinueBtn) return;
    if (currentStep === 'contact') {
      mobileContinueBtn.textContent = t.continueToDelivery || 'Continue to Delivery';
      if (mobileCta) mobileCta.style.display = '';
    } else if (currentStep === 'delivery') {
      mobileContinueBtn.textContent = t.continueToPayment || 'Continue to Payment';
      if (mobileCta) mobileCta.style.display = '';
    } else {
      mobileContinueBtn.textContent = countryEl.value === 'UA' ? (t.uaOrderBtn || 'Place order') : (t.payNow || 'Pay Now');
      if (mobileCta) mobileCta.style.display = '';
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

  /* ===== COUNTRY AUTO-DETECT ===== */
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
            if (!countryEl.querySelector('option[value="' + code + '"]')) {
              var name = data.country_name || code;
              var opt = document.createElement('option');
              opt.value = code;
              opt.textContent = code + ' \u2014 ' + name;
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
    toggleUaFlow(this.value === 'UA');
    updateUI();

    /* If delivery step was already completed, reset it since country changed */
    if (stepDelivery.classList.contains('completed')) {
      disableStep(stepDelivery);
      disableStep(stepPayment);
      deliverySummary.innerHTML = '';
      currentStep = 'contact'; /* stay on contact since they're editing */
      updateProgress('contact');
      updateMobileCta();
    }

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
      var span = document.createElement('span');
      span.setAttribute('data-email', corrected);
      span.textContent = corrected;
      emailSuggestion.textContent = '';
      emailSuggestion.appendChild(document.createTextNode((t.emailDidYouMean || 'Did you mean') + ' '));
      emailSuggestion.appendChild(span);
      emailSuggestion.appendChild(document.createTextNode('?'));
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
      if (countryEl.value === 'UA') {
        if (digits.length === 10 && digits[0] === '0') {
          input.classList.add('valid');
        } else if (digits.length > 0) {
          input.classList.add('error');
          if (digits.length > 0 && digits[0] !== '0') {
            showFieldError(input, t.uaPhoneZeroError || 'Number must start with 0');
          } else {
            showFieldError(input, t.uaPhoneError || 'Invalid phone number');
          }
        }
      } else if (digits.length >= 6) {
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

  /* Attach live validation to contact form inputs */
  contactForm.querySelectorAll('.form-input').forEach(function (input) {
    input.addEventListener('blur', function () { validateField(this); saveFormData(); });
    input.addEventListener('input', function () {
      if (this.id === 'phone') {
        var val = this.value;
        var prefix = phonePrefix ? phonePrefix.textContent : '';
        if (prefix && prefix.length > 1 && val.indexOf(prefix) === 0) {
          this.value = val.substring(prefix.length).replace(/^\s+/, '');
        } else if (val.charAt(0) === '+') {
          var digits = val.replace(/[^\d+]/g, '');
          var countryCode = countryEl.value;
          var expectedPrefix = phoneCodes[countryCode] || '';
          if (expectedPrefix && digits.indexOf(expectedPrefix) === 0) {
            this.value = digits.substring(expectedPrefix.length).replace(/^\s+/, '');
          } else if (digits.length > 3 && digits.charAt(0) === '+') {
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
      html += '<div class="zip-suggestion" data-zip="' + escapeHtml(r.postalCode) + '" data-city="' + escapeHtml(r.placeName) + '">' +
        escapeHtml(r.placeName) + '<span class="zip-code">' + escapeHtml(r.postalCode) + '</span></div>';
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
    if (!e.target || !e.target.closest) return;
    if (!e.target.closest('#zip') && !e.target.closest('#zipSuggestions') && !e.target.closest('#city')) {
      closeZipSuggestions();
    }
  });

  /* ===== PROGRESS BAR ===== */
  var progressSteps = document.querySelectorAll('.checkout-progress-step');
  var stepOrder = ['contact', 'delivery', 'payment'];

  function updateProgress(activeStepName) {
    var idx = stepOrder.indexOf(activeStepName);
    progressSteps.forEach(function (el, i) {
      el.classList.remove('done', 'active');
      if (i < idx) el.classList.add('done');
      else if (i === idx) el.classList.add('active');
    });
  }

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
      '<div class="step-summary-line"><span class="step-summary-label">' + (t.firstName || 'Name') + '</span> ' + escapeHtml(firstName) + ' ' + escapeHtml(lastName) + '</div>' +
      '<div class="step-summary-line"><span class="step-summary-label">' + (t.email || 'Email') + '</span> ' + escapeHtml(email) + '</div>' +
      '<div class="step-summary-line"><span class="step-summary-label">' + (t.phone || 'Phone') + '</span> ' + escapeHtml((phoneCodes[countryCode] || '') + ' ' + phone) + '</div>' +
      '<div class="step-summary-line"><span class="step-summary-label">' + (t.country || 'Country') + '</span> ' + escapeHtml(countryText) + '</div>';

    completeStep(stepContact);
    activateStep(stepDelivery);
    currentStep = 'delivery';
    updateProgress('delivery');
    updateMobileCta();
    stepDelivery.scrollIntoView({ behavior: 'smooth', block: 'center' });
    saveFormData();
  });

  /* ===== DELIVERY FORM: CONTINUE ===== */
  if (deliveryForm) {
    deliveryForm.addEventListener('submit', function (e) {
      e.preventDefault();

      var isUA = countryEl.value === 'UA';
      var valid = true;
      var firstError = null;

      if (isUA) {
        var npCityInput = document.getElementById('npCity');
        var npWarehouseSelect = document.getElementById('npWarehouse');
        [npCityInput, npWarehouseSelect].forEach(function (input) {
          input.classList.remove('error');
          clearFieldError(input);
          if (!input.value || !input.value.trim()) {
            input.classList.add('error');
            showFieldError(input, ERROR_MSGS.required);
            valid = false;
            if (!firstError) firstError = input;
          }
        });
      } else {
        var inputs = deliveryForm.querySelectorAll('.standard-delivery [required]');
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
      }

      if (!valid && firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstError.focus();
        return;
      }

      var summaryText;
      if (isUA) {
        var npCity = document.getElementById('npCity').value.trim();
        var npWh = document.getElementById('npWarehouse');
        var npWhText = npWh.options[npWh.selectedIndex] ? npWh.options[npWh.selectedIndex].text : '';
        summaryText = '<div class="step-summary-line"><span class="step-summary-label">Нова Пошта</span> ' + escapeHtml(npCity) + ', ' + escapeHtml(npWhText) + '</div>';
      } else {
        var street    = document.getElementById('street').value.trim();
        var apt       = document.getElementById('apt').value.trim();
        var city      = cityEl.value.trim();
        var zip       = zipEl.value.trim();
        var countryText = countryEl.options[countryEl.selectedIndex].text.replace(/^[\u{1F1E6}-\u{1F1FF}]{2}\s*/u, '');
        var addressParts = [street];
        if (apt) addressParts.push(apt);
        addressParts.push(city + ' ' + zip);
        addressParts.push(countryText);
        summaryText = '<div class="step-summary-line"><span class="step-summary-label">' + (t.address || 'Address') + '</span> ' + escapeHtml(addressParts.join(', ')) + '</div>';
      }

      deliverySummary.innerHTML = summaryText;

      completeStep(stepDelivery);
      activateStep(stepPayment);
      currentStep = 'payment';
      updateProgress('payment');

      updateMobileCta();
      stepPayment.scrollIntoView({ behavior: 'smooth', block: 'center' });
      saveFormData();
    });
  }

  /* ===== EDIT CONTACT ===== */
  editContact.addEventListener('click', function () {
    activateStep(stepContact);
    disableStep(stepDelivery);
    disableStep(stepPayment);
    currentStep = 'contact';
    updateProgress('contact');
    updateMobileCta();
  });

  /* ===== EDIT DELIVERY ===== */
  if (editDelivery) {
    editDelivery.addEventListener('click', function () {
      activateStep(stepDelivery);
      disableStep(stepPayment);
      currentStep = 'delivery';
      updateProgress('delivery');
      updateMobileCta();
      stepDelivery.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
    solanaCheckout.classList.add('hidden');
    stopSolanaPolling();
    checkoutBtn.style.display = '';
    checkoutBtn.disabled = !termsCheck.checked;
    var checkboxesArea = document.getElementById('checkboxesArea');
    if (checkboxesArea) checkboxesArea.style.display = '';
    var trustBadges = stepPayment.querySelector('.trust-badges');
    if (trustBadges) trustBadges.style.display = '';
    updatePayMethodAria();
  });

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
        promoIsReferral = !!data.isReferral;
        var isReferral = promoIsReferral;
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
      discount = 0;
      appliedPromo = null;
      promoType = null;
      promoValue = null;
      if (promoInput) promoInput.disabled = false;
      if (promoApply) { promoApply.disabled = false; promoApply.textContent = t.promoApply || 'Apply'; }
      if (promoMsg) {
        promoMsg.className = 'promo-msg error';
        promoMsg.textContent = t.promoNetworkError || 'Could not verify promo code. Please try again.';
      }
      updateUI();
    });
  }

  /* ===== REMOVE PROMO CODE ===== */
  function removePromo() {
    appliedPromo = null;
    promoType = null;
    promoValue = null;
    promoIsReferral = false;
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
  var STORAGE_VERSION = 4;
  var STORAGE_TTL = 30 * 60 * 1000;

  function saveFormData() {
    try {
      var data = {
        _v: STORAGE_VERSION,
        _ts: Date.now(),
        plates: plates,
        sleeveColors: sleeveColors.slice(0, plates),
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
        npCity: document.getElementById('npCity') ? document.getElementById('npCity').value : '',
        npWarehouse: (function () { var w = document.getElementById('npWarehouse'); return w && w.options[w.selectedIndex] ? w.options[w.selectedIndex].text : ''; })(),
        promo: appliedPromo,
        promoType: promoType,
        promoValue: promoValue,
        promoIsReferral: promoIsReferral
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {}
  }

  function restoreFormData() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);

      if (data._v !== STORAGE_VERSION || (data._ts && Date.now() - data._ts > STORAGE_TTL)) {
        sessionStorage.removeItem(STORAGE_KEY);
        return;
      }

      /* Product config comes from penger_product_config, not from checkout form data */

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

      /* Restore Nova Poshta fields */
      var _npCityEl = document.getElementById('npCity');
      if (data.npCity && _npCityEl) _npCityEl.value = data.npCity;

      /* Restore promo / referral code */
      if (data.promo && data.promoType && data.promoValue) {
        appliedPromo = data.promo;
        promoType = data.promoType;
        promoValue = data.promoValue;
        var sub = getSubtotal();
        discount = promoType === 'percent' ? Math.round(sub * promoValue / 100) : promoValue;
        discount = Math.min(discount, sub);
        if (promoInput) { promoInput.value = data.promo; promoInput.disabled = true; }
        if (promoApply) promoApply.style.display = 'none';
        if (promoRemove) promoRemove.style.display = '';
        if (promoForm) promoForm.classList.add('open');
        if (promoMsg) {
          promoIsReferral = !!data.promoIsReferral;
          var isRef = promoIsReferral;
          promoMsg.className = 'promo-msg success';
          promoMsg.textContent = (isRef
            ? (t.referralApplied || 'Referral discount applied!')
            : (t.promoApplied || 'Promo code applied!')) + formatDiscountSuffix(promoType, promoValue, discount);
        }
        /* Background re-validate */
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
        }).catch(function () {});
      }

      /* Trigger validation on restored fields */
      contactForm.querySelectorAll('.form-input').forEach(function (input) {
        if (input.value) validateField(input);
      });
    } catch (e) {}
  }

  /* ===== ORDER ID ===== */
  var ORDER_ID_KEY = 'penger_checkout_order_id';
  var _cachedOrderId = null;
  /* Restore from sessionStorage if available */
  try { _cachedOrderId = sessionStorage.getItem(ORDER_ID_KEY) || null; } catch (e) {}

  function generateOrderId() {
    if (!_cachedOrderId) {
      var ts = Date.now().toString(36).toUpperCase();
      var rand = Math.random().toString(36).substring(2, 6).toUpperCase();
      _cachedOrderId = 'PG-' + ts + '-' + rand;
      try { sessionStorage.setItem(ORDER_ID_KEY, _cachedOrderId); } catch (e) {}
    }
    return _cachedOrderId;
  }

  /* ===== SOLANA CRYPTO CHECKOUT ===== */
  var solanaInvoiceId = null;
  var solanaPoller = null;
  var solanaTimerInterval = null;
  var selectedAsset = 'SOL';

  function collectOrderData() {
    var prefix = phonePrefix ? phonePrefix.textContent : '';
    var isUA = countryEl && countryEl.value === 'UA';
    var npCityEl = document.getElementById('npCity');
    var npWhEl = document.getElementById('npWarehouse');

    var data = {
      order_id: generateOrderId(),
      plates: plates,
      sleeveColors: sleeveColors.slice(0, plates),
      punchTool: punchTool,
      country: countryEl ? countryEl.value : '',
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
      }
    };

    /* UA: include Nova Poshta data */
    if (isUA && npCityEl) {
      data.np_city = npCityEl.value.trim();
      data.np_warehouse = npWhEl && npWhEl.options[npWhEl.selectedIndex] ? npWhEl.options[npWhEl.selectedIndex].text : '';
      data.address.city = data.np_city;
      data.address.street = data.np_warehouse;
    }

    return data;
  }

  function stopSolanaPolling() {
    if (solanaPoller) { clearTimeout(solanaPoller); solanaPoller = null; }
    if (solanaTimerInterval) { clearInterval(solanaTimerInterval); solanaTimerInterval = null; }
    pollFailures = 0;
  }

  var walletIconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M16 14h2"/></svg> ';

  function setSolanaStatus(cls, text) {
    var btn = document.getElementById('solanaWalletBtn');
    if (!btn) return;
    btn.className = 'solana-wallet-btn';
    if (cls === 'waiting') {
      btn.innerHTML = walletIconSvg + (t.cryptoOpenWallet || 'Pay with Wallet');
      btn.disabled = false;
      return;
    }
    btn.classList.add('status-' + cls);
    btn.textContent = text;
    btn.disabled = (cls !== 'error' && cls !== 'expired');
  }

  function startCountdown(expiresAt) {
    var timerEl = document.getElementById('solanaTimer');
    if (!timerEl) return;
    if (solanaTimerInterval) clearInterval(solanaTimerInterval);

    function update() {
      var remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      var min = Math.floor(remaining / 60);
      var sec = remaining % 60;
      timerEl.innerHTML = (t.cryptoQuoteExpires || 'Quote expires in') +
        ' <span class="timer-value">' + min + ':' + (sec < 10 ? '0' : '') + sec + '</span>';
      if (remaining <= 0) {
        clearInterval(solanaTimerInterval);
        clearPersistedInvoice();
        setSolanaStatus('expired', t.cryptoExpired || 'Quote expired');
        stopSolanaPolling();
        showRetryButton();
      }
    }
    update();
    solanaTimerInterval = setInterval(update, 1000);
  }

  function showRetryButton() {
    var container = document.getElementById('solanaCheckout');
    var existing = container.querySelector('.solana-retry-btn');
    if (existing) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'solana-retry-btn';
    btn.textContent = t.cryptoRetry || 'Get new quote';
    btn.addEventListener('click', function () {
      btn.remove();
      startSolanaCheckout(selectedAsset);
    });
    container.appendChild(btn);
  }

  var pollFailures = 0;
  var pollBaseInterval = 2500;
  var pollExpiresAt = 0;

  function startSolanaPolling(invoiceId, expiresAt) {
    if (solanaPoller) clearInterval(solanaPoller);
    pollFailures = 0;
    if (expiresAt) pollExpiresAt = expiresAt;

    function doPoll() {
      /* Accelerate polling when <2 min remaining */
      var remaining = pollExpiresAt ? pollExpiresAt - Date.now() : Infinity;
      var interval = remaining < 120000 ? 1500 : pollBaseInterval;

      /* Exponential backoff on consecutive failures */
      if (pollFailures >= 3) {
        interval = Math.min(pollBaseInterval * Math.pow(2, pollFailures - 2), 15000);
      }

      solanaPoller = setTimeout(function () {
        fetch('/api/invoice/' + invoiceId)
          .then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
          })
          .then(function (data) {
            pollFailures = 0; /* reset on success */

            if (data.status === 'paid') {
              stopSolanaPolling();
              clearPersistedInvoice();
              setSolanaStatus('paid', t.cryptoPaid || 'Payment confirmed!');
              document.getElementById('solanaWalletBtn').disabled = true;

              var orderData = collectOrderData();
              orderData.order_id = data.orderId;
              orderData.pay_method = 'crypto_solana';
              orderData.solana_tx = data.txSignature || '';
              orderData.value = data.amountEur / 100;
              orderData.currency = 'EUR';
              orderData.product_id = 'penger-v1';
              orderData.ts = Date.now();
              try { sessionStorage.setItem('penger_order', JSON.stringify(orderData)); } catch (e) {}

              var dl = window.dataLayer = window.dataLayer || [];
              dl.push({
                event: 'purchase',
                order_id: data.orderId,
                value: data.amountEur / 100,
                currency: 'EUR',
                payment_method: 'crypto_solana_' + data.asset,
                transaction_id: data.txSignature || ''
              });

              var langPrefix = t.langPrefix || '';
              setTimeout(function () {
                window.location.href = langPrefix + '/payment-success?order_id=' + encodeURIComponent(data.orderId);
              }, 1500);
            } else if (data.status === 'confirming') {
              setSolanaStatus('confirming', t.cryptoConfirming || 'Payment detected, confirming...');
              doPoll();
            } else if (data.status === 'expired') {
              stopSolanaPolling();
              clearPersistedInvoice();
              setSolanaStatus('expired', t.cryptoExpired || 'Quote expired');
              showRetryButton();
            } else if (data.status === 'failed') {
              stopSolanaPolling();
              clearPersistedInvoice();
              setSolanaStatus('error', t.cryptoFailed || 'Payment failed. Please try again.');
              showRetryButton();
            } else {
              doPoll();
            }
          })
          .catch(function () {
            pollFailures++;
            if (pollFailures >= 10) {
              setSolanaStatus('error', t.cryptoConnectionLost || 'Connection lost. Please check your network.');
              showRetryButton();
              return;
            }
            if (pollFailures >= 3) {
              showOrderError(t.cryptoRetrying || 'Connection issue, retrying...');
            }
            doPoll();
          });
      }, interval);
    }

    doPoll();
  }

  /* Persist active invoice — localStorage for cross-browser-context survival (mobile deep links) */
  var INVOICE_KEY = 'penger_active_invoice';

  function persistInvoice(data) {
    try {
      localStorage.setItem(INVOICE_KEY, JSON.stringify({
        id: data.id, asset: data.asset, expiresAt: data.expiresAt,
        amountCrypto: data.amountCrypto, rate: data.rate,
        amountEur: data.amountEur, recipient: data.recipient,
        orderId: data.orderId, qrDataUrl: data.qrDataUrl,
        solanaPayUrl: data.solanaPayUrl
      }));
    } catch (e) {}
  }

  function clearPersistedInvoice() {
    try { localStorage.removeItem(INVOICE_KEY); } catch (e) {}
    try { sessionStorage.removeItem(INVOICE_KEY); } catch (e) {} /* clean up legacy */
  }

  function getPersistedInvoice() {
    try {
      var raw = localStorage.getItem(INVOICE_KEY) || sessionStorage.getItem(INVOICE_KEY);
      if (!raw) return null;
      var saved = JSON.parse(raw);
      if (!saved || !saved.id || !saved.expiresAt) return null;
      if (Date.now() >= saved.expiresAt) { clearPersistedInvoice(); return null; }
      return saved;
    } catch (e) { clearPersistedInvoice(); return null; }
  }

  var invoiceAbort = null; /* AbortController for in-flight invoice creation */

  function startSolanaCheckout(asset) {
    selectedAsset = asset;
    stopSolanaPolling();
    clearPersistedInvoice();
    solanaInvoiceId = null;
    connectedWallet = null;

    /* Abort any in-flight invoice creation from a previous asset switch */
    if (invoiceAbort) { try { invoiceAbort.abort(); } catch (e) {} }
    invoiceAbort = new AbortController();

    /* Disable asset buttons during creation to prevent double-click */
    var assetBtns = assetSelect ? assetSelect.querySelectorAll('.solana-asset-btn') : [];
    assetBtns.forEach(function (b) { b.disabled = true; });

    var qrEl = document.getElementById('solanaQr');
    var amountEl = document.getElementById('solanaAmountDisplay');
    var rateEl = document.getElementById('solanaRate');
    var walletBtn = document.getElementById('solanaWalletBtn');
    var badgeEl = document.getElementById('solanaConnected');
    if (badgeEl) badgeEl.style.display = 'none';

    qrEl.innerHTML = '<div class="solana-spinner"></div>';
    amountEl.textContent = '';
    rateEl.textContent = '';
    setSolanaStatus('waiting', t.cryptoLoading || 'Loading...');
    walletBtn.disabled = true;

    var orderData = collectOrderData();
    var fetchTimeout = setTimeout(function () { if (invoiceAbort) invoiceAbort.abort(); }, 15000);

    fetch('/api/invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderData: orderData, asset: asset }),
      signal: invoiceAbort.signal
    })
    .then(function (r) {
      clearTimeout(fetchTimeout);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (data) {
      if (data.error) {
        setSolanaStatus('error', data.error);
        qrEl.innerHTML = '';
        return;
      }

      solanaInvoiceId = data.id;
      persistInvoice(data);
      amountEl.textContent = data.amountCrypto + ' ' + data.asset;
      rateEl.textContent = '1 ' + data.asset + ' = \u20AC' + parseFloat(data.rate).toFixed(2) +
        ' \u00B7 ' + (t.cryptoTotal || 'Total') + ': \u20AC' + (data.amountEur / 100).toFixed(2);

      if (data.qrDataUrl) {
        if (data.solanaPayUrl) {
          qrEl.innerHTML = '<a href="' + data.solanaPayUrl + '" target="_blank" rel="noopener" style="cursor:pointer;display:inline-block">' +
            '<img src="' + data.qrDataUrl + '" alt="Solana Pay QR" width="280" height="280"></a>';
        } else {
          qrEl.innerHTML = '<img src="' + data.qrDataUrl + '" alt="Solana Pay QR" width="280" height="280" style="cursor:pointer">';
        }
        qrEl.querySelector('a, img').addEventListener('click', function (e) {
          if (data.solanaPayUrl) return;
          e.preventDefault();
          walletBtn.click();
        });
      } else {
        qrEl.innerHTML = '';
      }

      var solAmountEl = document.getElementById('solAmount');
      var usdcAmountEl = document.getElementById('usdcAmount');
      if (asset === 'SOL' && solAmountEl) solAmountEl.textContent = data.amountCrypto + ' SOL';
      if (asset === 'USDC' && usdcAmountEl) usdcAmountEl.textContent = data.amountCrypto + ' USDC';

      /* Show recipient address + exact amount for manual payment */
      var payDetailsEl = document.getElementById('solanaPayDetails');
      var recipientEl = document.getElementById('solanaRecipientAddr');
      var exactAmountEl = document.getElementById('solanaExactAmount');
      if (payDetailsEl && recipientEl && exactAmountEl) {
        recipientEl.textContent = data.recipient;
        exactAmountEl.textContent = data.amountCrypto + ' ' + data.asset;
        payDetailsEl.style.display = '';
      }

      setSolanaStatus('waiting', t.cryptoWaiting || 'Waiting for payment...');
      walletBtn.disabled = false;
      walletBtn.setAttribute('data-pay-url', '/api/pay/' + data.id);
      walletBtn.setAttribute('data-invoice-id', data.id);
      if (data.solanaPayUrl) {
        walletBtn.setAttribute('data-solana-pay-url', data.solanaPayUrl);
      }

      startCountdown(data.expiresAt);
      startSolanaPolling(data.id, data.expiresAt);

      /* Re-enable asset buttons */
      assetBtns.forEach(function (b) { b.disabled = false; });

      /* Auto-connect wallet and submit transaction (desktop, returning users) */
      autoPayWithWallet(data);
    })
    .catch(function (err) {
      clearTimeout(fetchTimeout);
      assetBtns.forEach(function (b) { b.disabled = false; });
      if (err.name === 'AbortError') {
        /* Request was aborted by asset switch or timeout */
        if (!invoiceAbort || invoiceAbort.signal.aborted) {
          setSolanaStatus('error', t.cryptoTimeout || 'Request timed out. Please try again.');
        }
      } else {
        setSolanaStatus('error', t.cryptoError || 'Failed to create invoice. Please try again.');
      }
      qrEl.innerHTML = '';
    });
  }

  /* Asset selector */
  var assetSelect = document.getElementById('assetSelect');
  if (assetSelect) {
    assetSelect.addEventListener('click', function (e) {
      var btn = e.target.closest('.solana-asset-btn');
      if (!btn) return;
      var asset = btn.getAttribute('data-asset');
      if (!asset) return;
      assetSelect.querySelectorAll('.solana-asset-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      startSolanaCheckout(asset);
    });
  }

  /* Copy-to-clipboard for payment details */
  var solanaCheckoutEl = document.getElementById('solanaCheckout');
  if (solanaCheckoutEl) {
    solanaCheckoutEl.addEventListener('click', function (e) {
      var copyBtn = e.target.closest('.solana-copy-btn');
      if (!copyBtn) return;
      var targetId = copyBtn.getAttribute('data-copy');
      var targetEl = document.getElementById(targetId);
      if (!targetEl) return;
      var text = targetEl.textContent.trim();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          copyBtn.classList.add('copied');
          setTimeout(function () { copyBtn.classList.remove('copied'); }, 2000);
        });
      } else {
        /* Fallback for non-HTTPS */
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        copyBtn.classList.add('copied');
        setTimeout(function () { copyBtn.classList.remove('copied'); }, 2000);
      }
    });
  }

  function resetWalletBtn() {
    var walletBtn = document.getElementById('solanaWalletBtn');
    if (!walletBtn) return;
    walletBtn.className = 'solana-wallet-btn';
    if (connectedWallet) {
      walletBtn.innerHTML = walletIconSvg + (t.cryptoRetryWallet || 'Retry with ') + connectedWallet.name;
    } else {
      var detected = getWalletProvider();
      walletBtn.innerHTML = walletIconSvg + (detected
        ? (t.cryptoPayWith || 'Pay with ') + detected.name
        : (t.cryptoOpenWallet || 'Pay with Wallet'));
    }
    walletBtn.disabled = false;
  }

  var isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  /* ===== WALLET DETECTION ===== */
  function getWalletProvider() {
    if (window.phantom?.solana?.isPhantom) return { provider: window.phantom.solana, name: 'Phantom' };
    if (window.solflare?.isSolflare) return { provider: window.solflare, name: 'Solflare' };
    if (window.backpack?.solana) return { provider: window.backpack.solana, name: 'Backpack' };
    if (window.solana?.isPhantom) return { provider: window.solana, name: 'Phantom' };
    if (window.solana) return { provider: window.solana, name: 'Wallet' };
    return null;
  }

  var connectedWallet = null; /* { provider, name, pubkey } */

  function showConnectedBadge(name, address) {
    var badge = document.getElementById('solanaConnected');
    var addrEl = document.getElementById('solanaConnectedAddr');
    if (badge && addrEl) {
      addrEl.textContent = name + ' \u00B7 ' + address.slice(0, 4) + '...' + address.slice(-4);
      badge.style.display = '';
    }
  }

  /* ===== AUTO-WALLET PAYMENT (desktop, returning users) ===== */
  async function autoPayWithWallet(invoiceData) {
    if (isMobile) return;
    var walletInfo = getWalletProvider();
    if (!walletInfo) return;

    var walletBtn = document.getElementById('solanaWalletBtn');
    if (!walletBtn) return;

    try {
      /* Silent connect — only works if user previously approved this dapp.
         First-time users won't see any popup; they use the manual button. */
      var resp;
      try {
        resp = await walletInfo.provider.connect({ onlyIfTrusted: true });
      } catch (e) {
        /* Silent connect failed — first-time user. Don't show popup automatically.
           Just update button text with detected wallet name. */
        walletBtn.innerHTML = walletIconSvg + (t.cryptoPayWith || 'Pay with ') + walletInfo.name;
        walletBtn.disabled = false;
        return;
      }

      var pubkey = resp.publicKey.toString();
      connectedWallet = { provider: walletInfo.provider, name: walletInfo.name, pubkey: pubkey };
      showConnectedBadge(walletInfo.name, pubkey);

      /* Auto-submit transaction */
      walletBtn.textContent = t.cryptoSigning || 'Confirm in wallet...';
      walletBtn.disabled = true;

      /* Check invoice hasn't expired */
      if (invoiceData.expiresAt && Date.now() >= invoiceData.expiresAt) return;

      var txResp = await fetch('/api/pay/' + invoiceData.id, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: pubkey })
      });
      var txData = await txResp.json();

      if (txData.error) {
        setSolanaStatus('error', txData.error);
        return;
      }

      walletBtn.textContent = t.cryptoSigning || 'Confirm in wallet...';
      var txBytes = Uint8Array.from(atob(txData.transaction), function (c) { return c.charCodeAt(0); });

      var result;
      if (walletInfo.provider.signAndSendTransaction) {
        result = await walletInfo.provider.signAndSendTransaction({
          serialize: function () { return txBytes; },
        });
      } else if (walletInfo.provider.request) {
        result = await walletInfo.provider.request({
          method: 'signAndSendTransaction',
          params: { message: txData.transaction },
        });
      }

      if (result && result.signature) {
        setSolanaStatus('confirming', t.cryptoConfirming || 'Payment detected, confirming...');
      } else {
        resetWalletBtn();
      }
    } catch (err) {
      console.error('[wallet] Auto-pay error:', err);
      var parsed = parseWalletError(err);
      if (parsed === 'rejected') {
        resetWalletBtn();
      } else if (connectedWallet && parsed) {
        /* Show specific error if wallet was connected */
        setSolanaStatus('error', parsed);
      } else {
        /* Silent connect failed or other — show wallet button for manual attempt */
        var detected = getWalletProvider();
        if (detected && walletBtn) {
          walletBtn.innerHTML = walletIconSvg + (t.cryptoPayWith || 'Pay with ') + detected.name;
          walletBtn.disabled = false;
        }
      }
    }
  }

  /* Mobile wallet install links (fallback if no wallet installed) */
  var mobileWalletPicker = document.getElementById('mobileWalletPicker');

  /* On mobile, show install links permanently once checkout is visible */
  function showMobileInstallLinks() {
    if (isMobile && mobileWalletPicker) mobileWalletPicker.classList.remove('hidden');
  }

  /* Parse wallet errors into user-friendly messages */
  function parseWalletError(err) {
    if (!err) return null;
    var msg = (err.message || err.toString() || '').toLowerCase();
    if (err.code === 4001 || msg.indexOf('rejected') !== -1 || msg.indexOf('cancelled') !== -1) return 'rejected';
    if (msg.indexOf('insufficient') !== -1 || msg.indexOf('not enough') !== -1) return t.cryptoInsufficientFunds || 'Insufficient funds in wallet';
    if (msg.indexOf('blockhash') !== -1 || msg.indexOf('block height') !== -1) return t.cryptoTxExpired || 'Transaction expired. Please retry.';
    if (err.code === -32603 || msg.indexOf('internal error') !== -1) return t.cryptoRpcError || 'Network error. Please try again.';
    return t.cryptoWalletError || 'Wallet error. Please try again or scan the QR code.';
  }

  var walletBtn = document.getElementById('solanaWalletBtn');
  if (walletBtn) {
    walletBtn.addEventListener('click', async function () {
      if (isMobile) {
        /* One tap → solana: protocol opens the user's installed wallet with payment ready */
        var solPayUrl = walletBtn.getAttribute('data-solana-pay-url');
        if (solPayUrl) {
          window.location.href = solPayUrl;
        }
        return;
      }

      var invoiceId = walletBtn.getAttribute('data-invoice-id');
      if (!invoiceId) return;

      var walletInfo = connectedWallet || getWalletProvider();
      if (!walletInfo) {
        alert(t.cryptoNoWallet || 'No Solana wallet detected. Please install Phantom, Backpack, or Solflare.');
        return;
      }
      var provider = walletInfo.provider;

      try {
        walletBtn.disabled = true;
        walletBtn.textContent = (t.cryptoConnecting || 'Connecting') + ' ' + (walletInfo.name || '') + '...';

        var pubkey;
        if (connectedWallet && connectedWallet.pubkey) {
          pubkey = connectedWallet.pubkey;
        } else {
          var resp = await provider.connect();
          pubkey = resp.publicKey.toString();
          connectedWallet = { provider: provider, name: walletInfo.name, pubkey: pubkey };
          showConnectedBadge(walletInfo.name, pubkey);
        }

        var txResp = await fetch('/api/pay/' + invoiceId, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ account: pubkey })
        });
        var txData = await txResp.json();

        if (txData.error) {
          setSolanaStatus('error', txData.error);
          return;
        }

        walletBtn.textContent = t.cryptoSigning || 'Confirm in wallet...';
        var txBytes = Uint8Array.from(atob(txData.transaction), function (c) { return c.charCodeAt(0); });

        var result;
        if (provider.signAndSendTransaction) {
          result = await provider.signAndSendTransaction({
            serialize: function () { return txBytes; },
          });
        } else if (provider.request) {
          result = await provider.request({
            method: 'signAndSendTransaction',
            params: { message: txData.transaction },
          });
        }

        if (result && result.signature) {
          setSolanaStatus('confirming', t.cryptoConfirming || 'Payment detected, confirming...');
        } else {
          resetWalletBtn();
        }
      } catch (err) {
        console.error('[wallet] Error:', err);
        var parsed = parseWalletError(err);
        if (parsed === 'rejected') {
          resetWalletBtn();
        } else {
          setSolanaStatus('error', parsed);
        }
      }
    });
  }

  function renderSolanaCheckout() {
    solanaCheckout.classList.remove('hidden');
    showMobileInstallLinks();
    startSolanaCheckout(selectedAsset);
    solanaCheckout.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ===== CHECKOUT (PAY NOW) ===== */
  checkoutBtn.addEventListener('click', function () {
    if (isSubmitting) return;

    var uaRadioNow = document.querySelector('input[name="uaPayMethod"]:checked');
    if (countryEl.value === 'UA' && uaRadioNow) {
      payMethod = uaRadioNow.value;
    }

    if (payMethod === 'crypto') {
      if (!termsCheck.checked) {
        var cb = termsCheck.closest('.form-checkbox').querySelector('.checkbox-box');
        cb.classList.remove('shake');
        cb.offsetHeight; /* force reflow */
        cb.classList.add('shake');
        termsCheck.closest('.form-checkbox').scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(function () { cb.classList.remove('shake'); }, 500);
        return;
      }
      checkoutBtn.style.display = 'none';
      var checkboxesArea = document.getElementById('checkboxesArea');
      if (checkboxesArea) checkboxesArea.style.display = 'none';
      var trustBadges = stepPayment.querySelector('.trust-badges');
      if (trustBadges) trustBadges.style.display = 'none';
      renderSolanaCheckout();
      return;
    }

    /* Recalculate with fresh state */
    updateShipping();
    if (appliedPromo && promoType && promoValue) {
      var sub = getSubtotal();
      discount = promoType === 'percent' ? Math.round(sub * promoValue / 100) : promoValue;
      discount = Math.min(discount, sub);
    }
    updateUI();

    if (!termsCheck.checked) {
      var cb2 = termsCheck.closest('.form-checkbox').querySelector('.checkbox-box');
      cb2.classList.remove('shake');
      cb2.offsetHeight;
      cb2.classList.add('shake');
      termsCheck.closest('.form-checkbox').scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(function () { cb2.classList.remove('shake'); }, 500);
      return;
    }

    isSubmitting = true;
    checkoutBtn.disabled = true;
    if (checkoutBtnText) checkoutBtnText.innerHTML = '<span class="btn-spinner"></span> ' + escapeHtml(t.processing || 'Processing...');

    var orderId = generateOrderId();
    var total = getTotal();
    var prefix = phonePrefix ? phonePrefix.textContent : '';

    var orderData = {
      order_id: orderId,
      plates: plates,
      sleeveColors: sleeveColors.slice(0, plates),
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
      page_section: 'checkout'
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
      page_section: 'checkout'
    });

    /* UA payment methods */
    var uaRadio = document.querySelector('input[name="uaPayMethod"]:checked');
    var uaMethod = uaRadio ? uaRadio.value : '';
    var isUaPayment = countryEl.value === 'UA' && (uaMethod === 'ua-cod' || uaMethod === 'ua-invoice' || uaMethod === 'ua-card');

    if (isUaPayment) {
      orderData.pay_method = uaMethod;
      var npCityEl = document.getElementById('npCity');
      var npWhEl = document.getElementById('npWarehouse');
      orderData.np_city = npCityEl ? npCityEl.value.trim() : '';
      orderData.np_warehouse = npWhEl ? npWhEl.options[npWhEl.selectedIndex].text : '';
      orderData.address.city = orderData.np_city;
      orderData.address.street = orderData.np_warehouse;

      try { sessionStorage.setItem('penger_order', JSON.stringify(orderData)); } catch (e) {}

      var _uaLangPrefix = t.langPrefix || '';
      var _uaSuccessPage = uaMethod === 'ua-invoice' ? '/invoice' : '/payment-success';

      fetch('/api/ua-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data.ok) throw new Error(data.error || 'Order failed');
        try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) {}
        window.location.href = _uaLangPrefix + _uaSuccessPage + '?order_id=' + encodeURIComponent(orderId);
      })
      .catch(function (err) {
        console.error('[checkout] UA order submission error:', err);
        isSubmitting = false;
        checkoutBtn.disabled = false;
        if (checkoutBtnText) checkoutBtnText.textContent = t.uaOrderBtn || 'Place order';
        saveFormData();
        showOrderError(t.orderSubmitError || 'Could not place order. Please check your connection and try again.');
      });
      return;
    }

    /* Non-crypto, non-UA: card/apple/google not yet supported */
    isSubmitting = false;
    checkoutBtn.disabled = false;
    if (checkoutBtnText) checkoutBtnText.textContent = t.payNow || 'Pay Now';
    saveFormData();
    showOrderError(t.payMethodUnavailable || 'This payment method is coming soon. Please use Crypto (SOL/USDC) to complete your order.');
  });

  /* ===== AUTO-APPLY REFERRAL CODE ===== */
  var REF_LOCAL_TTL = 7 * 24 * 60 * 60 * 1000;

  function getRefCode() {
    try {
      var ref = sessionStorage.getItem('penger_referral');
      if (ref) return ref;
    } catch (e) {}
    try {
      var raw = localStorage.getItem('penger_referral');
      if (raw) {
        var data = JSON.parse(raw);
        if (data && data.code && data.ts && (Date.now() - data.ts < REF_LOCAL_TTL)) {
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
      if (appliedPromo && appliedPromo !== ref) {
        removePromo();
      }
      if (appliedPromo) return;
      if (promoInput) promoInput.value = ref;
      applyPromo();
    } catch (e) {}
  }

  /* ===== UA FLOW: NOVA POSHTA + PAYMENT ===== */
  var npCityInput     = document.getElementById('npCity');
  var npCitySugg      = document.getElementById('npCitySuggestions');
  var npWarehouseEl   = document.getElementById('npWarehouse');
  var uaPayMethodsEl  = document.getElementById('uaPayMethods');
  var uaCheckbox      = document.getElementById('uaCheck');
  var countryRow      = document.getElementById('countryRow');
  var npCityRef       = '';
  var npSearchTimeout = null;

  function toggleUaFlow(isUA) {
    if (stepDelivery) stepDelivery.classList.toggle('ua-flow', isUA);
    if (stepPayment) stepPayment.classList.toggle('ua-flow-pay', isUA);
    if (contactForm) contactForm.classList.toggle('ua-active', isUA);
    if (checkoutBtnText) checkoutBtnText.textContent = isUA ? (t.uaOrderBtn || 'Place order') : (t.payNow || 'Pay Now');
    var shippingFreeVal = document.getElementById('shippingFreeVal');
    if (shippingFreeVal) shippingFreeVal.textContent = isUA ? (t.shippingFreeUA || 'Free in Ukraine') : (t.shippingFreeLabel || 'Free in EU');
    var phoneEl = document.getElementById('phone');
    if (phoneEl) phoneEl.placeholder = isUA ? (t.uaPhonePlaceholder || '0XXXXXXXXX') : (t.phone || 'Phone number');
  }

  if (uaCheckbox) {
    uaCheckbox.addEventListener('change', function () {
      if (this.checked) {
        countryEl.value = 'UA';
        countryEl.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        countryEl.value = '';
        countryEl.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }

  /* UA phone: plain 10-digit input, must start with 0 */
  (function () {
    var phoneEl = document.getElementById('phone');
    if (!phoneEl) return;

    phoneEl.addEventListener('input', function () {
      if (countryEl.value !== 'UA') return;
      var raw = this.value.replace(/\D/g, '');
      if (raw.length > 10) raw = raw.substring(0, 10);
      this.value = raw;
    });
  })();

  /* Nova Poshta API call */
  function npApi(modelName, calledMethod, props, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/novaposhta', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.timeout = 8000;
    xhr.onload = function () {
      if (xhr.status === 200) {
        try { cb(JSON.parse(xhr.responseText)); } catch (e) { cb(null); }
      } else { cb(null); }
    };
    xhr.onerror = function () { cb(null); };
    xhr.send(JSON.stringify({ modelName: modelName, calledMethod: calledMethod, methodProperties: props }));
  }

  /* City search */
  if (npCityInput) {
    npCityInput.addEventListener('input', function () {
      clearTimeout(npSearchTimeout);
      var q = npCityInput.value.trim();
      if (q.length < 2) { npCitySugg.classList.remove('open'); npCitySugg.innerHTML = ''; return; }
      npSearchTimeout = setTimeout(function () {
        npApi('Address', 'searchSettlements', { CityName: q, Limit: '10' }, function (res) {
          if (!res || !res.data || !res.data[0] || !res.data[0].Addresses) {
            npCitySugg.classList.remove('open');
            return;
          }
          var cities = res.data[0].Addresses;
          var html = '';
          cities.forEach(function (c) {
            html += '<div class="np-suggestion" data-ref="' + escapeHtml(c.DeliveryCity || '') + '">' + escapeHtml(c.Present || '') + '</div>';
          });
          npCitySugg.innerHTML = html;
          npCitySugg.classList.add('open');
        });
      }, 300);
    });

    npCitySugg.addEventListener('click', function (e) {
      var item = e.target.closest('.np-suggestion');
      if (!item) return;
      npCityRef = item.getAttribute('data-ref');
      npCityInput.value = item.textContent;
      npCitySugg.classList.remove('open');
      npCityInput.classList.remove('error');
      clearFieldError(npCityInput);
      loadWarehouses(npCityRef);
    });

    document.addEventListener('click', function (e) {
      if (!e.target || !e.target.closest) return;
      if (!e.target.closest('#npCitySuggestions') && e.target !== npCityInput) {
        npCitySugg.classList.remove('open');
      }
    });
  }

  function loadWarehouses(cityRef) {
    if (!npWarehouseEl) return;
    npWarehouseEl.innerHTML = '<option value="" disabled selected>' + (t.npLoading || 'Loading...') + '</option>';
    npWarehouseEl.disabled = true;

    npApi('AddressGeneral', 'getWarehouses', { CityRef: cityRef, Limit: '100' }, function (res) {
      npWarehouseEl.innerHTML = '<option value="" disabled selected>' + (t.npWarehouse || 'Nova Poshta department') + '</option>';
      if (!res || !res.data || res.data.length === 0) {
        npWarehouseEl.innerHTML = '<option value="" disabled selected>' + (t.npNotFound || 'No departments found') + '</option>';
        npWarehouseEl.disabled = false; /* allow user to see the message and re-search */
        return;
      }
      res.data.forEach(function (wh) {
        var opt = document.createElement('option');
        opt.value = wh.Ref;
        opt.textContent = wh.Description;
        npWarehouseEl.appendChild(opt);
      });
      npWarehouseEl.disabled = false;
    });
  }

  if (uaPayMethodsEl) {
    uaPayMethodsEl.addEventListener('click', function (e) {
      var label = e.target.closest('.pay-method');
      if (!label) return;
      uaPayMethodsEl.querySelectorAll('.pay-method').forEach(function (m) { m.classList.remove('active'); });
      label.classList.add('active');
      var radio = label.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
      var method = label.getAttribute('data-method');
      if (solanaCheckout) {
        solanaCheckout.classList.add('hidden');
        stopSolanaPolling();
        checkoutBtn.style.display = '';
        checkoutBtn.disabled = !termsCheck.checked;
        var _cba = document.getElementById('checkboxesArea');
        if (_cba) _cba.style.display = '';
        var _tb = stepPayment ? stepPayment.querySelector('.trust-badges') : null;
        if (_tb) _tb.style.display = '';
      }
    });
  }

  /* ===== RESUME ACTIVE INVOICE ON PAGE LOAD ===== */
  function tryResumeInvoice() {
    var saved = getPersistedInvoice();
    if (!saved) return;

    /* Verify invoice is still active on server before resuming */
    fetch('/api/invoice/' + saved.id)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data) { clearPersistedInvoice(); return; }
        if (['paid', 'expired', 'cancelled', 'failed'].includes(data.status)) {
          clearPersistedInvoice();
          if (data.status === 'paid') {
            var langPrefix = t.langPrefix || '';
            window.location.href = langPrefix + '/payment-success?order_id=' + encodeURIComponent(data.orderId);
          }
          return;
        }

        /* Resume: show crypto checkout with this invoice */
        selectedAsset = saved.asset;
        solanaInvoiceId = saved.id;

        /* Update asset tab UI */
        if (assetSelect) {
          assetSelect.querySelectorAll('.solana-asset-btn').forEach(function (b) {
            b.classList.toggle('active', b.getAttribute('data-asset') === saved.asset);
          });
        }

        var amountEl = document.getElementById('solanaAmountDisplay');
        var rateEl = document.getElementById('solanaRate');
        var walletBtn = document.getElementById('solanaWalletBtn');
        var qrEl = document.getElementById('solanaQr');

        if (amountEl) amountEl.textContent = saved.amountCrypto + ' ' + saved.asset;
        if (rateEl) rateEl.textContent = '1 ' + saved.asset + ' = \u20AC' + parseFloat(saved.rate).toFixed(2) +
          ' \u00B7 ' + (t.cryptoTotal || 'Total') + ': \u20AC' + (saved.amountEur / 100).toFixed(2);

        if (saved.qrDataUrl && qrEl) {
          if (saved.solanaPayUrl) {
            qrEl.innerHTML = '<a href="' + saved.solanaPayUrl + '" target="_blank" rel="noopener" style="cursor:pointer;display:inline-block">' +
              '<img src="' + saved.qrDataUrl + '" alt="Solana Pay QR" width="280" height="280"></a>';
          } else {
            qrEl.innerHTML = '<img src="' + saved.qrDataUrl + '" alt="Solana Pay QR" width="280" height="280">';
          }
        }

        if (walletBtn) {
          walletBtn.setAttribute('data-invoice-id', saved.id);
          walletBtn.disabled = false;
          resetWalletBtn();
        }

        /* Show payment details */
        var payDetailsEl = document.getElementById('solanaPayDetails');
        var recipientEl = document.getElementById('solanaRecipientAddr');
        var exactAmountEl = document.getElementById('solanaExactAmount');
        if (payDetailsEl && recipientEl && exactAmountEl && saved.recipient) {
          recipientEl.textContent = saved.recipient;
          exactAmountEl.textContent = saved.amountCrypto + ' ' + saved.asset;
          payDetailsEl.style.display = '';
        }

        /* Show the checkout section and skip to payment step */
        solanaCheckout.classList.remove('hidden');
        checkoutBtn.style.display = 'none';
        var checkboxesArea = document.getElementById('checkboxesArea');
        if (checkboxesArea) checkboxesArea.style.display = 'none';
        var trustBadges = stepPayment ? stepPayment.querySelector('.trust-badges') : null;
        if (trustBadges) trustBadges.style.display = 'none';

        startCountdown(saved.expiresAt);
        startSolanaPolling(saved.id, saved.expiresAt);
        autoPayWithWallet(saved);
      })
      .catch(function () { clearPersistedInvoice(); });
  }

  /* ===== INIT ===== */
  restoreFormData();
  autoApplyReferral();
  detectCountry();
  updateShipping();
  updateDeliveryEstimate();
  toggleUaFlow(countryEl.value === 'UA');
  updateUI();
  updateMobileCta();
  tryResumeInvoice();

  /* Re-sync UI when page is restored from bfcache */
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) {
      restoreFormData();
      autoApplyReferral();
      updateShipping();
      updateDeliveryEstimate();
      toggleUaFlow(countryEl.value === 'UA');
      updateUI();
      updateMobileCta();
      saveFormData();
    }
  });

})();
