(function () {
  'use strict';

  var t = window.ORDER_I18N || {};

  /* ===== PRICING ===== */
  var BASE_PRICE = 49;
  var EXTRA_PLATE = 35;

  /* ===== STATE ===== */
  var plates = 1;
  var payMethod = 'card';

  /* ===== DOM: PLATES ===== */
  var platesVal     = document.getElementById('platesVal');
  var platesMinus   = document.getElementById('platesMinus');
  var platesPlus    = document.getElementById('platesPlus');
  var cartPlates    = document.getElementById('cartPlates');

  /* Summary refs (sidebar) */
  var rowExtraPlates   = document.getElementById('rowExtraPlates');
  var extraPlatesLabel = document.getElementById('extraPlatesLabel');
  var extraPlatesPrice = document.getElementById('extraPlatesPrice');
  var summaryTotal     = document.getElementById('summaryTotal');

  /* Summary refs (bottom card in payment step) */
  var cartPlatesBottom       = document.getElementById('cartPlatesBottom');
  var rowExtraPlatesBottom   = document.getElementById('rowExtraPlatesBottom');
  var extraPlatesLabelBottom = document.getElementById('extraPlatesLabelBottom');
  var extraPlatesPriceBottom = document.getElementById('extraPlatesPriceBottom');
  var summaryTotalBottom     = document.getElementById('summaryTotalBottom');

  var txtExtraPlates = t.platesDesc || 'extra plate';

  /* ===== DOM: CHECKOUT STEPS ===== */
  var stepContact    = document.getElementById('stepContact');
  var stepPayment    = document.getElementById('stepPayment');
  var contactForm    = document.getElementById('contactForm');
  var contactSummary = document.getElementById('contactSummary');
  var editContact    = document.getElementById('editContact');
  var checkoutBtn    = document.getElementById('checkoutBtn');

  /* Payment method selector */
  var payMethods = document.getElementById('payMethods');
  var cardFields = document.getElementById('cardFields');

  /* ===== HELPERS ===== */
  function getTotal() {
    return BASE_PRICE + ((plates - 1) * EXTRA_PLATE);
  }

  /* ===== UPDATE UI ===== */
  function updateUI() {
    platesVal.textContent = plates;
    platesMinus.disabled = plates <= 1;
    platesPlus.disabled = plates >= 4;
    cartPlates.textContent = plates;
    if (cartPlatesBottom) cartPlatesBottom.textContent = plates;

    /* Extra plates row — sidebar */
    if (plates > 1) {
      rowExtraPlates.style.display = '';
      var extra = plates - 1;
      var label = '+' + extra + ' ' + txtExtraPlates;
      var price = '+\u20AC' + (extra * EXTRA_PLATE);
      extraPlatesLabel.textContent = label;
      extraPlatesPrice.textContent = price;
      /* bottom card */
      if (rowExtraPlatesBottom) {
        rowExtraPlatesBottom.style.display = '';
        extraPlatesLabelBottom.textContent = label;
        extraPlatesPriceBottom.textContent = price;
      }
    } else {
      rowExtraPlates.style.display = 'none';
      if (rowExtraPlatesBottom) rowExtraPlatesBottom.style.display = 'none';
    }

    var totalStr = '\u20AC' + getTotal();
    summaryTotal.textContent = totalStr;
    if (summaryTotalBottom) summaryTotalBottom.textContent = totalStr;
  }

  /* ===== PLATES +/- ===== */
  platesMinus.addEventListener('click', function () {
    if (plates > 1) { plates--; updateUI(); pushConfig('plates_change'); }
  });
  platesPlus.addEventListener('click', function () {
    if (plates < 4) { plates++; updateUI(); pushConfig('plates_change'); }
  });

  /* ===== STEP MANAGEMENT ===== */
  function activateStep(step) {
    step.classList.remove('disabled');
    step.classList.add('active');
    step.classList.remove('completed');
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

    /* Validate required fields */
    var inputs = contactForm.querySelectorAll('[required]');
    var valid = true;
    inputs.forEach(function (input) {
      input.classList.remove('error');
      if (!input.value.trim()) {
        input.classList.add('error');
        valid = false;
      }
    });

    var emailField = document.getElementById('email');
    if (emailField.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailField.value)) {
      emailField.classList.add('error');
      valid = false;
    }

    if (!valid) return;

    /* Build summary */
    var firstName = document.getElementById('firstName').value.trim();
    var lastName  = document.getElementById('lastName').value.trim();
    var email     = emailField.value.trim();
    var phone     = document.getElementById('phone').value.trim();
    var street    = document.getElementById('street').value.trim();
    var apt       = document.getElementById('apt').value.trim();
    var city      = document.getElementById('city').value.trim();
    var zip       = document.getElementById('zip').value.trim();
    var countryEl = document.getElementById('country');
    var countryText = countryEl.options[countryEl.selectedIndex].text;

    var addressParts = [street];
    if (apt) addressParts.push(apt);
    addressParts.push(city + ' ' + zip);
    addressParts.push(countryText);

    contactSummary.innerHTML =
      '<div class="step-summary-line"><span class="step-summary-label">' + (t.firstName || 'Name') + '</span> ' + firstName + ' ' + lastName + '</div>' +
      '<div class="step-summary-line"><span class="step-summary-label">' + (t.email || 'Email') + '</span> ' + email + '</div>' +
      '<div class="step-summary-line"><span class="step-summary-label">' + (t.phone || 'Phone') + '</span> ' + phone + '</div>' +
      '<div class="step-summary-line"><span class="step-summary-label" style="min-width:60px">' + '&nbsp;' + '</span> ' + addressParts.join(', ') + '</div>';

    /* Transition steps */
    completeStep(stepContact);
    activateStep(stepPayment);
    stepPayment.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* ===== EDIT CONTACT ===== */
  editContact.addEventListener('click', function () {
    activateStep(stepContact);
    disableStep(stepPayment);
  });

  /* ===== PAYMENT METHOD SELECTOR ===== */
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
  });

  /* ===== CARD NUMBER FORMATTING ===== */
  var cardNumberEl = document.getElementById('cardNumber');
  if (cardNumberEl) {
    cardNumberEl.addEventListener('input', function () {
      var v = this.value.replace(/\D/g, '').substring(0, 16);
      this.value = v.replace(/(\d{4})(?=\d)/g, '$1 ');
    });
  }

  /* ===== EXPIRY FORMATTING ===== */
  var cardExpiryEl = document.getElementById('cardExpiry');
  if (cardExpiryEl) {
    cardExpiryEl.addEventListener('input', function () {
      var v = this.value.replace(/\D/g, '').substring(0, 4);
      if (v.length >= 3) v = v.substring(0, 2) + '/' + v.substring(2);
      this.value = v;
    });
  }

  /* ===== CVC LIMIT ===== */
  var cardCvcEl = document.getElementById('cardCvc');
  if (cardCvcEl) {
    cardCvcEl.addEventListener('input', function () {
      this.value = this.value.replace(/\D/g, '').substring(0, 4);
    });
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

  /* ===== CHECKOUT (PAY NOW) ===== */
  checkoutBtn.addEventListener('click', function () {
    /* Validate terms */
    var terms = document.getElementById('agreeTerms');
    if (!terms.checked) {
      terms.closest('.form-checkbox').querySelector('.checkbox-box').style.borderColor = '#e74c3c';
      return;
    }

    var orderId = generateOrderId();
    var total = getTotal();

    /* Collect contact data */
    var orderData = {
      order_id: orderId,
      plates: plates,
      value: total,
      currency: 'EUR',
      product_id: 'penger-v1',
      pay_method: payMethod,
      contact: {
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim()
      },
      address: {
        street: document.getElementById('street').value.trim(),
        apt: document.getElementById('apt').value.trim(),
        city: document.getElementById('city').value.trim(),
        zip: document.getElementById('zip').value.trim(),
        country: document.getElementById('country').value
      },
      newsletter: document.getElementById('newsletter').checked,
      ts: Date.now()
    };

    try { sessionStorage.setItem('penger_order', JSON.stringify(orderData)); } catch (e) {}

    /* GA4 */
    var dl = window.dataLayer = window.dataLayer || [];
    dl.push({
      event: 'begin_checkout',
      order_id: orderId,
      ecommerce: {
        currency: 'EUR',
        value: total,
        items: [{
          item_id: 'penger-v1',
          item_name: 'PENGER v1.0',
          item_brand: 'PENGER',
          item_category: 'titanium_backup',
          price: 49,
          quantity: plates
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
      page_section: 'order'
    });

    var prefix = t.langPrefix || '';
    window.location.href = prefix + '/payment-failed?order_id=' + encodeURIComponent(orderId);
  });

  /* ===== TERMS CHECKBOX RESET ===== */
  var termsCheck = document.getElementById('agreeTerms');
  if (termsCheck) {
    termsCheck.addEventListener('change', function () {
      this.closest('.form-checkbox').querySelector('.checkbox-box').style.borderColor = '';
    });
  }

  /* Init */
  updateUI();
})();
