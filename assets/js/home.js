// Home: theme toggle, the fixed words column, project index.
(function () {
  var root = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');

  // Theme toggle, shared with the case study pages.
  var toggle = document.querySelector('[data-theme-toggle]');
  function labelToggle() {
    toggle.setAttribute('aria-label',
      root.dataset.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }
  labelToggle();
  toggle.addEventListener('click', function () {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('case-theme', root.dataset.theme); } catch (e) {}
    labelToggle();
  });

  // Email: copy the address and say so in a toast, instead of opening a
  // mail app. If copying isn't possible, the mailto: link works as usual.
  var toast = document.querySelector('.toast');
  var toastTimer = null;
  function showToast(text) {
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('is-on'); }, 2800);
  }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) { // older browsers / plain http
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
      ok ? resolve() : reject();
    });
  }
  document.querySelectorAll('[data-copy]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // let modified clicks open mail
      e.preventDefault();
      var text = link.dataset.copy;
      copyText(text).then(
        function () { showToast('Copied ' + text); },
        function () { window.location.href = link.href; }
      );
    });
  });

  var stops = Array.prototype.slice.call(document.querySelectorAll('.stop'));
  if (!stops.length) return;

  var block = document.querySelector('[data-block]');
  var indexList = document.querySelector('[data-index]');

  // Each stop's words, read once from its markup.
  var data = stops.map(function (s) {
    var q = function (sel) { var el = s.querySelector(sel); return el ? el.innerHTML : ''; };
    return {
      title: q('.i-title'),
      summary: q('.i-summary'),
      role: q('.i-role'),
      link: q('.i-link'),
      soon: !!s.querySelector('.i-soon')
    };
  });

  // Index: one link per project.
  var indexLinks = stops.map(function (s, i) {
    var li = document.createElement('li');
    var a = document.createElement('a');
    a.href = '#' + s.id;
    a.textContent = s.querySelector('.i-title').textContent;
    a.addEventListener('click', function (e) {
      e.preventDefault();
      go(i);
      history.replaceState(null, '', '#' + s.id);
    });
    li.appendChild(a);
    indexList.appendChild(li);
    return a;
  });

  function blockHTML(d) {
    var lines = [
      ['b-title', d.title],
      ['b-summary', d.summary],
      ['b-role', d.role],
      ['b-link', d.link]
    ];
    return lines.filter(function (l) { return l[1]; }).map(function (l, i) {
      return '<p class="' + l[0] + ' ln" style="--i:' + i + '"><span>' + l[1] + '</span></p>';
    }).join('');
  }

  var current = -1;
  var swapTimer = null;

  function show(i) {
    if (i === current) return;
    var first = current < 0;
    current = i;

    indexLinks.forEach(function (a, j) {
      a.classList.toggle('is-on', j === i);
      if (j === i) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });

    stops.forEach(function (s, j) {
      var v = s.querySelector('video');
      if (!v) return;
      if (j === i && !reduce.matches) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      else v.pause();
    });

    function swapIn() {
      block.innerHTML = blockHTML(data[i]);
      block.classList.remove('is-out', 'is-in');
      void block.offsetWidth; // restart the animation
      block.classList.add('is-in');
    }

    clearTimeout(swapTimer);
    if (first || reduce.matches) { swapIn(); return; }
    block.classList.remove('is-in');
    block.classList.add('is-out');
    swapTimer = setTimeout(swapIn, 200);
  }

  // ── Paging ───────────────────────────────────────
  // Wheel and keys move exactly one project per gesture, with an eased
  // tween instead of the browser's snap (which snaps back on a short
  // mouse-wheel flick and jumps on a long one). Touch keeps native snap.

  var tween = null;      // running animation frame id
  var target = 0;        // the stop being moved to
  var locked = false;    // ignore wheel until the current gesture ends
  var quietTimer = null;
  var lastDelta = 0;
  var acc = 0;

  // Stops land on whole device pixels (at 150% scaling, a whole CSS pixel
  // can be half a device pixel), so the snapped screenshots stay crisp.
  function stopTop(i) {
    var d = window.devicePixelRatio || 1;
    return Math.round(stops[i].offsetTop * d) / d;
  }
  var easeInOut = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

  function go(i) {
    i = Math.max(0, Math.min(stops.length - 1, i));
    target = i;
    show(i); // words start rolling as the move starts, not halfway through

    var from = window.scrollY;
    var to = stopTop(i);
    if (tween) cancelAnimationFrame(tween);
    if (reduce.matches || Math.abs(to - from) < 1) {
      window.scrollTo(0, to);
      tween = null;
      return;
    }

    root.classList.add('hold'); // CSS snap would fight the tween
    var dist = Math.abs(to - from) / window.innerHeight;
    var dur = Math.min(1300, 850 + (dist - 1) * 200); // longer jumps take a little longer
    var start = null;
    function step(now) {
      if (start === null) start = now;
      var t = Math.min(1, (now - start) / dur);
      window.scrollTo(0, from + (to - from) * easeInOut(t));
      if (t < 1) { tween = requestAnimationFrame(step); return; }
      tween = null;
      root.classList.remove('hold');
    }
    tween = requestAnimationFrame(step);
  }

  function cancelTween() {
    if (!tween) return;
    cancelAnimationFrame(tween);
    tween = null;
    root.classList.remove('hold');
  }

  window.addEventListener('wheel', function (e) {
    if (e.ctrlKey) return; // pinch-zoom
    e.preventDefault();
    var d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    var mag = Math.abs(d);

    // A trackpad's momentum keeps sending shrinking deltas: stay locked
    // until they stop. A clearly stronger push is a new gesture.
    clearTimeout(quietTimer);
    quietTimer = setTimeout(function () { locked = false; acc = 0; lastDelta = 0; }, 140);
    var fresh = mag > lastDelta * 1.6 && mag > 12;
    lastDelta = mag;
    if (locked && !(fresh && !tween)) return;

    acc += d;
    if (Math.abs(acc) < 24) return;
    var dir = acc > 0 ? 1 : -1;
    acc = 0;
    locked = true;
    var next = Math.max(0, Math.min(stops.length - 1, target + dir));
    if (next !== target || !tween) go(next);
  }, { passive: false });

  window.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;
    var k = e.key;
    var dir = 0;
    if (k === 'ArrowDown' || k === 'PageDown' || (k === ' ' && !e.shiftKey)) dir = 1;
    else if (k === 'ArrowUp' || k === 'PageUp' || (k === ' ' && e.shiftKey)) dir = -1;
    else if (k === 'Home') { e.preventDefault(); go(0); return; }
    else if (k === 'End') { e.preventDefault(); go(stops.length - 1); return; }
    if (!dir) return;
    if (k === ' ' && tag === 'button') return; // Space presses buttons
    e.preventDefault();
    go(target + dir);
  });

  // A touch or scrollbar drag takes over from a running tween.
  window.addEventListener('touchstart', cancelTween, { passive: true });
  window.addEventListener('pointerdown', function (e) {
    if (e.target === root) cancelTween(); // the scrollbar
  });

  // Native scrolling (touch, scrollbar): the current stop is the one whose
  // middle is nearest the screen's middle. Ignored while a tween runs.
  var ticking = false;
  function sync() {
    ticking = false;
    if (tween) return;
    var mid = window.innerHeight / 2;
    var best = 0, bestD = Infinity;
    stops.forEach(function (s, j) {
      var r = s.getBoundingClientRect();
      var d = Math.abs(r.top + r.height / 2 - mid);
      if (d < bestD) { bestD = d; best = j; }
    });
    target = best;
    show(best);
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(sync); }
  }, { passive: true });
  window.addEventListener('resize', function () {
    cancelTween();
    window.scrollTo(0, stopTop(target)); // stay on the same project
    sync();
  });
  sync();
})();
