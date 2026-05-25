document.addEventListener("DOMContentLoaded", function () {
  var el = document.getElementById("clock");
  if (!el) return;

  function tick() {
    var now = new Date();
    var h = now.getHours();
    var m = now.getMinutes().toString().padStart(2, "0");
    var ampm = h >= 12 ? "pm" : "am";
    h = h % 12 || 12;
    el.textContent = h + ":" + m + " " + ampm;
  }

  tick();
  setInterval(tick, 1000);
});
