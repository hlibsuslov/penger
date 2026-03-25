(function () {
  'use strict';

  /* ===== BIP39 WORDLIST (loaded from bip39-wordlist.js) ===== */
  var wordlist = window.BIP39_WORDLIST || [];

  /* ===== CORE CONSTANTS ===== */
  var BIT_POSITIONS = [2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2, 1];
  var BIT_COUNT = 12;
  var INDEX_OFFSET = 1;
  var LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
  var HEADER_OFFSET = 110; // px above section to account for sticky header + alpha bar
  var WORDS_PER_LETTER = 5; // initial words shown per letter section

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
    var bin = toBinary(exampleIdx); // "010000100100"
    var word = getWordByIndex(exampleIdx); // "love"

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
  var dictQuery = '';

  function $(id) { return document.getElementById(id); }

  /* Pre-build letter → indices map once */
  var letterMap = {};
  function buildLetterMap() {
    LETTERS.forEach(function (l) { letterMap[l] = []; });
    for (var i = 0; i < wordlist.length; i++) {
      var first = wordlist[i][0];
      if (letterMap[first]) letterMap[first].push(i + INDEX_OFFSET);
    }
  }

  function getSearchFiltered() {
    var results = [];
    var q = dictQuery;
    for (var i = 0; i < wordlist.length; i++) {
      var displayIdx = i + INDEX_OFFSET;
      var w = wordlist[i];
      var idxStr = String(displayIdx);
      var padIdx = idxStr.padStart(4, '0');
      if (w.indexOf(q) !== -1 || idxStr.indexOf(q) !== -1 || padIdx.indexOf(q) !== -1) {
        results.push(displayIdx);
      }
    }
    return results;
  }

  /* ===== ROW BUILDER ===== */
  function buildWordRow(displayIdx, container) {
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
      // Collapse any other expanded row in the same container
      container.querySelectorAll('.dict-row.expanded').forEach(function (other) {
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

    container.appendChild(row);
    container.appendChild(detail);
  }

  /* ===== RENDER SECTIONS ===== */
  function renderDict() {
    var listEl = $('dictList');
    if (!listEl) return;
    listEl.innerHTML = '';

    var countEl = $('dictCount');

    // Search mode: flat filtered list
    if (dictQuery) {
      var filtered = getSearchFiltered();
      if (countEl) countEl.textContent = filtered.length + ' / ' + wordlist.length;
      filtered.forEach(function (displayIdx) {
        buildWordRow(displayIdx, listEl);
      });
      return;
    }

    // Section mode: 26 letter groups
    if (countEl) countEl.textContent = wordlist.length + ' / ' + wordlist.length;

    LETTERS.forEach(function (letter) {
      var indices = letterMap[letter];
      if (!indices || indices.length === 0) return;

      var section = document.createElement('div');
      section.className = 'dict-letter-section';
      section.id = 'dict-letter-' + letter;

      // Letter header
      var header = document.createElement('div');
      header.className = 'dict-letter-header';
      header.innerHTML =
        '<span class="dict-letter-char">' + letter.toUpperCase() + '</span>' +
        '<span class="dict-letter-count">' + indices.length + ' words</span>';
      section.appendChild(header);

      // Word rows
      var body = document.createElement('div');
      body.className = 'dict-letter-body';
      var visibleCount = Math.min(indices.length, WORDS_PER_LETTER);
      for (var i = 0; i < visibleCount; i++) {
        buildWordRow(indices[i], body);
      }
      if (indices.length > WORDS_PER_LETTER) {
        var extra = document.createElement('div');
        extra.className = 'dict-extra-words';
        var extraInner = document.createElement('div');
        extraInner.className = 'dict-extra-inner';
        extra.appendChild(extraInner);
        body.appendChild(extra);

        var remaining = indices.length - WORDS_PER_LETTER;
        var moreBtn = document.createElement('button');
        moreBtn.className = 'dict-more-btn';
        moreBtn.setAttribute('aria-expanded', 'false');
        moreBtn.innerHTML =
          '<span class="dict-more-text">Show all</span>' +
          '<span class="dict-more-badge">' + remaining + '</span>' +
          '<span class="dict-more-chevron"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 4.5L6 8l3.5-3.5"/></svg></span>';
        (function (btn, extraEl, extraInnerEl, sectionEl, wordIndices) {
          var built = false;
          btn.addEventListener('click', function () {
            var expanded = btn.classList.contains('open');
            expanded = !expanded;
            if (expanded && !built) {
              for (var k = 0; k < wordIndices.length; k++) {
                buildWordRow(wordIndices[k], extraInnerEl);
              }
              built = true;
            }
            extraEl.classList.toggle('open', expanded);
            btn.classList.toggle('open', expanded);
            btn.setAttribute('aria-expanded', String(expanded));
            btn.querySelector('.dict-more-text').textContent = expanded ? 'Show less' : 'Show all';
            if (!expanded) {
              var rect = sectionEl.getBoundingClientRect();
              if (rect.top < 0) {
                window.scrollTo({ top: rect.top + window.pageYOffset - HEADER_OFFSET, behavior: 'smooth' });
              }
            }
          });
        })(moreBtn, extra, extraInner, section, indices.slice(WORDS_PER_LETTER));
        var moreWrap = document.createElement('div');
        moreWrap.className = 'dict-more-wrap';
        moreWrap.appendChild(moreBtn);
        body.appendChild(moreWrap);
      }
      section.appendChild(body);
      listEl.appendChild(section);
    });
  }

  /* ===== ALPHABET BAR ===== */
  function renderDictAlpha() {
    var el = $('dictAlpha');
    if (!el) return;
    var html = '';
    LETTERS.forEach(function (l) {
      var count = letterMap[l] ? letterMap[l].length : 0;
      html += '<button class="alpha-btn" data-letter="' + l + '" title="' + count + ' words">' + l.toUpperCase() + '</button>';
    });
    el.innerHTML = html;

    el.addEventListener('click', function (e) {
      var btn = e.target.closest('.alpha-btn');
      if (!btn) return;
      var letter = btn.getAttribute('data-letter');
      var target = document.getElementById('dict-letter-' + letter);
      if (target) {
        // Scroll to section
        var y = target.getBoundingClientRect().top + window.pageYOffset - HEADER_OFFSET;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
      // Update active state
      el.querySelectorAll('.alpha-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
    });
  }

  /* ===== SCROLL SPY ===== */
  function initScrollSpy() {
    var alphaEl = $('dictAlpha');
    if (!alphaEl) return;
    var ticking = false;

    window.addEventListener('scroll', function () {
      if (ticking || dictQuery) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        var best = null;
        var threshold = HEADER_OFFSET + 20;
        for (var i = 0; i < LETTERS.length; i++) {
          var sec = document.getElementById('dict-letter-' + LETTERS[i]);
          if (!sec) continue;
          var rect = sec.getBoundingClientRect();
          if (rect.top <= threshold && rect.bottom > threshold) {
            best = LETTERS[i];
          }
        }
        if (best) {
          alphaEl.querySelectorAll('.alpha-btn').forEach(function (b) {
            b.classList.toggle('active', b.getAttribute('data-letter') === best);
          });
        }
      });
    });
  }

  /* ===== SEARCH ===== */
  var searchTimeout;
  var searchEl = $('dictSearch');
  if (searchEl) {
    searchEl.addEventListener('input', function (e) {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(function () {
        dictQuery = e.target.value.trim().toLowerCase();
        renderDict();
        // Clear active alpha button during search
        var alphaEl = $('dictAlpha');
        if (alphaEl && dictQuery) {
          alphaEl.querySelectorAll('.alpha-btn').forEach(function (b) { b.classList.remove('active'); });
        }
      }, 150);
    });
  }

  /* ===== INIT ===== */
  var initialized = false;
  function init() {
    if (initialized) return;
    initialized = true;
    buildLetterMap();
    initDictExample();
    renderDictAlpha();
    renderDict();
    initScrollSpy();
  }

  document.addEventListener('DOMContentLoaded', init);
  if (document.readyState !== 'loading') init();

})();
