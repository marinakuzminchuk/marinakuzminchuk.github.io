document.addEventListener('DOMContentLoaded', function () {
  var deck = document.getElementById('hero-card-stack');
  if (!deck) return;

  var config = {
    dragThreshold: 90,
    transitionDuration: 350,
    offsetX: 6,
    offsetY: 0,
    rotationStep: 2,
    scaleStep: 0.045,
    maxDragRotation: 14
  };

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    config.transitionDuration = 1;
  }

  deck.style.setProperty('--stack-transition-duration', config.transitionDuration + 'ms');

  var state = {
    activeCard: null,
    pointerId: null,
    startX: 0,
    startY: 0,
    dx: 0,
    dy: 0,
    locked: false
  };

  function cardTransform(index) {
    var i = Math.min(index, deck.children.length - 1);
    var x = i * config.offsetX;
    var y = i * config.offsetY;
    var rotation = i * config.rotationStep;
    var scale = 1 - i * config.scaleStep;
    return 'translate3d(' + x + 'px, ' + y + 'px, 0) rotate(' + rotation + 'deg) scale(' + scale + ')';
  }

  // Keeps DOM order == visual stack order: deck.firstElementChild is always the top card.
  function renderStack(options) {
    options = options || {};
    var cards = Array.prototype.slice.call(deck.children);

    cards.forEach(function (card, index) {
      card.style.zIndex = cards.length - index;
      card.style.pointerEvents = index === 0 ? 'auto' : 'none';
      card.tabIndex = index === 0 ? 0 : -1;

      if (!(options.keepActiveCard && card === state.activeCard)) {
        card.style.transform = cardTransform(index);
      }
    });
  }

  function resetState() {
    state.activeCard = null;
    state.pointerId = null;
    state.dx = 0;
    state.dy = 0;
  }

  // Shared release path for both drag and keyboard interactions.
  function finishDrag(card) {
    var done = false;
    var complete = function () {
      if (done) return;
      done = true;
      card.removeEventListener('transitionend', complete);
      state.locked = false;
      resetState();
      renderStack();
    };
    card.addEventListener('transitionend', complete, { once: true });
    window.setTimeout(complete, config.transitionDuration + 150);
  }

  function sendToBack(card) {
    state.locked = true;
    state.activeCard = card;
    card.classList.remove('is-dragging');

    var currentTransform = card.style.transform;
    deck.appendChild(card);
    card.style.transform = currentTransform;
    renderStack({ keepActiveCard: true });

    // Two rAFs: first commits the appended position, second starts the transition to it.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        var newIndex = Array.prototype.indexOf.call(deck.children, card);
        card.style.transform = cardTransform(newIndex);
      });
    });

    finishDrag(card);
  }

  function returnToFront(card) {
    card.classList.remove('is-dragging');
    card.style.transform = cardTransform(0);
    resetState();
  }

  function onPointerDown(event) {
    if (state.locked) return;

    var topCard = deck.firstElementChild;
    if (!topCard || event.target.closest('.stack-card') !== topCard) return;

    event.preventDefault();

    state.activeCard = topCard;
    state.pointerId = event.pointerId;
    state.startX = event.clientX;
    state.startY = event.clientY;
    state.dx = 0;
    state.dy = 0;

    topCard.classList.add('is-dragging');
    topCard.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event) {
    if (!state.activeCard || event.pointerId !== state.pointerId) return;

    state.dx = event.clientX - state.startX;
    state.dy = event.clientY - state.startY;

    var rotation = Math.max(-config.maxDragRotation, Math.min(config.maxDragRotation, state.dx * 0.045));
    state.activeCard.style.transform =
      'translate3d(' + state.dx + 'px, ' + state.dy + 'px, 0) rotate(' + rotation + 'deg)';
  }

  function onPointerEnd(event) {
    if (!state.activeCard || event.pointerId !== state.pointerId) return;

    var card = state.activeCard;
    var distance = Math.hypot(state.dx, state.dy);

    if (distance < config.dragThreshold) {
      returnToFront(card);
      return;
    }

    sendToBack(card);
  }

  function onKeyDown(event) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    if (state.locked) return;

    var topCard = deck.firstElementChild;
    if (!topCard || document.activeElement !== topCard) return;

    event.preventDefault();
    sendToBack(topCard);
  }

  deck.addEventListener('pointerdown', onPointerDown);
  deck.addEventListener('pointermove', onPointerMove);
  deck.addEventListener('pointerup', onPointerEnd);
  deck.addEventListener('pointercancel', onPointerEnd);
  deck.addEventListener('keydown', onKeyDown);

  renderStack();
});
