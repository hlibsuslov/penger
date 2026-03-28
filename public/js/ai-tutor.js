/* =============================================================
   PENGER AI Tutor — extracted from ai-tutor.ejs
   Requires window.TUTOR_I18N to be set before loading.
   ============================================================= */

/* ===== INTRO COLLAPSE / EXPAND ===== */
(function () {
  var intro      = document.getElementById('tutorIntro');
  var collapseBtn = document.getElementById('introCollapseBtn');
  var expandBar  = document.getElementById('introExpandBar');
  var expandBtn  = document.getElementById('introExpandBtn');
  if (!intro || !collapseBtn || !expandBar || !expandBtn) return;

  var isAnimating = false;

  function collapse() {
    if (isAnimating) return;
    isAnimating = true;

    var h = intro.scrollHeight;
    intro.style.maxHeight = h + 'px';
    intro.offsetHeight; /* force reflow */

    intro.classList.add('is-collapsing');
    intro.style.maxHeight = '0px';
    intro.style.paddingTop = '0px';
    intro.style.paddingBottom = '0px';
    intro.style.borderBottomColor = 'transparent';

    collapseBtn.setAttribute('aria-expanded', 'false');
    expandBar.classList.add('is-visible');

    intro.addEventListener('transitionend', function onEnd(e) {
      if (e.propertyName !== 'max-height') return;
      intro.removeEventListener('transitionend', onEnd);
      intro.classList.remove('is-collapsing');
      intro.classList.add('is-collapsed');
      isAnimating = false;
    });
  }

  function expand() {
    if (isAnimating) return;
    isAnimating = true;

    intro.classList.remove('is-collapsed');
    intro.style.maxHeight = '';
    intro.style.paddingTop = '';
    intro.style.paddingBottom = '';
    intro.style.borderBottomColor = '';
    var targetH = intro.scrollHeight;

    intro.style.maxHeight = '0px';
    intro.style.paddingTop = '0px';
    intro.style.paddingBottom = '0px';
    intro.style.opacity = '0';
    intro.style.borderBottomColor = 'transparent';
    intro.offsetHeight; /* force reflow */

    intro.style.maxHeight = targetH + 'px';
    intro.style.paddingTop = '';
    intro.style.paddingBottom = '';
    intro.style.opacity = '';
    intro.style.borderBottomColor = '';

    collapseBtn.setAttribute('aria-expanded', 'true');
    expandBar.classList.remove('is-visible');

    intro.addEventListener('transitionend', function onEnd(e) {
      if (e.propertyName !== 'max-height') return;
      intro.removeEventListener('transitionend', onEnd);
      intro.style.maxHeight = '';
      isAnimating = false;
    });
  }

  collapseBtn.addEventListener('click', collapse);
  expandBtn.addEventListener('click', expand);
})();

/* ===== AUTO-SCROLL GATE ===== */
(function () {
  var chatEl = document.getElementById('tutorChat');
  if (!chatEl) return;
  chatEl._autoScroll = true;
  chatEl.addEventListener('scroll', function () {
    var distFromBottom = chatEl.scrollHeight - chatEl.scrollTop - chatEl.clientHeight;
    chatEl._autoScroll = distFromBottom < 80;
  }, { passive: true });
})();

