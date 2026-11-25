(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var toastEl = $('#toast'), toastTimer;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.classList.remove('on'); }, 2600);
  }

  // Smooth in-page links and placeholder links
  $$('[data-scroll]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var t = $(a.getAttribute('href')); if (!t) return;
      e.preventDefault(); t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    });
  });
  $$('[data-soon]').forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); toast(a.getAttribute('data-soon')); });
  });
  $('.brand').addEventListener('click', function (e) { e.preventDefault(); window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });

  // Hero prints: tap to bring one to the front
  var prints = $$('.print');
  prints.forEach(function (p) {
    p.addEventListener('click', function () {
      prints.forEach(function (o) { o.classList.remove('front'); });
      p.classList.add('front');
    });
  });

  // Library
  var grid = $('#grid'), empty = $('#empty'), q = $('#q'), tab = 'all', stateEl = $('#safeState'), stateTimer;
  function tiles() { return $$('.tile', grid); }
  function syncCount() {
    var n = tiles().length;
    $('#savedCount').textContent = n + (n === 1 ? ' memory' : ' memories') + '. Right where they belong.';
  }
  function renderStoredMedia(records) {
    $$('[data-stored-media]', grid).forEach(function (tile) { tile.remove(); });
    records.slice().reverse().forEach(function (record) {
      var item = HavenMediaStore.mediaItem(record), tile = document.createElement('button');
      tile.type = 'button'; tile.className = 'tile'; tile.dataset.type = item.video ? 'video' : 'photo';
      tile.dataset.title = item.name; tile.dataset.storedMedia = '';
      var media = document.createElement(item.video ? 'video' : 'img');
      media.src = item.url;
      if (item.video) { media.muted = true; media.playsInline = true; media.preload = 'metadata'; }
      else { media.alt = item.name; }
      var caption = document.createElement('span'); caption.className = 'cap'; caption.textContent = item.name;
      tile.appendChild(media); tile.appendChild(caption); grid.insertBefore(tile, grid.firstChild);
    });
    apply(); syncCount();
  }
  function refreshStoredMedia() {
    return HavenMediaStore.list().then(renderStoredMedia);
  }
  function reportMediaError(action, error) {
    stateEl.textContent = 'Could not ' + action;
    toast('Could not ' + action + ': ' + error.message);
  }
  function apply() {
    var term = q.value.trim().toLowerCase(), shown = 0;
    tiles().forEach(function (t) {
      var ok = (tab === 'all' || t.dataset.type === tab) && t.dataset.title.toLowerCase().indexOf(term) !== -1;
      t.hidden = !ok; if (ok) shown++;
    });
    empty.hidden = shown > 0;
    if (!shown) {
      empty.textContent = term ? 'Nothing matches “' + q.value.trim() + '”.' : (tab === 'video' ? 'No videos yet. Tap + to add one.' : 'No photos yet. Tap + to add one.');
    }
  }
  $$('.tab').forEach(function (b) {
    b.addEventListener('click', function () {
      tab = b.dataset.tab;
      $$('.tab').forEach(function (o) { o.setAttribute('aria-selected', String(o === b)); });
      apply();
    });
  });
  q.addEventListener('input', apply);

  // Viewer
  var dlg = $('#viewer'), media = $('#viewerMedia'), cap = $('#viewerCap');
  function openTile(t) {
    media.textContent = '';
    var src = t.querySelector('img, video'), el;
    if (t.dataset.type === 'video') { el = document.createElement('video'); el.controls = true; el.playsInline = true; el.src = src.src; }
    else { el = document.createElement('img'); el.src = src.src; el.alt = t.dataset.title; }
    media.appendChild(el); cap.textContent = t.dataset.title;
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  }
  function closeViewer() { var v = media.querySelector('video'); if (v) v.pause(); if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
  grid.addEventListener('click', function (e) { var t = e.target.closest('.tile'); if (t) openTile(t); });
  $('#viewerX').addEventListener('click', closeViewer);
  dlg.addEventListener('click', function (e) { if (e.target === dlg) closeViewer(); });

  // Adding memories
  var pick = $('#pick');
  function choose() { pick.value = ''; pick.click(); }
  $('#addBtn').addEventListener('click', choose);
  pick.addEventListener('change', function () {
    var files = Array.prototype.slice.call(pick.files || []).filter(function (f) { return /^(image|video)\//.test(f.type); });
    if (!files.length) return;
    stateEl.textContent = 'Saving ' + files.length + '…';
    clearTimeout(stateTimer);
    HavenMediaStore.add(files).then(refreshStoredMedia).then(function () {
      q.value = ''; tab = 'all';
      $$('.tab').forEach(function (o) { o.setAttribute('aria-selected', String(o.dataset.tab === 'all')); });
      apply(); syncCount(); stateEl.textContent = '✓  Everything is safe';
      toast('Safe in Haven. ' + tiles().length + ' memories.');
      if (window.HavenFX) HavenFX.confetti(innerWidth / 2, innerHeight * .6, 60);
    }).catch(function (error) { reportMediaError('save your media', error); });
  });

  refreshStoredMedia().catch(function (error) { reportMediaError('load your media', error); });
  HavenMediaStore.subscribe(function () {
    refreshStoredMedia().catch(function (error) { reportMediaError('refresh your media', error); });
  });
})();
