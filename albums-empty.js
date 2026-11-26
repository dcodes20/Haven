(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  /* Tabs */
  var names = { home: 'Home', library: 'Library', profile: 'Profile' };
  $$('[data-tab]').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = b.dataset.tab;
      if (t === 'album') { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); return; }
      toast(names[t] + ' is a separate screen.');
    });
  });

  var albums = [], nextId = 1, tone = 0, editing = null, pendingFiles = [];
  var grid = $('#agrid'), blank = $('#blank');
  var dots = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>';
  function plural(n) { return n ? n + (n === 1 ? ' memory' : ' memories') : 'No memories yet'; }

  function render(freshId) {
    blank.hidden = albums.length > 0; grid.hidden = albums.length === 0; grid.textContent = '';
    albums.forEach(function (a, i) {
      var li = document.createElement('div'); li.className = 'al'; li.setAttribute('role', 'listitem'); li.style.setProperty('--i', freshId === a.id ? 0 : Math.min(i, 10));
      var card = document.createElement('button'); card.type = 'button'; card.className = 'al-card'; card.setAttribute('aria-label', a.name + ', ' + plural(a.count));
      if (a.cover) { var im = document.createElement('img'); im.src = a.cover; im.alt = ''; card.appendChild(im); }
      else { var cv = document.createElement('span'); cv.className = 'cv t' + a.tone; cv.textContent = a.name.charAt(0).toUpperCase(); card.appendChild(cv); }
      var meta = document.createElement('span'); meta.className = 'al-meta'; var b = document.createElement('b'); b.textContent = a.name; var s = document.createElement('span'); s.textContent = plural(a.count);
      meta.appendChild(b); meta.appendChild(s); card.appendChild(meta);
      card.addEventListener('click', function () { toast('Opening an album is a separate screen.'); });
      var more = document.createElement('button'); more.type = 'button'; more.className = 'al-more'; more.setAttribute('aria-label', 'Options for ' + a.name); more.setAttribute('aria-haspopup', 'menu'); more.setAttribute('aria-expanded', 'false'); more.innerHTML = dots;
      more.addEventListener('click', function (e) { e.stopPropagation(); openMenu(li, more, a); });
      li.appendChild(card); li.appendChild(more); grid.appendChild(li);
    });
  }

  /* Per-album menu */
  var openedMenu = null;
  function closeMenu() { if (openedMenu) { openedMenu.btn.setAttribute('aria-expanded', 'false'); openedMenu.el.remove(); openedMenu = null; } }
  function openMenu(li, btn, a) {
    var was = openedMenu && openedMenu.btn === btn; closeMenu(); if (was) return;
    var m = document.createElement('div'); m.className = 'menu on'; m.setAttribute('role', 'menu');
    m.innerHTML = '<button type="button" role="menuitem" data-r>Rename</button><button type="button" role="menuitem" data-d>Delete album</button>';
    m.querySelector('[data-r]').addEventListener('click', function (e) { e.stopPropagation(); closeMenu(); openSheet(a); });
    m.querySelector('[data-d]').addEventListener('click', function (e) {
      e.stopPropagation(); closeMenu(); var snap = albums.slice(); albums = albums.filter(function (x) { return x !== a; }); render();
      toast('“' + a.name + '” deleted', function () { albums = snap; render(); });
    });
    li.appendChild(m); btn.setAttribute('aria-expanded', 'true'); openedMenu = { el: m, btn: btn };
  }
  document.addEventListener('click', closeMenu);

  /* Create / rename sheet */
  var sheet = $('#sheet'), nm = $('#nm'), err = $('#err'), pick = $('#pick');
  function openSheet(a) {
    editing = a || null; pendingFiles = [];
    $('#sheetT').textContent = a ? 'Rename album' : 'New album'; $('#go').textContent = a ? 'Save' : 'Create album';
    $('#memRow').hidden = !!a; nm.value = a ? a.name : ''; nm.classList.remove('bad'); err.hidden = true;
    $('#memSum').textContent = 'None yet. You can add them later.';
    if (sheet.showModal) sheet.showModal(); else sheet.setAttribute('open', '');
    setTimeout(function () { nm.focus(); nm.select(); }, 60);
  }
  function closeSheet() { if (sheet.close) sheet.close(); else sheet.removeAttribute('open'); }
  $$('[data-new], #newBtn').forEach(function (b) { b.addEventListener('click', function () { openSheet(null); }); });
  $('#cancel').addEventListener('click', closeSheet);
  sheet.addEventListener('click', function (e) { if (e.target === sheet) closeSheet(); });
  $('#addMem').addEventListener('click', function () { pick.value = ''; pick.click(); });
  pick.addEventListener('change', function () {
    pendingFiles = Array.prototype.slice.call(pick.files || []).filter(function (f) { return /^(image|video)\//.test(f.type); });
    $('#memSum').textContent = pendingFiles.length ? pendingFiles.length + (pendingFiles.length === 1 ? ' memory' : ' memories') + ' ready to add.' : 'None yet. You can add them later.';
  });
  nm.addEventListener('input', function () { nm.classList.remove('bad'); err.hidden = true; });
  $('#form').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = nm.value.trim();
    if (!name) { nm.classList.remove('bad'); void nm.offsetWidth; nm.classList.add('bad'); err.hidden = false; nm.focus(); return; }
    if (editing) { editing.name = name; render(); closeSheet(); toast('Album renamed.'); return; }
    var img = pendingFiles.filter(function (f) { return f.type.indexOf('image/') === 0; })[0];
    var a = { id: nextId++, name: name, count: pendingFiles.length, cover: img ? URL.createObjectURL(img) : null, tone: tone++ % 4 };
    albums.unshift(a); render(a.id); closeSheet();
    toast('“' + name + '” created.');
    if (window.HavenFX) HavenFX.confetti(innerWidth / 2, innerHeight * .4, 50);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

  render();
})();
