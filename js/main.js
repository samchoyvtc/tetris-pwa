import { Game } from "./game.js";
import { Renderer } from "./render.js";
import { bindInput, isIos, isStandalone } from "./input.js";
import {
  playClear,
  playGameOver,
  playLevelUp,
  playLock,
  playMove,
  playRotate,
  resumeAudio,
} from "./sound.js";

const scoreEl = document.getElementById("score");
const levelEl = document.getElementById("level");
const overlay = document.getElementById("overlay");
const overlayKicker = document.getElementById("overlay-kicker");
const overlayTitle = document.getElementById("overlay-title");
const overlayBody = document.getElementById("overlay-body");
const overlayAction = document.getElementById("overlay-action");
const installHint = document.getElementById("install-hint");
const pauseBtn = document.getElementById("pause");
const well = document.getElementById("well");
const next = document.getElementById("next");

const game = new Game();
const renderer = new Renderer(well, next);
let lastLevel = 1;
let lastCleared = 0;

function formatScore(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function syncHud() {
  scoreEl.textContent = formatScore(game.score);
  levelEl.textContent = String(game.level);
  pauseBtn.hidden = game.state === "ready" || game.state === "over";
  pauseBtn.textContent = game.state === "paused" ? "繼續" : "暫停";
  pauseBtn.setAttribute("aria-label", pauseBtn.textContent);

  if (game.state === "playing") {
    overlay.hidden = true;
    return;
  }

  overlay.hidden = false;
  if (game.state === "ready") {
    overlayKicker.textContent = "方塊井";
    overlayTitle.textContent = "準備落井";
    overlayBody.textContent = "消行升級。撳下面開始。";
    overlayAction.textContent = "開始";
    installHint.hidden = !(isIos() && !isStandalone());
  } else if (game.state === "paused") {
    overlayKicker.textContent = "暫停";
    overlayTitle.textContent = "井暫停咗";
    overlayBody.textContent = "分數會留住。";
    overlayAction.textContent = "繼續";
    installHint.hidden = true;
  } else {
    overlayKicker.textContent = "井滿咗";
    overlayTitle.textContent = formatScore(game.score);
    overlayBody.textContent = `去到第 ${game.level} 級 · 清咗 ${game.lines} 行`;
    overlayAction.textContent = "再來";
    installHint.hidden = true;
  }
}

function handleOverlay() {
  resumeAudio();
  if (game.state === "paused") game.togglePause();
  else game.start();
  syncHud();
}

overlayAction.addEventListener("click", handleOverlay);
pauseBtn.addEventListener("click", () => {
  resumeAudio();
  game.togglePause();
  syncHud();
});

bindInput(game, well, syncHud, {
  onMove: playMove,
  onRotate: playRotate,
  onSoft: () => {},
  onHard: () => {},
});

document.body.addEventListener(
  "pointerdown",
  (event) => {
    if (event.target.closest("[data-action]")) resumeAudio();
  },
  { passive: true }
);
renderer.resize();
renderer.draw(game);
syncHud();

window.addEventListener("resize", () => {
  renderer.resize();
  renderer.draw(game);
});

let last = performance.now();
function frame(now) {
  const dt = Math.min(48, now - last);
  last = now;
  const before = game.state;
  const score = game.score;
  const level = game.level;
  game.tick(dt);
  if (game.state !== before || game.score !== score || game.level !== level) syncHud();
  if (game.state === "over" && before !== "over") {
    playGameOver();
  }
  if (game.level !== lastLevel && game.level > 1) {
    playLevelUp();
  }
  lastLevel = game.level;
  if (game.lines !== lastCleared && game.lines > lastCleared) {
    const delta = game.lines - lastCleared;
    playClear(Math.min(4, delta));
  }
  if (game.state === "playing" && game.current === null && before === "playing") {
    playLock();
  }
  lastCleared = game.lines;
  renderer.draw(game);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
