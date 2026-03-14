(function () {
  'use strict';

  /* ===== BIP39 TEST VECTOR ===== */
  var TEST_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
  var TEST_WORDS = TEST_MNEMONIC.split(' ');

  /* ===== DOM REFS ===== */
  var seedDisplay = document.getElementById('simSeedDisplay');
  var passInput   = document.getElementById('simPassInput');
  var clearBtn    = document.getElementById('simClearBtn');
  var seedOut     = document.getElementById('simSeedOut');
  var addrOut     = document.getElementById('simAddrOut');
  var spinner     = document.getElementById('simSpinner');

  if (!seedDisplay || !passInput) return;

  /* Render seed words */
  seedDisplay.textContent = TEST_MNEMONIC;

  /* ===== HELPERS ===== */
  function hexFromBuf(buf) {
    return Array.prototype.map.call(new Uint8Array(buf), function (b) {
      return ('0' + b.toString(16)).slice(-2);
    }).join('');
  }

  function strToUtf8(str) {
    return new TextEncoder().encode(str);
  }

  /* ===== PBKDF2-HMAC-SHA512 (Web Crypto) ===== */
  function pbkdf2Seed(mnemonic, passphrase) {
    var password = strToUtf8(mnemonic);
    var salt = strToUtf8('mnemonic' + passphrase);

    return crypto.subtle.importKey('raw', password, 'PBKDF2', false, ['deriveBits'])
      .then(function (key) {
        return crypto.subtle.deriveBits(
          { name: 'PBKDF2', salt: salt, iterations: 2048, hash: 'SHA-512' },
          key,
          512
        );
      });
  }

  /* ===== HMAC-SHA512 for BIP32 ===== */
  function hmacSHA512(key, data) {
    return crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-512' }, false, ['sign'])
      .then(function (k) {
        return crypto.subtle.sign('HMAC', k, data);
      });
  }

  /* ===== SHA-256 double hash ===== */
  function sha256(data) {
    return crypto.subtle.digest('SHA-256', data);
  }
  function hash160Placeholder(pubKeyHex) {
    /* We derive a deterministic placeholder using first 20 bytes of SHA-256(pubkey)
       since RIPEMD-160 is not available in Web Crypto. This is sufficient for demo purposes. */
    var bytes = new Uint8Array(pubKeyHex.length / 2);
    for (var i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(pubKeyHex.substr(i * 2, 2), 16);
    }
    return sha256(bytes.buffer).then(function (h) {
      return new Uint8Array(h).slice(0, 20);
    });
  }

  /* ===== BASE58CHECK ===== */
  var BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  function base58check(payload) {
    /* payload is Uint8Array (version + hash160) */
    return sha256(payload.buffer).then(function (h1) {
      return sha256(h1).then(function (h2) {
        var checksum = new Uint8Array(h2).slice(0, 4);
        var full = new Uint8Array(payload.length + 4);
        full.set(payload);
        full.set(checksum, payload.length);

        /* Convert to base58 */
        var num = BigInt(0);
        for (var i = 0; i < full.length; i++) {
          num = num * BigInt(256) + BigInt(full[i]);
        }
        var result = '';
        while (num > BigInt(0)) {
          var rem = Number(num % BigInt(58));
          num = num / BigInt(58);
          result = BASE58_ALPHABET[rem] + result;
        }
        /* Leading zeros */
        for (var j = 0; j < full.length && full[j] === 0; j++) {
          result = '1' + result;
        }
        return result;
      });
    });
  }

  /* ===== SIMPLIFIED BIP32 KEY DERIVATION ===== */
  /* Derives m/44'/0'/0'/0/x for demo — uses HMAC-SHA512 chain only.
     We don't do full secp256k1 point math (no library loaded).
     Instead, we derive deterministic unique "addresses" from the seed
     that change with every passphrase character, which is the educational purpose. */
  function deriveAddresses(seedHex, count) {
    var seedBytes = new Uint8Array(seedHex.length / 2);
    for (var i = 0; i < seedBytes.length; i++) {
      seedBytes[i] = parseInt(seedHex.substr(i * 2, 2), 16);
    }

    /* Master key: HMAC-SHA512(key="Bitcoin seed", data=seed) */
    var btcSeedKey = strToUtf8('Bitcoin seed');

    return hmacSHA512(btcSeedKey, seedBytes).then(function (master) {
      var masterBytes = new Uint8Array(master);

      /* Chain down path segments deterministically */
      var pathSegments = [
        0x8000002C, /* 44' */
        0x80000000, /* 0'  */
        0x80000000, /* 0'  */
        0x00000000  /* 0   */
      ];

      var chain = Promise.resolve(masterBytes);
      pathSegments.forEach(function (seg) {
        chain = chain.then(function (current) {
          var data = new Uint8Array(37);
          data[0] = 0;
          data.set(current.slice(0, 32), 1);
          data[33] = (seg >>> 24) & 0xFF;
          data[34] = (seg >>> 16) & 0xFF;
          data[35] = (seg >>> 8) & 0xFF;
          data[36] = seg & 0xFF;
          return hmacSHA512(current.slice(32, 64), data).then(function (r) {
            return new Uint8Array(r);
          });
        });
      });

      return chain.then(function (accountKey) {
        /* Derive count child keys at index 0..count-1 */
        var addrPromises = [];
        for (var idx = 0; idx < count; idx++) {
          (function (childIdx) {
            var p = (function () {
              var data = new Uint8Array(37);
              data[0] = 0;
              data.set(accountKey.slice(0, 32), 1);
              data[33] = 0;
              data[34] = 0;
              data[35] = 0;
              data[36] = childIdx;
              return hmacSHA512(accountKey.slice(32, 64), data).then(function (childRaw) {
                var child = new Uint8Array(childRaw);
                var keyHex = hexFromBuf(child.slice(0, 32).buffer);
                return hash160Placeholder(keyHex).then(function (h160) {
                  /* P2PKH: version byte 0x00 + hash160 */
                  var payload = new Uint8Array(21);
                  payload[0] = 0x00;
                  payload.set(h160, 1);
                  return base58check(payload);
                });
              });
            })();
            addrPromises.push(p);
          })(idx);
        }
        return Promise.all(addrPromises);
      });
    });
  }

  /* ===== RENDER ===== */
  var debounceTimer = null;
  var computeId = 0;

  function updateSimulator() {
    var passphrase = passInput.value;
    var myId = ++computeId;

    spinner.hidden = false;

    pbkdf2Seed(TEST_MNEMONIC, passphrase).then(function (seedBuf) {
      if (myId !== computeId) return;
      var hex = hexFromBuf(seedBuf);

      /* Render seed hex */
      seedOut.textContent = hex;
      seedOut.querySelector('.sim-placeholder-text') && seedOut.querySelector('.sim-placeholder-text').remove();

      return deriveAddresses(hex, 3).then(function (addrs) {
        if (myId !== computeId) return;
        spinner.hidden = true;

        addrOut.innerHTML = '';
        addrs.forEach(function (addr, i) {
          var row = document.createElement('div');
          row.className = 'sim-addr-row';
          row.innerHTML =
            '<span class="sim-addr-idx">' + i + '</span>' +
            '<span class="sim-addr-val">' + addr + '</span>';
          addrOut.appendChild(row);
        });
      });
    }).catch(function () {
      if (myId !== computeId) return;
      spinner.hidden = true;
      seedOut.textContent = 'Error computing seed';
    });
  }

  /* ===== EVENT LISTENERS ===== */
  passInput.addEventListener('input', function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(updateSimulator, 200);
  });

  clearBtn.addEventListener('click', function () {
    passInput.value = '';
    passInput.focus();
    clearTimeout(debounceTimer);
    updateSimulator();
  });

  /* Initial computation with empty passphrase */
  updateSimulator();

})();
