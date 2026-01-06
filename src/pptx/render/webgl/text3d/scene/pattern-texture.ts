/**
 * @file Pattern Texture Generation for 3D Materials
 *
 * Creates canvas-based pattern textures for Three.js materials.
 * Implements ECMA-376 pattern presets.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.47 (pattFill)
 * @see ECMA-376 Part 1, Section 20.1.10.50 (ST_PresetPatternVal)
 */

import * as THREE from "three";
import { createPatternCanvas } from "../utils/canvas";

// =============================================================================
// Pattern Types
// =============================================================================

/**
 * Pattern preset type from ECMA-376
 * @see ECMA-376 Part 1, Section 20.1.10.50 (ST_PresetPatternVal)
 */
export type PatternPreset =
  | "pct5" | "pct10" | "pct20" | "pct25" | "pct30" | "pct40" | "pct50"
  | "pct60" | "pct70" | "pct75" | "pct80" | "pct90"
  | "horz" | "vert" | "ltHorz" | "ltVert" | "dkHorz" | "dkVert"
  | "narHorz" | "narVert" | "dashHorz" | "dashVert" | "cross"
  | "dnDiag" | "upDiag" | "ltDnDiag" | "ltUpDiag" | "dkDnDiag" | "dkUpDiag"
  | "wdDnDiag" | "wdUpDiag" | "dashDnDiag" | "dashUpDiag" | "diagCross"
  | "smCheck" | "lgCheck" | "smGrid" | "lgGrid" | "dotGrid"
  | "smConfetti" | "lgConfetti" | "horzBrick" | "diagBrick"
  | "solidDmnd" | "openDmnd" | "dotDmnd" | "plaid" | "sphere"
  | "weave" | "divot" | "shingle" | "wave" | "trellis" | "zigZag";

// =============================================================================
// Texture Cache
// =============================================================================

const patternTextureCache = new Map<string, THREE.CanvasTexture>();

function getPatternCacheKey(preset: PatternPreset, fgColor: string, bgColor: string, size: number): string {
  return `${preset}-${fgColor}-${bgColor}-${size}`;
}

// =============================================================================
// Pattern Drawing Functions
// =============================================================================

const PATTERN_SIZE = 16; // Base pattern tile size

type PatternDrawer = (ctx: CanvasRenderingContext2D, fg: string, bg: string, size: number) => void;

/**
 * Draw percentage pattern (dotted)
 */
function drawPercentPattern(ctx: CanvasRenderingContext2D, fg: string, bg: string, size: number, pct: number): void {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = fg;

  // Calculate dot spacing based on percentage
  const gridSize = Math.ceil(Math.sqrt(100 / pct));
  const dotSize = Math.max(1, Math.floor(size / gridSize / 2));

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if ((x + y) % Math.ceil(100 / pct / 10) === 0) {
        const px = (x / gridSize) * size;
        const py = (y / gridSize) * size;
        ctx.fillRect(px, py, dotSize, dotSize);
      }
    }
  }
}

/**
 * Draw horizontal line pattern
 */
function drawHorizontalPattern(ctx: CanvasRenderingContext2D, fg: string, bg: string, size: number, lineWidth: number, spacing: number): void {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = fg;
  for (let y = 0; y < size; y += spacing) {
    ctx.fillRect(0, y, size, lineWidth);
  }
}

/**
 * Draw vertical line pattern
 */
function drawVerticalPattern(ctx: CanvasRenderingContext2D, fg: string, bg: string, size: number, lineWidth: number, spacing: number): void {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = fg;
  for (let x = 0; x < size; x += spacing) {
    ctx.fillRect(x, 0, lineWidth, size);
  }
}

/**
 * Draw diagonal line pattern
 */
function drawDiagonalPattern(ctx: CanvasRenderingContext2D, fg: string, bg: string, size: number, lineWidth: number, up: boolean): void {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = fg;
  ctx.lineWidth = lineWidth;

  ctx.beginPath();
  for (let i = -size; i < size * 2; i += 4) {
    if (up) {
      ctx.moveTo(i, size);
      ctx.lineTo(i + size, 0);
    } else {
      ctx.moveTo(i, 0);
      ctx.lineTo(i + size, size);
    }
  }
  ctx.stroke();
}

/**
 * Draw cross pattern
 */
function drawCrossPattern(ctx: CanvasRenderingContext2D, fg: string, bg: string, size: number, lineWidth: number): void {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = fg;
  ctx.lineWidth = lineWidth;

  // Horizontal lines
  for (let y = 0; y < size; y += size / 4) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }
  // Vertical lines
  for (let x = 0; x < size; x += size / 4) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }
}

