export const COLS = 10;
export const ROWS = 20;

export const COLORS = {
  I: "#2ec4d6",
  O: "#f0c14b",
  T: "#9b6bdb",
  S: "#3cbf7a",
  Z: "#e24b4b",
  J: "#3b6fd8",
  L: "#e8883a",
};

const BASE = {
  I: { size: 4, cells: [[0, 1], [1, 1], [2, 1], [3, 1]] },
  O: { size: 4, cells: [[1, 0], [2, 0], [1, 1], [2, 1]] },
  T: { size: 3, cells: [[1, 0], [0, 1], [1, 1], [2, 1]] },
  S: { size: 3, cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },
  Z: { size: 3, cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  J: { size: 3, cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  L: { size: 3, cells: [[2, 0], [0, 1], [1, 1], [2, 1]] },
};

const TYPES = Object.keys(BASE);
const KICKS = [
  [0, 0],
  [-1, 0],
  [1, 0],
  [0, -1],
  [-2, 0],
  [2, 0],
  [0, 1],
];
const LINE_SCORES = [0, 100, 300, 500, 800];

function rotateOnce(cells, size) {
  return cells.map(([x, y]) => [size - 1 - y, x]);
}

function rotationsFor(type) {
  const { size, cells } = BASE[type];
  const frames = [cells];
  let current = cells;
  for (let i = 0; i < 3; i += 1) {
    current = rotateOnce(current, size);
    frames.push(current);
  }
  return frames;
}

export const SHAPES = Object.fromEntries(TYPES.map((type) => [type, rotationsFor(type)]));

function shuffle(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export class Game {
  constructor() {
    this.reset();
  }

  reset() {
    this.board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    this.bag = [];
    this.current = null;
    this.next = this.pull();
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.state = "ready";
    this.dropMs = 1000;
    this.dropAcc = 0;
  }

  pull() {
    if (this.bag.length === 0) this.bag = shuffle(TYPES);
    return this.bag.pop();
  }

  spawn() {
    const type = this.next;
    this.next = this.pull();
    this.current = {
      type,
      rot: 0,
      x: 3,
      y: type === "I" ? -1 : 0,
    };
    if (this.collides(this.current, 0, 0, 0)) {
      this.current = null;
      this.state = "over";
    }
  }

  start() {
    this.reset();
    this.state = "playing";
    this.spawn();
  }

  togglePause() {
    if (this.state === "playing") this.state = "paused";
    else if (this.state === "paused") this.state = "playing";
  }

  cells(piece = this.current, rotOffset = 0) {
    if (!piece) return [];
    const rot = (piece.rot + rotOffset + 4) % 4;
    return SHAPES[piece.type][rot].map(([x, y]) => [piece.x + x, piece.y + y]);
  }

  collides(piece, dx, dy, rotOffset) {
    for (const [x, y] of this.cells(piece, rotOffset)) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && this.board[ny][nx]) return true;
    }
    return false;
  }

  move(dx, dy) {
    if (this.state !== "playing" || !this.current) return false;
    if (this.collides(this.current, dx, dy, 0)) return false;
    this.current.x += dx;
    this.current.y += dy;
    return true;
  }

  rotate() {
    if (this.state !== "playing" || !this.current) return false;
    if (this.current.type === "O") return true;
    for (const [dx, dy] of KICKS) {
      if (!this.collides(this.current, dx, dy, 1)) {
        this.current.rot = (this.current.rot + 1) % 4;
        this.current.x += dx;
        this.current.y += dy;
        return true;
      }
    }
    return false;
  }

  softDrop() {
    if (!this.move(0, 1)) return false;
    this.score += 1;
    this.dropAcc = 0;
    return true;
  }

  hardDrop() {
    if (this.state !== "playing" || !this.current) return;
    let dist = 0;
    while (this.move(0, 1)) dist += 1;
    this.score += dist * 2;
    this.lock();
  }

  ghostY() {
    if (!this.current) return 0;
    let dy = 0;
    while (!this.collides(this.current, 0, dy + 1, 0)) dy += 1;
    return this.current.y + dy;
  }

  lock() {
    if (!this.current) return;
    let overflow = false;
    for (const [x, y] of this.cells()) {
      if (y < 0) overflow = true;
      else this.board[y][x] = this.current.type;
    }
    this.current = null;
    if (overflow) {
      this.state = "over";
      return;
    }
    const full = [];
    for (let y = 0; y < ROWS; y += 1) {
      if (this.board[y].every(Boolean)) full.push(y);
    }
    if (full.length) {
      this.board = this.board.filter((_, y) => !full.includes(y));
      while (this.board.length < ROWS) this.board.unshift(Array(COLS).fill(null));
      this.lines += full.length;
      this.score += LINE_SCORES[full.length] * this.level;
      this.level = Math.floor(this.lines / 10) + 1;
      this.dropMs = Math.max(90, 1000 - (this.level - 1) * 80);
    }
    this.spawn();
  }

  tick(dt) {
    if (this.state !== "playing" || !this.current) return;
    this.dropAcc += dt;
    if (this.dropAcc >= this.dropMs) {
      this.dropAcc = 0;
      if (!this.move(0, 1)) this.lock();
    }
  }
}
