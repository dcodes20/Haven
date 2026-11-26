(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var toastEl = $('#toast'), toastTimer;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.classList.remove('on'); }, 2800);
  }

  /* Greeting and date follow today; "last upload" updates when you add */
  var now = new Date(), hr = now.getHours();
  $('#date').textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  $('#hi').textContent = hr < 5 ? 'Good evening' : hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  var displayName = window.localStorage.getItem('haven.displayName');
  if (displayName) $('#who').textContent = displayName;
  var clock = function (d) { return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'); };

  /* Tabs */
  var names = { library: 'Library', album: 'Album', profile: 'Profile' };
  $$('[data-tab]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.tagName === 'A') return;
      var t = b.dataset.tab;
      if (t === 'home') { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); return; }
      if (t === 'library' && b.closest('.tabs')) { window.location.href = 'library-all.html'; return; }
      toast(names[t] + ' is a separate screen.');
    });
  });
  $('#avatar').addEventListener('click', function () { toast('Account settings are on the Profile screen.'); });
  $('#seeAll').addEventListener('click', function () { toast('The full library is a separate screen.'); });

  /* On this day: step back through the years */
  var stories = [
    { y: 2025, when: 'A year ago', t: 'Salt air. No plans.', n: 8, img: 'assets/Moody Golden-Hour Street Style.png' },
    { y: 2024, when: '2 years ago', t: 'The coast, just me.', n: 5, img: 'assets/lib-coast.webp' },
    { y: 2023, when: '3 years ago', t: 'A very good ordinary day.', n: 12, img: 'assets/lib-ordinary.webp' }
  ];
  var si = 0, story = $('#story'), sImg = $('#storyImg'), dateLong = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
  function showStory() {
    var s = stories[si];
    story.classList.add('swap');
    setTimeout(function () {
      sImg.src = s.img; $('#when').textContent = s.when; $('#storyT').textContent = s.t;
      $('#storyS').textContent = dateLong + ' ' + s.y + '  \u00b7  ' + s.n + ' memories';
      $('#yearT').textContent = s.y; $('#year').setAttribute('aria-label', 'Change year, now ' + s.y);
      story.classList.remove('swap');
    }, reduce ? 0 : 220);
  }
  $('#year').addEventListener('click', function () { si = (si + 1) % stories.length; showStory(); });
  story.addEventListener('click', function () {
    var s = stories[si];
    openMemoryPage({ name: s.t, url: s.img });
  });
  $('#storyS').textContent = dateLong + ' 2025  \u00b7  8 memories';

  /* Recent memories */
  var demoItems = [
    { name: 'The great outdoors', url: 'assets/dan.png' },
    { name: 'Sunday, at home', url: 'assets/Dramatic Side Lighting Portrait.png' },
    { name: 'One more sunset', url: 'assets/Image_fx (32).jpg', video: true, dur: '0:18' }
  ];
  var items = demoItems.slice();
  var BASE_TOTAL = 128, BASE_BYTES = 2.4 * 1073741824, BASE_TODAY = 3, TOTAL = 10 * 1073741824;
  var total = BASE_TOTAL, bytes = BASE_BYTES, todayN = BASE_TODAY;
  var tilesEl = $('#tiles'), pick = $('#pick');
  var check = '<span class="saved" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>';
  var playI = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="12" height="12"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"/></svg>';

  function render(fresh) {
    tilesEl.textContent = '';
    items.slice(0, 3).forEach(function (it, i) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'tile photo' + (fresh && i === 0 ? ' fresh' : '');
      b.dataset.i = i; b.setAttribute('aria-label', 'Open ' + it.name + (it.video ? ', video' : ''));
      var m;
      if (it.video && it.file) { m = document.createElement('video'); m.muted = true; m.playsInline = true; m.preload = 'metadata'; }
      else { m = document.createElement('img'); m.alt = it.name; }
      m.src = it.url; b.appendChild(m); b.insertAdjacentHTML('beforeend', check);
      if (it.video) b.insertAdjacentHTML('beforeend', '<span class="kind">' + playI + (it.dur || '') + '</span>');
      tilesEl.appendChild(b);
    });
    $('#today').textContent = 'Today  \u00b7  ' + todayN + (todayN === 1 ? ' memory' : ' memories');
  }
  function fmtBytes(b) {
    var g = b / 1073741824; return (g >= 1 ? g.toFixed(1) + ' GB' : Math.max(1, Math.round(b / 1048576)) + ' MB');
  }
  function syncStorage() {
    $('#used').textContent = fmtBytes(bytes) + ' of 10 GB used';
    var pct = Math.min(100, bytes / TOTAL * 100);
    $('#capFill').style.width = pct + '%'; $('#cap').setAttribute('aria-valuenow', Math.round(pct));
  }
  function refreshMedia() {
    return HavenMediaStore.list().then(function (records) {
      var uploaded = records.map(HavenMediaStore.mediaItem);
      items = uploaded.concat(demoItems);
      total = BASE_TOTAL + records.length;
      bytes = BASE_BYTES + records.reduce(function (sum, record) { return sum + record.size; }, 0);
      todayN = BASE_TODAY + records.filter(HavenMediaStore.isToday).length;
      render(false); syncStorage();
      return records;
    });
  }
  function reportMediaError(action, error) {
    toast('Could not ' + action + ': ' + error.message);
  }
  function countTo(el, from, to) {
    if (reduce) { el.textContent = to; return; }
    var t0 = performance.now(), d = 700;
    (function step(t) { var p = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - p, 3); el.textContent = Math.round(from + (to - from) * e); if (p < 1) requestAnimationFrame(step); })(t0);
  }

  $$('[data-add]').forEach(function (b) { b.addEventListener('click', function () { pick.value = ''; pick.click(); }); });
  tilesEl.addEventListener('click', function (e) {
    var t = e.target.closest('.tile'); if (!t) return;
    var it = items[+t.dataset.i];
    if (it.video) openViewer(it); else openMemoryPage(it);
  });
  pick.addEventListener('change', function () {
    var files = Array.prototype.slice.call(pick.files || []).filter(function (f) { return /^(image|video)\//.test(f.type); });
    if (!files.length) return;
    var before = total;
    HavenMediaStore.add(files).then(function (records) {
      return refreshMedia().then(function () { return records; });
    }).then(function (records) {
      render(true); syncStorage(); countTo($('#count'), before, total);
      $('#last').textContent = clock(new Date(records[records.length - 1].createdAt));
      toast(files.length + (files.length === 1 ? ' memory' : ' memories') + ' safe in Haven.');
      if (window.HavenFX) HavenFX.confetti(innerWidth / 2, innerHeight * .5, 60);
    }).catch(function (error) { reportMediaError('save your media', error); });
  });

  /* Storage details */
  var store = $('#store');
  store.addEventListener('click', function () { store.setAttribute('aria-expanded', String(store.getAttribute('aria-expanded') !== 'true')); });

  /* Viewer */
  var dlg = $('#viewer'), media = $('#viewerMedia');
  function openViewer(it) {
    media.textContent = '';
    var el = document.createElement(it.video && it.file ? 'video' : 'img'); el.src = it.url;
    if (el.tagName === 'VIDEO') { el.controls = true; el.playsInline = true; } else { el.alt = it.name; }
    media.appendChild(el); $('#viewerCap').textContent = it.name + (it.video && !it.file ? '  \u00b7  video preview' : '');
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  }
  function openMemoryPage(it) {
    var params = new URLSearchParams();
    params.set('from', 'home-filled');
    params.set('name', it.name);
    if (it.file && it.id) params.set('id', it.id);
    else params.set('src', it.url);
    window.location.href = 'memory-view.html?' + params.toString();
  }
  function closeViewer() { var v = media.querySelector('video'); if (v) v.pause(); if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
  $('#viewerX').addEventListener('click', closeViewer);
  dlg.addEventListener('click', function (e) { if (e.target === dlg) closeViewer(); });

  /* Arrival: count up and fill the storage bar */
  refreshMedia().then(function () {
    countTo($('#count'), 0, total);
    requestAnimationFrame(function () { setTimeout(syncStorage, 60); });
  }).catch(function (error) { reportMediaError('load your media', error); });
  HavenMediaStore.subscribe(function () {
    var before = total;
    refreshMedia().then(function () { countTo($('#count'), before, total); })
      .catch(function (error) { reportMediaError('refresh your media', error); });
  });
})();
