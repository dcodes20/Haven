(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var fan = $('#fan'), status = $('#status'), prints = $$('.pol', fan);

  /* Toast */
  var toastEl = $('#toast'), toastTimer;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.classList.remove('on'); }, 2800);
  }
  $('.brand').addEventListener('click', function (e) { e.preventDefault(); window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });

  /* Choose memories */
  function chosen() { return prints.filter(function (p) { return p.getAttribute('aria-pressed') === 'true'; }); }
  function update() {
    var n = chosen().length;
    status.classList.remove('warn');
    status.textContent = n ? n + (n === 1 ? ' memory chosen' : ' memories chosen') : '';
  }
  prints.forEach(function (p) {
    p.addEventListener('click', function () {
      var on = p.getAttribute('aria-pressed') !== 'true';
      p.setAttribute('aria-pressed', String(on));
      if (on && window.HavenFX) HavenFX.burstAt(p, 16);
      update();
    });
  });

  /* Next and Skip (this is step 1 of 3; the later steps are separate screens) */
  $('#next').addEventListener('click', function () {
    window.location.href = 'saving-memories.html';
  });
  $('#skip').addEventListener('click', function () {
    window.location.href = 'home-empty.html';
  });
})();
