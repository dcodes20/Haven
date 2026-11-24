(function () {
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  var root = document.documentElement;

  /* Cursor glow */
  var glow = document.createElement('div'); glow.className = 'fx-glow'; glow.setAttribute('aria-hidden', 'true');
  document.body.appendChild(glow);
  var raf = 0, gx = 0, gy = 0;
  window.addEventListener('pointermove', function (e) {
    gx = e.clientX; gy = e.clientY;
    if (raf) return;
    raf = requestAnimationFrame(function () { raf = 0; glow.style.setProperty('--mx', gx + 'px'); glow.style.setProperty('--my', gy + 'px'); });
  }, { passive: true });

  /* Press ripple */
  document.addEventListener('pointerdown', function (e) {
    var b = e.target.closest && e.target.closest('.btn, .create, .google, .add, .safe');
    if (!b || reduce) return;
    b.classList.add('fx-r');
    var r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2.2, s = document.createElement('span');
    s.className = 'fx-ripple';
    s.style.cssText = 'width:' + d + 'px;height:' + d + 'px;left:' + (e.clientX - r.left - d / 2) + 'px;top:' + (e.clientY - r.top - d / 2) + 'px';
    b.appendChild(s); setTimeout(function () { s.remove(); }, 700);
  });

  /* 3D tilt toward the pointer */
  if (fine && !reduce) {
    $$('[data-tilt]').forEach(function (el) {
      var max = parseFloat(el.getAttribute('data-tilt')) || 8;
      el.addEventListener('pointermove', function (e) {
        if (e.pointerType === 'touch') return;
        var r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
        el.style.transform = 'perspective(900px) rotateY(' + (px * max).toFixed(2) + 'deg) rotateX(' + (-py * max).toFixed(2) + 'deg)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });

    /* Magnetic buttons */
    var mags = $$('[data-magnetic]');
    if (mags.length) {
      window.addEventListener('pointermove', function (e) {
        mags.forEach(function (el) {
          var r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
          var dx = e.clientX - cx, dy = e.clientY - cy, near = Math.abs(dx) < r.width / 2 + 40 && Math.abs(dy) < r.height / 2 + 40;
          el.style.translate = near ? (dx * .12).toFixed(1) + 'px ' + (dy * .22).toFixed(1) + 'px' : '';
        });
      }, { passive: true });
    }
  }

  /* Card spotlight */
  if (fine) {
    $$('[data-spot]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--sx', (e.clientX - r.left) + 'px'); el.style.setProperty('--sy', (e.clientY - r.top) + 'px');
      });
      el.addEventListener('pointerleave', function () { el.style.removeProperty('--sx'); el.style.removeProperty('--sy'); });
    });
  }

  /* Scroll reveal. Anything already on screen stays put; items below the fold fade up as they arrive. */
  var items = $$('[data-reveal]');
  if (items.length && 'IntersectionObserver' in window && !reduce) {
    var vh = window.innerHeight || root.clientHeight;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target; io.unobserve(el);
        var sib = el.parentNode ? $$('[data-reveal]', el.parentNode).filter(function (n) { return n.parentNode === el.parentNode; }) : [el];
        var delay = Math.max(0, sib.indexOf(el)) * 90;
        el.classList.remove('fx-pre');
        if (el.animate) el.animate([{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }], { duration: 700, delay: delay, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'backwards' });
      });
    }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
    items.forEach(function (el) {
      if (el.getBoundingClientRect().top < vh) return;
      el.classList.add('fx-pre'); io.observe(el);
    });
    window.addEventListener('beforeprint', function () { items.forEach(function (el) { el.classList.remove('fx-pre'); }); });
  }

  /* Scroll progress */
  if (document.querySelector('[data-fx-progress]')) {
    var bar = document.createElement('div'); bar.className = 'fx-prog'; bar.setAttribute('aria-hidden', 'true'); document.body.appendChild(bar);
    var tick = 0;
    var upd = function () {
      tick = 0; var h = root.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, window.scrollY / h) : 0) + ')';
    };
    window.addEventListener('scroll', function () { if (!tick) tick = requestAnimationFrame(upd); }, { passive: true });
    upd();
  }

  /* Confetti: HavenFX.confetti(x, y, count) in viewport pixels. Defaults to the middle of the screen. */
  var colors = ['#f5a17b', '#c5d5b5', '#f4f1e8', '#f7b190', '#a7b19d'];
  function confetti(x, y, n) {
    if (reduce || !document.body.animate) return;
    x = x == null ? window.innerWidth / 2 : x; y = y == null ? window.innerHeight * .4 : y; n = n || 50;
    for (var i = 0; i < n; i++) {
      var s = document.createElement('i'); s.className = 'fx-bit';
      var w = 5 + Math.random() * 6, h = Math.random() < .5 ? w : w * 1.8;
      s.style.cssText = 'left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px;background:' + colors[i % colors.length] + ';border-radius:' + (Math.random() < .35 ? '50%' : '2px');
      document.body.appendChild(s);
      var a = -Math.PI / 2 + (Math.random() - .5) * Math.PI * 1.25, v = 150 + Math.random() * 300;
      var dx = Math.cos(a) * v, dy = Math.sin(a) * v, rot = (Math.random() - .5) * 900;
      var an = s.animate([
        { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
        { transform: 'translate(' + dx * .6 + 'px,' + dy * .75 + 'px) rotate(' + rot * .5 + 'deg)', opacity: 1, offset: .45 },
        { transform: 'translate(' + dx + 'px,' + (dy + 420) + 'px) rotate(' + rot + 'deg)', opacity: 0 }
      ], { duration: 1100 + Math.random() * 800, easing: 'cubic-bezier(.2,.6,.4,1)' });
      an.onfinish = (function (el) { return function () { el.remove(); }; })(s);
    }
  }
  function burstAt(el, n) { var r = el.getBoundingClientRect(); confetti(r.left + r.width / 2, r.top + r.height / 2, n || 18); }

  window.HavenFX = { confetti: confetti, burstAt: burstAt };
})();
