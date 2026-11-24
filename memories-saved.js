(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Toast */
  var toastEl = $('#toast'), toastTimer;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.classList.remove('on'); }, 2800);
  }
  $('#back').addEventListener('click', function () { window.location.href = 'saving-memories.html'; });

  /* Tap a print to preview it. The video print toggles between play and pause. */
  var sub = $('#sub'), base = sub.textContent, resetTimer;
  function say(text) {
    sub.textContent = text; clearTimeout(resetTimer);
    resetTimer = setTimeout(function () { sub.textContent = base; }, 2600);
  }
  $$('.card').forEach(function (c) {
    c.addEventListener('click', function () {
      if (c.dataset.video === 'true') {
        var on = c.dataset.playing !== 'true';
        c.dataset.playing = String(on);
        say(on ? 'Playing Mountains.mov, saved at 26 MB.' : 'Paused Mountains.mov.');
      } else {
        say(c.dataset.name + ' is safe in Haven.');
      }
    });
  });

  /* The Safe in Haven pill gives a small pulse and a reassurance */
  var safe = $('#safe');
  safe.addEventListener('click', function () {
    safe.classList.remove('pulse'); void safe.offsetWidth; safe.classList.add('pulse');
    if (window.HavenFX) HavenFX.burstAt(safe, 30);
    say('Your originals stay here until you delete them here.');
  });

  /* A little celebration when the screen arrives */
  setTimeout(function () { if (window.HavenFX) HavenFX.confetti(innerWidth / 2, Math.min(innerHeight * .3, 240), 70); }, reduce ? 0 : 700);
})();