/* ===== SCENARIO ENGINE ===== */
(function () {
  'use strict';

  var t = window.TUTOR_I18N || {};

  var chatEl = document.getElementById('tutorChat');
  var activeTimer = null;
  var SCENARIOS = null;
  var history = [];
  var isTyping = false;

  /* ===== LOAD SCENARIOS ===== */
  function loadScenarios(cb) {
    if (window.fetch) {
      fetch((t.langPrefix || '') + '/tutor-scenarios.json')
        .then(function (r) {
          if (!r.ok) throw new Error(r.status);
          return r.json();
        })
        .then(function (data) { SCENARIOS = data; cb(null); })
        .catch(function () { fallbackXHR(cb); });
      return;
    }
    fallbackXHR(cb);
  }

  function fallbackXHR(cb) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', (t.langPrefix || '') + '/tutor-scenarios.json', true);
      xhr.onload = function () {
        try {
          SCENARIOS = JSON.parse(xhr.responseText);
          cb(null);
        } catch (e) { cb('Failed to parse scenarios.'); }
      };
      xhr.onerror = function () { cb('Network error. Open via a local server or use Live Server extension.'); };
      xhr.send();
    } catch (e) {
      cb('Cannot load scenarios via file:// protocol. Please open through a local server (e.g. Live Server).');
    }
  }

  /* ===== HELPERS ===== */
  function smoothScroll() {
    if (!chatEl._autoScroll) return;
    chatEl.scrollTo({ top: chatEl.scrollHeight, behavior: 'smooth' });
  }

  function typeText(el, text, cb) {
    isTyping = true;

    var markerCount = (text.match(/\*\*/g) || []).length;
    if (markerCount % 2 !== 0) {
      var lastUnpaired = text.lastIndexOf('**');
      text = text.slice(0, lastUnpaired) + text.slice(lastUnpaired + 2);
    }

    var segments = [];
    var re = /\*\*(.+?)\*\*/g;
    var last = 0;
    var m;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) segments.push({ b: false, t: text.slice(last, m.index) });
      segments.push({ b: true, t: m[1] });
      last = re.lastIndex;
    }
    if (last < text.length) segments.push({ b: false, t: text.slice(last) });

    var queue = [];
    segments.forEach(function (s) {
      for (var i = 0; i < s.t.length; i++) {
        queue.push({ ch: s.t[i], b: s.b });
      }
    });

    var idx = 0;
    var cursor = document.createElement('span');
    cursor.className = 'tutor-cursor';
    el.appendChild(cursor);
    var scrollCounter = 0;
    var strong = null;

    activeTimer = setInterval(function () {
      if (idx >= queue.length) {
        clearInterval(activeTimer);
        activeTimer = null;
        cursor.remove();
        isTyping = false;
        if (cb) cb();
        return;
      }
      var item = queue[idx];
      if (item.ch === '\n') {
        strong = null;
        cursor.insertAdjacentHTML('beforebegin', '<br>');
      } else if (item.b) {
        if (!strong) {
          strong = document.createElement('strong');
          cursor.insertAdjacentElement('beforebegin', strong);
        }
        strong.appendChild(document.createTextNode(item.ch));
      } else {
        strong = null;
        cursor.insertAdjacentText('beforebegin', item.ch);
      }
      idx++;
      scrollCounter++;
      if (scrollCounter % 5 === 0 && chatEl._autoScroll) chatEl.scrollTop = chatEl.scrollHeight;
    }, 12);
  }

  /* ===== RENDER MESSAGES ===== */
  function addUserMsg(text) {
    var div = document.createElement('div');
    div.className = 'tutor-msg user';
    div.textContent = text;
    chatEl._autoScroll = true;
    chatEl.appendChild(div);
    smoothScroll();
  }

  function addBotMsg(scenarioKey) {
    if (!SCENARIOS) return;
    var scene = SCENARIOS[scenarioKey];
    if (!scene) return;

    history.push(scenarioKey);
    chatEl.setAttribute('data-scenario', scenarioKey);

    chatEl._autoScroll = true;
    var indicator = document.createElement('div');
    indicator.className = 'tutor-msg bot tutor-typing-msg';
    indicator.innerHTML = '<span class="tutor-typing"><span></span><span></span><span></span></span>';
    chatEl.appendChild(indicator);
    smoothScroll();

    setTimeout(function () {
      indicator.remove();

      var div = document.createElement('div');
      div.className = 'tutor-msg bot';
      var textWrap = document.createElement('div');
      textWrap.className = 'tutor-msg-text';
      div.appendChild(textWrap);
      chatEl.appendChild(div);
      smoothScroll();

      typeText(textWrap, scene.bot, function () {
        if (scene.options && scene.options.length > 0) {
          var optWrap = document.createElement('div');
          optWrap.className = 'tutor-options';

          scene.options.forEach(function (opt) {
            var btn = document.createElement('button');
            btn.className = 'tutor-option-btn';
            btn.type = 'button';
            btn.textContent = opt.label;
            btn.setAttribute('data-track', 'cta_click');
            btn.setAttribute('data-cta-id', 'tutor_scenario_option');
            btn.setAttribute('data-section', 'tutor-chat');

            if (opt.next === 'root') {
              btn.classList.add('restart');
              btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="vertical-align:-2px;margin-right:6px;"><path d="M4 12a8 8 0 0 1 13.4-5.9L20 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 4v5h-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 12a8 8 0 0 1-13.4 5.9L4 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 20v-5h5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' + opt.label;
            }

            btn.addEventListener('click', function () {
              if (isTyping) return;

              /* --- analytics: scenario option click --- */
              var dl = window.dataLayer = window.dataLayer || [];
              dl.push({ event: 'tutor_scenario_click', page_section: 'tutor-chat', scenario_option: opt.next, scenario_label: opt.label });

              optWrap.querySelectorAll('.tutor-option-btn').forEach(function (b) {
                b.disabled = true;
                if (b !== btn) b.classList.add('dimmed');
                else b.classList.add('chosen');
              });

              if (opt.next === 'root') {
                setTimeout(function () { startChat(); }, 300);
              } else {
                addUserMsg(opt.label);
                setTimeout(function () { addBotMsg(opt.next); }, 400);
              }
            });

            optWrap.appendChild(btn);
          });

          div.appendChild(optWrap);
          smoothScroll();
        }
      });
    }, 600);
  }

  /* ===== START / RESET ===== */
  function startChat() {
    if (activeTimer) { clearInterval(activeTimer); activeTimer = null; }
    isTyping = false;
    history = [];
    chatEl._autoScroll = true;
    chatEl.innerHTML = '';
    addBotMsg('root');
  }

  /* ===== ERROR STATE ===== */
  function showError(msg) {
    var div = document.createElement('div');
    div.className = 'tutor-msg bot';
    div.style.cssText = 'color:var(--error-text);border-color:var(--error-border);';
    div.textContent = msg + ' ';
    var retryBtn = document.createElement('button');
    retryBtn.className = 'tutor-option-btn';
    retryBtn.type = 'button';
    retryBtn.style.marginTop = '10px';
    retryBtn.textContent = t.retry || 'Retry';
    retryBtn.addEventListener('click', function () { location.reload(); });
    div.appendChild(retryBtn);
    chatEl.appendChild(div);
  }

  /* ===== INIT ===== */
  loadScenarios(function (err) {
    if (err) { showError(err); return; }
    startChat();
  });
})();

