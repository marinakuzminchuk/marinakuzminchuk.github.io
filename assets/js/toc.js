document.addEventListener('DOMContentLoaded', function () {
  var toc = document.getElementById('case-toc');
  if (!toc) return;

  var sections = Array.from(document.querySelectorAll('.case-hero, .case-section'));
  if (!sections.length) return;

  var links = [];

  sections.forEach(function (section, i) {
    var label = section.querySelector('.sec-label');
    if (!label) return;
    if (!section.id) section.id = 'section-' + i;

    var a = document.createElement('a');
    a.href = '#' + section.id;
    a.className = 'case-toc-link';
    a.textContent = label.textContent.trim();
    toc.appendChild(a);
    links.push({ a: a, section: section });
  });

  if (!links.length) return;

  function activate(section) {
    links.forEach(function (item) {
      item.a.classList.toggle('is-active', item.section === section);
    });
  }

  var THRESHOLD = 112; // sticky header height + small buffer

  function update() {
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 80) {
      activate(links[links.length - 1].section);
      return;
    }

    var active = links[0].section;
    links.forEach(function (item) {
      if (item.section.getBoundingClientRect().top <= THRESHOLD) {
        active = item.section;
      }
    });

    activate(active);
  }

  window.addEventListener('scroll', update, { passive: true });
  update();
});
