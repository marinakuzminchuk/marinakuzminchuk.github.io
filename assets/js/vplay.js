// Play / pause buttons over phone videos (home page and case studies).
//
// Default (case pages): the video shows its first frame under a play
// button; the button, or a click on the screen, toggles playback.
// data-autoplay on the host (home page): nothing downloads until the phone
// is actually on screen; then it loads and plays by itself. If the visitor
// pauses it, it stays paused until they press play again.
// Either way, if playback is asked for but the video isn't ready within a
// moment, the button turns into a spinner until it starts. A video that
// scrolls off screen is paused. With reduced motion, nothing autoplays.
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SPINNER_DELAY = 200; // ms: no spinner flash when the video is quick
  var SPIN = '<svg class="i-spin" viewBox="0 0 20 20" aria-hidden="true">' +
    '<circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" stroke-width="2" stroke-opacity="0.25"/>' +
    '<path d="M10 3a7 7 0 0 1 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  document.querySelectorAll('.vplay').forEach(function (btn) {
    var host = btn.closest('.vplay-host');
    var video = host && host.querySelector('video');
    if (!video) return;
    var auto = host.hasAttribute('data-autoplay') && !reduce;
    var controls = !host.hasAttribute('data-no-controls'); // false: spinner only
    var wantPlay = false;   // playback requested, maybe still loading
    var userPaused = false; // the visitor paused: don't autoplay over that
    var spinTimer = null;
    if (!btn.querySelector('.i-spin')) btn.insertAdjacentHTML('beforeend', SPIN);
    // On autoplay hosts the idle play button stays hidden (CSS) until it's
    // useful: after a pause, a blocked autoplay, or with reduced motion.
    function showPlay() { if (controls) btn.classList.add('was-paused'); }
    if (host.hasAttribute('data-autoplay') && !auto) {
      showPlay();
      // No control to press and no autoplay (reduced motion): show a still.
      if (!controls && video.preload === 'none') video.preload = 'metadata';
    }

    function loading(on) {
      clearTimeout(spinTimer);
      if (on) spinTimer = setTimeout(function () { btn.classList.add('is-loading'); sync(); }, SPINNER_DELAY);
      else btn.classList.remove('is-loading');
    }
    function sync() {
      var playing = !video.paused && !video.ended;
      var busy = btn.classList.contains('is-loading');
      btn.classList.toggle('is-playing', playing);
      if (!controls) return; // a status overlay, not a control: no labels
      var label = busy ? 'Loading video' : (playing ? 'Pause video' : 'Play video');
      var name = video.getAttribute('aria-label');
      btn.setAttribute('aria-label', name ? label + ': ' + name : label);
      btn.setAttribute('aria-pressed', playing ? 'true' : 'false');
    }
    function start() {
      wantPlay = true;
      if (video.preload !== 'auto') video.preload = 'auto';
      if (video.readyState < 3) loading(true); // not enough data to play yet
      var p = video.play();
      if (p && p.catch) p.catch(function () { wantPlay = false; loading(false); showPlay(); sync(); });
    }
    function stop() {
      wantPlay = false;
      loading(false);
      video.pause();
      sync();
    }
    function toggle(e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      if (video.paused || video.ended) { userPaused = false; start(); }
      else { userPaused = true; showPlay(); stop(); }
    }

    if (controls) btn.addEventListener('click', toggle);
    video.addEventListener('playing', function () { loading(false); sync(); });
    video.addEventListener('waiting', function () { if (wantPlay) loading(true); });
    video.addEventListener('error', function () { wantPlay = false; loading(false); showPlay(); sync(); }, true);
    ['play', 'pause', 'ended'].forEach(function (ev) { video.addEventListener(ev, sync); });
    sync();

    // Outside a link (the case pages), the screen itself toggles too.
    if (controls && !video.closest('a')) {
      video.style.cursor = 'pointer';
      video.addEventListener('click', toggle);
    }

    // On screen: autoplay hosts start once most of the phone is visible.
    // Off screen: pause, so nothing plays where no one can see it.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        var r = entries[0].intersectionRatio;
        if (auto && r >= 0.6 && !userPaused && video.paused && !wantPlay) start();
        else if (r < 0.15 && (wantPlay || !video.paused)) stop();
      }, { threshold: [0, 0.15, 0.6, 1] }).observe(host);
    }
  });
})();
