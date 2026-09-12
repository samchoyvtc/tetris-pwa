#!/usr/bin/env python3
"""Paint app icons: a plastic tetromino stack in a dark shaft."""

from __future__ import annotations

import pathlib
import struct
import zlib

ROOT = pathlib.Path(__file__).resolve().parents[1] / "icons"

# Same plastic colors as the game
CYAN = (46, 196, 214)
YELLOW = (240, 193, 75)
PURPLE = (155, 107, 219)
GREEN = (60, 191, 122)
RED = (226, 75, 75)
BLUE = (59, 111, 216)
ORANGE = (232, 136, 58)
SHAFT = (10, 11, 14)
WELL = (18, 20, 26)


def mix(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def write_png(path: pathlib.Path, width: int, height: int, rgba: bytearray) -> None:
    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    raw = bytearray()
    row = width * 4
    for y in range(height):
        raw.append(0)
        raw.extend(rgba[y * row : (y + 1) * row])
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + chunk(b"IEND", b"")
    )
    path.write_bytes(png)


def set_px(buf: bytearray, size: int, x: int, y: int, color: tuple[int, int, int], a: int = 255) -> None:
    if 0 <= x < size and 0 <= y < size:
        i = (y * size + x) * 4
        buf[i : i + 4] = bytes((color[0], color[1], color[2], a))


def fill_rect(
    buf: bytearray,
    size: int,
    x0: int,
    y0: int,
    x1: int,
    y1: int,
    color: tuple[int, int, int],
) -> None:
    for y in range(y0, y1):
        for x in range(x0, x1):
            set_px(buf, size, x, y, color)


def draw_block(
    buf: bytearray,
    size: int,
    x0: int,
    y0: int,
    cell: int,
    color: tuple[int, int, int],
) -> None:
    gap = max(1, cell // 16)
    x1, y1 = x0 + cell - gap, y0 + cell - gap
    fill_rect(buf, size, x0, y0, x1, y1, color)
    hi = mix(color, (255, 255, 255), 0.28)
    lo = mix(color, (0, 0, 0), 0.28)
    edge = max(2, cell // 10)
    fill_rect(buf, size, x0, y0, x1, y0 + edge, hi)
    fill_rect(buf, size, x0, y0, x0 + edge, y1, hi)
    fill_rect(buf, size, x0, y1 - edge, x1, y1, lo)
    fill_rect(buf, size, x1 - edge, y0, x1, y1, lo)
    inset = edge + max(1, cell // 14)
    spot = mix(color, (255, 255, 255), 0.45)
    fill_rect(buf, size, x0 + inset, y0 + inset, x0 + inset + max(2, cell // 6), y0 + inset + max(2, cell // 8), spot)


def paint(size: int) -> bytearray:
    buf = bytearray(size * size * 4)
    fill_rect(buf, size, 0, 0, size, size, SHAFT)

    margin = size * 14 // 100
    # 6x7 playfield of plastic bricks
    cols, rows = 6, 7
    inner_w = size - margin * 2
    cell = inner_w // cols
    well_w = cell * cols
    well_h = cell * rows
    ox = (size - well_w) // 2
    oy = (size - well_h) // 2

    fill_rect(buf, size, ox - cell // 8, oy - cell // 8, ox + well_w + cell // 8, oy + well_h + cell // 8, WELL)

    # (col, row, color) — a settled stack, read as a shaft
    stack = [
        (2, 0, PURPLE),
        (1, 1, PURPLE),
        (2, 1, PURPLE),
        (3, 1, PURPLE),
        (0, 2, BLUE),
        (0, 3, BLUE),
        (1, 3, BLUE),
        (2, 3, BLUE),
        (4, 2, ORANGE),
        (3, 3, ORANGE),
        (4, 3, ORANGE),
        (5, 3, ORANGE),
        (1, 4, GREEN),
        (2, 4, GREEN),
        (0, 5, GREEN),
        (1, 5, GREEN),
        (3, 4, RED),
        (4, 4, RED),
        (4, 5, RED),
        (5, 5, RED),
        (0, 6, CYAN),
        (1, 6, CYAN),
        (2, 6, CYAN),
        (3, 6, CYAN),
        (4, 6, YELLOW),
        (5, 6, YELLOW),
        (4, 5, RED),
        (5, 4, YELLOW),
    ]

    for col, row, color in stack:
        draw_block(buf, size, ox + col * cell, oy + row * cell, cell, color)

    return buf


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    for name, size in (("icon-512.png", 512), ("icon-192.png", 192), ("apple-touch-icon.png", 180)):
        write_png(ROOT / name, size, size, paint(size))
        print(f"wrote {ROOT / name}")


if __name__ == "__main__":
    main()
