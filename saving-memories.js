(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Toast */
  var toastEl = $('#toast'), toastTimer;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.classList.remove('on'); }, 2800);
  }
  $('#back').addEventListener('click', function () { window.location.href = 'first-memories.html'; });
  $('#skip').addEventListener('click', function () { toast('Skipped. Your uploads keep saving in the background.'); });

  /* Upload simulation. Starts exactly as designed: 2 of 3 safe, 77%, 43 of 50 MB, Cute.jpg at 13 of 20 MB.
     Nothing is really uploaded; Cute.jpg counts up to 20 MB, then everything reads as safe. */
  var live = $('#live'), liveFill = $('#liveFill'), vbar = $('#vbar'), upct = $('#upct'), liveMeta = $('#liveMeta');
  var TOTAL = 20, START = 13, mb = START, paused = false, finished = false, timer = null;
  var tickSvg = '<svg class="tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-label="Saved"><circle cx="12" cy="12" r="10"/><path d="m8 12.2 2.7 2.7L16.2 9.4"/></svg>';

  function render() {
    var filePct = Math.min(100, Math.round(mb / TOTAL * 100));
    var overall = Math.round(77 + (mb - START) / (TOTAL - START) * 23);
    var uploaded = Math.round(30 + mb);
    liveFill.style.width = filePct + '%'; vbar.setAttribute('aria-valuenow', filePct); upct.textContent = filePct + '%';
    if (!finished) liveMeta.textContent = Math.floor(mb) + ' of ' + TOTAL + ' MB  ·  ' + (paused ? 'Paused. Tap to resume' : 'Uploading');
    $('#pct').textContent = overall + '%';
    $('#overallFill').style.width = overall + '%';
    $('#overallBar').setAttribute('aria-valuenow', overall);
    $('#size').textContent = uploaded + ' MB of 50 MB uploaded';
  }
  function finish() {
    finished = true; clearInterval(timer);
    live.dataset.done = 'true'; live.classList.remove('paused'); live.removeAttribute('role'); live.removeAttribute('tabindex'); live.removeAttribute('aria-pressed');
    $('#tickwrap').innerHTML = tickSvg;
    liveMeta.textContent = TOTAL + ' MB  ·  Photo';
    $('#what').textContent = '3 of 3 memories safe';
    $('#size').textContent = '50 MB of 50 MB uploaded';
    toast('All 3 memories are safe in Haven.');
    if (window.HavenFX) HavenFX.confetti(innerWidth / 2, innerHeight * .45, 80);
  }
  function tick() {
    if (paused || finished) return;
    mb = Math.min(TOTAL, mb + (reduce ? 0.7 : 0.1));
    render();
    if (mb >= TOTAL) finish();
  }
  timer = setInterval(tick, reduce ? 700 : 100);

  /* Tap the uploading row to pause or resume */
  function togglePause() {
    if (finished) return;
    paused = !paused;
    live.classList.toggle('paused', paused);
    live.setAttribute('aria-pressed', String(paused));
    render();
    toast(paused ? 'Upload paused. Tap again to resume.' : 'Resumed right where it left off.');
  }
  live.setAttribute('role', 'button'); live.setAttribute('tabindex', '0'); live.setAttribute('aria-pressed', 'false'); live.setAttribute('aria-describedby', 'liveHint');
  live.classList.add('pausable');
  live.addEventListener('click', togglePause);
  live.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePause(); } });

  /* Next (this is a middle step; the following screens are separate) */
  $('#next').addEventListener('click', function () {
    if (!finished) {
      toast(paused ? 'One memory is paused. Resume it so it can finish saving.' : 'Almost there. Keep this open while the last memory saves.');
      return;
    }
    window.location.href = 'memories-saved.html';
  });
})();
