(function () {
  'use strict';

  var t = window.CONTACTS_I18N || {};
  var copiedText = t.copied || 'Copied';
  var copyText = t.copy || 'Copy';

  function showCopied(btn) {
    btn.classList.add('copied');
    btn.querySelector('span').textContent = copiedText;
    setTimeout(function () {
      btn.classList.remove('copied');
      btn.querySelector('span').textContent = copyText;
    }, 2000);
  }

  document.addEventListener('click', function (e) {
    var emailBtn = e.target.closest('[data-copy-email]');
    if (emailBtn) {
      var email = emailBtn.getAttribute('data-copy-email') || emailBtn.getAttribute('data-email');
      navigator.clipboard.writeText(email).then(function () { showCopied(emailBtn); });
      return;
    }

    var handleBtn = e.target.closest('[data-copy-handle]');
    if (handleBtn) {
      var handle = handleBtn.getAttribute('data-copy-handle');
      navigator.clipboard.writeText(handle).then(function () { showCopied(handleBtn); });
    }
  });
})();