/**
 * Draw checker pattern
 */
function drawCheckerPattern(ctx: CanvasRenderingContext2D, fg: string, bg: string, size: number, cellSize: number): void {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = fg;

  const cells = Math.ceil(size / cellSize);
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      if ((x + y) % 2 === 0) {
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
  }
}

/**
 * Draw grid pattern
 */
function drawGridPattern(ctx: CanvasRenderingContext2D, fg: string, bg: string, size: number, cellSize: number): void {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = fg;
  ctx.lineWidth = 1;

  for (let x = 0; x <= size; x += cellSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }
  for (let y = 0; y <= size; y += cellSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }
}

/**
 * Draw dotted grid pattern
 */
function drawDotGridPattern(ctx: CanvasRenderingContext2D, fg: string, bg: string, size: number, spacing: number): void {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = fg;

  for (let y = 0; y < size; y += spacing) {
    for (let x = 0; x < size; x += spacing) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * Draw confetti pattern
 */
function drawConfettiPattern(ctx: CanvasRenderingContext2D, fg: string, bg: string, size: number, dotSize: number): void {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = fg;

  // Deterministic "random" pattern using simple hash
  for (let i = 0; i < size * 2; i++) {
    const x = ((i * 7) % size);
    const y = ((i * 13) % size);
    ctx.fillRect(x, y, dotSize, dotSize);
  }
}

/**
 * Draw brick pattern
 */
function drawBrickPattern(ctx: CanvasRenderingContext2D, fg: string, bg: string, size: number, horizontal: boolean): void {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = fg;
  ctx.lineWidth = 1;

  const brickH = size / 4;
  const brickW = size / 2;

  for (let y = 0; y < size; y += brickH) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();

    const offset = Math.floor(y / brickH) % 2 === 0 ? 0 : brickW / 2;
    for (let x = offset; x < size; x += brickW) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + brickH);
      ctx.stroke();
    }
  }
}

/**
 * Draw diamond pattern
 */
function drawDiamondPattern(ctx: CanvasRenderingContext2D, fg: string, bg: string, size: number, solid: boolean): void {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  const half = size / 2;
  const quarter = size / 4;

  ctx.beginPath();
  ctx.moveTo(half, 0);
  ctx.lineTo(size, half);
  ctx.lineTo(half, size);
  ctx.lineTo(0, half);
  ctx.closePath();

  if (solid) {
    ctx.fillStyle = fg;
    ctx.fill();
  } else {
    ctx.strokeStyle = fg;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

/**
 * Draw wave pattern
 */
function drawWavePattern(ctx: CanvasRenderingContext2D, fg: string, bg: string, size: number): void {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = fg;
  ctx.lineWidth = 1;

  const amplitude = size / 4;
  const frequency = (2 * Math.PI) / size;

  for (let y = 0; y < size; y += size / 2) {
    ctx.beginPath();
    ctx.moveTo(0, y + amplitude);
    for (let x = 0; x <= size; x++) {
      ctx.lineTo(x, y + amplitude + Math.sin(x * frequency) * amplitude);
    }
    ctx.stroke();
  }
}

/**
 * Draw trellis pattern
 */
function drawTrellisPattern(ctx: CanvasRenderingContext2D, fg: string, bg: string, size: number): void {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = fg;
  ctx.lineWidth = 1;

  // Diagonal lines both ways
  for (let i = -size; i < size * 2; i += 4) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + size, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(i, size);
    ctx.lineTo(i + size, 0);
    ctx.stroke();
  }
}

/**
 * Draw zigzag pattern
 */
function drawZigZagPattern(ctx: CanvasRenderingContext2D, fg: string, bg: string, size: number): void {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = fg;
  ctx.lineWidth = 1;

  const step = size / 4;

  for (let y = 0; y < size; y += step * 2) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= size; x += step) {
      const yOffset = (Math.floor(x / step) % 2 === 0) ? 0 : step;
      ctx.lineTo(x, y + yOffset);
    }
    ctx.stroke();
  }
}

// =============================================================================
// Pattern Preset Map
// =============================================================================

