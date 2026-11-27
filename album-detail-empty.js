(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var app = $('#app');

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

  /* Things that live on other screens */
  var names = { home: 'Home', library: 'Library', profile: 'Profile' };
  $$('[data-tab]').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = b.dataset.tab;
      if (t === 'album') { toast('The albums list is a separate screen.'); return; }
      toast(names[t] + ' is a separate screen.');
    });
  });
  $('#back').addEventListener('click', function () { toast('The albums list is a separate screen.'); });

  /* The library this album can draw from, and what is in the album */
  var library = [
    { id: 1, name: 'One more sunset', src: 'assets/lib-sunset.webp' },
    { id: 2, name: 'The coast, just me', src: 'assets/lib-coast.webp' },
    { id: 3, name: 'The great outdoors', src: 'assets/lib-outdoors.webp' },
    { id: 4, name: 'Sunday, at home', src: 'assets/lib-sunday.webp' },
    { id: 5, name: 'A very good ordinary day', src: 'assets/lib-ordinary.webp' },
    { id: 6, name: 'Studio light', ph: 'a' },
    { id: 7, name: 'Blue hour', ph: 'b' },
    { id: 8, name: 'Golden afternoon', ph: 'c' }
  ];
  var items = [], nextUp = 100;
  var blank = $('#blank'), filled = $('#filled'), grid = $('#grid');
  var selecting = false, chosen = {};
  var check = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

  function thumb(it, cls) {
    if (it.src) { var im = document.createElement('img'); im.src = it.src; im.alt = ''; im.draggable = false; return im; }
    var p = document.createElement('span'); p.className = 'ph ' + (it.ph || 'a'); return p;
  }
  function render(freshFrom) {
    var any = items.length > 0;
    blank.hidden = any; filled.hidden = !any; grid.textContent = '';
    $('#count').textContent = items.length + (items.length === 1 ? ' memory' : ' memories');
    items.forEach(function (it, i) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'm'; b.setAttribute('role', 'listitem'); b.setAttribute('aria-label', it.name);
      b.style.setProperty('--i', freshFrom != null && i >= freshFrom ? i - freshFrom : 0);
      if (!(freshFrom != null && i >= freshFrom)) b.style.animation = 'none';
      b.appendChild(thumb(it));
      var s = document.createElement('span'); s.className = 'sel'; s.innerHTML = check; b.appendChild(s);
      if (selecting) b.setAttribute('aria-checked', chosen[it.id] ? 'true' : 'false');
      b.addEventListener('click', function () { if (b._held) { b._held = false; return; } selecting ? toggle(it) : openViewer(i); });
      var timer; b.addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse' || selecting) return; timer = setTimeout(function () { timer = null; startSelect(it); b._held = true; }, 480); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (n) { b.addEventListener(n, function () { clearTimeout(timer); }); });
      b.addEventListener('contextmenu', function (e) { if (e.pointerType === 'touch') e.preventDefault(); });
      grid.appendChild(b);
    });
    if (window.HavenFX && HavenFX.scan) HavenFX.scan();
  }

  /* Menu */
  var menu = $('#menu'), mb = $('#menuBtn');
  function openMenu(on) { menu.classList.toggle('on', on); mb.setAttribute('aria-expanded', String(on)); }
  mb.addEventListener('click', function (e) { e.stopPropagation(); openMenu(!menu.classList.contains('on')); });
  document.addEventListener('click', function (e) { if (!menu.contains(e.target)) openMenu(false); });

  /* Adding from the library */
  var sheet = $('#pickSheet'), pgrid = $('#pgrid'), picked = {};
  function openD(d) { if (d.showModal) d.showModal(); else d.setAttribute('open', ''); }
  function closeD(d) { if (d.close) d.close(); else d.removeAttribute('open'); }
  function buildPicker() {
    picked = {}; pgrid.textContent = '';
    var inAlbum = {}; items.forEach(function (x) { inAlbum[x.id] = true; });
    var avail = library.filter(function (l) { return !inAlbum[l.id]; });
    if (!avail.length) { var n = document.createElement('p'); n.className = 'pnone'; n.textContent = 'Everything in your library is already in this album.'; pgrid.appendChild(n); }
    avail.forEach(function (l) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'pt'; b.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-label', l.name);
      b.appendChild(thumb(l)); var c = document.createElement('span'); c.className = 'ck'; c.innerHTML = check; b.appendChild(c);
      b.addEventListener('click', function () { var on = !picked[l.id]; if (on) picked[l.id] = l; else delete picked[l.id]; b.setAttribute('aria-pressed', String(on)); pickSum(); });
      pgrid.appendChild(b);
    });
    pickSum();
  }
  function pickSum() {
    var n = Object.keys(picked).length;
    $('#pickN').textContent = n ? n + ' selected' : 'None selected'; $('#pickGo').disabled = !n; $('#pickGo').textContent = n ? 'Add ' + n : 'Add';
  }
  function addItems(list) {
    if (!list.length) return;
    var from = items.length; items = items.concat(list); render(from);
    toast(list.length === 1 ? 'Added to Fun Moments.' : list.length + ' memories added to Fun Moments.');
    if (window.HavenFX) HavenFX.confetti(innerWidth / 2, innerHeight * .35, 40);
  }
  $$('[data-add]').forEach(function (b) { b.addEventListener('click', function () { openMenu(false); if (selecting) endSelect(); buildPicker(); openD(sheet); }); });
  $('#pickCancel').addEventListener('click', function () { closeD(sheet); });
  sheet.addEventListener('click', function (e) { if (e.target === sheet) closeD(sheet); });
  $('#pickGo').addEventListener('click', function () {
    var list = Object.keys(picked).map(function (k) { return picked[k]; }).sort(function (a, b) { return a.id - b.id; });
    closeD(sheet); addItems(list);
  });
  var pick = $('#pick');
  $('#upNew').addEventListener('click', function () { pick.value = ''; pick.click(); });
  pick.addEventListener('change', function () {
    var files = Array.prototype.slice.call(pick.files || []).filter(function (f) { return /^(image|video)\//.test(f.type); });
    var list = files.map(function (f) { return { id: nextUp++, name: f.name.replace(/\.[^.]+$/, ''), src: URL.createObjectURL(f), video: f.type.indexOf('video/') === 0 }; });
    if (files.length && !list.length) return;
    closeD(sheet); if (list.length) addItems(list); else toast('Choose photos or videos.');
  });

  /* Select to remove */
  var selbar = $('#selbar');
  function sync() {
    var n = Object.keys(chosen).length;
    $('#selN').textContent = n + ' selected'; $('#selDel').disabled = !n;
    $$('.m', grid).forEach(function (b, i) { b.setAttribute('aria-checked', chosen[items[i].id] ? 'true' : 'false'); });
  }
  function startSelect(it) {
    if (!items.length) return; selecting = true; app.classList.add('selecting'); document.body.classList.add('selecting'); selbar.setAttribute('aria-hidden', 'false'); chosen = {};
    if (it) chosen[it.id] = true; sync(); if (navigator.vibrate) navigator.vibrate(12);
  }
  function endSelect() { selecting = false; chosen = {}; app.classList.remove('selecting'); document.body.classList.remove('selecting'); selbar.setAttribute('aria-hidden', 'true'); $$('.m', grid).forEach(function (b) { b.removeAttribute('aria-checked'); }); }
  function toggle(it) { if (chosen[it.id]) delete chosen[it.id]; else chosen[it.id] = true; sync(); }
  $('#mSelect').addEventListener('click', function () { openMenu(false); if (!items.length) { toast('Add media first, then select it.'); return; } startSelect(); });
  $('#selCancel').addEventListener('click', endSelect);
  $('#selDel').addEventListener('click', function () {
    var gone = items.filter(function (x) { return chosen[x.id]; }), snap = items.slice();
    items = items.filter(function (x) { return !chosen[x.id]; }); endSelect(); render();
    toast(gone.length === 1 ? 'Removed from album.' : gone.length + ' removed from album.', function () { items = snap; render(); });
  });

  /* Rename */
  var nameSheet = $('#nameSheet'), nm = $('#nm'), err = $('#err');
  $('#mRename').addEventListener('click', function () {
    openMenu(false); nm.value = $('#title').textContent; nm.classList.remove('bad'); err.hidden = true; openD(nameSheet);
    setTimeout(function () { nm.focus(); nm.select(); }, 60);
  });
  $('#nameCancel').addEventListener('click', function () { closeD(nameSheet); });
  nameSheet.addEventListener('click', function (e) { if (e.target === nameSheet) closeD(nameSheet); });
  nm.addEventListener('input', function () { nm.classList.remove('bad'); err.hidden = true; });
  $('#nameForm').addEventListener('submit', function (e) {
    e.preventDefault(); var v = nm.value.trim();
    if (!v) { nm.classList.remove('bad'); void nm.offsetWidth; nm.classList.add('bad'); err.hidden = false; nm.focus(); return; }
    $('#title').textContent = v; document.title = 'Haven · ' + v; closeD(nameSheet); toast('Album renamed.');
  });

  /* Viewer */
  var viewer = $('#viewer'), vi = 0;
  function showV() {
    var it = items[vi], m = $('#viewerMedia'); m.textContent = '';
    if (it.video) { var v = document.createElement('video'); v.src = it.src; v.controls = true; v.playsInline = true; m.appendChild(v); }
    else m.appendChild(thumb(it));
    $('#viewerCap').textContent = it.name; $('#vPrev').hidden = vi === 0; $('#vNext').hidden = vi === items.length - 1;
  }
  function openViewer(i) { vi = i; showV(); openD(viewer); }
  $('#viewerX').addEventListener('click', function () { closeD(viewer); });
  viewer.addEventListener('click', function (e) { if (e.target === viewer) closeD(viewer); });
  $('#vPrev').addEventListener('click', function () { if (vi > 0) { vi--; showV(); } });
  $('#vNext').addEventListener('click', function () { if (vi < items.length - 1) { vi++; showV(); } });
  document.addEventListener('keydown', function (e) {
    if (viewer.open) { if (e.key === 'ArrowLeft') $('#vPrev').click(); else if (e.key === 'ArrowRight') $('#vNext').click(); return; }
    if (e.key === 'Escape') { openMenu(false); if (selecting) endSelect(); }
  });

  render();
})();
