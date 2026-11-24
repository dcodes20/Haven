(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var form = $('#signup');
  var f = {
    name: $('#name'), email: $('#email'), password: $('#password'), confirm: $('#confirm'), agree: $('#agree')
  };
  var touched = {};
  function strength() {
    var v = f.password.value, m = $('#meter'), lab = $('#strength');
    if (!v) { m.hidden = true; lab.textContent = ''; return; }
    var lvl = 0;
    if (v.length >= 8) {
      lvl = 1;
      if (v.length >= 12) lvl++;
      if (/[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v)) lvl++;
      if (/[^A-Za-z0-9]/.test(v)) lvl++;
      lvl = Math.min(4, lvl);
    }
    m.hidden = false; m.dataset.s = lvl;
    lab.textContent = ['Too short. Use at least 8 characters.', 'Weak. Add length or a mix of letters and numbers.', 'Okay. A little longer would help.', 'Good.', 'Strong. Nice one.'][lvl];
  }

  /* Toast */
  var toastEl = $('#toast'), toastTimer;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.classList.remove('on'); }, 2600);
  }
  $$('[data-soon]').forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); toast(a.getAttribute('data-soon')); });
  });
  $('#google').addEventListener('click', function () { toast('Google sign-in isn’t connected in this preview.'); });
  $('.brand').addEventListener('click', function (e) { e.preventDefault(); window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });

  /* Validation */
  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var rules = {
    name: function () { return f.name.value.trim() ? '' : 'Tell us what to call you.'; },
    email: function () {
      var v = f.email.value.trim();
      if (!v) return 'Enter your email address.';
      return emailRe.test(v) ? '' : 'That email doesn’t look right. Check for typos.';
    },
    password: function () {
      var v = f.password.value;
      if (!v) return 'Choose a password.';
      return v.length >= 8 ? '' : 'Use at least 8 characters. ' + (8 - v.length) + ' to go.';
    },
    confirm: function () {
      if (f.password.value.length < 8) return '';
      if (!f.confirm.value) return 'Type your password again.';
      return f.confirm.value === f.password.value ? '' : 'Passwords don’t match yet.';
    },
    agree: function () { return f.agree.checked ? '' : 'Tick the box to continue.'; }
  };
  function show(key, msg) {
    var box = key === 'agree' ? $('#terms') : $('[data-field="' + key + '"]');
    var out = $('#' + key + '-msg');
    out.textContent = msg;
    box.classList.toggle('invalid', !!msg);
    f[key].setAttribute('aria-invalid', msg ? 'true' : 'false');
  }
  function check(key) { var m = rules[key](); show(key, m); return !m; }

  function syncConfirm() {
    var ok = f.password.value.length >= 8;
    f.confirm.disabled = !ok;
    $('#confirm-box').classList.toggle('is-disabled', !ok);
  }

  ['name', 'email', 'password', 'confirm'].forEach(function (key) {
    f[key].addEventListener('blur', function () { touched[key] = true; check(key); if (key === 'password' && touched.confirm) check('confirm'); });
    f[key].addEventListener('input', function () {
      if (key === 'password') { syncConfirm(); strength(); }
      if (touched[key]) check(key);
      if (key === 'password' && touched.confirm) check('confirm');
    });
  });
  f.agree.addEventListener('change', function () { if (touched.agree || f.agree.checked) { touched.agree = true; check('agree'); } });

  /* Show / hide password */
  $$('.reveal').forEach(function (b) {
    b.addEventListener('click', function () {
      var input = $('#' + b.dataset.for), show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      b.setAttribute('aria-pressed', String(show));
      b.setAttribute('aria-label', (show ? 'Hide ' : 'Show ') + (b.dataset.for === 'confirm' ? 'confirm password' : 'password'));
    });
  });

  /* Submit */
  var busy = false;
  form.addEventListener('submit', function (e) {
    e.preventDefault(); if (busy) return;
    var keys = ['name', 'email', 'password', 'confirm', 'agree'], first = null;
    keys.forEach(function (k) { touched[k] = true; if (!check(k) && !first) first = f[k]; });
    if (first) { if (!first.disabled) first.focus(); return; }
    busy = true; $('#create').disabled = true; $('#spin').hidden = false; $('#createLabel').textContent = 'Creating your Haven…';
    // No backend here: the account is simulated and nothing is stored.
    setTimeout(function () {
      window.location.href = 'first-memories.html';
    }, reduce ? 0 : 900);
  });
})();