const patternDrawers: Record<PatternPreset, PatternDrawer> = {
  // Percentage patterns
  pct5: (ctx, fg, bg, size) => drawPercentPattern(ctx, fg, bg, size, 5),
  pct10: (ctx, fg, bg, size) => drawPercentPattern(ctx, fg, bg, size, 10),
  pct20: (ctx, fg, bg, size) => drawPercentPattern(ctx, fg, bg, size, 20),
  pct25: (ctx, fg, bg, size) => drawPercentPattern(ctx, fg, bg, size, 25),
  pct30: (ctx, fg, bg, size) => drawPercentPattern(ctx, fg, bg, size, 30),
  pct40: (ctx, fg, bg, size) => drawPercentPattern(ctx, fg, bg, size, 40),
  pct50: (ctx, fg, bg, size) => drawCheckerPattern(ctx, fg, bg, size, size / 8),
  pct60: (ctx, fg, bg, size) => drawPercentPattern(ctx, bg, fg, size, 40),
  pct70: (ctx, fg, bg, size) => drawPercentPattern(ctx, bg, fg, size, 30),
  pct75: (ctx, fg, bg, size) => drawPercentPattern(ctx, bg, fg, size, 25),
  pct80: (ctx, fg, bg, size) => drawPercentPattern(ctx, bg, fg, size, 20),
  pct90: (ctx, fg, bg, size) => drawPercentPattern(ctx, bg, fg, size, 10),

  // Horizontal patterns
  horz: (ctx, fg, bg, size) => drawHorizontalPattern(ctx, fg, bg, size, 2, 4),
  ltHorz: (ctx, fg, bg, size) => drawHorizontalPattern(ctx, fg, bg, size, 1, 4),
  dkHorz: (ctx, fg, bg, size) => drawHorizontalPattern(ctx, fg, bg, size, 2, 3),
  narHorz: (ctx, fg, bg, size) => drawHorizontalPattern(ctx, fg, bg, size, 1, 2),
  dashHorz: (ctx, fg, bg, size) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = fg;
    for (let y = 0; y < size; y += 4) {
      for (let x = 0; x < size; x += 6) {
        ctx.fillRect(x, y, 3, 1);
      }
    }
  },

  // Vertical patterns
  vert: (ctx, fg, bg, size) => drawVerticalPattern(ctx, fg, bg, size, 2, 4),
  ltVert: (ctx, fg, bg, size) => drawVerticalPattern(ctx, fg, bg, size, 1, 4),
  dkVert: (ctx, fg, bg, size) => drawVerticalPattern(ctx, fg, bg, size, 2, 3),
  narVert: (ctx, fg, bg, size) => drawVerticalPattern(ctx, fg, bg, size, 1, 2),
  dashVert: (ctx, fg, bg, size) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = fg;
    for (let x = 0; x < size; x += 4) {
      for (let y = 0; y < size; y += 6) {
        ctx.fillRect(x, y, 1, 3);
      }
    }
  },

  // Cross patterns
  cross: (ctx, fg, bg, size) => drawCrossPattern(ctx, fg, bg, size, 1),

  // Diagonal patterns
  dnDiag: (ctx, fg, bg, size) => drawDiagonalPattern(ctx, fg, bg, size, 1, false),
  upDiag: (ctx, fg, bg, size) => drawDiagonalPattern(ctx, fg, bg, size, 1, true),
  ltDnDiag: (ctx, fg, bg, size) => drawDiagonalPattern(ctx, fg, bg, size, 0.5, false),
  ltUpDiag: (ctx, fg, bg, size) => drawDiagonalPattern(ctx, fg, bg, size, 0.5, true),
  dkDnDiag: (ctx, fg, bg, size) => drawDiagonalPattern(ctx, fg, bg, size, 2, false),
  dkUpDiag: (ctx, fg, bg, size) => drawDiagonalPattern(ctx, fg, bg, size, 2, true),
  wdDnDiag: (ctx, fg, bg, size) => drawDiagonalPattern(ctx, fg, bg, size, 3, false),
  wdUpDiag: (ctx, fg, bg, size) => drawDiagonalPattern(ctx, fg, bg, size, 3, true),
  dashDnDiag: (ctx, fg, bg, size) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = fg;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    drawDiagonalPattern(ctx, fg, bg, size, 1, false);
    ctx.setLineDash([]);
  },
  dashUpDiag: (ctx, fg, bg, size) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = fg;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    drawDiagonalPattern(ctx, fg, bg, size, 1, true);
    ctx.setLineDash([]);
  },
  diagCross: (ctx, fg, bg, size) => {
    drawDiagonalPattern(ctx, fg, bg, size, 1, false);
    drawDiagonalPattern(ctx, fg, bg, size, 1, true);
  },

  // Checker patterns
  smCheck: (ctx, fg, bg, size) => drawCheckerPattern(ctx, fg, bg, size, size / 8),
  lgCheck: (ctx, fg, bg, size) => drawCheckerPattern(ctx, fg, bg, size, size / 4),

  // Grid patterns
  smGrid: (ctx, fg, bg, size) => drawGridPattern(ctx, fg, bg, size, size / 8),
  lgGrid: (ctx, fg, bg, size) => drawGridPattern(ctx, fg, bg, size, size / 4),
  dotGrid: (ctx, fg, bg, size) => drawDotGridPattern(ctx, fg, bg, size, 4),

  // Confetti patterns
  smConfetti: (ctx, fg, bg, size) => drawConfettiPattern(ctx, fg, bg, size, 1),
  lgConfetti: (ctx, fg, bg, size) => drawConfettiPattern(ctx, fg, bg, size, 2),

  // Brick patterns
  horzBrick: (ctx, fg, bg, size) => drawBrickPattern(ctx, fg, bg, size, true),
  diagBrick: (ctx, fg, bg, size) => drawBrickPattern(ctx, fg, bg, size, false),

  // Diamond patterns
  solidDmnd: (ctx, fg, bg, size) => drawDiamondPattern(ctx, fg, bg, size, true),
  openDmnd: (ctx, fg, bg, size) => drawDiamondPattern(ctx, fg, bg, size, false),
  dotDmnd: (ctx, fg, bg, size) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = fg;
    // Diamond shape with dots
    const half = size / 2;
    ctx.fillRect(half - 1, 0, 2, 2);
    ctx.fillRect(size - 2, half - 1, 2, 2);
    ctx.fillRect(half - 1, size - 2, 2, 2);
    ctx.fillRect(0, half - 1, 2, 2);
  },

  // Complex patterns
  plaid: (ctx, fg, bg, size) => {
    drawHorizontalPattern(ctx, fg, bg, size, 2, 8);
    ctx.globalAlpha = 0.5;
    drawVerticalPattern(ctx, fg, bg, size, 2, 8);
    ctx.globalAlpha = 1;
  },
  sphere: (ctx, fg, bg, size) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);
    const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grd.addColorStop(0, fg);
    grd.addColorStop(1, bg);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
  },
  weave: (ctx, fg, bg, size) => {
    drawCheckerPattern(ctx, fg, bg, size, size / 4);
    ctx.strokeStyle = bg;
    ctx.lineWidth = 1;
    for (let i = 0; i < size; i += size / 4) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.stroke();
    }
  },
  divot: (ctx, fg, bg, size) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(size / 4, size / 4, 2, 0, Math.PI * 2);
    ctx.arc(size * 3 / 4, size * 3 / 4, 2, 0, Math.PI * 2);
    ctx.fill();
  },
  shingle: (ctx, fg, bg, size) => drawBrickPattern(ctx, fg, bg, size, true),
  wave: (ctx, fg, bg, size) => drawWavePattern(ctx, fg, bg, size),
  trellis: (ctx, fg, bg, size) => drawTrellisPattern(ctx, fg, bg, size),
  zigZag: (ctx, fg, bg, size) => drawZigZagPattern(ctx, fg, bg, size),
};

