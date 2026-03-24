(function () {
  'use strict';

  var t = window.ORDER_I18N || {};

  /* ===== PRICING ===== */
  var BASE_PRICE = 49;
  var EXTRA_PLATE = 35;

  /* ===== ADDON PRICES ===== */
  var SLEEVE_PRICE = 10;
  var PUNCH_PRICE = 10;

  /* ===== STATE ===== */
  var plates = 1;
  var sleeveColors = ['black', 'black', 'black', 'black'];
  var activeSleeveTab = 0;
  var punchTool = true;

  /* ===== DOM REFS ===== */
  var platesPicker    = document.getElementById('platesPicker');
  var cartConfigLines = document.getElementById('cartConfigLines');

  /* Summary refs (sidebar) */
  var rowExtraPlates   = document.getElementById('rowExtraPlates');
  var extraPlatesLabel = document.getElementById('extraPlatesLabel');
  var extraPlatesPrice = document.getElementById('extraPlatesPrice');
  var summaryTotal     = document.getElementById('summaryTotal');

  var txtExtraPlates = t.platesDesc || 'extra plate';

  /* Mobile CTA */
  var mobilePrice = document.getElementById('mobilePrice');

  /* ===== HELPERS ===== */
  function getSubtotal() {
    var sub = BASE_PRICE + ((plates - 1) * EXTRA_PLATE);
    sub += SLEEVE_PRICE;
    if (punchTool) sub += PUNCH_PRICE;
    return sub;
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
      if (animate !== false) {
        indicator.classList.add('pop');
        clearTimeout(indicator._popTimer);
        indicator._popTimer = setTimeout(function () {
          indicator.classList.remove('pop');
        }, 500);
      }
    }
  }

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
    updatePlatesPicker();
    renderSleeveRows();
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

    var totalStr = '\u20AC' + getSubtotal();
    summaryTotal.textContent = totalStr;
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
        if (activeSleeveTab >= val) activeSleeveTab = val - 1;
        updateUI();
        saveConfig();
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
      if (activeSleeveTab >= plates) activeSleeveTab = plates - 1;
      updateUI();
      saveConfig();
      pushConfig('plates_change');
    }

    track.addEventListener('pointerdown', function (e) {
      if (e.button && e.button !== 0) return;
      isDragging = true;
      platesPicker.classList.add('is-dragging');
      track.setPointerCapture(e.pointerId);
      document.addEventListener('pointermove', onDragMove);
      document.addEventListener('pointerup', onDragEnd);
      document.addEventListener('pointercancel', onDragEnd);
      onDragMove(e);
    });

    /* -- Keyboard navigation (arrow keys) -- */
    platesPicker.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      var next = plates + (e.key === 'ArrowRight' ? 1 : -1);
      if (next >= 1 && next <= 4) {
        plates = next;
        if (activeSleeveTab >= next) activeSleeveTab = next - 1;
        updateUI();
        saveConfig();
        pushConfig('plates_change');
        var activeOpt = platesPicker.querySelector('.plates-option.active');
        if (activeOpt) activeOpt.focus();
      }
    });
  }

  /* ===== CONFIG OPTIONS: SLEEVE & PUNCH ===== */
  var sleeveOptions = document.getElementById('sleeveOptions');
  var punchToggle   = document.getElementById('punchToggle');

  /* Sleeve colour options — per plate */
  var SLEEVE_OPTS = [
    { value: 'black',  img: '/photo/blacksleeve.png' },
    { value: 'blue',   img: '/photo/bluesleeve.png' },
    { value: 'red',    img: '/photo/redsleeve.png' },
    { value: 'coffee', img: '/photo/coffeesleeve.png' }
  ];

  var SLEEVE_DOT_COLORS = {
    black:  '#3a3a3a',
    blue:   '#3b6baa',
    red:    '#aa3b3b',
    coffee: '#8b6b4a'
  };

  function getSleeveLabel(value) {
    if (!sleeveOptions) return value;
    return sleeveOptions.getAttribute('data-label-' + value) || value;
  }

  function buildSleeveRow(i) {
    var cur = sleeveColors[i] || 'black';
    var html = '<div class="sleeve-cards" data-plate="' + i + '">';
    for (var j = 0; j < SLEEVE_OPTS.length; j++) {
      var o = SLEEVE_OPTS[j];
      var active = (o.value === cur) ? ' active' : '';
      html += '<div class="sleeve-card-wrap">'
            + '<div class="sleeve-card' + active + '" data-value="' + o.value + '">'
            + '<img src="' + o.img + '" alt="' + o.value + '">'
            + '</div>'
            + '<span class="sleeve-card-label">' + getSleeveLabel(o.value) + '</span>'
            + '</div>';
    }
    html += '</div>';
    return html;
  }

  function renderSleeveRows() {
    if (!sleeveOptions) return;
    var count = Math.max(1, plates);

    if (activeSleeveTab >= count) activeSleeveTab = count - 1;

    if (count === 1) {
      sleeveOptions.innerHTML = buildSleeveRow(0);
      return;
    }

    var html = '<div class="sleeve-tabs" role="tablist">';
    for (var ti = 0; ti < count; ti++) {
      var isActive = (ti === activeSleeveTab);
      var dotColor = SLEEVE_DOT_COLORS[sleeveColors[ti]] || SLEEVE_DOT_COLORS.black;
      html += '<button type="button" class="sleeve-tab' + (isActive ? ' active' : '') + '"'
            + ' role="tab" aria-selected="' + isActive + '"'
            + ' data-tab="' + ti + '"'
            + ' id="sleeveTab' + ti + '"'
            + ' aria-controls="sleevePanel' + ti + '"'
            + ' tabindex="' + (isActive ? '0' : '-1') + '">'
            + '<span class="sleeve-tab-dot" style="background:' + dotColor + '"></span>'
            + '<span class="sleeve-tab-num">' + (ti + 1) + '</span>'
            + '</button>';
    }
    html += '</div>';

    html += '<div class="sleeve-panels">';
    for (var pi = 0; pi < count; pi++) {
      var active = (pi === activeSleeveTab);
      html += '<div class="sleeve-panel' + (active ? ' active' : '') + '"'
            + ' role="tabpanel" id="sleevePanel' + pi + '"'
            + ' aria-labelledby="sleeveTab' + pi + '"'
            + (active ? '' : ' hidden') + '>';
      html += buildSleeveRow(pi);
      html += '</div>';
    }
    html += '</div>';

    sleeveOptions.innerHTML = html;
  }

  function switchSleeveTab() {
    var tabs = sleeveOptions.querySelectorAll('.sleeve-tab');
    var panels = sleeveOptions.querySelectorAll('.sleeve-panel');
    tabs.forEach(function (t, i) {
      var isActive = (i === activeSleeveTab);
      t.classList.toggle('active', isActive);
      t.setAttribute('aria-selected', String(isActive));
      t.setAttribute('tabindex', isActive ? '0' : '-1');
    });
    panels.forEach(function (p, i) {
      var isActive = (i === activeSleeveTab);
      p.classList.toggle('active', isActive);
      if (isActive) p.removeAttribute('hidden');
      else p.setAttribute('hidden', '');
    });
  }

  function updateTabDot(plateIdx) {
    var tab = sleeveOptions.querySelector('.sleeve-tab[data-tab="' + plateIdx + '"]');
    if (!tab) return;
    var dot = tab.querySelector('.sleeve-tab-dot');
    if (dot) dot.style.background = SLEEVE_DOT_COLORS[sleeveColors[plateIdx]] || SLEEVE_DOT_COLORS.black;
  }

  if (sleeveOptions) {
    sleeveOptions.addEventListener('click', function (e) {
      var tab = e.target.closest('.sleeve-tab');
      if (tab) {
        var tabIdx = parseInt(tab.getAttribute('data-tab'), 10);
        if (tabIdx !== activeSleeveTab) {
          activeSleeveTab = tabIdx;
          switchSleeveTab();
        }
        return;
      }
      var wrap = e.target.closest('.sleeve-card-wrap');
      if (!wrap) return;
      var card = wrap.querySelector('.sleeve-card');
      if (!card) return;
      var row = card.closest('.sleeve-cards');
      var idx = parseInt(row.getAttribute('data-plate'), 10);
      row.querySelectorAll('.sleeve-card').forEach(function (c) { c.classList.remove('active'); });
      card.classList.add('active');
      sleeveColors[idx] = card.getAttribute('data-value');
      updateTabDot(idx);
      updateUI();
      saveConfig();
      pushConfig('sleeve_change');
    });

    sleeveOptions.addEventListener('keydown', function (e) {
      var tab = e.target.closest('.sleeve-tab');
      if (!tab) return;
      var count = Math.max(1, plates);
      var idx = parseInt(tab.getAttribute('data-tab'), 10);
      var next = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        next = (idx + 1) % count;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        next = (idx - 1 + count) % count;
      } else if (e.key === 'Home') {
        next = 0;
      } else if (e.key === 'End') {
        next = count - 1;
      }
      if (next >= 0 && next !== activeSleeveTab) {
        e.preventDefault();
        activeSleeveTab = next;
        switchSleeveTab();
        var nextBtn = sleeveOptions.querySelector('.sleeve-tab[data-tab="' + next + '"]');
        if (nextBtn) nextBtn.focus();
      }
    });
  }

  renderSleeveRows();

  /* Punch toggle */
  if (punchToggle) {
    var punchInput = punchToggle.querySelector('input');
    if (punchInput) {
      punchInput.addEventListener('change', function () {
        punchTool = this.checked;
        updateUI();
        saveConfig();
        pushConfig('punch_change');
      });
    }
  }

  /* ===== SAVE PRODUCT CONFIG TO SESSION STORAGE ===== */
  function saveConfig() {
    try {
      sessionStorage.setItem('penger_product_config', JSON.stringify({
        _v: 1,
        _ts: Date.now(),
        plates: plates,
        sleeveColors: sleeveColors.slice(0, plates),
        punchTool: punchTool
      }));
    } catch (e) {}
  }

  /* Also save on "Continue to Checkout" click (belt and suspenders) */
  var continueBtn = document.getElementById('continueToCheckout');
  if (continueBtn) {
    continueBtn.addEventListener('click', function () {
      saveConfig();
    });
  }

  /* Mobile CTA also saves config */
  var mobileContinueBtn = document.getElementById('mobileContinueBtn');
  if (mobileContinueBtn) {
    mobileContinueBtn.addEventListener('click', function () {
      saveConfig();
    });
  }

  /* ===== ANALYTICS ===== */
  function pushConfig(action) {
    var dl = window.dataLayer = window.dataLayer || [];
    dl.push({
      event: 'config_change',
      config_action: action,
      config_plates: plates,
      config_total: getSubtotal(),
      product_id: 'penger-v1',
      page_section: 'order'
    });
  }

  /* ===== RESTORE CONFIG FROM SESSION ===== */
  function restoreConfig() {
    try {
      var raw = sessionStorage.getItem('penger_product_config');
      if (!raw) return;
      var data = JSON.parse(raw);
      if (!data || data._v !== 1) return;

      if (data.plates && data.plates >= 1 && data.plates <= 4) {
        plates = data.plates;
      }
      if (data.sleeveColors && Array.isArray(data.sleeveColors)) {
        for (var si = 0; si < data.sleeveColors.length && si < 4; si++) {
          sleeveColors[si] = data.sleeveColors[si];
        }
      }
      if (typeof data.punchTool !== 'undefined') {
        punchTool = !!data.punchTool;
        if (punchToggle) {
          var punchInp = punchToggle.querySelector('input');
          if (punchInp) punchInp.checked = punchTool;
        }
      }
    } catch (e) {}
  }

  /* ===== INIT ===== */
  restoreConfig();
  updateUI();

  /* Re-sync UI when page is restored from bfcache */
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) {
      restoreConfig();
      updateUI();
    }
  });

})();
