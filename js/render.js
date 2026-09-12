import { COLS, ROWS, COLORS, SHAPES } from "./game.js";

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function mix(hex, toward, t) {
  const a = hexToRgb(hex);
  const b = hexToRgb(toward);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bch = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r} ${g} ${bch})`;
}

export class Renderer {
  constructor(wellCanvas, nextCanvas) {
    this.well = wellCanvas;
    this.next = nextCanvas;
    this.wctx = wellCanvas.getContext("2d");
    this.nctx = nextCanvas.getContext("2d");
    this.cell = 30;
  }

  resize() {
    const stage = this.well.closest(".stage");
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const cssW = Math.max(120, stage.clientWidth - 32);
    const cssH = Math.max(160, stage.clientHeight - 8);
    this.cell = Math.max(8, Math.floor(Math.min(cssW / COLS, cssH / ROWS)));
    const width = this.cell * COLS;
    const height = this.cell * ROWS;
    this.well.style.width = `${width}px`;
    this.well.style.height = `${height}px`;
    this.well.width = Math.round(width * dpr);
    this.well.height = Math.round(height * dpr);
    this.wctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const nextCss = 56;
    this.next.style.width = `${nextCss}px`;
    this.next.style.height = `${nextCss}px`;
    this.next.width = Math.round(nextCss * dpr);
    this.next.height = Math.round(nextCss * dpr);
    this.nctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.nextCss = nextCss;
  }

  drawBlock(ctx, x, y, size, color, ghost = false) {
    const gap = Math.max(1, Math.floor(size * 0.06));
    const s = size - gap;
    if (ghost) {
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, s, s);
      ctx.globalAlpha = 1;
      return;
    }
    ctx.fillStyle = color;
    ctx.fillRect(x, y, s, s);
    const edge = Math.max(2, Math.floor(size * 0.1));
    ctx.fillStyle = mix(color, "#ffffff", 0.28);
    ctx.fillRect(x, y, s, edge);
    ctx.fillRect(x, y, edge, s);
    ctx.fillStyle = mix(color, "#000000", 0.28);
    ctx.fillRect(x, y + s - edge, s, edge);
    ctx.fillRect(x + s - edge, y, edge, s);
    ctx.fillStyle = mix(color, "#ffffff", 0.42);
    ctx.fillRect(x + edge + 1, y + edge + 1, Math.max(2, size * 0.18), Math.max(2, size * 0.1));
  }

  draw(game) {
    const ctx = this.wctx;
    const cell = this.cell;
    ctx.clearRect(0, 0, cell * COLS, cell * ROWS);
    ctx.fillStyle = "#12141a";
    ctx.fillRect(0, 0, cell * COLS, cell * ROWS);

    ctx.strokeStyle = "rgba(255,255,255,0.035)";
    ctx.lineWidth = 1;
    for (let x = 1; x < COLS; x += 1) {
      ctx.beginPath();
      ctx.moveTo(x * cell + 0.5, 0);
      ctx.lineTo(x * cell + 0.5, cell * ROWS);
      ctx.stroke();
    }
    for (let y = 1; y < ROWS; y += 1) {
      ctx.beginPath();
      ctx.moveTo(0, y * cell + 0.5);
      ctx.lineTo(cell * COLS, y * cell + 0.5);
      ctx.stroke();
    }

    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        const type = game.board[y][x];
        if (!type) continue;
        this.drawBlock(ctx, x * cell, y * cell, cell, COLORS[type]);
      }
    }

    if (game.current) {
      const gy = game.ghostY();
      for (const [x, y] of game.cells()) {
        const ghostRow = gy + (y - game.current.y);
        if (ghostRow >= 0) {
          this.drawBlock(ctx, x * cell, ghostRow * cell, cell, COLORS[game.current.type], true);
        }
      }
      for (const [x, y] of game.cells()) {
        if (y >= 0) this.drawBlock(ctx, x * cell, y * cell, cell, COLORS[game.current.type]);
      }
    }

    this.drawNext(game.next);
  }

  drawNext(type) {
    const ctx = this.nctx;
    const box = this.nextCss;
    ctx.clearRect(0, 0, box, box);
    if (!type) return;
    const cells = SHAPES[type][0];
    const xs = cells.map(([x]) => x);
    const ys = cells.map(([, y]) => y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    const size = Math.floor(box / 4.2);
    const ox = (box - w * size) / 2;
    const oy = (box - h * size) / 2;
    for (const [x, y] of cells) {
      this.drawBlock(ctx, ox + (x - minX) * size, oy + (y - minY) * size, size, COLORS[type]);
    }
  }
}