// =============================================================================
// Public API
// =============================================================================

/**
 * Create a pattern texture from resolved colors.
 *
 * @param preset - Pattern preset from ECMA-376
 * @param fgColor - Foreground color (hex string)
 * @param bgColor - Background color (hex string)
 * @param size - Texture size (default 64)
 */
export function createPatternTextureFromResolved(
  preset: PatternPreset,
  fgColor: string,
  bgColor: string,
  size: number = 64,
): THREE.CanvasTexture {
  const cacheKey = getPatternCacheKey(preset, fgColor, bgColor, size);
  const cached = patternTextureCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const { canvas, ctx } = createPatternCanvas(size);

  // Parse colors
  const fg = fgColor.startsWith("#") ? fgColor : `#${fgColor}`;
  const bg = bgColor.startsWith("#") ? bgColor : `#${bgColor}`;

  // Draw pattern
  const drawer = patternDrawers[preset];
  if (drawer) {
    drawer(ctx, fg, bg, size);
  } else {
    // Fallback: simple fill with foreground
    ctx.fillStyle = fg;
    ctx.fillRect(0, 0, size, size);
  }

  // Create texture with tiling
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4); // Tile the pattern
  texture.needsUpdate = true;

  patternTextureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Clear the pattern texture cache.
 */
export function clearPatternTextureCache(): void {
  for (const texture of patternTextureCache.values()) {
    texture.dispose();
  }
  patternTextureCache.clear();
}