/* ===== FREE-TEXT CHAT ENGINE ===== */
(function () {
  'use strict';

  var t = window.TUTOR_I18N || {};

  var TUTOR_API = {
    endpoint: '/api/chat',
    maxHistoryMessages: 20,
    maxInputLength: 2000,
    retryDelay: 2000,
  };

  var chatEl  = document.getElementById('tutorChat');
  var inputEl = document.getElementById('tutorInput');
  var sendBtn = document.getElementById('tutorSendBtn');
  if (!chatEl || !inputEl || !sendBtn) return;

  var conversationHistory = [];
  var isSending = false;

  function getCurrentContext() {
    return chatEl.getAttribute('data-scenario') || null;
  }

  var observer = new MutationObserver(function () {
    if (chatEl.childNodes.length === 0 ||
        chatEl.childNodes.length <= 1) {
      conversationHistory = [];
    }
  });
  observer.observe(chatEl, { childList: true });

  function updateSendButton() {
    var hasText = inputEl.value.trim().length > 0;
    sendBtn.disabled = !hasText || isSending || !TUTOR_API.endpoint;
  }

  inputEl.addEventListener('input', updateSendButton);
  inputEl.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.keyCode === 13) && !e.shiftKey && !sendBtn.disabled) {
      e.preventDefault();
      handleSend();
    }
  });
  sendBtn.addEventListener('click', function () {
    if (!sendBtn.disabled) handleSend();
  });

  function sanitizeInput(text) {
    text = text.replace(/<[^>]*>/g, '');
    text = text.replace(/\s{3,}/g, '  ');
    if (text.length > TUTOR_API.maxInputLength) {
      text = text.slice(0, TUTOR_API.maxInputLength);
    }
    return text.trim();
  }

  function trimHistory() {
    var max = TUTOR_API.maxHistoryMessages;
    if (conversationHistory.length <= max) return;
    var keepStart = 2;
    var keepEnd   = max - keepStart;
    var first  = conversationHistory.slice(0, keepStart);
    var recent = conversationHistory.slice(-keepEnd);
    conversationHistory = first.concat(recent);
  }

  function smoothScroll() {
    if (!chatEl._autoScroll) return;
    chatEl.scrollTo({ top: chatEl.scrollHeight, behavior: 'smooth' });
  }

  function typeTextFree(el, text, cb) {
    text = text.replace(/^#{1,3}\s+(.+)$/gm, '**$1**');

    var markerCount = (text.match(/\*\*/g) || []).length;
    if (markerCount % 2 !== 0) {
      var lastUnpaired = text.lastIndexOf('**');
      text = text.slice(0, lastUnpaired) + text.slice(lastUnpaired + 2);
    }

    var segments = [];
    var re = /\*\*(.+?)\*\*/g;
    var last = 0;
    var m;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) segments.push({ b: false, t: text.slice(last, m.index) });
      segments.push({ b: true, t: m[1] });
      last = re.lastIndex;
    }
    if (last < text.length) segments.push({ b: false, t: text.slice(last) });

    var queue = [];
    segments.forEach(function (s) {
      for (var i = 0; i < s.t.length; i++) {
        queue.push({ ch: s.t[i], b: s.b });
      }
    });

    var idx = 0;
    var cursor = document.createElement('span');
    cursor.className = 'tutor-cursor';
    el.appendChild(cursor);
    var scrollCounter = 0;
    var strong = null;

    var timer = setInterval(function () {
      if (idx >= queue.length) {
        clearInterval(timer);
        cursor.remove();
        if (cb) cb();
        return;
      }
      var item = queue[idx];
      if (item.ch === '\n') {
        strong = null;
        cursor.insertAdjacentHTML('beforebegin', '<br>');
      } else if (item.b) {
        if (!strong) {
          strong = document.createElement('strong');
          cursor.insertAdjacentElement('beforebegin', strong);
        }
        strong.appendChild(document.createTextNode(item.ch));
      } else {
        strong = null;
        cursor.insertAdjacentText('beforebegin', item.ch);
      }
      idx++;
      scrollCounter++;
      if (scrollCounter % 5 === 0 && chatEl._autoScroll) chatEl.scrollTop = chatEl.scrollHeight;
    }, 12);
  }

  function showTypingIndicator() {
    var div = document.createElement('div');
    div.className = 'tutor-msg bot tutor-typing-msg';
    div.innerHTML = '<span class="tutor-typing"><span></span><span></span><span></span></span>';
    chatEl.appendChild(div);
    smoothScroll();
    return div;
  }

  function removeTypingIndicator(el) {
    if (el && el.parentNode) el.remove();
  }

  function addFreeUserMsg(text) {
    var div = document.createElement('div');
    div.className = 'tutor-msg user';
    div.textContent = text;
    chatEl._autoScroll = true;
    chatEl.appendChild(div);
    smoothScroll();
  }

  function addFreeBotMsg(text, cb) {
    var div = document.createElement('div');
    div.className = 'tutor-msg bot';
    var textWrap = document.createElement('div');
    textWrap.className = 'tutor-msg-text';
    div.appendChild(textWrap);
    chatEl._autoScroll = true;
    chatEl.appendChild(div);
    smoothScroll();

    typeTextFree(textWrap, text, function () {
      if (cb) cb();
    });
  }

  function addErrorMsg(text) {
    var div = document.createElement('div');
    div.className = 'tutor-msg bot tutor-error-msg';
    div.textContent = text;
    chatEl.appendChild(div);
    smoothScroll();
  }

  var TUTOR_ERRORS = {
    rateLimited: t.rateLimited || 'Too many requests. Please wait.',
    serviceUnavailable: t.serviceUnavailable || 'Service temporarily unavailable.',
    errorMsg: t.errorMsg || 'An error occurred.',
    emptyResponse: t.emptyResponse || 'Empty response received.',
    connectionError: t.connectionError || 'Connection error.'
  };

  function callTutorAPI(messages, context) {
    var payload = { messages: messages, lang: t.lang || 'en' };
    if (context) payload.context = context;

    return fetch(TUTOR_API.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    .then(function (res) {
      if (res.ok) return res.json();
      return res.json().catch(function () { return {}; }).then(function (d) {
        if (res.status === 429) throw new Error(d.error || TUTOR_ERRORS.rateLimited);
        if (res.status === 503) throw new Error(d.error || TUTOR_ERRORS.serviceUnavailable);
        throw new Error(d.error || TUTOR_ERRORS.errorMsg);
      });
    })
    .then(function (data) {
      if (!data.reply) throw new Error(TUTOR_ERRORS.emptyResponse);
      return data.reply;
    });
  }

  function handleSend() {
    var text = sanitizeInput(inputEl.value);
    if (!text || isSending) return;

    /* --- analytics: chat start (first message only) --- */
    if (!window._tutorChatStarted) {
      window._tutorChatStarted = true;
      var dl = window.dataLayer = window.dataLayer || [];
      dl.push({ event: 'tutor_chat_start', page_section: 'tutor-chat' });
    }
    /* --- analytics: every message send --- */
    var dl2 = window.dataLayer = window.dataLayer || [];
    dl2.push({ event: 'tutor_message_send', page_section: 'tutor-chat' });

    isSending = true;
    inputEl.value = '';
    updateSendButton();
    inputEl.focus();

    var context = getCurrentContext();

    addFreeUserMsg(text);
    conversationHistory.push({ role: 'user', content: text });
    trimHistory();

    var typingEl = showTypingIndicator();

    callTutorAPI(conversationHistory, context)
      .then(function (reply) {
        removeTypingIndicator(typingEl);
        addFreeBotMsg(reply, function () {
          conversationHistory.push({ role: 'assistant', content: reply });
          trimHistory();
          isSending = false;
          updateSendButton();
        });
      })
      .catch(function (err) {
        removeTypingIndicator(typingEl);
        addErrorMsg(err.message || TUTOR_ERRORS.connectionError);
        isSending = false;
        updateSendButton();
      });
  }

  /* ===== MOBILE KEYBOARD HANDLING ===== */
  var inputBar = document.getElementById('tutorInputBar');

  (function initKeyboardHandler() {
    var root = document.documentElement;
    var vv   = window.visualViewport;
    if (!vv || !inputBar) return;

    var pendingRAF = null;

    function syncKB() {
      if (pendingRAF) return;
      pendingRAF = requestAnimationFrame(function () {
        pendingRAF = null;
        var kb = Math.max(0,
          window.innerHeight - (vv.height + vv.offsetTop));
        root.style.setProperty('--kb', kb + 'px');
      });
    }

    vv.addEventListener('resize', syncKB);

    inputEl.addEventListener('focus', function () {
      setTimeout(function () { syncKB(); smoothScroll(); }, 300);
    });

    inputEl.addEventListener('blur', function () {
      setTimeout(function () {
        if (document.activeElement !== inputEl) {
          root.style.setProperty('--kb', '0px');
        }
      }, 300);
    });

    window.addEventListener('orientationchange', function () {
      setTimeout(function () {
        root.style.setProperty('--kb', '0px');
      }, 500);
    });
  })();

  if (inputBar) {
    inputBar.addEventListener('touchmove', function (e) {
      e.preventDefault();
    }, { passive: false });
  }

  updateSendButton();
})();
