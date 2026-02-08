/**
 * @file ASCII canvas - 2D character grid with z-order support
 */

export type Cell = {
  char: string;
  z: number;
};

export type AsciiCanvas = {
  readonly width: number;
  readonly height: number;
  readonly cells: Cell[][];
};

export const BOX_CHARS = {
  topLeft: "\u250C",
  topRight: "\u2510",
  bottomLeft: "\u2514",
  bottomRight: "\u2518",
  horizontal: "\u2500",
  vertical: "\u2502",
} as const;

export const TABLE_CHARS = {
  ...BOX_CHARS,
  topTee: "\u252C",
  bottomTee: "\u2534",
  leftTee: "\u251C",
  rightTee: "\u2524",
  cross: "\u253C",
} as const;

/** Create an empty canvas filled with spaces. */
export function createCanvas(width: number, height: number): AsciiCanvas {
  const cells: Cell[][] = [];
  for (let row = 0; row < height; row++) {
    const rowCells: Cell[] = [];
    for (let col = 0; col < width; col++) {
      rowCells.push({ char: " ", z: 0 });
    }
    cells.push(rowCells);
  }
  return { width, height, cells };
}

export type CellParams = {
  readonly canvas: AsciiCanvas;
  readonly col: number;
  readonly row: number;
  readonly char: string;
  readonly z: number;
};

/** Set a character on the canvas. Higher z overwrites lower z. */
export function setCell(params: CellParams): void {
  const { canvas, col, row, char, z } = params;
  if (col < 0 || col >= canvas.width || row < 0 || row >= canvas.height) {
    return;
  }
  const cell = canvas.cells[row]![col]!;
  if (z >= cell.z) {
    cell.char = char;
    cell.z = z;
  }
}

export type BoxParams = {
  readonly canvas: AsciiCanvas;
  readonly col: number;
  readonly row: number;
  readonly w: number;
  readonly h: number;
  readonly z: number;
};

/** Draw a box-drawing rectangle. Min 2x2; 1x1 renders as "+". */
export function drawBox(params: BoxParams): void {
  const { canvas, col, row, w, h, z } = params;
  if (w < 2 || h < 2) {
    if (w >= 1 && h >= 1) {
      setCell({ canvas, col, row, char: "+", z });
    }
    return;
  }

  setCell({ canvas, col, row, char: BOX_CHARS.topLeft, z });
  setCell({ canvas, col: col + w - 1, row, char: BOX_CHARS.topRight, z });
  setCell({ canvas, col, row: row + h - 1, char: BOX_CHARS.bottomLeft, z });
  setCell({ canvas, col: col + w - 1, row: row + h - 1, char: BOX_CHARS.bottomRight, z });

  for (let c = col + 1; c < col + w - 1; c++) {
    setCell({ canvas, col: c, row, char: BOX_CHARS.horizontal, z });
    setCell({ canvas, col: c, row: row + h - 1, char: BOX_CHARS.horizontal, z });
  }

  for (let r = row + 1; r < row + h - 1; r++) {
    setCell({ canvas, col, row: r, char: BOX_CHARS.vertical, z });
    setCell({ canvas, col: col + w - 1, row: r, char: BOX_CHARS.vertical, z });
  }
}

export type TextParams = {
  readonly canvas: AsciiCanvas;
  readonly col: number;
  readonly row: number;
  readonly text: string;
  readonly maxLen: number;
  readonly z: number;
};

/** Write text, truncating with "..." if it exceeds maxLen. */
export function drawText(params: TextParams): void {
  const { canvas, col, row, text, maxLen, z } = params;
  if (maxLen <= 0) {
    return;
  }
  const truncated = truncateText(text, maxLen);

  for (let i = 0; i < truncated.length; i++) {
    setCell({ canvas, col: col + i, row, char: truncated[i]!, z });
  }
}

/** Truncate text with "..." suffix if it exceeds maxLen. */
export function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) {
    return text;
  }
  if (maxLen <= 3) {
    return text.substring(0, maxLen);
  }
  return text.substring(0, maxLen - 3) + "...";
}

/** Render canvas to string. Trims trailing spaces and empty lines. */
export function renderCanvas(canvas: AsciiCanvas): string {
  const lines: string[] = [];
  for (const row of canvas.cells) {
    const line = row.map((cell) => cell.char).join("");
    lines.push(line.trimEnd());
  }
  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }
  return lines.join("\n");
}
