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

  /* Greeting follows the real date and time of day */
  var now = new Date(), hr = now.getHours();
  $('#date').textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  $('#hi').textContent = hr < 5 ? 'Good evening' : hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  var displayName = window.localStorage.getItem('haven.displayName');
  if (displayName) {
    $('#who').textContent = displayName;
    $('#avatar').textContent = displayName.charAt(0).toUpperCase();
    $('#avatar').setAttribute('aria-label', displayName + '\'s account');
  }

  /* Tabs: Home is this screen; the others are separate screens */
  var names = { library: 'Library', album: 'Album', profile: 'Profile' };
  $$('[data-tab]').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = b.dataset.tab;
      if (t === 'home') { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); return; }
      toast(names[t] + ' is a separate screen.');
    });
  });
  $('#avatar').addEventListener('click', function () { toast('Account settings are on the Profile screen.'); });
  $('#seeAll').addEventListener('click', function () { toast(items.length ? 'The full library is a separate screen.' : 'Nothing to see yet. Add your first memory.'); });

  /* On this day: step through earlier years */
  var years = [2026, 2025, 2024, 2023], yi = 0;
  $('#year').addEventListener('click', function () {
    yi = (yi + 1) % years.length; var y = years[yi];
    $('#yearT').textContent = y;
    $('#year').setAttribute('aria-label', 'Change year, now ' + y);
    $('#emptyDay').textContent = 'No memories from this day' + (y === 2026 ? '' : ' in ' + y) + ' yet';
  });

  /* Storage details */
  var store = $('#store');
  store.addEventListener('click', function () { store.setAttribute('aria-expanded', String(store.getAttribute('aria-expanded') !== 'true')); });

  /* Recent memories and adding more */
  var items = [], bytes = 0, TOTAL_GB = 10;
  var tilesEl = $('#tiles'), pick = $('#pick');
  var plus = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M12 5v14"/></svg>';
  var play = '<span class="kind" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg></span>';

  function render(freshFirst) {
    tilesEl.textContent = '';
    for (var i = 0; i < 3; i++) {
      var it = items[i], b = document.createElement('button'); b.type = 'button'; b.className = 'tile';
      if (it) {
        b.dataset.i = i; b.setAttribute('aria-label', 'Open ' + it.name);
        var m = document.createElement(it.video ? 'video' : 'img'); m.src = it.url;
        if (it.video) { m.muted = true; m.playsInline = true; m.preload = 'metadata'; } else { m.alt = it.name; }
        b.appendChild(m); if (it.video) b.insertAdjacentHTML('beforeend', play);
        if (freshFirst && i === 0) b.classList.add('fresh');
      } else {
        b.innerHTML = plus; b.setAttribute('aria-label', 'Add a memory'); b.dataset.add = '';
      }
      tilesEl.appendChild(b);
    }
    $('#empty').hidden = items.length > 0;
  }
  function formatUsed(b) {
    if (!b) return '0 GB of ' + TOTAL_GB + ' GB used';
    var mb = b / 1048576;
    if (mb < 1) return Math.max(1, Math.round(b / 1024)) + ' KB of ' + TOTAL_GB + ' GB used';
    return (mb < 1000 ? (mb < 10 ? mb.toFixed(1) : Math.round(mb)) + ' MB' : (mb / 1024).toFixed(1) + ' GB') + ' of ' + TOTAL_GB + ' GB used';
  }
  function sync() {
    var n = items.length, st = $('#status');
    $('#statusT').textContent = n ? n + (n === 1 ? ' memory is safe' : ' memories are safe') : 'No memories added yet';
    $('#statusS').textContent = n ? 'Everything is safe in Haven' : 'No upload yet';
    st.classList.toggle('live', n > 0);
    $('#used').textContent = formatUsed(bytes);
    var pct = Math.min(100, bytes / (TOTAL_GB * 1073741824) * 100);
    if (bytes && pct < 4) pct = 4;
    $('#capFill').style.width = pct + '%'; $('#cap').setAttribute('aria-valuenow', Math.round(pct));
  }

  $$('[data-add]').forEach(function (b) { b.addEventListener('click', function () { pick.value = ''; pick.click(); }); });
  tilesEl.addEventListener('click', function (e) {
    var t = e.target.closest('.tile'); if (!t) return;
    if (t.hasAttribute('data-add')) { pick.value = ''; pick.click(); return; }
    openViewer(items[+t.dataset.i]);
  });
  pick.addEventListener('change', function () {
    var files = Array.prototype.slice.call(pick.files || []).filter(function (f) { return /^(image|video)\//.test(f.type); });
    if (!files.length) return;
    files.forEach(function (f) {
      items.unshift({ name: f.name.replace(/\.[^.]+$/, '') || 'New memory', url: URL.createObjectURL(f), video: f.type.indexOf('video/') === 0 });
      bytes += f.size;
    });
    render(true); sync();
    toast('Safe in Haven. ' + items.length + (items.length === 1 ? ' memory.' : ' memories.'));
    if (window.HavenFX) HavenFX.confetti(innerWidth / 2, innerHeight * .5, 60);
  });

  /* Viewer */
  var dlg = $('#viewer'), media = $('#viewerMedia');
  function openViewer(it) {
    media.textContent = '';
    var el = document.createElement(it.video ? 'video' : 'img'); el.src = it.url;
    if (it.video) { el.controls = true; el.playsInline = true; } else { el.alt = it.name; }
    media.appendChild(el); $('#viewerCap').textContent = it.name;
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  }
  function closeViewer() { var v = media.querySelector('video'); if (v) v.pause(); if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
  $('#viewerX').addEventListener('click', closeViewer);
  dlg.addEventListener('click', function (e) { if (e.target === dlg) closeViewer(); });

  render(false); sync();
})();
