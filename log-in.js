(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var login = $('#login'), reset = $('#reset'), done = $('#done'), intro = $('#intro');
  var email = $('#email'), password = $('#password'), resetEmail = $('#resetEmail');
  var touched = {};

  /* Toast */
  var toastEl = $('#toast'), toastTimer;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.classList.remove('on'); }, 2600);
  }
  $('#google').addEventListener('click', function () { toast('Google sign-in isn’t connected in this preview.'); });
  $('.brand').addEventListener('click', function (e) { e.preventDefault(); window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });

  /* Validation */
  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function emailError(v) {
    v = v.trim();
    if (!v) return 'Enter your email address.';
    return emailRe.test(v) ? '' : 'That email doesn’t look right. Check for typos.';
  }
  var rules = {
    email: function () { return emailError(email.value); },
    password: function () { return password.value ? '' : 'Enter your password.'; },
    resetEmail: function () { return emailError(resetEmail.value); }
  };
  var inputs = { email: email, password: password, resetEmail: resetEmail };
  function check(key) {
    var msg = rules[key](), field = $('[data-field="' + key + '"]');
    $('#' + key + '-msg').textContent = msg;
    field.classList.toggle('invalid', !!msg);
    inputs[key].setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  }
  Object.keys(inputs).forEach(function (key) {
    inputs[key].addEventListener('blur', function () { touched[key] = true; check(key); });
    inputs[key].addEventListener('input', function () { if (touched[key]) check(key); });
  });

  /* Caps Lock hint */
  var caps = $('#caps');
  function capsCheck(e) { caps.hidden = !(e.getModifierState && e.getModifierState('CapsLock')); }
  password.addEventListener('keydown', capsCheck); password.addEventListener('keyup', capsCheck);
  password.addEventListener('blur', function () { caps.hidden = true; });

  /* Show / hide password */
  $('.reveal').addEventListener('click', function () {
    var show = password.type === 'password';
    password.type = show ? 'text' : 'password';
    this.setAttribute('aria-pressed', String(show));
    this.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });

  /* Views */
  function setIntro(title, sub) { $('#introTitle').textContent = title; $('#introSub').textContent = sub; }
  function view(name) {
    login.hidden = name !== 'login'; reset.hidden = name !== 'reset'; done.hidden = name !== 'done'; intro.hidden = name === 'done';
    if (name === 'login') setIntro('Welcome back', 'Log in to see your memories.');
    if (name === 'reset') setIntro('Reset your password', 'We’ll email you a link to choose a new one.');
  }
  $('#forgot').addEventListener('click', function () {
    resetEmail.value = email.value; touched.resetEmail = false; check('resetEmail'); $('#resetEmail-msg').textContent = '';
    $('[data-field="resetEmail"]').classList.remove('invalid');
    view('reset'); resetEmail.focus();
  });
  $('#backToLogin').addEventListener('click', function () { view('login'); email.focus(); });

  /* Submit: log in (simulated, nothing is sent or stored) */
  var busy = false;
  function setBusy(on, btn, spin, label, text) {
    busy = on; btn.disabled = on; spin.hidden = !on; label.textContent = text;
  }
  login.addEventListener('submit', function (e) {
    e.preventDefault(); if (busy) return;
    touched.email = touched.password = true;
    var okE = check('email'), okP = check('password');
    if (!okE) { email.focus(); return; }
    if (!okP) { password.focus(); return; }
    setBusy(true, $('#submit'), $('#spin'), $('#submitLabel'), 'Logging in…');
    setTimeout(function () {
      window.location.href = 'home-filled.html';
      $('#doneBody').textContent = 'Welcome back, ' + email.value.trim() + '. Your memories are right where you left them.';
    }, reduce ? 0 : 800);
  });

  /* Submit: reset link (simulated) */
  reset.addEventListener('submit', function (e) {
    e.preventDefault(); if (busy) return;
    touched.resetEmail = true;
    if (!check('resetEmail')) { resetEmail.focus(); return; }
    setBusy(true, $('#resetBtn'), $('#resetSpin'), $('#resetLabel'), 'Sending…');
    setTimeout(function () {
      setBusy(false, $('#resetBtn'), $('#resetSpin'), $('#resetLabel'), 'Send reset link');
      $('#doneTitle').textContent = 'Check your inbox';
      $('#doneBody').textContent = 'If ' + resetEmail.value.trim() + ' has a Haven, a reset link is on its way.';
      $('#doneOpen').textContent = 'Back to log in';
      $('#doneOut').hidden = true;
      done.dataset.mode = 'reset';
      view('done'); $('#doneTitle').focus({ preventScroll: true });
    }, reduce ? 0 : 800);
  });

  $('#doneOpen').addEventListener('click', function () {
    if (done.dataset.mode === 'reset') { resetDone(); email.value = resetEmail.value; view('login'); password.focus(); return; }
    toast('The library lives on the landing page for now.');
  });
  $('#doneOut').addEventListener('click', function () {
    login.reset(); touched = {};
    ['email', 'password'].forEach(function (k) { check(k); $('#' + k + '-msg').textContent = ''; $('[data-field="' + k + '"]').classList.remove('invalid'); });
    password.type = 'password'; $('.reveal').setAttribute('aria-pressed', 'false');
    view('login'); email.focus();
  });
  function resetDone() {
    done.dataset.mode = ''; $('#doneOpen').textContent = 'Open my library'; $('#doneOut').hidden = false;
  }
})();
