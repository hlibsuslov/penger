(function () {
  'use strict';

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

  /* ===== BIP39 WORDLIST ===== */
  var BIP39 = "abandon ability able about above absent absorb abstract absurd abuse access accident account accuse achieve acid acoustic acquire across act action actor actress actual adapt add addict address adjust admit adult advance advice aerobic affair afford afraid again age agent agree ahead aim air airport aisle alarm album alcohol alert alien all alley allow almost alone alpha already also alter always amateur amazing among amount amused analyst anchor ancient anger angle angry animal ankle announce annual another answer antenna antique anxiety any apart apology appear apple approve april arch arctic area arena argue arm armed armor army around arrange arrest arrive arrow art artefact artist artwork ask aspect assault asset assist assume asthma athlete atom attack attend attitude attract auction audit august aunt author auto autumn average avocado avoid awake aware away awesome awful awkward axis baby bachelor bacon badge bag balance balcony ball bamboo banana banner bar barely bargain barrel base basic basket battle beach bean beauty because become beef before begin behave behind believe below belt bench benefit best betray better between beyond bicycle bid bike bind biology bird birth bitter black blade blame blanket blast bleak bless blind blood blossom blouse blue blur blush board boat body boil bomb bone bonus book boost border boring borrow boss bottom bounce box boy bracket brain brand brass brave bread breeze brick bridge brief bright bring brisk broccoli broken bronze broom brother brown brush bubble buddy budget buffalo build bulb bulk bullet bundle bunker burden burger burst bus business busy butter buyer buzz cabbage cabin cable cactus cage cake call calm camera camp can canal cancel candy cannon canoe canvas canyon capable capital captain car carbon card cargo carpet carry cart case cash casino castle casual cat catalog catch category cattle caught cause caution cave ceiling celery cement census century cereal certain chair chalk champion change chaos chapter charge chase chat cheap check cheese chef cherry chest chicken chief child chimney choice choose chronic chuckle chunk churn cigar cinnamon circle citizen city civil claim clap clarify claw clay clean clerk clever click client cliff climb clinic clip clock clog close cloth cloud clown club clump cluster clutch coach coast coconut code coffee coil coin collect color column combine come comfort comic common company concert conduct confirm congress connect consider control convince cook cool copper copy coral core corn correct cost cotton couch country couple course cousin cover coyote crack cradle craft cram crane crash crater crawl crazy cream credit creek crew cricket crime crisp critic crop cross crouch crowd crucial cruel cruise crumble crunch crush cry crystal cube culture cup cupboard curious current curtain curve cushion custom cute cycle dad damage damp dance danger daring dash daughter dawn day deal debate debris decade december decide decline decorate decrease deer defense define defy degree delay deliver demand demise denial dentist deny depart depend deposit depth deputy derive describe desert design desk despair destroy detail detect develop device devote diagram dial diamond diary dice diesel diet differ digital dignity dilemma dinner dinosaur direct dirt disagree discover disease dish dismiss disorder display distance divert divide divorce dizzy doctor document dog doll dolphin domain donate donkey donor door dose double dove draft dragon drama drastic draw dream dress drift drill drink drip drive drop drum dry duck dumb dune during dust dutch duty dwarf dynamic eager eagle early earn earth easily east easy echo ecology economy edge edit educate effort egg eight either elbow elder electric elegant element elephant elevator elite else embark embody embrace emerge emotion employ empower empty enable enact end endless endorse enemy energy enforce engage engine enhance enjoy enlist enough enrich enroll ensure enter entire entry envelope episode equal equip era erase erode erosion error erupt escape essay essence estate eternal ethics evidence evil evoke evolve exact example excess exchange excite exclude excuse execute exercise exhaust exhibit exile exist exit exotic expand expect expire explain expose express extend extra eye eyebrow fabric face faculty fade faint faith fall false fame family famous fan fancy fantasy farm fashion fat fatal father fatigue fault favorite feature february federal fee feed feel female fence festival fetch fever few fiber fiction field figure file film filter final find fine finger finish fire firm first fiscal fish fit fitness fix flag flame flash flat flavor flee flight flip float flock floor flower fluid flush fly foam focus fog foil fold follow food foot force forest forget fork fortune forum forward fossil foster found fox fragile frame frequent fresh friend fringe frog front frost frown frozen fruit fuel fun funny furnace fury future gadget gain galaxy gallery game gap garage garbage garden garlic garment gas gasp gate gather gauge gaze general genius genre gentle genuine gesture ghost giant gift giggle ginger giraffe girl give glad glance glare glass glide glimpse globe gloom glory glove glow glue goat goddess gold good goose gorilla gospel gossip govern gown grab grace grain grant grape grass gravity great green grid grief grit grocery group grow grunt guard guess guide guilt guitar gun gym habit hair half hammer hamster hand happy harbor hard harsh harvest hat have hawk hazard head health heart heavy hedgehog height hello helmet help hen hero hidden high hill hint hip hire history hobby hockey hold hole holiday hollow home honey hood hope horn horror horse hospital host hotel hour hover hub huge human humble humor hundred hungry hunt hurdle hurry hurt husband hybrid ice icon idea identify idle ignore ill illegal illness image imitate immense immune impact impose improve impulse inch include income increase index indicate indoor industry infant inflict inform inhale inherit initial inject injury inmate inner innocent input inquiry insane insect inside inspire install intact interest into invest invite involve iron island isolate issue item ivory jacket jaguar jar jazz jealous jeans jelly jewel job join joke journey joy judge juice jump jungle junior junk just kangaroo keen keep ketchup key kick kid kidney kind kingdom kiss kit kitchen kite kitten kiwi knee knife knock know lab label labor ladder lady lake lamp language laptop large later latin laugh laundry lava law lawn lawsuit layer lazy leader leaf learn leave lecture left leg legal legend leisure lemon lend length lens leopard lesson letter level liar liberty library license life lift light like limb limit link lion liquid list little live lizard load loan lobster local lock logic lonely long loop lottery loud lounge love loyal lucky luggage lumber lunar lunch luxury lyrics machine mad magic magnet maid mail main major make mammal man manage mandate mango mansion manual maple marble march margin marine market marriage mask mass master match material math matrix matter maximum maze meadow mean measure meat mechanic medal media melody melt member memory mention menu mercy merge merit merry mesh message metal method middle midnight milk million mimic mind minimum minor minute miracle mirror misery miss mistake mix mixed mixture mobile model modify mom moment monitor monkey monster month moon moral more morning mosquito mother motion motor mountain mouse move movie much muffin mule multiply muscle museum mushroom music must mutual myself mystery myth naive name napkin narrow nasty nation nature near neck need negative neglect neither nephew nerve nest net network neutral never news next nice night noble noise nominee noodle normal north nose notable note nothing notice novel now nuclear number nurse nut oak obey object oblige obscure observe obtain obvious occur ocean october odor off offer office often oil okay old olive olympic omit once one onion online only open opera opinion oppose option orange orbit orchard order ordinary organ orient original orphan ostrich other outdoor outer output outside oval oven over own owner oxygen oyster ozone pact paddle page pair palace palm panda panel panic panther paper parade parent park parrot party pass patch path patient patrol pattern pause pave payment peace peanut pear peasant pelican pen penalty pencil people pepper perfect permit person pet phone photo phrase physical piano picnic picture piece pig pigeon pill pilot pink pioneer pipe pistol pitch pizza place planet plastic plate play please pledge pluck plug plunge poem poet point polar pole police pond pony pool popular portion position possible post potato pottery poverty powder power practice praise predict prefer prepare present pretty prevent price pride primary print priority prison private prize problem process produce profit program project promote proof property prosper protect proud provide public pudding pull pulp pulse pumpkin punch pupil puppy purchase purity purpose purse push put puzzle pyramid quality quantum quarter question quick quit quiz quote rabbit raccoon race rack radar radio rail rain raise rally ramp ranch random range rapid rare rate rather raven raw razor ready real reason rebel rebuild recall receive recipe record recycle reduce reflect reform refuse region regret regular reject relax release relief rely remain remember remind remove render renew rent reopen repair repeat replace report require rescue resemble resist resource response result retire retreat return reunion reveal review reward rhythm rib ribbon rice rich ride ridge rifle right rigid ring riot ripple risk ritual rival river road roast robot robust rocket romance roof rookie room rose rotate rough round route royal rubber rude rug rule run runway rural sad saddle sadness safe sail salad salmon salon salt salute same sample sand satisfy satoshi sauce sausage save say scale scan scare scatter scene scheme school science scissors scorpion scout scrap screen script scrub sea search season seat second secret section security seed seek segment select sell seminar senior sense sentence series service session settle setup seven shadow shaft shallow share shed shell sheriff shield shift shine ship shiver shock shoe shoot shop short shoulder shove shrimp shrug shuffle shy sibling sick side siege sight sign silent silk silly silver similar simple since sing siren sister situate six size skate sketch ski skill skin skirt skull slab slam sleep slender slice slide slight slim slogan slot slow slush small smart smile smoke smooth snack snake snap sniff snow soap soccer social sock soda soft solar soldier solid solution solve someone song soon sorry sort soul sound soup source south space spare spatial spawn speak special speed spell spend sphere spice spider spike spin spirit split spoil sponsor spoon sport spot spray spread spring spy square squeeze squirrel stable stadium staff stage stairs stamp stand start state stay steak steel stem step stereo stick still sting stock stomach stone stool story stove strategy street strike strong struggle student stuff stumble style subject submit subway success such sudden suffer sugar suggest suit summer sun sunny sunset super supply supreme sure surface surge surprise surround survey suspect sustain swallow swamp swap swarm swear sweet swift swim swing switch sword symbol symptom syrup system table tackle tag tail talent talk tank tape target task taste tattoo taxi teach team tell ten tenant tennis tent term test text thank that theme then theory there they thing this thought three thrive throw thumb thunder ticket tide tiger tilt timber time tiny tip tired tissue title toast tobacco today toddler toe together toilet token tomato tomorrow tone tongue tonight tool tooth top topic topple torch tornado tortoise toss total tourist toward tower town toy track trade traffic tragic train transfer trap trash travel tray treat tree trend trial tribe trick trigger trim trip trophy trouble truck true truly trumpet trust truth try tube tuition tumble tuna tunnel turkey turn turtle twelve twenty twice twin twist two type typical ugly umbrella unable unaware uncle uncover under undo unfair unfold unhappy uniform unique unit universe unknown unlock until unusual unveil update upgrade uphold upon upper upset urban urge usage use used useful useless usual utility vacant vacuum vague valid valley valve van vanish vapor various vast vault vehicle velvet vendor venture venue verb verify version very vessel veteran viable vibrant vicious victory video view village vintage violin virtual virus visa visit visual vital vivid vocal voice void volcano volume vote voyage wage wagon wait walk wall walnut want warfare warm warrior wash wasp waste water wave way wealth weapon wear weasel weather web wedding weekend weird welcome west wet whale what wheat wheel when where whip whisper wide width wife wild will win window wine wing wink winner winter wire wisdom wise wish witness wolf woman wonder wood wool word work world worry worth wrap wreck wrestle wrist write wrong yard year yellow you young youth zebra zero zone zoo";
  var wordlist = BIP39.split(' ');
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
  function generateMnemonic(wordCount) {
    var entropyBits = ENTROPY_MAP[wordCount];
    var entropyBytes = entropyBits / 8;
    var entropy = new Uint8Array(entropyBytes);
    crypto.getRandomValues(entropy);

    var hash = sha256sync(entropy);
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
    return indices;
  }

  /* ===== DETAIL HTML BUILDER ===== */
  // displayIdx: 1..2048
  function buildDetailHTML(displayIdx, wordNum) {
    var word = getWordByIndex(displayIdx);
    var bin = toBinary(displayIdx);
    var html = '';
    html += '<div class="detail-word-header">';
    html += '<span class="detail-word-name" translate="no">' + word + '</span>';
    html += '<span class="detail-word-index">Word #' + wordNum + ' \u2014 Index: ' + String(displayIdx).padStart(4, '0') + '</span>';
    html += '</div>';
    html += '<div class="detail-bits-row">';
    for (var i = 0; i < bin.length; i++) {
      html += '<span class="detail-bit ' + (bin[i] === '1' ? 'b1' : 'b0') + '">' + bin[i] + '</span>';
    }
    html += '</div>';
    html += '<table class="detail-table">';
    html += '<thead><tr><th>Bit Weight</th><th>Value</th><th>Running Sum</th><th>Action</th></tr></thead><tbody>';
    var runSum = 0;
    for (var b = 0; b < BIT_COUNT; b++) {
      var pos = BIT_POSITIONS[b];
      var bitVal = parseInt(bin[b], 10);
      if (bitVal === 1) runSum += pos;
      html += '<tr>'
        + '<td class="td-pos">' + pos + '</td>'
        + '<td class="' + (bitVal === 1 ? 'td-active' : '') + '">' + bitVal + '</td>'
        + '<td class="' + (bitVal === 1 ? 'td-sum' : '') + '">' + (bitVal === 1 ? runSum : '&mdash;') + '</td>'
        + '<td>' + (bitVal === 1 ? '<svg class="action-icon punch" width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5" fill="currentColor"/></svg> punch' : '<svg class="action-icon skip" width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg> skip') + '</td>'
        + '</tr>';
    }
    html += '</tbody></table>';
    html += '<div class="detail-punch-label">Punch pattern (top &rarr; bottom):</div>';
    html += '<div class="detail-punch-dots">';
    for (var d = 0; d < bin.length; d++) {
      html += '<span class="detail-punch-dot ' + (bin[d] === '1' ? 'on' : 'off') + '"></span>';
    }
    html += '</div>';
    return html;
  }

  /* ===== DOM REFS ===== */
  var $ = function(id) { return document.getElementById(id); };

  /* ===== GENERATE TAB ===== */
  var genWordCount = 12;
  var genIndices = []; // display indices 1..2048

  function updateGenInfo() {
    var ent = ENTROPY_MAP[genWordCount];
    var cs = ent / 32;
    $('genEntropy').textContent = ent + ' bits';
    $('genChecksum').textContent = cs + ' bits';
    $('genTotalBits').innerHTML = (ent + cs) + ' bits (' + genWordCount + ' &times; 11 + ' + genWordCount + ' display offset)';
    $('genPlateBits').textContent = (genWordCount * BIT_COUNT) + ' positions (' + genWordCount + ' \u00d7 ' + BIT_COUNT + ')';
  }

  document.querySelectorAll('#genWordCount .pill').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('#genWordCount .pill').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      genWordCount = parseInt(btn.getAttribute('data-count'), 10);
      updateGenInfo();
    });
  });

  function renderGenSeed(indices) {
    var seedEl = $('genSeedOutput');
    var words = indices.map(function (displayIdx) { return getWordByIndex(displayIdx); });
    seedEl.textContent = words.join(' ');
    seedEl.setAttribute('translate', 'no');
    seedEl.oncopy = function (e) { e.preventDefault(); };
    seedEl.oncut = function (e) { e.preventDefault(); };
    seedEl.oncontextmenu = function (e) { e.preventDefault(); };
    $('genStatus').textContent = 'GENERATED / ' + indices.length + ' WORDS / ' + (indices.length * BIT_COUNT) + ' PLATE BITS';
  }

  function renderGenWords(indices) {
    var table = $('genWordTable');
    table.innerHTML = '<div class="word-row table-head"><span>#</span><span>Word</span><span>Index</span><span>Binary (12-bit)</span><span>Punch</span></div>';

    indices.forEach(function (displayIdx, i) {
      var word = getWordByIndex(displayIdx);
      var bin = toBinary(displayIdx);
      var row = document.createElement('div');
      row.className = 'word-row';
      row.innerHTML =
        '<span class="w-num">' + String(i + 1).padStart(2, '0') + '</span>' +
        '<span class="w-word" translate="no">' + word + '</span>' +
        '<span class="w-index">' + displayIdx + '</span>' +
        '<span class="w-binary">' + formatBinaryHTML(bin) + '</span>' +
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
      subtitle.textContent = wordCount + ' words \u00d7 ' + BIT_COUNT + ' bits = ' + (wordCount * BIT_COUNT) + ' positions' + (shouldSplit ? ' (Words ' + (startIdx + 1) + '-' + endIdx + ')' : '');
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
      matrices.push(createMatrix(0, 12, 'PENGER BINARY ENCODER (PART 1)', indices));
      matrices.push(createMatrix(12, count, 'PENGER BINARY ENCODER (PART 2)', indices));
    } else {
      matrices.push(createMatrix(0, count, 'PENGER BINARY ENCODER', indices));
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

  $('generateBtn').addEventListener('click', function () {
    genIndices = generateMnemonic(genWordCount);
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

  updateGenInfo();

  /* ===== DECODE TAB ===== */
  var decWordCount = 12;
  var decodeBits = [];
  var decodeTouched = [];
  var decodeInitialized = false;

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
      subtitle.textContent = wordCount + ' words \u00d7 ' + BIT_COUNT + ' bits' + (shouldSplit ? ' (Words ' + (startIdx + 1) + '-' + endIdx + ')' : '');
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
      matrices.push(createMatrix(0, 12, 'PENGER BINARY DECODER (PART 1)'));
      matrices.push(createMatrix(12, count, 'PENGER BINARY DECODER (PART 2)'));
    } else {
      matrices.push(createMatrix(0, count, 'PENGER BINARY DECODER'));
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
    var tableHTML = '<div class="decode-word-row table-head"><span>#</span><span>Index</span><span>Binary (12-bit)</span><span>Punch</span><span>Word</span></div>';

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
      // index 0 means all bits off and untouched — treat as empty placeholder
      var isInvalid = decodeTouched[w] && !valid;
      if (isInvalid) hasInvalid = true;

      words.push({ word: word, displayIdx: displayIdx, empty: isEmpty, invalid: isInvalid, bin: binStr });

      var binHTML = '';
      for (var bi = 0; bi < binStr.length; bi++) {
        binHTML += binStr[bi] === '1' ? '<span class="bit-one">' + binStr[bi] + '</span>' : binStr[bi];
      }

      var rowClass = 'decode-word-row';
      if (isEmpty) rowClass += ' empty';
      if (isInvalid) rowClass += ' invalid';

      var displayIdxStr = isEmpty ? '\u2014' : String(displayIdx);
      var wordDisplay;
      if (isEmpty) {
        wordDisplay = '\u2014';
      } else if (isInvalid) {
        wordDisplay = '\u2014';
      } else {
        wordDisplay = word;
      }

      var dotsHTML = isEmpty ? '' : buildMiniDotsHTML(binStr);
      tableHTML += '<div class="' + rowClass + '">' +
        '<span class="dw-num">' + String(w + 1).padStart(2, '0') + '</span>' +
        '<span class="dw-index">' + displayIdxStr + '</span>' +
        '<span class="dw-binary">' + binHTML + '</span>' +
        '<span class="dw-dots">' + dotsHTML + '</span>' +
        '<span class="dw-word" translate="no">' + wordDisplay + '</span></div>';
    }

    $('decodeWordTable').innerHTML = tableHTML;

    var seedHTML = '';
    for (var s = 0; s < words.length; s++) {
      if (s > 0) seedHTML += ' ';
      var wi = words[s];
      var cls = 'seed-word';
      if (wi.empty) cls += ' empty-word';
      else if (wi.invalid) cls += ' invalid-word';
      var label = wi.empty ? '\u2014' : (wi.invalid ? '\u2014' : wi.word);
      seedHTML += '<span class="' + cls + '" translate="no">' + label + '</span>';
    }
    var dso = $('decodeSeedOutput');
    dso.innerHTML = seedHTML;
    dso.oncopy = function (e) { e.preventDefault(); };
    dso.oncut = function (e) { e.preventDefault(); };
    dso.oncontextmenu = function (e) { e.preventDefault(); };

    var badge = $('decodeBadge');
    if (!anyInput) {
      badge.className = 'badge partial'; badge.textContent = 'WAITING FOR INPUT';
    } else if (hasInvalid) {
      badge.className = 'badge error'; badge.textContent = 'INVALID INDEX \u2014 OUT OF RANGE 1\u20132048';
    } else {
      var filled = words.filter(function (wi) { return !wi.empty; }).length;
      if (filled === count) {
        badge.className = 'badge valid'; badge.textContent = 'DECODED / ' + count + ' WORDS / ALL VALID BIP39';
      } else {
        badge.className = 'badge partial'; badge.textContent = 'DECODING / ' + filled + ' OF ' + count + ' WORDS SET';
      }
    }

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
  initExampleDots('genExampleDots', 1);   // index 1 = abandon
  initExampleDots('decExampleDots', 1);   // index 1 = abandon

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

})();
