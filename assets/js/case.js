// Case study page: theme toggle, header state, section index, reveals, before/after videos.
(function () {
  var root = document.documentElement;

  // Always open at the top, not where a previous visit left off.
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  if (!location.hash) window.scrollTo(0, 0);

  // Theme toggle, remembered per browser.
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

  // Mobile header: hidden while scrolling down, shown at the top or on scroll up.
  var bar = document.querySelector('.bar');
  var mobile = matchMedia('(max-width: 760px)');
  var lastY = window.scrollY;
  function syncBar() {
    var y = Math.max(window.scrollY, 0);
    var dy = y - lastY;
    if (!mobile.matches || y <= bar.offsetHeight || bar.contains(document.activeElement)) {
      bar.classList.remove('is-hidden');
    } else if (Math.abs(dy) > 6) {
      bar.classList.toggle('is-hidden', dy > 0);
    } else {
      return; // ignore jitter; keep lastY so small moves add up
    }
    lastY = y;
  }
  window.addEventListener('scroll', syncBar, { passive: true });
  mobile.addEventListener('change', syncBar);
  bar.addEventListener('focusin', function () { bar.classList.remove('is-hidden'); });

  // Section index: highlight the section being read.
  var rows = Array.prototype.slice.call(document.querySelectorAll('.cs__row[id]'));
  var links = Array.prototype.slice.call(document.querySelectorAll('.cs__index a'));

  var current = null;
  function sync() {
    // The current section is the last one whose top has passed 35% of the view;
    // at the very bottom of the page, it's the last one.
    var mark = window.innerHeight * 0.35;
    var row = rows[0];
    rows.forEach(function (r) { if (r.getBoundingClientRect().top <= mark) row = r; });
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
      row = rows[rows.length - 1];
    }
    if (row === current) return;
    current = row;

    links.forEach(function (a) {
      var on = a.getAttribute('href') === '#' + row.id;
      a.classList.toggle('is-on', on);
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  }
  window.addEventListener('scroll', sync, { passive: true });
  sync();

  // Side column: stagger its masked lines top to bottom.
  var lines = document.querySelectorAll('.cs__side .line');
  lines.forEach(function (el, i) { el.style.setProperty('--i', i); });

  // Scroll reveals. Items visible at load get delays that continue the
  // side column's stagger.
  var items = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  var step = 60;
  var onLoad = 0;
  // Narrow screens skip the side column's reveal, so nothing to wait for.
  var after = matchMedia('(max-width: 960px)').matches ? 0 : lines.length;
  items.forEach(function (el) {
    if (el.getBoundingClientRect().top < window.innerHeight) {
      el.style.setProperty('--delay', (after + onLoad++) * step + 'ms');
    }
  });

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
        // Later arrivals shouldn't wait on the load stagger.
        e.target.addEventListener('transitionend', function () {
          e.target.style.removeProperty('--delay');
        }, { once: true });
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('is-in'); });
  }

  // Phone videos: playback is the visitor's choice, through the play button
  // over each phone (vplay.js). Here: hide the placeholder once a frame loads.
  document.querySelectorAll('.device').forEach(function (device) {
    device.querySelectorAll('video').forEach(function (v) {
      function hideEmpty() {
        var empty = v.parentNode.querySelector('.device__empty');
        if (empty) empty.hidden = true;
      }
      if (v.readyState >= 2) hideEmpty();
      else v.addEventListener('loadeddata', hideEmpty);
    });

    // A Before / After switch in the same figure swaps the layer and caption.
    var figure = device.closest('figure');
    var sw = figure && figure.querySelector('.switch');
    if (!sw) return;
    var options = Array.prototype.slice.call(sw.querySelectorAll('.switch__item'));
    var pill = sw.querySelector('.switch__pill');
    var caption = figure.querySelector('figcaption');

    function placePill() {
      var on = sw.querySelector('.switch__item.is-active');
      if (!on || !on.offsetWidth) return;
      pill.style.width = on.offsetWidth + 'px';
      pill.style.transform = 'translateX(' + on.offsetLeft + 'px)';
    }

    function show(state) {
      options.forEach(function (o) {
        var on = o.dataset.show === state;
        o.classList.toggle('is-active', on);
        o.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      device.querySelectorAll('.device__state').forEach(function (layer) {
        var on = layer.dataset.state === state;
        layer.classList.toggle('is-active', on);
        if (on) layer.removeAttribute('aria-hidden'); else layer.setAttribute('aria-hidden', 'true');
      });
      // The hidden layer's video stops; the shown one waits for its play button.
      device.querySelectorAll('.device__state:not(.is-active) video').forEach(function (v) { v.pause(); });
      if (caption && caption.dataset[state]) caption.textContent = caption.dataset[state];
      placePill();
    }

    options.forEach(function (o) {
      o.addEventListener('click', function () { show(o.dataset.show); });
    });
    window.addEventListener('resize', placePill);
    // Fonts change button widths; place the pill once they've loaded.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(placePill);
    placePill();
  });

  // Start the roll after first paint.
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { document.body.classList.add('is-ready'); });
  });
})();

// Tap to zoom (phones): a [data-zoom] picture gets a zoom button in its
// corner; tapping the picture or the button opens it full screen, at the
// screen's height, to swipe across (and pinch). × or Esc / back closes it.
(function () {
  var frames = document.querySelectorAll('[data-zoom]');
  if (!frames.length || !window.HTMLDialogElement) return;
  var phone = matchMedia('(max-width: 760px)');
  var X = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  var EXPAND = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12 3.5h4.5V8M8 16.5H3.5V12M16.5 3.5l-5 5M3.5 16.5l5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  var dlg = document.createElement('dialog');
  dlg.className = 'zoom';
  dlg.innerHTML = '<div class="zoom__pane"><img class="zoom__img" alt=""></div>' +
    '<button class="zoom__close" type="button" aria-label="Close">' + X + '</button>';
  document.body.appendChild(dlg);
  var pane = dlg.querySelector('.zoom__pane');
  var big = dlg.querySelector('.zoom__img');
  dlg.querySelector('.zoom__close').addEventListener('click', function () { dlg.close(); });
  dlg.addEventListener('close', function () { document.documentElement.classList.remove('zoom-open'); });

  frames.forEach(function (frame) {
    var img = frame.querySelector('img');
    if (!img) return;
    var btn = document.createElement('button');
    btn.className = 'zoom-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Zoom in: ' + (img.alt || 'image'));
    btn.innerHTML = EXPAND;
    frame.appendChild(btn);
    frame.addEventListener('click', function () {
      if (!phone.matches) return;
      big.src = img.currentSrc || img.src;
      big.alt = img.alt;
      dlg.setAttribute('aria-label', img.alt || 'Zoomed image');
      document.documentElement.classList.add('zoom-open');
      dlg.showModal();
      pane.scrollLeft = 0;
      pane.scrollTop = 0;
    });
  });
})();
