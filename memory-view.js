(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mv = $('#mv'), stage = $('#stage'), pic = $('#pic'), img = $('#img'), vid = $('#vid');
  function isVid() { var it = items[idx]; return !!(it && it.video); }

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
    { name: 'Desk setup tour', type: 'video', src: 'assets/clip-desk.webp', video: 'assets/clip-desk.mp4', alt: 'assets/clip-desk.webm', taken: 'November 12, 2026', added: 'November 18, 2026', bytes: 241472, file: 'desk-setup-tour.mp4', fav: false, albums: {} },
    { name: 'The coast, just me', src: 'assets/lib-coast.webp', taken: 'November 9, 2026', added: 'November 18, 2026', bytes: 25560, file: 'the-coast-just-me.webp', fav: false, albums: {} },
    { name: 'The great outdoors', src: 'assets/lib-outdoors.webp', taken: 'October 28, 2026', added: 'November 2, 2026', bytes: 18950, file: 'the-great-outdoors.webp', fav: false, albums: { 'Dcodes_UIUX': true } },
    { name: 'Sunday, at home', src: 'assets/lib-sunday.webp', taken: 'October 18, 2026', added: 'October 19, 2026', bytes: 33766, file: 'sunday-at-home.webp', fav: false, albums: {} },
    { name: 'A very good ordinary day', src: 'assets/lib-ordinary.webp', taken: 'September 30, 2026', added: 'October 1, 2026', bytes: 17634, file: 'a-very-good-ordinary-day.webp', fav: false, albums: {} }
  ];
  var albums = [
    { name: 'Tess Outing', n: 24, src: 'assets/lib-sunset.webp' },
    { name: 'Dee Copywriter', n: 14, ph: 'a' },
    { name: 'Dcodes_UIUX', n: 4, src: 'assets/lib-outdoors.webp' },
    { name: 'Lifestyle', n: 144, ph: 'b' }
  ];
  var idx = 0, playing = null;
  var params = new URLSearchParams(location.search);

  function initSelectedMemory() {
    var id = params.get('id'), src = params.get('src'), name = params.get('name'), type = params.get('type');
    if (id && window.HavenMediaStore) {
      return HavenMediaStore.list().then(function (records) {
        var record = records.filter(function (item) { return item.id === id; })[0];
        if (!record) throw new Error('The saved memory could not be found.');
        var media = HavenMediaStore.mediaItem(record);
        var it = {
          name: media.name,
          src: media.url,
          video: media.video ? media.url : null,
          alt: null,
          taken: media.when,
          added: media.when,
          bytes: media.size,
          file: record.name + (record.type.indexOf('video/') === 0 ? '.mp4' : ''),
          fav: false,
          albums: {}
        };
        items = [it];
      });
    }
    if (src) {
      var isVideo = type === 'video' || /\.(mp4|webm|mov)(?:[?#].*)?$/i.test(src);
      var existing = items.filter(function (item) { return item.src === src || item.video === src; })[0];
      if (existing) {
        idx = items.indexOf(existing);
      } else {
        var selected = {
          name: name || 'Memory',
          src: src,
          video: isVideo ? src : null,
          taken: 'Today',
          added: 'Today',
          bytes: 0,
          file: src.split('/').pop(),
          fav: false,
          albums: {}
        };
        items = [selected];
      }
    } else if (name) {
      var named = items.filter(function (item) { return item.name === name; })[0];
      if (named) idx = items.indexOf(named);
    }
    return Promise.resolve();
  }

  /* Zoom and pan */
  var s = 1, x = 0, y = 0;
  function clampPan() {
    var w = stage.clientWidth, h = stage.clientHeight, mx = Math.max(0, (w * s - w) / 2), my = Math.max(0, (h * s - h) / 2);
    x = Math.min(mx, Math.max(-mx, x)); y = Math.min(my, Math.max(-my, y));
  }
  var tagT;
  function apply(animate) {
    pic.style.transition = animate && !reduce ? 'transform .28s cubic-bezier(.2,.8,.3,1)' : 'none';
    pic.style.transform = s === 1 && x === 0 && y === 0 ? '' : 'translate3d(' + x + 'px,' + y + 'px,0) scale(' + s + ')';
    stage.classList.toggle('zoomed', s > 1.01);
    var tag = $('#zoomTag'); tag.textContent = Math.round(s * 100) + '%'; tag.classList.toggle('on', s > 1.01);
    clearTimeout(tagT); if (s > 1.01) tagT = setTimeout(function () { tag.classList.remove('on'); }, 1200);
  }
  function zoomAt(ns, cx, cy, animate) {
    if (isVid()) return; ns = Math.min(6, Math.max(1, ns)); var k = ns / s; x = cx - (cx - x) * k; y = cy - (cy - y) * k; s = ns;
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
    if (e.target.closest('.arrow, .gone, .vctl button, .vprog')) return;
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
      if (isVid()) { vtap(); return; }
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
      $('#dTaken').textContent = it.taken; $('#dAdded').textContent = it.added; $('#dSize').textContent = fmt(it.bytes);
      $('#dFormat').textContent = it.file; $('#dDims').textContent = (function () { var w = it.video ? vid.videoWidth : img.naturalWidth, h = it.video ? vid.videoHeight : img.naturalHeight; return w ? w + '\u00d7' + h + 'px' : '\u2013'; })();
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
    vstop(); var imageUrl = it.video ? it.src : new URL(it.src, location.href).href;
    img.src = imageUrl; img.alt = it.name; resetZoom(false); pic.style.opacity = '';
    stage.style.backgroundImage = it.video ? 'none' : 'url("' + imageUrl + '")';
    stage.style.backgroundPosition = 'center';
    stage.style.backgroundSize = 'contain';
    stage.style.backgroundRepeat = 'no-repeat';
    pic.style.zIndex = '100';
    img.style.position = 'relative';
    img.style.zIndex = '100';
    img.style.transform = 'translateZ(0)';
    requestAnimationFrame(function () { img.src = imageUrl; });
    setVideo(it);
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

  /* Video: paused it's dimmed with mute + play in the middle; a tap plays, a tap while playing peeks the controls */
  var vctl = $('#vctl'), vprog = $('#vprog'), vtrack = $('#vTrack'), vfill = $('#vFill'), peekT;
  var ICON = {
    play: '<polygon points="6 3 20 12 6 21 6 3"/>', pause: '<rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>',
    off: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" x2="16" y1="9" y2="15"/><line x1="16" x2="22" y1="9" y2="15"/>',
    on: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>'
  };
  function mmss(t) { t = Math.max(0, Math.floor(t || 0)); return Math.floor(t / 60) + '.' + String(t % 60).padStart(2, '0'); }
  function vui() {
    var on = !vid.paused && !vid.ended;
    stage.classList.toggle('playing', on);
    $('#vPlayI').innerHTML = on ? ICON.pause : ICON.play; $('#vPlay').setAttribute('aria-label', on ? 'Pause' : 'Play');
    $('#vMuteI').innerHTML = vid.muted ? ICON.off : ICON.on; $('#vMute').setAttribute('aria-label', vid.muted ? 'Unmute' : 'Mute');
    clearTimeout(peekT); vctl.classList.toggle('away', on);
  }
  function vtime() {
    var d = vid.duration || 0, p = d ? vid.currentTime / d : 0;
    vfill.style.width = (p * 100) + '%'; $('#vCur').textContent = mmss(vid.currentTime); $('#vDur').textContent = mmss(d);
    vtrack.setAttribute('aria-valuenow', String(Math.round(p * 100)));
  }
  function setVideo(it) {
    var v = !!it.video; mv.classList.toggle('is-video', v); stage.classList.toggle('vid', v);
    vid.hidden = !v; img.style.visibility = v ? 'hidden' : ''; vctl.hidden = !v; vprog.hidden = !v;
    if (v) { vid.poster = it.src; var u = (it.alt && !vid.canPlayType('video/mp4; codecs="avc1.42E01E"')) ? it.alt : it.video; if (vid.getAttribute('src') !== u) vid.src = u; vid.muted = true; vtime(); vui(); }
  }
  function vstop() { try { vid.pause(); vid.currentTime = 0; } catch (z) {} stage.classList.remove('playing'); }
  function vtoggle() {
    if (!isVid()) return;
    if (vid.paused || vid.ended) { var pr = vid.play(); if (pr && pr.catch) pr.catch(function () { toast('Couldn’t play this video.'); }); } else vid.pause();
  }
  function vtap() {
    if (vid.paused || vid.ended) { vtoggle(); return; }
    vctl.classList.remove('away'); clearTimeout(peekT); peekT = setTimeout(function () { if (!vid.paused) vctl.classList.add('away'); }, 2500);
  }
  ['play', 'pause', 'ended', 'volumechange'].forEach(function (n) { vid.addEventListener(n, vui); });
  vid.addEventListener('timeupdate', vtime); vid.addEventListener('loadedmetadata', function () { vtime(); det.render(); });
  $('#vPlay').addEventListener('click', vtoggle);
  $('#vMute').addEventListener('click', function () { vid.muted = !vid.muted; });
  function seek(e) { var r = vtrack.getBoundingClientRect(), p = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)); if (vid.duration) { vid.currentTime = p * vid.duration; vtime(); } }
  var scrub = false;
  vtrack.addEventListener('pointerdown', function (e) { scrub = true; vtrack.classList.add('scrub'); try { vtrack.setPointerCapture(e.pointerId); } catch (z) {} seek(e); });
  vtrack.addEventListener('pointermove', function (e) { if (scrub) seek(e); });
  function sEnd() { scrub = false; vtrack.classList.remove('scrub'); }
  vtrack.addEventListener('pointerup', sEnd); vtrack.addEventListener('pointercancel', sEnd);
  vtrack.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { vid.currentTime = Math.max(0, vid.currentTime - 1); e.preventDefault(); e.stopPropagation(); }
    else if (e.key === 'ArrowRight') { vid.currentTime = Math.min(vid.duration || 0, vid.currentTime + 1); e.preventDefault(); e.stopPropagation(); }
  });

  /* Menu */
  var menu = $('#menu'), mb = $('#menuBtn');
  function openMenu(on) { menu.classList.toggle('on', on); mb.setAttribute('aria-expanded', String(on)); }
  mb.addEventListener('click', function (e) { e.stopPropagation(); openMenu(!menu.classList.contains('on')); });
  document.addEventListener('click', function (e) { if (!menu.contains(e.target)) openMenu(false); });
  $('#close').addEventListener('click', function () {
    var from = params.get('from');
    if (from) { window.location.href = from + '.html'; return; }
    if (history.length > 1) history.back(); else window.location.href = 'library-all.html';
  });

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
    var it = items[idx], a = document.createElement('a'); a.href = it.video || it.src; a.download = it.video ? it.file : it.name.replace(/[^\w]+/g, '-').toLowerCase() + '.webp';
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
  [['vShare', 'aShare'], ['vDl', 'aDl'], ['vAlb', 'aAlb'], ['vDel', 'aDel']].forEach(function (m) { $('#' + m[0]).addEventListener('click', function () { openMenu(false); $('#' + m[1]).click(); }); });
  $('#aAlb').addEventListener('click', function () { buildAlbums(); open($('#albSheet')); });
  $('#aDel').addEventListener('click', function () { open($('#delSheet')); });
  $('#delGo').addEventListener('click', function () {
    close($('#delSheet')); stopShow();
    var at = idx, it = items.splice(idx, 1)[0];
    if (idx >= items.length) idx = items.length - 1;
    if (!items.length) { $('#gone').hidden = false; $('#count').textContent = '0 of 0'; } else show(1);
    toast('Memory deleted', function () { items.splice(at, 0, it); idx = at; $('#gone').hidden = true; show(0); });
  });
  $('#goneBack').addEventListener('click', function () { toast('The library is a separate screen.'); });

  /* Keyboard */
  document.addEventListener('keydown', function (e) {
    if (document.querySelector('dialog[open]')) return;
    if (e.key === 'ArrowLeft') { stopShow(); go(-1); }
    else if (e.key === 'ArrowRight') { stopShow(); go(1); }
    else if (e.key === '+' || e.key === '=') zoomAt(s * 1.4, 0, 0, true);
    else if (e.key === '-') zoomAt(s / 1.4, 0, 0, true);
    else if (e.key === '0') resetZoom(true);
    else if (e.key === ' ' && isVid()) { e.preventDefault(); vtoggle(); }
    else if (e.key === 'ArrowUp') det.set(true);
    else if (e.key === 'ArrowDown') det.set(false);
    else if (e.key === 'Escape') { if (det.isOpen) det.set(false); else if (menu.classList.contains('on')) openMenu(false); else if (s > 1) resetZoom(true); else if (mv.classList.contains('immersive')) mv.classList.remove('immersive'); }
    else if (e.key.toLowerCase() === 'i') $('#mInfo').click();
  });
  addEventListener('resize', function () { clampPan(); apply(false); });

  initSelectedMemory().then(function () { show(0); }).catch(function (error) {
    items = [];
    $('#gone').querySelector('b').textContent = 'Memory unavailable';
    $('#gone').querySelector('span').textContent = error.message;
    $('#goneBack').textContent = 'Back';
    $('#gone').hidden = false;
    $('#count').textContent = 'Unavailable';
    toast('Could not load this memory.');
  });
})();
