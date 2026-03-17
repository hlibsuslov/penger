(function () {
  'use strict';

  var t = window.ORDER_I18N || {};

  /* ===== PRICING ===== */
  var BASE_PRICE = 49;      // €49 base (1 plate + kit)
  var EXTRA_PLATE = 35;     // +€35 per extra plate

  /* ===== STATE ===== */
  var plates = 1;

  /* ===== DOM ===== */
  var platesVal     = document.getElementById('platesVal');
  var platesMinus   = document.getElementById('platesMinus');
  var platesPlus    = document.getElementById('platesPlus');
  var checkoutBtn   = document.getElementById('checkoutBtn');

  /* Cart refs */
  var cartPlates = document.getElementById('cartPlates');

  /* Summary refs */
  var rowExtraPlates   = document.getElementById('rowExtraPlates');
  var extraPlatesLabel = document.getElementById('extraPlatesLabel');
  var extraPlatesPrice = document.getElementById('extraPlatesPrice');
  var summaryTotal     = document.getElementById('summaryTotal');

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

    /* Total */
    var total = BASE_PRICE + ((plates - 1) * EXTRA_PLATE);
    summaryTotal.textContent = '\u20AC' + total;
  }

  /* ===== PLATES +/- ===== */
  platesMinus.addEventListener('click', function () {
    if (plates > 1) { plates--; updateUI(); pushConfig('plates_change'); }
  });
  platesPlus.addEventListener('click', function () {
    if (plates < 4) { plates++; updateUI(); pushConfig('plates_change'); }
  });

  /* ===== ANALYTICS: config change events ===== */
  function pushConfig(action) {
    var total = BASE_PRICE + ((plates - 1) * EXTRA_PLATE);
    var dl = window.dataLayer = window.dataLayer || [];
    dl.push({
      event: 'config_change',
      config_action: action,
      config_plates: plates,
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
    var total = BASE_PRICE + ((plates - 1) * EXTRA_PLATE);

    /* Save order data so payment-success/failed pages can read it */
    try {
      sessionStorage.setItem('penger_order', JSON.stringify({
        order_id: orderId,
        plates: plates,
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
          price: 49,
          quantity: plates
        }]
      },
      config_plates: plates,
      page_section: 'order'
    });

    /* Legacy checkout_start event */
    dl.push({
      event: 'checkout_start',
      order_id: orderId,
      product_id: 'penger-v1',
      config_plates: plates,
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
