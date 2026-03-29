(function () {
  'use strict';

  /* ===== I18N ===== */
  var i18n = window.PENGER_I18N || {};

  /* ===== PRIVACY HARDENING ===== */
  (function hardenNetworkSurface() {
    var blocked = function () {
      throw new Error('Network APIs are disabled in privacy mode.');
    };
    try { window.fetch = blocked; } catch (e) {}
    try { navigator.sendBeacon = function () { return false; }; } catch (e) {}
    try { window.WebSocket = function () { throw new Error('WebSocket disabled.'); }; } catch (e) {}
    try { window.EventSource = function () { throw new Error('EventSource disabled.'); }; } catch (e) {}
    try {
      if (window.XMLHttpRequest && window.XMLHttpRequest.prototype) {
        window.XMLHttpRequest.prototype.open = blocked;
        window.XMLHttpRequest.prototype.send = blocked;
      }
    } catch (e) {}
  })();

  /* ===== BIP39 WORDLIST (loaded from bip39-wordlist.js) ===== */
  var wordlist = window.BIP39_WORDLIST || [];
  var wordMap = {};
  wordlist.forEach(function (w, i) { wordMap[w] = i; });

  /* ===== CORE CONSTANTS ===== */
  // BIT_POSITIONS: 12 positions — 2048 down to 1
  var BIT_POSITIONS = [2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2, 1];
  var BIT_COUNT = BIT_POSITIONS.length; // 12
  var INDEX_OFFSET = 1; // display indices are wordlist index + 1 (1..2048)

  var ENTROPY_MAP = {12: 128, 15: 160, 18: 192, 21: 224, 24: 256};

  /* ===== HELPERS ===== */
  // Convert a display index (1..2048) to 12-bit binary string
  function toBinary(n) {
    var s = n.toString(2);
    while (s.length < BIT_COUNT) s = '0' + s;
    return s;
  }

  // Returns true if displayIdx is a valid BIP39 index (1..2048)
  function isValidIndex(displayIdx) {
    return displayIdx >= 1 && displayIdx <= 2048;
  }

  // Returns the BIP39 word for a display index (1..2048), or null if invalid
  function getWordByIndex(displayIdx) {
    if (!isValidIndex(displayIdx)) return null;
    return wordlist[displayIdx - 1];
  }

  /* ===== SHA-256 (pure JS fallback for file:// protocol) ===== */
  var K256 = new Uint32Array([
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
  ]);

  function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }

  function sha256sync(bytes) {
    var H = new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);
    var len = bytes.length;
    var bitLen = len * 8;
    var padded = new Uint8Array(((len + 9 + 63) & ~63));
    padded.set(bytes);
    padded[len] = 0x80;
    var dv = new DataView(padded.buffer);
    dv.setUint32(padded.length - 4, bitLen, false);

    var W = new Uint32Array(64);
    for (var off = 0; off < padded.length; off += 64) {
      for (var i = 0; i < 16; i++) W[i] = dv.getUint32(off + i * 4, false);
      for (var i = 16; i < 64; i++) {
        var s0 = rotr(W[i-15],7) ^ rotr(W[i-15],18) ^ (W[i-15]>>>3);
        var s1 = rotr(W[i-2],17) ^ rotr(W[i-2],19) ^ (W[i-2]>>>10);
        W[i] = (W[i-16] + s0 + W[i-7] + s1) | 0;
      }
      var a=H[0],b=H[1],c=H[2],d=H[3],e=H[4],f=H[5],g=H[6],h=H[7];
      for (var i = 0; i < 64; i++) {
        var S1 = rotr(e,6) ^ rotr(e,11) ^ rotr(e,25);
        var ch = (e & f) ^ (~e & g);
        var t1 = (h + S1 + ch + K256[i] + W[i]) | 0;
        var S0 = rotr(a,2) ^ rotr(a,13) ^ rotr(a,22);
        var maj = (a & b) ^ (a & c) ^ (b & c);
        var t2 = (S0 + maj) | 0;
        h=g; g=f; f=e; e=(d+t1)|0; d=c; c=b; b=a; a=(t1+t2)|0;
      }
      H[0]=(H[0]+a)|0; H[1]=(H[1]+b)|0; H[2]=(H[2]+c)|0; H[3]=(H[3]+d)|0;
      H[4]=(H[4]+e)|0; H[5]=(H[5]+f)|0; H[6]=(H[6]+g)|0; H[7]=(H[7]+h)|0;
    }
    var out = new Uint8Array(32);
    for (var i = 0; i < 8; i++) {
      out[i*4]=(H[i]>>>24)&0xff; out[i*4+1]=(H[i]>>>16)&0xff;
      out[i*4+2]=(H[i]>>>8)&0xff; out[i*4+3]=H[i]&0xff;
    }
    return out;
  }

  /* ===== SHA-256 ASYNC (prefers native Web Crypto API) ===== */
  async function sha256(bytes) {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      var buf = await crypto.subtle.digest('SHA-256', bytes);
      return new Uint8Array(buf);
    }
    return sha256sync(bytes);
  }

  /* ===== UTILITIES ===== */
  function formatBinaryHTML(bin) {
    var out = '';
    for (var i = 0; i < bin.length; i++) {
      out += bin[i] === '1' ? '<span class="bit-one">1</span>' : '0';
    }
    return out;
  }

  function buildMiniDotsHTML(bin) {
    var html = '';
    for (var i = 0; i < bin.length; i++) {
      html += '<span class="mini-dot' + (bin[i] === '1' ? ' on' : '') + '"></span>';
    }
    return html;
  }

  function pad(s, len) { while (s.length < len) s = ' ' + s; return s; }

  function bytesToBits(bytes) {
    var bits = '';
    for (var i = 0; i < bytes.length; i++) bits += bytes[i].toString(2).padStart(8, '0');
    return bits;
  }

  /* ===== BIP39 MNEMONIC GENERATION ===== */
  // Returns display indices 1..2048
  async function generateMnemonic(wordCount) {
    if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
      throw new Error('Web Crypto API unavailable. Use a modern browser with HTTPS or file:// protocol.');
    }

    var entropyBits = ENTROPY_MAP[wordCount];
    var entropyBytes = entropyBits / 8;
    var entropy = new Uint8Array(entropyBytes);
    crypto.getRandomValues(entropy);

    var hash = await sha256(entropy);
    var entropyBitStr = bytesToBits(entropy);
    var hashBitStr = bytesToBits(hash);
    var checksumLen = entropyBits / 32;
    var allBits = entropyBitStr + hashBitStr.slice(0, checksumLen);

    // BIP39 standard uses 11-bit indices (0..2047); we add INDEX_OFFSET for display
    var indices = [];
    for (var i = 0; i < wordCount; i++) {
      var raw = parseInt(allBits.slice(i * 11, (i + 1) * 11), 2);
      indices.push(raw + INDEX_OFFSET); // display index: 1..2048
    }

    // Wipe sensitive data from memory
    entropy.fill(0);
    hash.fill(0);

    return indices;
  }

  /* ===== BIP39 MNEMONIC VALIDATION ===== */
  // Validates checksum of a BIP39 mnemonic given as array of display indices (1..2048)
  // Returns detailed result for UI feedback
  async function validateMnemonic(displayIndices) {
    var wordCount = displayIndices.length;
    var entropyBits = ENTROPY_MAP[wordCount];
    if (!entropyBits) return { valid: false, error: 'INVALID_WORD_COUNT' };

    // Convert display indices to 11-bit binary string
    var allBits = '';
    for (var i = 0; i < wordCount; i++) {
      var raw = displayIndices[i] - INDEX_OFFSET; // 0..2047
      if (raw < 0 || raw > 2047) return { valid: false, error: 'INDEX_OUT_OF_RANGE' };
      var s = raw.toString(2);
      while (s.length < 11) s = '0' + s;
      allBits += s;
    }

    var checksumLen = entropyBits / 32;
    var entropyBitStr = allBits.slice(0, entropyBits);
    var checksumBits = allBits.slice(entropyBits, entropyBits + checksumLen);

    // Reconstruct entropy bytes
    var entropyBytes = new Uint8Array(entropyBits / 8);
    for (var i = 0; i < entropyBytes.length; i++) {
      entropyBytes[i] = parseInt(entropyBitStr.slice(i * 8, (i + 1) * 8), 2);
    }

    // Compute expected checksum
    var hash = await sha256(entropyBytes);
    var hashBits = bytesToBits(hash);
    var expectedChecksum = hashBits.slice(0, checksumLen);

    // Wipe sensitive data
    entropyBytes.fill(0);
    hash.fill(0);

    // The checksum sits in the last bits of the last word
    // For 12 words / 128-bit entropy: last word = 7 entropy bits + 4 checksum bits
    // Compute which word contains the checksum boundary
    var lastWordIdx = wordCount; // 1-based word number (last word)
    var checksumStartBit = entropyBits; // bit offset where checksum starts in the total bit string
    // The last word spans bits [(wordCount-1)*11 .. wordCount*11)
    // Checksum bits within last word: from (checksumStartBit - (wordCount-1)*11) to 10
    var lastWordStart = (wordCount - 1) * 11;
    var csOffsetInLastWord = checksumStartBit - lastWordStart; // how many entropy bits the last word contributes

    if (checksumBits === expectedChecksum) {
      return {
        valid: true,
        error: null,
        checksumLen: checksumLen,
        expected: expectedChecksum,
        actual: checksumBits
      };
    }
    return {
      valid: false,
      error: 'CHECKSUM_MISMATCH',
      checksumLen: checksumLen,
      expected: expectedChecksum,
      actual: checksumBits,
      lastWord: lastWordIdx,
      entropyBitsInLastWord: csOffsetInLastWord
    };
  }

  /* ===== DETAIL HTML BUILDER ===== */
  // displayIdx: 1..2048
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

  /* ===== DOM REFS ===== */
  var $ = function(id) { return document.getElementById(id); };

  /* ===== GENERATE TAB ===== */
  var genWordCount = 12;
  var genIndices = []; // display indices 1..2048


  document.querySelectorAll('#genWordCount .pill').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('#genWordCount .pill').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      genWordCount = parseInt(btn.getAttribute('data-count'), 10);
    });
  });

  function renderGenSeed(indices) {
    var seedEl = $('genSeedOutput');
    var html = '';
    for (var i = 0; i < indices.length; i++) {
      var word = getWordByIndex(indices[i]);
      html += '<span class="seed-word" translate="no"><span class="seed-num">' + (i + 1) + '</span>' + word + '</span>';
    }
    seedEl.innerHTML = html;
    seedEl.classList.add('seed-grid');
    seedEl.oncopy = function (e) { e.preventDefault(); };
    seedEl.oncut = function (e) { e.preventDefault(); };
    seedEl.oncontextmenu = function (e) { e.preventDefault(); };
  }

  function renderGenWords(indices) {
    var table = $('genWordTable');
    table.innerHTML = '<div class="word-row table-head"><span>#</span><span>' + (i18n.colWord || 'Word') + '</span><span>' + (i18n.colIndex || 'Index') + '</span><span>' + (i18n.colPunch || 'Punch') + '</span></div>';

    indices.forEach(function (displayIdx, i) {
      var word = getWordByIndex(displayIdx);
      var bin = toBinary(displayIdx);
      var row = document.createElement('div');
      row.className = 'word-row';
      row.innerHTML =
        '<span class="w-num">' + String(i + 1).padStart(2, '0') + '</span>' +
        '<span class="w-word" translate="no">' + word + '</span>' +
        '<span class="w-index">' + displayIdx + '</span>' +
        '<span class="w-dots">' + buildMiniDotsHTML(bin) + '</span>';

      var detail = document.createElement('div');
      detail.className = 'word-detail';
      detail.innerHTML = '<div class="word-detail-inner">' + buildDetailHTML(displayIdx, i + 1) + '</div>';

      row.addEventListener('click', function () {
        var isExpanded = row.classList.contains('expanded');
        document.querySelectorAll('.word-row.expanded').forEach(function (other) {
          if (other !== row) { other.classList.remove('expanded'); var od = other.nextElementSibling; if (od && od.classList.contains('word-detail')) od.style.maxHeight = '0'; }
        });
        if (isExpanded) { row.classList.remove('expanded'); detail.style.maxHeight = '0'; }
        else { row.classList.add('expanded'); detail.style.maxHeight = detail.scrollHeight + 'px'; }
      });

      table.appendChild(row);
      table.appendChild(detail);
    });
  }

  function setPlateWc(plateVis, count) {
    plateVis.classList.remove('wc-md', 'wc-lg');
    if (count >= 21) plateVis.classList.add('wc-lg');
    else if (count >= 15) plateVis.classList.add('wc-md');
  }

  function renderGenPlate(indices) {
    var count = indices.length;
    var container = $('genPlateContainer');
    container.innerHTML = '';

    var isMobile = window.innerWidth < 768;
    var shouldSplit = isMobile && count > 12;

    function createMatrix(startIdx, endIdx, title, indices) {
      var wordCount = endIdx - startIdx;
      var subIndices = indices.slice(startIdx, endIdx);

      var plateVis = document.createElement('div');
      plateVis.className = 'plate-vis';
      setPlateWc(plateVis, wordCount);

      var plateTitle = document.createElement('div');
      plateTitle.className = 'plate-title';
      plateTitle.textContent = title;
      plateVis.appendChild(plateTitle);

      var subtitle = document.createElement('div');
      subtitle.className = 'plate-subtitle';
      subtitle.textContent = wordCount + ' ' + (i18n.wordsLabel || 'words') + ' \u00d7 ' + BIT_COUNT + ' ' + (i18n.bitsLabel || 'bits') + ' = ' + (wordCount * BIT_COUNT) + ' ' + (i18n.positions || 'positions') + (shouldSplit ? ' (' + (i18n.colWord || 'Words') + ' ' + (startIdx + 1) + '-' + endIdx + ')' : '');
      plateVis.appendChild(subtitle);

      var header = document.createElement('div');
      header.className = 'word-header';
      for (var w = startIdx; w < endIdx; w++) {
        var word = getWordByIndex(indices[w]);
        var abbr = word ? word.substring(0, 4).toUpperCase() : '????';
        header.innerHTML += '<span class="col-header"><span class="col-num">' + String(w + 1).padStart(2, '0') + '</span><span class="col-word" translate="no">' + abbr + '</span></span>';
      }
      plateVis.appendChild(header);

      var rows = document.createElement('div');
      rows.className = 'plate-rows';
      rows.setAttribute('data-start', startIdx);
      rows.setAttribute('data-end', endIdx);

      var binaries = subIndices.map(function (displayIdx) { return toBinary(displayIdx); });

      BIT_POSITIONS.forEach(function (pos, bitIdx) {
        var row = document.createElement('div');
        row.className = 'plate-row';
        var dotsHTML = '';
        for (var w = 0; w < wordCount; w++) {
          var isOn = binaries[w][bitIdx] === '1';
          var globalW = startIdx + w;
          dotsHTML += '<div class="dot-cell" data-w="' + globalW + '" data-b="' + bitIdx + '"><span class="dot' + (isOn ? ' on' : '') + '"></span></div>';
        }
        row.innerHTML = '<span class="plate-bit-label"><span class="pbl-pos">' + pos + '</span></span><div class="plate-dots">' + dotsHTML + '</div>';
        rows.appendChild(row);
      });

      plateVis.appendChild(rows);

      var legend = document.createElement('div');
      legend.className = 'plate-legend';
      legend.innerHTML = '<div class="legend-item"><span class="legend-dot on"></span><span>1 \u2014 ON</span></div>' +
                         '<div class="legend-item"><span class="legend-dot off"></span><span>0 \u2014 OFF</span></div>';
      plateVis.appendChild(legend);

      return { plateVis: plateVis, rows: rows, header: header };
    }

    var matrices = [];
    if (shouldSplit) {
      var m1 = createMatrix(0, 12, (i18n.encoderTitle || 'PENGER BINARY ENCODER') + ' (' + (i18n.part1 || 'PART 1') + ')', indices);
      var m2 = createMatrix(12, count, (i18n.encoderTitle || 'PENGER BINARY ENCODER') + ' (' + (i18n.part2 || 'PART 2') + ')', indices);
      if (count - 12 < 12) {
        setPlateWc(m2.plateVis, 12);
        m2.plateVis.classList.add('plate-vis-part2');
      }
      matrices.push(m1);
      matrices.push(m2);
    } else {
      matrices.push(createMatrix(0, count, (i18n.encoderTitle || 'PENGER BINARY ENCODER'), indices));
    }

    matrices.forEach(function(matrix) {
      container.appendChild(matrix.plateVis);
    });

    setupGenPlateListeners(matrices, indices);
  }

  function setupGenPlateListeners(matrices, indices) {
    matrices.forEach(function(matrix) {
      var rows = matrix.rows;
      var header = matrix.header;
      var startIdx = parseInt(rows.getAttribute('data-start'), 10);

      rows.addEventListener('mouseover', function (e) {
        if (isTouchDevice || indices.length === 0) return;
        var cell = e.target.closest('.dot-cell');
        if (!cell) {
          dotTooltip.classList.remove('visible');
          clearColumnHighlight(rows, header);
          return;
        }
        var w = parseInt(cell.getAttribute('data-w'), 10);
        var b = parseInt(cell.getAttribute('data-b'), 10);
        highlightColumn(rows, header, w - startIdx);
        dotTooltip.innerHTML = buildTooltipHTML(indices, w, b);
        dotTooltip.classList.add('visible');
      });

      rows.addEventListener('mousemove', positionTooltip);

      rows.addEventListener('mouseleave', function () {
        dotTooltip.classList.remove('visible');
        clearColumnHighlight(rows, header);
      });
    });
  }

  /* Tooltip for generate plate */
  var dotTooltip = $('dotTooltip');
  var isTouchDevice = window.matchMedia('(hover: none)').matches;

  var activeCol = -1;

  function highlightColumn(plateEl, headerEl, colIdx) {
    if (colIdx === activeCol) return;
    clearColumnHighlight(plateEl, headerEl);
    activeCol = colIdx;
    if (colIdx < 0) return;

    var line = plateEl.querySelector('.col-line');
    if (!line) {
      line = document.createElement('div');
      line.className = 'col-line';
      plateEl.appendChild(line);
    }
    var cell = plateEl.querySelector('.dot-cell[data-w="' + colIdx + '"]');
    if (!cell) return;
    var plateRect = plateEl.getBoundingClientRect();
    var cellRect = cell.getBoundingClientRect();
    line.style.left = (cellRect.left - plateRect.left + plateEl.scrollLeft) + 'px';
    line.style.width = cellRect.width + 'px';
    line.classList.add('visible');

    var hSpans = headerEl.children;
    if (hSpans[colIdx]) hSpans[colIdx].classList.add('col-hover');
  }

  function clearColumnHighlight(plateEl, headerEl) {
    activeCol = -1;
    var line = plateEl.querySelector('.col-line');
    if (line) line.classList.remove('visible');
    headerEl.querySelectorAll('.col-hover').forEach(function (c) { c.classList.remove('col-hover'); });
  }

  // displayIndices: array of display indices 1..2048
  function buildTooltipHTML(displayIndices, wIdx, bIdx) {
    var displayIdx = displayIndices[wIdx];
    var word = getWordByIndex(displayIdx);
    var html = '<span class="th">#' + (wIdx + 1) + '</span>  ';
    html += '<span class="tv">' + word + '</span>  ';
    html += '<span class="td">index ' + displayIdx + '</span>';
    return html;
  }

  function positionTooltip(e) {
    if (!dotTooltip.classList.contains('visible')) return;
    var x = e.clientX + 14;
    var y = e.clientY + 14;
    var r = dotTooltip.getBoundingClientRect();
    if (x + r.width > window.innerWidth - 10) x = e.clientX - r.width - 10;
    if (y + r.height > window.innerHeight - 10) y = e.clientY - r.height - 10;
    dotTooltip.style.left = x + 'px';
    dotTooltip.style.top = y + 'px';
  }

  $('generateBtn').addEventListener('click', async function () {
    genIndices = await generateMnemonic(genWordCount);
    var dl = window.dataLayer = window.dataLayer || [];
    dl.push({ event: 'simulator_generate', word_count: genWordCount, page_section: 'simulator-generate' });
    renderGenSeed(genIndices);
    renderGenWords(genIndices);
    renderGenPlate(genIndices);
    ['genSeedSection', 'genWordsSection', 'genPlateSection'].forEach(function (sectionId) {
      var section = $(sectionId);
      section.hidden = false;
      section.classList.add('visible');
    });
    setTimeout(function () { $('genSeedSection').scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 80);
  });

  /* ===== DECODE TAB ===== */
  var decWordCount = 12;
  var decodeBits = [];
  var decodeTouched = [];
  var decodeInitialized = false;
  var decodeValidationSeq = 0;

  function resetDecodeBits(count) {
    decodeBits = [];
    decodeTouched = [];
    for (var w = 0; w < count; w++) {
      // BIT_COUNT = 12 bits per word
      decodeBits[w] = [0,0,0,0,0,0,0,0,0,0,0,0];
      decodeTouched[w] = false;
    }
  }

  resetDecodeBits(12);

  function initDecode() {
    decodeInitialized = true;
    var count = decWordCount;
    resetDecodeBits(count);

    var container = $('decodeMatrixContainer');
    container.innerHTML = '';

    var isMobile = window.innerWidth < 768;
    var shouldSplit = isMobile && count > 12;

    function createMatrix(startIdx, endIdx, title) {
      var wordCount = endIdx - startIdx;

      var plateVis = document.createElement('div');
      plateVis.className = 'plate-vis decode-plate';
      setPlateWc(plateVis, wordCount);

      var plateTitle = document.createElement('div');
      plateTitle.className = 'plate-title';
      plateTitle.textContent = title;
      plateVis.appendChild(plateTitle);

      var subtitle = document.createElement('div');
      subtitle.className = 'plate-subtitle';
      subtitle.textContent = wordCount + ' ' + (i18n.wordsLabel || 'words') + ' \u00d7 ' + BIT_COUNT + ' ' + (i18n.bitsLabel || 'bits') + (shouldSplit ? ' (' + (i18n.colWord || 'Words') + ' ' + (startIdx + 1) + '-' + endIdx + ')' : '');
      plateVis.appendChild(subtitle);

      var header = document.createElement('div');
      header.className = 'word-header';
      for (var w = startIdx; w < endIdx; w++) {
        header.innerHTML += '<span class="col-header"><span class="col-num">' + String(w + 1).padStart(2, '0') + '</span><span class="col-idx" data-wh="' + w + '">\u2014</span></span>';
      }
      plateVis.appendChild(header);

      var grid = document.createElement('div');
      grid.className = 'plate-rows';
      grid.setAttribute('data-start', startIdx);
      grid.setAttribute('data-end', endIdx);

      BIT_POSITIONS.forEach(function (pos, bitIdx) {
        var row = document.createElement('div');
        row.className = 'plate-row';
        var dotsHTML = '';
        for (var w = startIdx; w < endIdx; w++) {
          dotsHTML += '<div class="dot-cell" data-w="' + w + '" data-b="' + bitIdx + '"><span class="dot"></span></div>';
        }
        row.innerHTML = '<span class="plate-bit-label"><span class="pbl-pos">' + pos + '</span></span><div class="plate-dots">' + dotsHTML + '</div>';
        grid.appendChild(row);
      });

      plateVis.appendChild(grid);

      var legend = document.createElement('div');
      legend.className = 'plate-legend';
      legend.innerHTML = '<div class="legend-item"><span class="legend-dot on"></span><span>1 \u2014 ON</span></div>' +
                         '<div class="legend-item"><span class="legend-dot off"></span><span>0 \u2014 OFF</span></div>';
      plateVis.appendChild(legend);

      return { plateVis: plateVis, grid: grid, header: header };
    }

    var matrices = [];
    if (shouldSplit) {
      matrices.push(createMatrix(0, 12, (i18n.decoderTitle || 'PENGER BINARY DECODER') + ' (' + (i18n.part1 || 'PART 1') + ')'));
      matrices.push(createMatrix(12, count, (i18n.decoderTitle || 'PENGER BINARY DECODER') + ' (' + (i18n.part2 || 'PART 2') + ')'));
    } else {
      matrices.push(createMatrix(0, count, (i18n.decoderTitle || 'PENGER BINARY DECODER')));
    }

    matrices.forEach(function(matrix) {
      container.appendChild(matrix.plateVis);
    });

    var lastTouchEnd = 0;

    function setupGridListeners(grid, header) {
      var startIdx = parseInt(grid.getAttribute('data-start'), 10);

      grid.onclick = function (e) {
        if (Date.now() - lastTouchEnd < 400) return;
        var cell = e.target.closest('.dot-cell');
        if (!cell) return;
        var w = parseInt(cell.getAttribute('data-w'), 10);
        var b = parseInt(cell.getAttribute('data-b'), 10);
        var dot = cell.querySelector('.dot');
        decodeBits[w][b] = decodeBits[w][b] ? 0 : 1;
        decodeTouched[w] = true;
        dot.classList.toggle('on', !!decodeBits[w][b]);
        updateDecodeResult();
      };

      grid.addEventListener('mouseover', function (e) {
        if (isTouchDevice) return;
        var cell = e.target.closest('.dot-cell');
        if (!cell) { clearColumnHighlight(grid, header); return; }
        var w = parseInt(cell.getAttribute('data-w'), 10);
        highlightColumn(grid, header, w - startIdx);
      });
      grid.addEventListener('mouseleave', function () {
        clearColumnHighlight(grid, header);
      });

      var paintMode = -1;
      var lastPainted = null;

      grid.addEventListener('touchstart', function (e) {
        var cell = e.target.closest('.dot-cell');
        if (!cell) return;
        var w = parseInt(cell.getAttribute('data-w'), 10);
        var b = parseInt(cell.getAttribute('data-b'), 10);
        var dot = cell.querySelector('.dot');
        decodeBits[w][b] = decodeBits[w][b] ? 0 : 1;
        decodeTouched[w] = true;
        paintMode = decodeBits[w][b];
        lastPainted = w + ',' + b;
        dot.classList.toggle('on', !!decodeBits[w][b]);
        updateDecodeResult();
        e.preventDefault();
      }, { passive: false });

      grid.addEventListener('touchmove', function (e) {
        if (paintMode < 0) return;
        var touch = e.touches[0];
        var el = document.elementFromPoint(touch.clientX, touch.clientY);
        if (!el) return;
        var cell = el.closest('.dot-cell');
        if (!cell || !grid.contains(cell)) return;
        var w = parseInt(cell.getAttribute('data-w'), 10);
        var b = parseInt(cell.getAttribute('data-b'), 10);
        var key = w + ',' + b;
        if (key === lastPainted) return;
        lastPainted = key;
        decodeBits[w][b] = paintMode;
        decodeTouched[w] = true;
        cell.querySelector('.dot').classList.toggle('on', !!paintMode);
        updateDecodeResult();
        e.preventDefault();
      }, { passive: false });

      grid.addEventListener('touchend', function () { paintMode = -1; lastPainted = null; lastTouchEnd = Date.now(); });
      grid.addEventListener('touchcancel', function () { paintMode = -1; lastPainted = null; });
    }

    matrices.forEach(function(matrix) {
      setupGridListeners(matrix.grid, matrix.header);
    });

    updateDecodeResult();
  }

  function updateDecodeResult() {
    var count = decWordCount;
    var words = [];
    var anyInput = false;
    var hasInvalid = false;

    for (var w = 0; w < count; w++) {
      var bits = decodeBits[w];
      var displayIdx = 0;
      var binStr = '';
      for (var b = 0; b < BIT_COUNT; b++) {
        binStr += bits[b];
        if (bits[b]) displayIdx += BIT_POSITIONS[b];
      }
      if (decodeTouched[w]) anyInput = true;
      var isEmpty = !decodeTouched[w];
      var valid = isValidIndex(displayIdx);
      var word = valid ? getWordByIndex(displayIdx) : null;
      var isInvalid = decodeTouched[w] && !valid;
      if (isInvalid) hasInvalid = true;

      words.push({ word: word, displayIdx: displayIdx, empty: isEmpty, invalid: isInvalid, bin: binStr });
    }

    var table = $('decodeWordTable');
    table.innerHTML = '<div class="word-row table-head"><span>#</span><span>' + (i18n.colWord || 'Word') + '</span><span>' + (i18n.colIndex || 'Index') + '</span><span>' + (i18n.colPunch || 'Punch') + '</span></div>';

    words.forEach(function (wi, i) {
      var wordDisplay = wi.empty ? '\u2014' : (wi.invalid ? '\u2014' : wi.word);
      var displayIdxStr = wi.empty ? '\u2014' : String(wi.displayIdx);
      var dotsHTML = wi.empty ? '' : buildMiniDotsHTML(wi.bin);

      var row = document.createElement('div');
      row.className = 'word-row' + (wi.empty ? ' empty' : '') + (wi.invalid ? ' invalid' : '');
      row.innerHTML =
        '<span class="w-num">' + String(i + 1).padStart(2, '0') + '</span>' +
        '<span class="w-word" translate="no">' + wordDisplay + '</span>' +
        '<span class="w-index">' + displayIdxStr + '</span>' +
        '<span class="w-dots">' + dotsHTML + '</span>';

      var detail = document.createElement('div');
      detail.className = 'word-detail';
      if (!wi.empty && !wi.invalid) {
        detail.innerHTML = '<div class="word-detail-inner">' + buildDetailHTML(wi.displayIdx, i + 1) + '</div>';
      }

      row.addEventListener('click', function () {
        if (wi.empty || wi.invalid) return;
        var isExpanded = row.classList.contains('expanded');
        table.querySelectorAll('.word-row.expanded').forEach(function (other) {
          if (other !== row) { other.classList.remove('expanded'); var od = other.nextElementSibling; if (od && od.classList.contains('word-detail')) od.style.maxHeight = '0'; }
        });
        if (isExpanded) { row.classList.remove('expanded'); detail.style.maxHeight = '0'; }
        else { row.classList.add('expanded'); detail.style.maxHeight = detail.scrollHeight + 'px'; }
      });

      table.appendChild(row);
      table.appendChild(detail);
    });

    var seedHTML = '';
    for (var s = 0; s < words.length; s++) {
      var wi = words[s];
      var cls = 'seed-word';
      if (wi.empty) cls += ' empty-word';
      else if (wi.invalid) cls += ' invalid-word';
      var label = wi.empty ? '\u2014' : (wi.invalid ? '\u2014' : wi.word);
      seedHTML += '<span class="' + cls + '" translate="no"><span class="seed-num">' + (s + 1) + '</span>' + label + '</span>';
    }
    var dso = $('decodeSeedOutput');
    dso.innerHTML = seedHTML;
    dso.classList.add('seed-grid');
    dso.oncopy = function (e) { e.preventDefault(); };
    dso.oncut = function (e) { e.preventDefault(); };
    dso.oncontextmenu = function (e) { e.preventDefault(); };

    // Update live column index labels in decoder header
    document.querySelectorAll('.col-idx[data-wh]').forEach(function (el) {
      var w = parseInt(el.getAttribute('data-wh'), 10);
      var displayIdx = 0;
      for (var b = 0; b < BIT_COUNT; b++) displayIdx += decodeBits[w][b] * BIT_POSITIONS[b];
      el.textContent = decodeTouched[w] ? String(displayIdx).padStart(4, '0') : '\u2014';
    });
  }

  document.querySelectorAll('#decWordCount .pill').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('#decWordCount .pill').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      decWordCount = parseInt(btn.getAttribute('data-count'), 10);
      initDecode();
    });
  });

  $('decodeClearBtn').addEventListener('click', function () {
    resetDecodeBits(decWordCount);
    $('decodeMatrixContainer').querySelectorAll('.dot.on').forEach(function (d) { d.classList.remove('on'); });
    updateDecodeResult();
  });

  /* ===== TAB SYSTEM ===== */
  var tabBtns = document.querySelectorAll('.tab-btn');
  var tabPanels = document.querySelectorAll('.tab-panel');

  tabBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = btn.getAttribute('data-tab');
      tabBtns.forEach(function (b) { b.classList.remove('active'); });
      tabPanels.forEach(function (p) { p.classList.remove('active'); });
      btn.classList.add('active');
      $('panel-' + target).classList.add('active');
      window.scrollTo(0, 0);
      var dl = window.dataLayer = window.dataLayer || [];
      dl.push({ event: 'simulator_tab_switch', tab_name: target, page_section: 'simulator-tabs' });
      if (target === 'decode' && !decodeInitialized) initDecode();
    });
  });

  /* ===== EXAMPLE DOTS INIT ===== */
  function initExampleDots(containerId, exampleIdx) {
    var container = document.getElementById(containerId);
    if (!container) return;
    var bin = toBinary(exampleIdx);
    var html = '';
    for (var i = 0; i < bin.length; i++) {
      html += '<span class="dict-example-dot ' + (bin[i] === '1' ? 'on' : 'off') + '"></span>';
    }
    container.innerHTML = html;
  }
  initExampleDots('genExampleDots', 628);  // index 628 = example
  initExampleDots('decExampleDots', 628);  // index 628 = example

  /* ===== DICTIONARY-STYLE EXAMPLE GRIDS (mobile view + FAQ) ===== */
  function initExampleGrid(gridId, formulaId, exampleIdx) {
    var grid = document.getElementById(gridId);
    var formula = document.getElementById(formulaId);
    if (!grid) return;
    var bin = toBinary(exampleIdx);
    var html = '';
    for (var i = 0; i < bin.length; i++) {
      var isOn = bin[i] === '1';
      html += '<div class="detail-binary-col">';
      html += '<div class="detail-binary-cell ' + (isOn ? 'on' : 'off') + '"><span class="detail-binary-digit">' + bin[i] + '</span></div>';
      html += '<span class="detail-binary-weight' + (isOn ? ' active' : '') + '">' + BIT_POSITIONS[i] + '</span>';
      html += '</div>';
    }
    grid.innerHTML = html;
    if (formula) {
      var parts = [];
      for (var f = 0; f < bin.length; f++) {
        if (bin[f] === '1') parts.push('<strong>' + BIT_POSITIONS[f] + '</strong>');
      }
      formula.innerHTML = parts.join(' + ') + ' = <strong>' + exampleIdx + '</strong>';
    }
  }
  // Example grids for generate/decode tabs (shown on mobile)
  initExampleGrid('genExampleGrid', 'genExampleFormula', 628);
  initExampleGrid('decExampleGrid', 'decExampleFormula', 628);

  /* Theme toggle is handled by shared.js */

  /* ===== RESIZE HANDLER FOR MATRICES ===== */
  var lastWidth = window.innerWidth;
  var resizeTimeout;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function() {
      var currentWidth = window.innerWidth;
      var wasDesktop = lastWidth >= 768;
      var isDesktop = currentWidth >= 768;

      if (wasDesktop !== isDesktop) {
        if (decodeInitialized) {
          initDecode();
        }
        if (genIndices.length > 0) {
          renderGenPlate(genIndices);
        }
      }
      lastWidth = currentWidth;
    }, 250);
  });

  // Dict picker: full custom scroll engine with spring physics (wheel / picker)
  document.querySelectorAll('.lp-guide-dict-body').forEach(function(body) {
    // --- Physics tuning ---
    var SPRING_STIFFNESS = 300;   // snap-back spring force
    var SPRING_DAMPING   = 28;    // snap-back damping (critical ~2*sqrt(stiffness))
    var DECEL_RATE       = 0.97;  // momentum friction per frame (lower = more friction)
    var RUBBER_FACTOR    = 0.35;  // overscroll rubber-band resistance
    var SETTLE_VEL       = 0.15;  // velocity threshold to stop animation
    var SETTLE_POS       = 0.25;  // position threshold to stop animation
    var DT               = 1 / 60;
    var VELOCITY_SCALE   = 1.0;   // touch velocity multiplier for momentum
    var WHEEL_AMOUNT     = 40;    // pixels per wheel delta unit
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // --- DOM setup ---
    var rows = Array.prototype.slice.call(body.querySelectorAll('.lp-guide-dict-row'));
    if (!rows.length) return;

    // Wrap rows in a track container for transform-based scrolling
    var track = document.createElement('div');
    track.className = 'lp-guide-dict-track';
    while (body.firstChild) track.appendChild(body.firstChild);
    body.appendChild(track);

    // --- State ---
    var rowHeight    = rows[0].offsetHeight;
    var viewH        = body.clientHeight;
    var centerOffset = 0; // px from top of track to center the first row
    var maxOffset    = 0; // maximum scroll offset (last row centerable)
    var offset       = 0; // current virtual scroll position (0 = first row centered)
    var velocity     = 0;
    var activeIndex  = -1;
    var animating    = false;
    var phase        = 'idle'; // 'idle' | 'dragging' | 'momentum' | 'spring'
    var rafId        = null;

    // Touch / mouse tracking
    var dragging     = false;
    var dragStartY   = 0;
    var dragStartOff = 0;
    var lastTouchY   = 0;
    var lastTouchT   = 0;
    var touchVel     = 0;

    // --- Geometry ---
    function recalcGeometry() {
      rowHeight    = rows[0].offsetHeight;
      viewH        = body.clientHeight;
      centerOffset = Math.floor((viewH - rowHeight) / 2);
      maxOffset    = Math.max(0, (rows.length - 1) * rowHeight);
    }

    function getIdxForOffset(off) {
      var idx = Math.round(off / rowHeight);
      return Math.max(0, Math.min(idx, rows.length - 1));
    }

    function getOffsetForIdx(idx) {
      return idx * rowHeight;
    }

    // Clamp offset within bounds (no rubber-band)
    function clampOffset(off) {
      return Math.max(0, Math.min(off, maxOffset));
    }

    // Rubber-band: allow overscroll but with increasing resistance
    function rubberBand(off) {
      if (off < 0) return off * RUBBER_FACTOR;
      if (off > maxOffset) return maxOffset + (off - maxOffset) * RUBBER_FACTOR;
      return off;
    }

    // Inverse rubber-band: convert visual offset back to logical
    function inverseRubber(visualOff) {
      if (visualOff < 0) return visualOff / RUBBER_FACTOR;
      if (visualOff > maxOffset) return maxOffset + (visualOff - maxOffset) / RUBBER_FACTOR;
      return visualOff;
    }

    // --- Rendering ---
    function applyTransform(off) {
      var visualOff = rubberBand(off);
      track.style.transform = 'translateY(' + (centerOffset - visualOff) + 'px)';
    }

    function updateActiveRow() {
      // Active row is fixed — don't change highlight on scroll
    }

    function render() {
      applyTransform(offset);
      updateActiveRow();
    }

    // --- Animation loop ---
    function startAnim() {
      if (animating) return;
      animating = true;
      rafId = requestAnimationFrame(tick);
    }

    function stopAnim() {
      animating = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    }

    function tick() {
      if (!animating) return;

      if (phase === 'momentum') {
        // Apply deceleration
        offset += velocity * DT * 60;
        velocity *= DECEL_RATE;

        // If overscrolling, switch to spring immediately
        if (offset < 0 || offset > maxOffset) {
          phase = 'spring';
          // Carry velocity into spring
        }

        // If velocity is low enough, snap to nearest
        if (Math.abs(velocity) < 1.5) {
          phase = 'spring';
          velocity = 0;
        }

        render();
        rafId = requestAnimationFrame(tick);

      } else if (phase === 'spring') {
        var target = getOffsetForIdx(activeIndex);
        var displacement = offset - target;
        var springForce = -SPRING_STIFFNESS * displacement - SPRING_DAMPING * velocity;
        velocity += springForce * DT;
        offset += velocity * DT;

        render();

        if (Math.abs(velocity) < SETTLE_VEL && Math.abs(offset - target) < SETTLE_POS) {
          offset = target;
          velocity = 0;
          phase = 'idle';
          render();
          stopAnim();
          return;
        }
        rafId = requestAnimationFrame(tick);

      } else {
        stopAnim();
      }
    }

    // --- Snap (for reduced motion or programmatic) ---
    function snapToIndex(idx, animate) {
      var target = getOffsetForIdx(idx);
      if (!animate || reducedMotion) {
        offset = target;
        velocity = 0;
        phase = 'idle';
        stopAnim();
        render();
        return;
      }
      phase = 'spring';
      startAnim();
    }

    // --- Touch handling ---
    function onTouchStart(e) {
      stopAnim();
      phase = 'dragging';
      dragging = true;
      var touch = e.touches[0];
      dragStartY   = touch.clientY;
      dragStartOff = offset;
      lastTouchY   = touch.clientY;
      lastTouchT   = Date.now();
      touchVel     = 0;
    }

    function onTouchMove(e) {
      if (!dragging) return;
      var touch = e.touches[0];
      var dy = dragStartY - touch.clientY;
      // Compute logical offset (inverse rubber-band for overscroll resistance)
      offset = dragStartOff + dy;

      // Track velocity with smoothing
      var now = Date.now();
      var dt = now - lastTouchT;
      if (dt > 0) {
        var instantVel = (lastTouchY - touch.clientY) / dt * 1000;
        touchVel = touchVel * 0.6 + instantVel * 0.4; // smoothed
      }
      lastTouchY = touch.clientY;
      lastTouchT = now;

      render();
    }

    function onTouchEnd() {
      if (!dragging) return;
      dragging = false;

      // Always snap back to the initial active row
      phase = 'spring';
      velocity = 0;
      startAnim();
    }

    // --- Mouse drag handling ---
    var mouseDragging = false;
    function onMouseDown(e) {
      // Ignore right-click
      if (e.button !== 0) return;
      e.preventDefault();
      stopAnim();
      phase = 'dragging';
      mouseDragging = true;
      dragStartY   = e.clientY;
      dragStartOff = offset;
      lastTouchY   = e.clientY;
      lastTouchT   = Date.now();
      touchVel     = 0;

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    }

    function onMouseMove(e) {
      if (!mouseDragging) return;
      var dy = dragStartY - e.clientY;
      offset = dragStartOff + dy;

      var now = Date.now();
      var dt = now - lastTouchT;
      if (dt > 0) {
        var instantVel = (lastTouchY - e.clientY) / dt * 1000;
        touchVel = touchVel * 0.6 + instantVel * 0.4;
      }
      lastTouchY = e.clientY;
      lastTouchT = now;

      render();
    }

    function onMouseUp() {
      if (!mouseDragging) return;
      mouseDragging = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      // Always snap back to the initial active row
      phase = 'spring';
      velocity = 0;
      startAnim();
    }

    // --- Wheel handling ---
    function onWheel(e) {
      e.preventDefault();
      // During spring/momentum, absorb wheel and redirect
      if (phase === 'spring' || phase === 'momentum') {
        stopAnim();
        velocity = 0;
      }

      var delta = e.deltaY;
      // Normalize deltaMode
      if (e.deltaMode === 1) delta *= rowHeight; // lines
      else if (e.deltaMode === 2) delta *= viewH; // pages
      else delta = delta * (WHEEL_AMOUNT / 100); // pixels — scale down

      offset = clampOffset(offset + delta);
      render();

      // After wheel stops, spring to nearest
      clearTimeout(onWheel._timer);
      onWheel._timer = setTimeout(function() {
        phase = 'spring';
        startAnim();
      }, 120);
    }

    // --- Event binding ---
    body.addEventListener('touchstart', onTouchStart, { passive: true });
    body.addEventListener('touchmove', onTouchMove, { passive: true });
    body.addEventListener('touchend', onTouchEnd, { passive: true });
    body.addEventListener('touchcancel', onTouchEnd, { passive: true });
    body.addEventListener('mousedown', onMouseDown);
    body.addEventListener('wheel', onWheel, { passive: false });

    // Prevent text selection during drag
    body.style.userSelect = 'none';
    body.style.webkitUserSelect = 'none';
    body.style.touchAction = 'none';

    // --- Resize handling ---
    var resizeTimer = null;
    function handleResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function() {
        recalcGeometry();
        var idx = activeIndex >= 0 ? activeIndex : 0;
        offset = getOffsetForIdx(idx);
        velocity = 0;
        phase = 'idle';
        stopAnim();
        render();
      }, 100);
    }

    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(handleResize).observe(body);
    } else {
      window.addEventListener('resize', handleResize);
    }

    // --- Init ---
    recalcGeometry();

    // Determine initial active row from HTML markup
    var initialActive = body.querySelector('.lp-guide-dict-active');
    if (initialActive) {
      activeIndex = rows.indexOf(initialActive);
    }
    if (activeIndex < 0) activeIndex = 0;

    // Center on initial active row (no animation)
    offset = getOffsetForIdx(activeIndex);
    render();
  });

})();
