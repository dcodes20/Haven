(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var app = $('#app'), grid = $('#grid');

  /* Toast, with optional Undo */
  var toastEl = $('#toast'), toastTimer;
  function toast(msg, undo) {
    toastEl.textContent = msg;
    if (undo) {
      var u = document.createElement('button'); u.type = 'button'; u.className = 'undo'; u.textContent = 'Undo';
      u.addEventListener('click', function () { undo(); toastEl.classList.remove('on'); });
      toastEl.appendChild(u); toastEl.style.pointerEvents = 'auto';
    } else toastEl.style.pointerEvents = 'none';
    toastEl.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.classList.remove('on'); }, undo ? 5000 : 2600);
  }

  /* Library data: newest first. Photos not yet placed use tinted stand-ins. */
  var demoItems = [
    { id: 1, name: 'One more sunset', when: 'Today', url: 'assets/lib-sunset.webp' },
    { id: 2, name: 'Portrait in shadow', when: 'Today', ph: 'a' },
    { id: 3, name: 'The great outdoors', when: 'Yesterday', url: 'assets/lib-outdoors.webp' },
    { id: 4, name: 'Blue hour', when: 'Yesterday', ph: 'b' },
    { id: 5, name: 'Us, in November', when: 'November 2026', ph: 'c', video: true, dur: '0:18' }
  ];
  var items = demoItems.slice();
  var filter = 'all', query = '', newestFirst = true, selecting = false, picked = {}, fresh = null;
  var playI = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"/></svg>';
  var tick = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

  function visible() {
    var q = query.trim().toLowerCase();
    var list = items.filter(function (it) {
      if (filter === 'photo' && it.video) return false;
      if (filter === 'video' && !it.video) return false;
      if (!q) return true;
      return (it.name + ' ' + it.when + ' ' + (it.video ? 'video' : 'photo')).toLowerCase().indexOf(q) > -1;
    });
    return newestFirst ? list : list.slice().reverse();
  }

  var shown = [];
  function render() {
    shown = visible(); grid.textContent = '';
    shown.forEach(function (it, i) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'm'; b.dataset.id = it.id; b.setAttribute('role', 'listitem');
      b.style.setProperty('--i', Math.min(i, 12));
      if (selecting) { b.setAttribute('aria-checked', picked[it.id] ? 'true' : 'false'); }
      b.setAttribute('aria-label', it.name + ', ' + it.when + (it.video ? ', video ' + it.dur : ''));
      var m;
      if (it.url && it.video && it.file) { m = document.createElement('video'); m.muted = true; m.playsInline = true; m.preload = 'metadata'; m.src = it.url; }
      else if (it.url) { m = document.createElement('img'); m.src = it.url; m.alt = ''; m.loading = 'lazy'; }
      else { m = document.createElement('span'); m.className = 'ph ' + it.ph; }
      b.appendChild(m);
      b.insertAdjacentHTML('beforeend', '<span class="lbl">' + it.when + '</span>' + (it.video ? '<span class="dur">' + playI + (it.dur || '') + '</span>' : '') + '<span class="sel" aria-hidden="true">' + tick + '</span>');
      if (fresh === it.id) b.style.setProperty('--i', 0);
      grid.appendChild(b);
    });
    var none = !shown.length; $('#empty').hidden = !none;
    $('#emptyS').textContent = query ? 'No memories match \u201c' + query.trim() + '\u201d.' : 'No ' + (filter === 'video' ? 'videos' : 'photos') + ' yet.';
    fresh = null;
  }
  function refreshMedia() {
    return HavenMediaStore.list().then(function (records) {
      items = records.map(HavenMediaStore.mediaItem).concat(demoItems);
      render();
      return records;
    });
  }
  function reportMediaError(action, error) {
    toast('Could not ' + action + ': ' + error.message);
  }

  /* Filter chips */
  $$('.chip').forEach(function (c) {
    c.addEventListener('click', function () {
      filter = c.dataset.f;
      $$('.chip').forEach(function (x) { x.setAttribute('aria-pressed', String(x === c)); });
      render();
    });
  });

  /* Search */
  var row = $('#searchRow'), q = $('#q'), sb = $('#searchBtn');
  function openSearch(on) {
    row.classList.toggle('on', on); sb.setAttribute('aria-expanded', String(on));
    if (on) setTimeout(function () { q.focus(); }, 120); else { q.value = ''; query = ''; render(); }
  }
  sb.addEventListener('click', function () { openSearch(!row.classList.contains('on')); });
  $('#qx').addEventListener('click', function () { openSearch(false); });
  q.addEventListener('input', function () { query = q.value; render(); });

  /* Menu */
  var menu = $('#menu'), mb = $('#menuBtn');
  function openMenu(on) { menu.classList.toggle('on', on); mb.setAttribute('aria-expanded', String(on)); }
  mb.addEventListener('click', function (e) { e.stopPropagation(); openMenu(!menu.classList.contains('on')); });
  document.addEventListener('click', function (e) { if (!menu.contains(e.target)) openMenu(false); });
  $('#mSort').addEventListener('click', function () {
    newestFirst = !newestFirst; $('#sortT').textContent = newestFirst ? 'Oldest first' : 'Newest first'; openMenu(false); render();
    toast(newestFirst ? 'Newest first' : 'Oldest first');
  });
  $('#mSelect').addEventListener('click', function () { openMenu(false); setSelecting(true); });

  /* Select mode */
  function updateSel() {
    var n = Object.keys(picked).length;
    $('#selN').textContent = n ? n + ' selected' : 'Select memories'; $('#selDel').disabled = !n;
  }
  function setSelecting(on) {
    selecting = on; picked = {}; app.classList.toggle('selecting', on); $('#selbar').setAttribute('aria-hidden', String(!on));
    document.body.classList.toggle('selecting', on); updateSel(); render();
  }
  $('#selCancel').addEventListener('click', function () { setSelecting(false); });
  $('#selDel').addEventListener('click', function () {
    var ids = Object.keys(picked); if (!ids.length) return;
    var removed = items.filter(function (it) { return picked[String(it.id)]; });
    var removedMedia = removed.filter(function (it) { return it.file; });
    var oldDemos = demoItems.slice();
    HavenMediaStore.remove(removedMedia.map(function (it) { return it.id; })).then(function () {
      demoItems = demoItems.filter(function (it) { return !picked[String(it.id)]; });
      setSelecting(false);
      toast(removed.length + (removed.length === 1 ? ' memory' : ' memories') + ' removed', function () {
        HavenMediaStore.restore(removedMedia).then(function () {
          demoItems = oldDemos;
          return refreshMedia();
        }).catch(function (error) { reportMediaError('restore your media', error); });
      });
      return refreshMedia();
    }).catch(function (error) { reportMediaError('delete your media', error); });
  });

  /* Tap / long-press */
  var pressT, longFired = false;
  grid.addEventListener('pointerdown', function (e) {
    var t = e.target.closest('.m'); if (!t || selecting) return;
    longFired = false; pressT = setTimeout(function () { longFired = true; picked[t.dataset.id] = true; setSelecting(true); picked[t.dataset.id] = true; updateSel(); render(); if (navigator.vibrate) try { navigator.vibrate(12); } catch (x) {} }, 520);
  });
  ['pointerup', 'pointerleave', 'pointercancel', 'scroll'].forEach(function (ev) { grid.addEventListener(ev, function () { clearTimeout(pressT); }); });
  grid.addEventListener('click', function (e) {
    var t = e.target.closest('.m'); if (!t) return;
    if (longFired) { longFired = false; return; }
    var id = t.dataset.id;
    if (selecting) {
      if (picked[id]) delete picked[id]; else picked[id] = true;
      t.setAttribute('aria-checked', picked[id] ? 'true' : 'false'); updateSel(); return;
    }
    openViewer(shown.map(function (x) { return x.id; }).indexOf(id));
  });

  /* Viewer with prev / next */
  var dlg = $('#viewer'), media = $('#viewerMedia'), vi = 0;
  function showViewer() {
    var it = shown[vi]; if (!it) return;
    media.textContent = '';
    var el;
    if (it.url && it.video && it.file) { el = document.createElement('video'); el.controls = true; el.playsInline = true; el.src = it.url; }
    else if (it.url) { el = document.createElement('img'); el.src = it.url; el.alt = it.name; }
    else { el = document.createElement('span'); el.className = 'ph ' + it.ph; }
    media.appendChild(el);
    $('#viewerCap').textContent = it.name + '  ·  ' + it.when + '  ·  ' + (vi + 1) + ' of ' + shown.length;
    $('#vPrev').hidden = vi === 0; $('#vNext').hidden = vi === shown.length - 1;
  }
  function openViewer(i) { vi = i; showViewer(); if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); }
  function closeViewer() { var v = media.querySelector('video'); if (v) v.pause(); if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
  function step(d) { var n = vi + d; if (n < 0 || n >= shown.length) return; vi = n; showViewer(); }
  $('#viewerX').addEventListener('click', closeViewer);
  $('#vPrev').addEventListener('click', function () { step(-1); });
  $('#vNext').addEventListener('click', function () { step(1); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) closeViewer(); });
  document.addEventListener('keydown', function (e) {
    if (dlg.open) { if (e.key === 'ArrowLeft') step(-1); if (e.key === 'ArrowRight') step(1); return; }
    if (e.key === 'Escape') { if (selecting) setSelecting(false); else if (menu.classList.contains('on')) openMenu(false); else if (row.classList.contains('on')) openSearch(false); }
  });

  /* Adding memories */
  var pick = $('#pick');
  $$('[data-add]').forEach(function (b) { b.addEventListener('click', function () { openMenu(false); pick.value = ''; pick.click(); }); });
  pick.addEventListener('change', function () {
    var files = Array.prototype.slice.call(pick.files || []).filter(function (f) { return /^(image|video)\//.test(f.type); });
    if (!files.length) return;
    HavenMediaStore.add(files).then(function (records) {
      fresh = records.length ? records[records.length - 1].id : null;
      filter = 'all'; query = ''; q.value = ''; $$('.chip').forEach(function (x) { x.setAttribute('aria-pressed', String(x.dataset.f === 'all')); });
      return refreshMedia();
    }).then(function () {
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      toast(files.length + (files.length === 1 ? ' memory' : ' memories') + ' safe in Haven.');
      if (window.HavenFX) HavenFX.confetti(innerWidth / 2, innerHeight * .45, 50);
    }).catch(function (error) { reportMediaError('save your media', error); });
  });

  /* Tabs */
  var names = { home: 'Home', album: 'Album', profile: 'Profile' };
  $$('[data-tab]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.tagName === 'A') return;
      var t = b.dataset.tab;
      if (t === 'library') { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); return; }
      toast(names[t] + ' is a separate screen.');
    });
  });

  /* Header gains a hairline once the grid scrolls under it */
  var top = $('#top');
  addEventListener('scroll', function () { top.classList.toggle('scrolled', scrollY > 4); }, { passive: true });

  render();
  refreshMedia().catch(function (error) { reportMediaError('load your media', error); });
  HavenMediaStore.subscribe(function () {
    refreshMedia().catch(function (error) { reportMediaError('refresh your media', error); });
  });
})();
