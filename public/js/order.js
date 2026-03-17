(function () {
  'use strict';

  var t = window.ORDER_I18N || {};

  /* ===== PRICING ===== */
  var BASE_PRICE = 49;      // €49 base (1 plate + case)
  var EXTRA_PLATE = 35;     // +€35 per extra plate
  var PUNCH_PRICE = 10;     // +€10 for punch

  /* ===== STATE ===== */
  var plates = 1;
  var finish = 'ocean';
  var caseColor = 'black';
  var punch = true;

  /* ===== DOM ===== */
  var platesVal     = document.getElementById('platesVal');
  var platesMinus   = document.getElementById('platesMinus');
  var platesPlus    = document.getElementById('platesPlus');
  var finishOptions = document.getElementById('finishOptions');
  var caseOptions   = document.getElementById('caseColorOptions');
  var punchOptions  = document.getElementById('punchOptions');
  var checkoutBtn   = document.getElementById('checkoutBtn');

  /* Cart refs */
  var cartFinish  = document.getElementById('cartFinish');
  var cartPlates  = document.getElementById('cartPlates');
  var cartCase    = document.getElementById('cartCase');
  var cartPunch   = document.getElementById('cartPunch');

  /* Summary refs */
  var rowExtraPlates   = document.getElementById('rowExtraPlates');
  var extraPlatesLabel = document.getElementById('extraPlatesLabel');
  var extraPlatesPrice = document.getElementById('extraPlatesPrice');
  var rowPunch         = document.getElementById('rowPunch');
  var punchPriceEl     = document.getElementById('punchPrice');
  var summaryTotal     = document.getElementById('summaryTotal');

  /* Translation maps */
  var finishNames = {
    ocean: t.finishOcean || 'Ocean',
    mat:   t.finishMat || 'Mat'
  };
  var caseNames = {
    black: t.caseColorBlack || 'Black',
    white: t.caseColorWhite || 'White'
  };
  var txtYes = t.punchYes || 'Yes';
  var txtNo  = t.punchNo || 'No';
  var txtExtraPlates = t.platesDesc || 'extra plate';

  /* ===== UPDATE ===== */
  function updateUI() {
    /* Plates */
    platesVal.textContent = plates;
    platesMinus.disabled = plates <= 1;
    platesPlus.disabled = plates >= 4;
    cartPlates.textContent = plates;

    /* Extra plates row */
    if (plates > 1) {
      rowExtraPlates.style.display = '';
      var extra = plates - 1;
      extraPlatesLabel.textContent = '+' + extra + ' ' + txtExtraPlates;
      extraPlatesPrice.textContent = '+\u20AC' + (extra * EXTRA_PLATE);
    } else {
      rowExtraPlates.style.display = 'none';
    }

    /* Finish */
    cartFinish.textContent = finishNames[finish];

    /* Case */
    cartCase.textContent = caseNames[caseColor];

    /* Punch */
    cartPunch.textContent = punch ? txtYes : txtNo;
    punchPriceEl.textContent = punch ? '+\u20AC' + PUNCH_PRICE : '\u20AC0';

    /* Total */
    var total = BASE_PRICE + ((plates - 1) * EXTRA_PLATE) + (punch ? PUNCH_PRICE : 0);
    summaryTotal.textContent = '\u20AC' + total;
  }

  /* ===== PLATES +/- ===== */
  platesMinus.addEventListener('click', function () {
    if (plates > 1) { plates--; updateUI(); pushConfig('plates_change'); }
  });
  platesPlus.addEventListener('click', function () {
    if (plates < 4) { plates++; updateUI(); pushConfig('plates_change'); }
  });

  /* ===== FINISH SELECTOR ===== */
  finishOptions.addEventListener('click', function (e) {
    var option = e.target.closest('.finish-option');
    if (!option) return;
    var input = option.querySelector('input');
    if (!input) return;
    finishOptions.querySelectorAll('.finish-option').forEach(function (o) { o.classList.remove('active'); });
    option.classList.add('active');
    input.checked = true;
    finish = input.value;
    updateUI();
    pushConfig('finish_change');
  });

  /* ===== CASE COLOR ===== */
  caseOptions.addEventListener('click', function (e) {
    var option = e.target.closest('.toggle-option');
    if (!option) return;
    var input = option.querySelector('input');
    if (!input) return;
    caseOptions.querySelectorAll('.toggle-option').forEach(function (o) { o.classList.remove('active'); });
    option.classList.add('active');
    input.checked = true;
    caseColor = input.value;
    updateUI();
    pushConfig('case_color_change');
  });

  /* ===== PUNCH TOGGLE ===== */
  punchOptions.addEventListener('click', function (e) {
    var option = e.target.closest('.toggle-option');
    if (!option) return;
    var input = option.querySelector('input');
    if (!input) return;
    punchOptions.querySelectorAll('.toggle-option').forEach(function (o) { o.classList.remove('active'); });
    option.classList.add('active');
    input.checked = true;
    punch = input.value === 'yes';
    updateUI();
    pushConfig('punch_change');
  });

  /* ===== ANALYTICS: config change events ===== */
  function pushConfig(action) {
    var total = BASE_PRICE + ((plates - 1) * EXTRA_PLATE) + (punch ? PUNCH_PRICE : 0);
    var dl = window.dataLayer = window.dataLayer || [];
    dl.push({
      event: 'config_change',
      config_action: action,
      config_finish: finish,
      config_plates: plates,
      config_case_color: caseColor,
      config_punch: punch,
      config_total: total,
      product_id: 'penger-v1',
      page_section: 'order'
    });
  }

  /* ===== ORDER ID GENERATOR ===== */
  function generateOrderId() {
    var ts = Date.now().toString(36).toUpperCase();
    var rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return 'PG-' + ts + '-' + rand;
  }

  /* ===== CHECKOUT ===== */
  checkoutBtn.addEventListener('click', function () {
    var orderId = generateOrderId();
    var total = BASE_PRICE + ((plates - 1) * EXTRA_PLATE) + (punch ? PUNCH_PRICE : 0);

    /* Save order data so payment-success/failed pages can read it */
    try {
      sessionStorage.setItem('penger_order', JSON.stringify({
        order_id: orderId,
        finish: finish,
        plates: plates,
        caseColor: caseColor,
        punch: punch,
        value: total,
        currency: 'EUR',
        product_id: 'penger-v1',
        ts: Date.now()
      }));
    } catch (e) {}

    /* GA4 begin_checkout ecommerce event */
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
          item_variant: finish,
          price: 49,
          quantity: plates
        }]
      },
      config_finish: finish,
      config_plates: plates,
      config_case_color: caseColor,
      config_punch: punch,
      page_section: 'order'
    });

    /* Legacy checkout_start event */
    dl.push({
      event: 'checkout_start',
      order_id: orderId,
      product_id: 'penger-v1',
      config_finish: finish,
      config_plates: plates,
      config_case_color: caseColor,
      config_punch: punch,
      value: total,
      currency: 'EUR',
      page_section: 'order'
    });

    /* Redirect to payment-failed (no payment provider yet) */
    var prefix = t.langPrefix || '';
    window.location.href = prefix + '/payment-failed?order_id=' + encodeURIComponent(orderId);
  });

  /* Init */
  updateUI();
})();
