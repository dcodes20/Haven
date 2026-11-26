(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mv = $('#mv'), stage = $('#stage'), pic = $('#pic'), img = $('#img');
  var params = new URLSearchParams(window.location.search);
  var requestedId = params.get('id'), requestedSrc = params.get('src');
  var requestedName = params.get('name') || 'Memory';
  var source = params.get('from');
  var returnPage = source === 'library-all' ? 'library-all.html' : source === 'index' ? 'index.html' : 'home-filled.html';

  function returnToSource() { window.location.href = returnPage; }
  function showUnavailable() {
    img.removeAttribute('src');
    $('#gone').querySelector('b').textContent = 'Memory unavailable';
    $('#gone').querySelector('span').textContent = 'This image could not be loaded.';
    $('#gone').hidden = false;
  }

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
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.classList.remove('on'); }, undo ? 5000 : 2400);
  }

  /* The memories in this library, newest first */
  var items = [
    { name: 'One more sunset', src: 'assets/lib-sunset.webp', taken: 'November 15, 2026', added: 'November 18, 2026', bytes: 12950, file: 'one-more-sunset.webp', fav: false, albums: { 'Tess Outing': true } },
    { name: 'The coast, just me', src: 'assets/lib-coast.webp', taken: 'November 9, 2026', added: 'November 18, 2026', bytes: 25560, file: 'the-coast-just-me.webp', fav: false, albums: {} },
    { name: 'The great outdoors', src: 'assets/lib-outdoors.webp', taken: 'October 28, 2026', added: 'November 2, 2026', bytes: 18950, file: 'the-great-outdoors.webp', fav: false, albums: { 'Dcodes_UIUX': true } },
    { name: 'Sunday, at home', src: 'assets/lib-sunday.webp', taken: 'October 18, 2026', added: 'October 19, 2026', bytes: 33766, file: 'sunday-at-home.webp', fav: false, albums: {} },
    { name: 'A very good ordinary day', src: 'assets/lib-ordinary.webp', taken: 'September 30, 2026', added: 'October 1, 2026', bytes: 17634, file: 'a-very-good-ordinary-day.webp', fav: false, albums: {} }
  ];
  if (requestedId) items = [];
  else if (requestedSrc) {
    items = [{
      name: requestedName,
      src: requestedSrc,
      taken: '\u2014',
      added: '\u2014',
      bytes: 0,
      file: requestedSrc.split('/').pop() || requestedName,
      fav: false,
      albums: {}
    }];
  }
  var albums = [
    { name: 'Tess Outing', n: 24, src: 'assets/lib-sunset.webp' },
    { name: 'Dee Copywriter', n: 14, ph: 'a' },
    { name: 'Dcodes_UIUX', n: 4, src: 'assets/lib-outdoors.webp' },
    { name: 'Lifestyle', n: 144, ph: 'b' }
  ];
  var idx = 0, playing = null;

  /* Zoom and pan */
  var s = 1, x = 0, y = 0;
  function clampPan() {
    var w = stage.clientWidth, h = stage.clientHeight, mx = Math.max(0, (w * s - w) / 2), my = Math.max(0, (h * s - h) / 2);
    x = Math.min(mx, Math.max(-mx, x)); y = Math.min(my, Math.max(-my, y));
  }
  var tagT;
  function apply(animate) {
    pic.style.transition = animate && !reduce ? 'transform .28s cubic-bezier(.2,.8,.3,1)' : 'none';
    pic.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) scale(' + s + ')';
    stage.classList.toggle('zoomed', s > 1.01);
    var tag = $('#zoomTag'); tag.textContent = Math.round(s * 100) + '%'; tag.classList.toggle('on', s > 1.01);
    clearTimeout(tagT); if (s > 1.01) tagT = setTimeout(function () { tag.classList.remove('on'); }, 1200);
  }
  function zoomAt(ns, cx, cy, animate) {
    ns = Math.min(6, Math.max(1, ns)); var k = ns / s; x = cx - (cx - x) * k; y = cy - (cy - y) * k; s = ns;
    if (s < 1.02) { s = 1; x = 0; y = 0; } clampPan(); apply(animate);
  }
  function rel(e) { var r = stage.getBoundingClientRect(); return { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2 }; }
  function resetZoom(animate) { s = 1; x = 0; y = 0; apply(animate); }

  stage.addEventListener('wheel', function (e) {
    e.preventDefault(); stopShow();
    var p = rel(e), f = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018)); zoomAt(s * f, p.x, p.y, false);
  }, { passive: false });

  var pts = {}, count = 0, g = null, tapT, lastTap = 0, lastTapPos = null;
  function dist() { var k = Object.keys(pts); var a = pts[k[0]], b = pts[k[1]]; return Math.hypot(a.x - b.x, a.y - b.y); }
  function mid() { var k = Object.keys(pts); var a = pts[k[0]], b = pts[k[1]]; return { clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 }; }
  stage.addEventListener('pointerdown', function (e) {
    if (e.target.closest('.arrow, .gone')) return;
    stopShow(); try { stage.setPointerCapture(e.pointerId); } catch (x1) {}
    pts[e.pointerId] = { x: e.clientX, y: e.clientY }; count = Object.keys(pts).length;
    if (count === 1) g = { sx: e.clientX, sy: e.clientY, ox: x, oy: y, t: performance.now(), moved: false, dx: 0 };
    else if (count === 2) { g = g || {}; g.moved = true; g.d0 = dist(); g.s0 = s; }
  });
  stage.addEventListener('pointermove', function (e) {
    if (!pts[e.pointerId]) return; pts[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (count === 2) { var m = rel(mid()); zoomAt(g.s0 * dist() / g.d0, m.x, m.y, false); return; }
    var dx = e.clientX - g.sx, dy = e.clientY - g.sy;
    if (!g.moved && Math.abs(dx) + Math.abs(dy) > 6) { g.moved = true; stage.classList.add('panning'); }
    if (!g.moved) return;
    if (s > 1.01) { x = g.ox + dx; y = g.oy + dy; clampPan(); apply(false); }
    else {
      if (!g.axis) g.axis = Math.abs(dy) > Math.abs(dx) ? 'v' : 'h';
      if (g.axis === 'v') { g.dy = dy; det.drag(dy); }
      else if (!det.isOpen) { g.dx = dx; pic.style.transition = 'none'; pic.style.transform = 'translate3d(' + dx * .8 + 'px,0,0)'; pic.style.opacity = String(1 - Math.min(.5, Math.abs(dx) / 500)); }
    }
  });
  function end(e) {
    if (!pts[e.pointerId]) return; delete pts[e.pointerId]; count = Object.keys(pts).length; stage.classList.remove('panning');
    if (count === 1) { var k = Object.keys(pts)[0]; g = { sx: pts[k].x, sy: pts[k].y, ox: x, oy: y, t: performance.now(), moved: true, dx: 0 }; return; }
    if (count > 0 || !g) return;
    var gg = g; g = null;
    if (!gg.moved) {                                   /* a tap */
      if (det.isOpen) { det.set(false); return; }
      var now = performance.now(), p = rel(e);
      if (now - lastTap < 300) { clearTimeout(tapT); lastTap = 0; if (s > 1.01) resetZoom(true); else zoomAt(2.6, p.x, p.y, true); }
      else { lastTap = now; tapT = setTimeout(function () { mv.classList.toggle('immersive'); }, 260); }
      return;
    }
    pic.style.opacity = '';
    if (s <= 1.01) {
      if (gg.axis === 'v') { det.finish(gg.dy || 0, performance.now() - gg.t); return; }
      if (det.isOpen) { x = 0; apply(true); return; }
      if (Math.abs(gg.dx) > Math.min(90, stage.clientWidth * .2)) go(gg.dx < 0 ? 1 : -1); else { x = 0; y = 0; apply(true); }
    }
  }
  stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);

  /* Memory details: follows the finger on a swipe up, springs open or shut on release */
  var det = (function () {
    var el = $('#details'), isOpen = false;
    function H() { return el.offsetHeight || 320; }
    function fmt(b) { return b >= 1048576 ? (b / 1048576).toFixed(2).replace(/\.?0+$/, '') + 'MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }
    function render() {
      var it = items[idx]; if (!it) return;
      $('#dTaken').textContent = it.taken; $('#dAdded').textContent = it.added; $('#dSize').textContent = it.bytes ? fmt(it.bytes) : '\u2014';
      $('#dFormat').textContent = it.file; $('#dDims').textContent = img.naturalWidth ? img.naturalWidth + '\u00d7' + img.naturalHeight + 'px' : '\u2013';
    }
    function set(on) {
      isOpen = on; el.classList.remove('drag'); el.style.transform = ''; el.classList.toggle('open', on);
      el.setAttribute('aria-hidden', String(!on)); if (on) el.removeAttribute('inert'); else el.setAttribute('inert', '');
      det.isOpen = on; if (on) { render(); mv.classList.remove('immersive'); stopShow(); }
    }
    function drag(dy) {                                /* dy < 0 is upward */
      var h = H(), py = isOpen ? Math.max(0, Math.min(h, dy)) : Math.max(0, Math.min(h, h + dy));
      if (!isOpen && dy >= 0) return;
      el.classList.add('drag'); el.style.transform = 'translateY(' + py + 'px)';
    }
    function finish(dy, ms) {
      var fast = Math.abs(dy) / Math.max(ms, 1) > .5, far = Math.abs(dy) > 60;
      if (!isOpen) set(dy < 0 && (far || fast)); else set(!(dy > 0 && (far || fast)));
    }
    var o = { isOpen: false, set: set, drag: drag, finish: finish, render: render };
    /* swipe down on the sheet itself to close it */
    var sy = null, st = 0;
    el.addEventListener('pointerdown', function (e) { sy = e.clientY; st = performance.now(); try { el.setPointerCapture(e.pointerId); } catch (z) {} });
    el.addEventListener('pointermove', function (e) { if (sy === null) return; var dy = e.clientY - sy; if (dy > 0) { el.classList.add('drag'); el.style.transform = 'translateY(' + Math.min(H(), dy) + 'px)'; } });
    function up(e) { if (sy === null) return; var dy = e.clientY - sy; sy = null; if (dy > 60 || (dy > 20 && dy / Math.max(performance.now() - st, 1) > .5)) set(false); else { el.classList.remove('drag'); el.style.transform = ''; } }
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    return o;
  })();

  /* Showing a memory */
  function arrows() { $('#prev').disabled = idx === 0; $('#next').disabled = idx >= items.length - 1; }
  function show(dir) {
    var it = items[idx]; if (!it) return;
    img.src = it.src; img.alt = it.name; resetZoom(false); pic.style.opacity = '';
    $('#count').textContent = (idx + 1) + ' of ' + items.length;
    $('#favT').textContent = it.fav ? 'Remove favourite' : 'Favourite'; $('#mFav').classList.toggle('on-fav', it.fav);
    arrows(); det.render();
    if (dir && !reduce && pic.animate) pic.animate([{ transform: 'translate3d(' + dir * 70 + 'px,0,0)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 300, easing: 'cubic-bezier(.2,.8,.3,1)' });
    [idx - 1, idx + 1].forEach(function (i) { if (items[i]) { var im = new Image(); im.src = items[i].src; } });
  }
  function go(d, silent) {
    var n = idx + d;
    if (n < 0 || n >= items.length) {                  /* bounce at the ends */
      x = 0; apply(true); if (!silent) toast(n < 0 ? 'This is the newest memory.' : 'That’s the last memory.'); return false;
    }
    idx = n; show(d); return true;
  }
  $('#prev').addEventListener('click', function () { stopShow(); go(-1); });
  $('#next').addEventListener('click', function () { stopShow(); go(1); });

  /* Menu */
  var menu = $('#menu'), mb = $('#menuBtn');
  function openMenu(on) { menu.classList.toggle('on', on); mb.setAttribute('aria-expanded', String(on)); }
  mb.addEventListener('click', function (e) { e.stopPropagation(); openMenu(!menu.classList.contains('on')); });
  document.addEventListener('click', function (e) { if (!menu.contains(e.target)) openMenu(false); });
  $('#close').addEventListener('click', returnToSource);

  $('#mFav').addEventListener('click', function () {
    openMenu(false); var it = items[idx]; it.fav = !it.fav; show(0);
    if (it.fav) { var p = $('#favPop'); p.classList.remove('on'); void p.offsetWidth; p.classList.add('on'); }
    toast(it.fav ? 'Added to favourites.' : 'Removed from favourites.');
  });
  function stopShow() { if (playing) { clearInterval(playing); playing = null; $('#showT').textContent = 'Play slideshow'; } }
  $('#mShow').addEventListener('click', function () {
    openMenu(false);
    if (playing) { stopShow(); return; }
    if (items.length < 2) { toast('Add more memories to play a slideshow.'); return; }
    mv.classList.add('immersive'); $('#showT').textContent = 'Stop slideshow'; toast('Slideshow playing. Tap to stop.');
    playing = setInterval(function () { if (!go(1, true)) { idx = -1; go(1, true); } }, 3200);
  });

  /* Sheets */
  function open(d) { if (d.showModal) d.showModal(); else d.setAttribute('open', ''); }
  function close(d) { if (d.close) d.close(); else d.removeAttribute('open'); }
  $$('dialog.sheet').forEach(function (d) {
    d.addEventListener('click', function (e) { if (e.target === d) close(d); });
    $$('[data-close]', d).forEach(function (b) { b.addEventListener('click', function () { close(d); }); });
  });

  /* Details: the same sheet as a swipe up */
  img.addEventListener('load', det.render);
  $('#mInfo').addEventListener('click', function () { openMenu(false); det.set(!det.isOpen); });

  /* Actions */
  $('#aShare').addEventListener('click', function () {
    var it = items[idx];
    if (navigator.share) { navigator.share({ title: it.name, text: it.name + ' from Haven' }).catch(function () {}); }
    else toast('Sharing opens your device’s share sheet.');
  });
  $('#aDl').addEventListener('click', function () {
    var it = items[idx], a = document.createElement('a'); a.href = it.src; a.download = it.name.replace(/[^\w]+/g, '-').toLowerCase() + '.webp';
    document.body.appendChild(a); a.click(); a.remove(); toast('Saving the original…');
  });
  var alist = $('#alist');
  function buildAlbums() {
    alist.textContent = ''; var it = items[idx];
    albums.forEach(function (a) {
      var li = document.createElement('li'), b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-pressed', it.albums[a.name] ? 'true' : 'false');
      var th = document.createElement('span'); th.className = 'th' + (a.ph ? ' ' + a.ph : ''); if (a.src) th.style.backgroundImage = 'url(' + a.src + ')';
      var nm = document.createElement('span'); nm.className = 'nm'; var t = document.createElement('b'); t.textContent = a.name; var sm = document.createElement('small'); sm.textContent = (a.n + (it.albums[a.name] ? 1 : 0)) + ' items'; nm.appendChild(t); nm.appendChild(sm);
      var ck = document.createElement('span'); ck.className = 'ck'; ck.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
      b.appendChild(th); b.appendChild(nm); b.appendChild(ck);
      b.addEventListener('click', function () {
        if (it.albums[a.name]) delete it.albums[a.name]; else it.albums[a.name] = true;
        var on = !!it.albums[a.name]; b.setAttribute('aria-pressed', String(on)); sm.textContent = (a.n + (on ? 1 : 0)) + ' items';
        $('#aAlb').classList.toggle('hot', Object.keys(it.albums).length > 0); toast(on ? 'Added to ' + a.name + '.' : 'Removed from ' + a.name + '.');
      });
      li.appendChild(b); alist.appendChild(li);
    });
  }
  $('#aAlb').addEventListener('click', function () { buildAlbums(); open($('#albSheet')); });
  $('#aDel').addEventListener('click', function () { open($('#delSheet')); });
  $('#delGo').addEventListener('click', function () {
    close($('#delSheet')); stopShow();
    var at = idx, it = items.splice(idx, 1)[0];
    if (idx >= items.length) idx = items.length - 1;
    if (!items.length) { $('#gone').hidden = false; $('#count').textContent = '0 of 0'; } else show(1);
    toast('Memory deleted', function () { items.splice(at, 0, it); idx = at; $('#gone').hidden = true; show(0); });
  });
  $('#goneBack').addEventListener('click', returnToSource);

  /* Keyboard */
  document.addEventListener('keydown', function (e) {
    if (document.querySelector('dialog[open]')) return;
    if (e.key === 'ArrowLeft') { stopShow(); go(-1); }
    else if (e.key === 'ArrowRight') { stopShow(); go(1); }
    else if (e.key === '+' || e.key === '=') zoomAt(s * 1.4, 0, 0, true);
    else if (e.key === '-') zoomAt(s / 1.4, 0, 0, true);
    else if (e.key === '0') resetZoom(true);
    else if (e.key === 'ArrowUp') det.set(true);
    else if (e.key === 'ArrowDown') det.set(false);
    else if (e.key === 'Escape') { if (det.isOpen) det.set(false); else if (menu.classList.contains('on')) openMenu(false); else if (s > 1) resetZoom(true); else if (mv.classList.contains('immersive')) mv.classList.remove('immersive'); }
    else if (e.key.toLowerCase() === 'i') $('#mInfo').click();
  });
  addEventListener('resize', function () { clampPan(); apply(false); });

  if (requestedId || requestedSrc) img.addEventListener('error', showUnavailable, { once: true });
  if (requestedId) {
    img.removeAttribute('src');
    $('#count').textContent = 'Loading';
    HavenMediaStore.list().then(function (records) {
      var record = records.filter(function (item) { return item.id === requestedId; })[0];
      if (!record || record.type.indexOf('image/') !== 0) { showUnavailable(); return; }
      var item = HavenMediaStore.mediaItem(record);
      var date = new Date(record.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      items = [{
        name: record.name,
        src: item.url,
        taken: date,
        added: date,
        bytes: record.size,
        file: record.blob.name || record.name,
        fav: false,
        albums: {}
      }];
      idx = 0;
      show(0);
    }).catch(function () {
      showUnavailable();
      toast('Could not load this image from browser storage.');
    });
  } else show(0);
})();
