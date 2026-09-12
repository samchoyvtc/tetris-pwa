const REPEAT_DELAY = 180;
const REPEAT_EVERY = 55;

export function isIos() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
}

export function bindInput(game, wellCanvas, onUi, callbacks = {}) {
  const { onMove, onRotate, onSoft, onHard } = callbacks;
  const held = new Map();

  function fire(action) {
    if (action === "left") {
      if (game.move(-1, 0)) onMove?.();
    } else if (action === "right") {
      if (game.move(1, 0)) onMove?.();
    } else if (action === "down") {
      if (game.softDrop()) onSoft?.();
    } else if (action === "rotate") {
      if (game.rotate()) onRotate?.();
    } else if (action === "hard") {
      game.hardDrop();
      onHard?.();
    }
    onUi();
  }

  function startHold(action, button) {
    if (held.has(action)) return;
    fire(action);
    button?.classList.add("is-held");
    const repeating = action === "left" || action === "right" || action === "down";
    const timer = repeating
      ? window.setTimeout(() => {
          const id = window.setInterval(() => fire(action), REPEAT_EVERY);
          const prev = held.get(action);
          if (prev) prev.interval = id;
        }, REPEAT_DELAY)
      : 0;
    held.set(action, { timer, interval: 0, button });
  }

  function stopHold(action) {
    const rec = held.get(action);
    if (!rec) return;
    window.clearTimeout(rec.timer);
    window.clearInterval(rec.interval);
    rec.button?.classList.remove("is-held");
    held.delete(action);
  }

  function stopAll() {
    for (const action of [...held.keys()]) stopHold(action);
  }

  document.querySelectorAll("[data-action]").forEach((button) => {
    const action = button.getAttribute("data-action");
    const down = (event) => {
      event.preventDefault();
      startHold(action, button);
    };
    const up = (event) => {
      event.preventDefault();
      stopHold(action);
    };
    button.addEventListener("pointerdown", down);
    button.addEventListener("pointerup", up);
    button.addEventListener("pointercancel", up);
    button.addEventListener("pointerleave", up);
  });

  let swipe = null;
  wellCanvas.addEventListener("pointerdown", (event) => {
    swipe = { x: event.clientX, y: event.clientY, used: false, id: event.pointerId };
  });
  wellCanvas.addEventListener("pointermove", (event) => {
    if (!swipe || swipe.id !== event.pointerId) return;
    const dx = event.clientX - swipe.x;
    const dy = event.clientY - swipe.y;
    if (!swipe.used && Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy)) {
      fire(dx > 0 ? "right" : "left");
      swipe.x = event.clientX;
      swipe.used = true;
    } else if (!swipe.used && dy > 40 && Math.abs(dy) > Math.abs(dx)) {
      fire("hard");
      swipe.used = true;
    }
  });
  const endSwipe = (event) => {
    if (!swipe || swipe.id !== event.pointerId) return;
    const dx = event.clientX - swipe.x;
    const dy = event.clientY - swipe.y;
    if (!swipe.used && Math.hypot(dx, dy) < 12) fire("rotate");
    swipe = null;
  };
  wellCanvas.addEventListener("pointerup", endSwipe);
  wellCanvas.addEventListener("pointercancel", () => {
    swipe = null;
  });

  const keys = {
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowDown: "down",
    ArrowUp: "rotate",
    KeyX: "rotate",
    Space: "hard",
  };

  window.addEventListener("keydown", (event) => {
    if (event.code === "KeyP") {
      game.togglePause();
      onUi();
      return;
    }
    if (event.code === "Enter" && game.state !== "playing") {
      game.start();
      onUi();
      return;
    }
    const action = keys[event.code];
    if (!action || event.repeat) return;
    event.preventDefault();
    startHold(action);
  });
  window.addEventListener("keyup", (event) => {
    const action = keys[event.code];
    if (action) stopHold(action);
  });
  window.addEventListener("blur", stopAll);

  const blockScroll = (event) => event.preventDefault();
  document.addEventListener("touchmove", blockScroll, { passive: false });
  document.addEventListener("gesturestart", blockScroll);
}
