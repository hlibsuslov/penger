(function () {
  'use strict';

  /* ===== BIP39 WORDLIST (loaded from bip39-wordlist.js) ===== */
  var wordlist = window.BIP39_WORDLIST || [];

  /* ===== CORE CONSTANTS ===== */
  var BIT_POSITIONS = [2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2, 1];
  var BIT_COUNT = 12;
  var INDEX_OFFSET = 1;

  /* ===== HELPERS ===== */
  function toBinary(n) {
    var s = n.toString(2);
    while (s.length < BIT_COUNT) s = '0' + s;
    return s;
  }
  function isValidIndex(displayIdx) { return displayIdx >= 1 && displayIdx <= 2048; }
  function getWordByIndex(displayIdx) {
    if (!isValidIndex(displayIdx)) return null;
    return wordlist[displayIdx - 1];
  }
  function formatBinaryHTML(bin) {
    var out = '';
    for (var i = 0; i < bin.length; i++) {
      out += bin[i] === '1' ? '<span class="bit-one">1</span>' : '0';
    }
    return out;
  }

  /* ===== DETAIL HTML BUILDER ===== */
  function buildDetailHTML(displayIdx, wordNum) {
    var word = getWordByIndex(displayIdx);
    var bin = toBinary(displayIdx);
    var html = '';

    // Header: word + index
    html += '<div class="detail-word-header">';
    html += '<span class="detail-word-name" translate="no">' + word + '</span>';
    if (wordNum) {
      html += '<span class="detail-word-index">#' + wordNum + ' \u2014 ' + String(displayIdx).padStart(4, '0') + '</span>';
    } else {
      html += '<span class="detail-word-index">' + String(displayIdx).padStart(4, '0') + '</span>';
    }
    html += '</div>';

    // Binary grid (lp-binary-col style)
    html += '<div class="detail-binary-cells">';
    for (var i = 0; i < BIT_COUNT; i++) {
      var isOn = bin[i] === '1';
      html += '<div class="detail-binary-col">';
      html += '<div class="detail-binary-cell ' + (isOn ? 'on' : 'off') + '"><span class="detail-binary-digit">' + bin[i] + '</span></div>';
      html += '<span class="detail-binary-weight' + (isOn ? ' active' : '') + '">' + BIT_POSITIONS[i] + '</span>';
      html += '</div>';
    }
    html += '</div>';

    // Formula
    var activeParts = [];
    for (var f = 0; f < BIT_COUNT; f++) {
      if (bin[f] === '1') activeParts.push('<strong>' + BIT_POSITIONS[f] + '</strong>');
    }
    if (activeParts.length > 0) {
      html += '<div class="detail-formula">';
      html += activeParts.join(' + ') + ' = <strong>' + displayIdx + '</strong>';
      html += '</div>';
    }

    return html;
  }

  /* ===== EXAMPLE ANIMATION INIT ===== */
  function initDictExample() {
    var exampleIdx = 1060;
    var bin = toBinary(exampleIdx); // "001111011001"
    var word = getWordByIndex(exampleIdx); // "inner"

    var dotsContainer = document.getElementById('dictExampleDots');
    var gridContainer = document.getElementById('dictExampleGrid');
    var wordEl = document.getElementById('dictExampleWord');
    var formulaEl = document.getElementById('dictExampleFormula');
    if (!gridContainer || !wordEl) return;

    // Render dots
    if (dotsContainer) {
      var dotsHtml = '';
      for (var d = 0; d < bin.length; d++) {
        dotsHtml += '<span class="dict-example-dot ' + (bin[d] === '1' ? 'on' : 'off') + '"></span>';
      }
      dotsContainer.innerHTML = dotsHtml;
    }

    // Render grid
    var html = '';
    for (var i = 0; i < BIT_COUNT; i++) {
      var isOn = bin[i] === '1';
      html += '<div class="detail-binary-col">';
      html += '<div class="detail-binary-cell ' + (isOn ? 'on' : 'off') + '"><span class="detail-binary-digit">' + bin[i] + '</span></div>';
      html += '<span class="detail-binary-weight' + (isOn ? ' active' : '') + '">' + BIT_POSITIONS[i] + '</span>';
      html += '</div>';
    }
    gridContainer.innerHTML = html;
    wordEl.textContent = word.toUpperCase();

    // Render formula
    if (formulaEl) {
      var parts = [];
      for (var f = 0; f < BIT_COUNT; f++) {
        if (bin[f] === '1') parts.push('<strong>' + BIT_POSITIONS[f] + '</strong>');
      }
      formulaEl.innerHTML = parts.join(' + ') + ' = <strong>' + exampleIdx + '</strong>';
    }
  }

  /* ===== DICTIONARY LOGIC ===== */
  var DICT_PAGE_SIZE = 100;
  var dictVisible = DICT_PAGE_SIZE;
  var dictFilter = 'all';
  var dictQuery = '';
  var dictFiltered = [];

  function $ (id) { return document.getElementById(id); }

  function getDictFiltered() {
    var results = [];
    var useLetterFilter = dictFilter !== 'all' && !dictQuery;
    for (var i = 0; i < wordlist.length; i++) {
      var displayIdx = i + INDEX_OFFSET;
      var w = wordlist[i];
      if (useLetterFilter && w[0] !== dictFilter) continue;
      if (dictQuery) {
        var idxStr = String(displayIdx);
        var padIdx = idxStr.padStart(4, '0');
        if (w.indexOf(dictQuery) === -1 && idxStr.indexOf(dictQuery) === -1 && padIdx.indexOf(dictQuery) === -1) continue;
      }
      results.push(displayIdx);
    }
    return results;
  }

  function renderDictAlpha() {
    var el = $('dictAlpha');
    if (!el) return;
    var letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
    var html = '';
    letters.forEach(function (l) {
      html += '<button class="alpha-btn" data-letter="' + l + '">' + l.toUpperCase() + '</button>';
    });
    html += '<button class="alpha-btn active" data-letter="all">ALL</button>';
    el.innerHTML = html;
    el.addEventListener('click', function (e) {
      var btn = e.target.closest('.alpha-btn');
      if (!btn) return;
      el.querySelectorAll('.alpha-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      dictFilter = btn.getAttribute('data-letter');
      dictVisible = DICT_PAGE_SIZE;
      renderDict();
    });
  }

  function renderDict(append) {
    dictFiltered = getDictFiltered();
    var countEl = $('dictCount');
    if (countEl) countEl.textContent = dictFiltered.length + ' / ' + wordlist.length;

    var end = Math.min(dictVisible, dictFiltered.length);
    var listEl = $('dictList');
    if (!listEl) return;

    var startFrom = 0;
    if (append) {
      startFrom = end - DICT_PAGE_SIZE;
      if (startFrom < 0) startFrom = 0;
    } else {
      listEl.innerHTML = '';
      startFrom = 0;
    }

    var pageItems = dictFiltered.slice(startFrom, end);

    pageItems.forEach(function (displayIdx) {
      var word = getWordByIndex(displayIdx);
      var bin = toBinary(displayIdx);

      var row = document.createElement('div');
      row.className = 'dict-row';
      row.setAttribute('data-idx', displayIdx);

      var dotsHTML = '';
      for (var b = 0; b < BIT_COUNT; b++) {
        dotsHTML += '<span class="mini-dot' + (bin[b] === '1' ? ' on' : '') + '"></span>';
      }

      row.innerHTML =
        '<span class="dr-idx">' + String(displayIdx).padStart(4, '0') + '</span>' +
        '<span class="dr-word" translate="no">' + word + '</span>' +
        '<span class="dr-dots">' + dotsHTML + '</span>';

      var detail = document.createElement('div');
      detail.className = 'dict-row-detail';

      row.addEventListener('click', function () {
        var isExpanded = row.classList.contains('expanded');
        listEl.querySelectorAll('.dict-row.expanded').forEach(function (other) {
          if (other !== row) {
            other.classList.remove('expanded');
            var od = other.nextElementSibling;
            if (od) od.style.maxHeight = '0';
          }
        });
        if (isExpanded) {
          row.classList.remove('expanded');
          detail.style.maxHeight = '0';
        } else {
          if (!detail.innerHTML) {
            detail.innerHTML = '<div class="word-detail-inner">' + buildDetailHTML(displayIdx) + '</div>';
          }
          row.classList.add('expanded');
          detail.style.maxHeight = detail.scrollHeight + 'px';
        }
      });

      listEl.appendChild(row);
      listEl.appendChild(detail);
    });

    renderShowMore();
  }

  function renderShowMore() {
    var pagEl = $('dictPagination');
    if (!pagEl) return;
    var shown = Math.min(dictVisible, dictFiltered.length);
    var remaining = dictFiltered.length - shown;

    var html = '';

    if (remaining > 0) {
      html +=
        '<button class="show-more-btn" type="button">' +
        '<span class="show-more-label">Show more</span>' +
        '<span class="show-more-count">' + shown + ' / ' + dictFiltered.length + '</span>' +
        '</button>';
    }

    if (shown > DICT_PAGE_SIZE) {
      html += '<button class="back-to-top-btn" type="button">&uarr; Back to top</button>';
    }

    pagEl.innerHTML = html;

    pagEl.onclick = function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      if (btn.classList.contains('show-more-btn')) {
        dictVisible += DICT_PAGE_SIZE;
        renderDict(true);
      } else if (btn.classList.contains('back-to-top-btn')) {
        var listEl = $('dictList');
        if (listEl) listEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
  }

  var searchTimeout;
  var searchEl = $('dictSearch');
  if (searchEl) {
    searchEl.addEventListener('input', function (e) {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(function () {
        dictQuery = e.target.value.trim().toLowerCase();
        dictVisible = DICT_PAGE_SIZE;
        renderDict();
      }, 150);
    });
  }

  /* ===== INIT ===== */
  document.addEventListener('DOMContentLoaded', function () {
    initDictExample();
    renderDictAlpha();
    renderDict();
  });

  // Also init immediately if DOM is already ready
  if (document.readyState !== 'loading') {
    initDictExample();
    renderDictAlpha();
    renderDict();
  }

})();
