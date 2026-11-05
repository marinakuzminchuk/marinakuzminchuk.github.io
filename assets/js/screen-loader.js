// Phone screens: a spinner until the screenshot (or the video's first
// frame) has loaded, then the picture fades in. Styles: screen-loader.css.
// Videos that load nothing until they're played (preload="none", the home
// page) are left to vplay.js, whose button turns into the same spinner.
(function () {
  document.querySelectorAll('.mock__screen, .device__screen').forEach(function (screen) {
    var media = screen.querySelector('img.mock__shot, img.device__shot, video');
    if (!media) return;
    var video = media.tagName === 'VIDEO';
    if (video && media.preload === 'none') return;
    if (video ? media.readyState >= 2 : (media.complete && media.naturalWidth > 0)) return;

    screen.classList.add('is-loading');
    function done() { screen.classList.remove('is-loading'); }
    if (video) {
      media.addEventListener('loadeddata', done);
      // Some browsers (iOS Safari) stop after the metadata without a frame:
      // once the download is suspended there's nothing more to wait for.
      media.addEventListener('suspend', function () { if (media.readyState >= 1) done(); });
      media.addEventListener('error', done, true); // errors come from <source>
    } else {
      media.addEventListener('load', done);
      media.addEventListener('error', done);
    }
  });
})();
