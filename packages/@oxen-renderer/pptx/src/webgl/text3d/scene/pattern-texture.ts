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
import type { TileFlipMode } from "@oxen-office/ooxml/domain/drawing";
import { applyTileFlipMode } from "./tile-config";

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

/**
 * Pattern tile configuration for dynamic scaling
 */
export type PatternTileConfig = {
  /** Number of horizontal repeats */
  readonly repeatX: number;
  /** Number of vertical repeats */
  readonly repeatY: number;
  /** Flip mode per ECMA-376 */
  readonly flip?: TileFlipMode;
};

/**
 * Default pattern tile configuration
 */
export const DEFAULT_PATTERN_TILE: PatternTileConfig = {
  repeatX: 4,
  repeatY: 4,
  flip: "none",
};

type GetPatternCacheKeyArgs = [
  preset: PatternPreset,
  fgColor: string,
  bgColor: string,
  size: number,
  tileConfig?: PatternTileConfig,
];

function getPatternCacheKey(...args: GetPatternCacheKeyArgs): string {
  const [preset, fgColor, bgColor, size, tileConfig] = args;
  return `${preset}-${fgColor}-${bgColor}-${size}-${JSON.stringify(tileConfig)}`;
}

// =============================================================================
// Pattern Drawing Functions
// =============================================================================

type PatternDrawerArgs = [ctx: CanvasRenderingContext2D, fg: string, bg: string, size: number];

type PatternDrawer = (...args: PatternDrawerArgs) => void;

/**
 * Draw percentage pattern (dotted)
 */
type DrawPercentPatternArgs = [...PatternDrawerArgs, pct: number];

function drawPercentPattern(...args: DrawPercentPatternArgs): void {
  const [ctx, fg, bg, size, pct] = args;
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
type DrawHorizontalPatternArgs = [...PatternDrawerArgs, lineWidth: number, spacing: number];

function drawHorizontalPattern(...args: DrawHorizontalPatternArgs): void {
  const [ctx, fg, bg, size, lineWidth, spacing] = args;
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
type DrawVerticalPatternArgs = [...PatternDrawerArgs, lineWidth: number, spacing: number];

function drawVerticalPattern(...args: DrawVerticalPatternArgs): void {
  const [ctx, fg, bg, size, lineWidth, spacing] = args;
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
type DrawDiagonalPatternArgs = [...PatternDrawerArgs, lineWidth: number, up: boolean];

function drawDiagonalPattern(...args: DrawDiagonalPatternArgs): void {
  const [ctx, fg, bg, size, lineWidth, up] = args;
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
type DrawCrossPatternArgs = [...PatternDrawerArgs, lineWidth: number];

function drawCrossPattern(...args: DrawCrossPatternArgs): void {
  const [ctx, fg, bg, size, lineWidth] = args;
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
type DrawCheckerPatternArgs = [...PatternDrawerArgs, cellSize: number];

function drawCheckerPattern(...args: DrawCheckerPatternArgs): void {
  const [ctx, fg, bg, size, cellSize] = args;
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
type DrawGridPatternArgs = [...PatternDrawerArgs, cellSize: number];

function drawGridPattern(...args: DrawGridPatternArgs): void {
  const [ctx, fg, bg, size, cellSize] = args;
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
type DrawDotGridPatternArgs = [...PatternDrawerArgs, spacing: number];

function drawDotGridPattern(...args: DrawDotGridPatternArgs): void {
  const [ctx, fg, bg, size, spacing] = args;
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
type DrawConfettiPatternArgs = [...PatternDrawerArgs, dotSize: number];

function drawConfettiPattern(...args: DrawConfettiPatternArgs): void {
  const [ctx, fg, bg, size, dotSize] = args;
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
type DrawBrickPatternArgs = [...PatternDrawerArgs, horizontal: boolean];

function drawBrickPattern(...args: DrawBrickPatternArgs): void {
  const [ctx, fg, bg, size, horizontal] = args;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = fg;
  ctx.lineWidth = 1;

  const brickH = size / 4;
  const brickW = size / 2;

  if (horizontal) {
    // Horizontal brick pattern
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
  } else {
    // Diagonal brick pattern
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate(Math.PI / 4);
    ctx.translate(-size, -size);

    for (let y = 0; y < size * 2; y += brickH) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size * 2, y);
      ctx.stroke();

      const offset = Math.floor(y / brickH) % 2 === 0 ? 0 : brickW / 2;
      for (let x = offset; x < size * 2; x += brickW) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + brickH);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}

/**
 * Draw diamond pattern
 */
type DrawDiamondPatternArgs = [...PatternDrawerArgs, solid: boolean];

function drawDiamondPattern(...args: DrawDiamondPatternArgs): void {
  const [ctx, fg, bg, size, solid] = args;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  const half = size / 2;

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
function drawWavePattern(...args: PatternDrawerArgs): void {
  const [ctx, fg, bg, size] = args;
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
function drawTrellisPattern(...args: PatternDrawerArgs): void {
  const [ctx, fg, bg, size] = args;
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
function drawZigZagPattern(...args: PatternDrawerArgs): void {
  const [ctx, fg, bg, size] = args;
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

function makePercentDrawer(pct: number): PatternDrawer {
  return (...args) => drawPercentPattern(...args, pct);
}

function makeInvertedPercentDrawer(pct: number): PatternDrawer {
  return (...args) => {
    const [ctx, fg, bg, size] = args;
    drawPercentPattern(ctx, bg, fg, size, pct);
  };
}

function makeHorizontalDrawer(lineWidth: number, spacing: number): PatternDrawer {
  return (...args) => drawHorizontalPattern(...args, lineWidth, spacing);
}

function makeVerticalDrawer(lineWidth: number, spacing: number): PatternDrawer {
  return (...args) => drawVerticalPattern(...args, lineWidth, spacing);
}

function makeCrossDrawer(lineWidth: number): PatternDrawer {
  return (...args) => drawCrossPattern(...args, lineWidth);
}

function makeDiagonalDrawer(lineWidth: number, up: boolean): PatternDrawer {
  return (...args) => drawDiagonalPattern(...args, lineWidth, up);
}

function makeCheckerDrawer(divisor: number): PatternDrawer {
  return (...args) => {
    const [ctx, fg, bg, size] = args;
    drawCheckerPattern(ctx, fg, bg, size, size / divisor);
  };
}

function makeGridDrawer(divisor: number): PatternDrawer {
  return (...args) => {
    const [ctx, fg, bg, size] = args;
    drawGridPattern(ctx, fg, bg, size, size / divisor);
  };
}

function makeDotGridDrawer(spacing: number): PatternDrawer {
  return (...args) => drawDotGridPattern(...args, spacing);
}

function makeConfettiDrawer(dotSize: number): PatternDrawer {
  return (...args) => drawConfettiPattern(...args, dotSize);
}

function makeBrickDrawer(horizontal: boolean): PatternDrawer {
  return (...args) => drawBrickPattern(...args, horizontal);
}

function makeDiamondDrawer(solid: boolean): PatternDrawer {
  return (...args) => drawDiamondPattern(...args, solid);
}

const patternDrawers: Record<PatternPreset, PatternDrawer> = {
  // Percentage patterns
  pct5: makePercentDrawer(5),
  pct10: makePercentDrawer(10),
  pct20: makePercentDrawer(20),
  pct25: makePercentDrawer(25),
  pct30: makePercentDrawer(30),
  pct40: makePercentDrawer(40),
  pct50: makeCheckerDrawer(8),
  pct60: makeInvertedPercentDrawer(40),
  pct70: makeInvertedPercentDrawer(30),
  pct75: makeInvertedPercentDrawer(25),
  pct80: makeInvertedPercentDrawer(20),
  pct90: makeInvertedPercentDrawer(10),

  // Horizontal patterns
  horz: makeHorizontalDrawer(2, 4),
  ltHorz: makeHorizontalDrawer(1, 4),
  dkHorz: makeHorizontalDrawer(2, 3),
  narHorz: makeHorizontalDrawer(1, 2),
  dashHorz: (...args) => {
    const [ctx, fg, bg, size] = args;
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
  vert: makeVerticalDrawer(2, 4),
  ltVert: makeVerticalDrawer(1, 4),
  dkVert: makeVerticalDrawer(2, 3),
  narVert: makeVerticalDrawer(1, 2),
  dashVert: (...args) => {
    const [ctx, fg, bg, size] = args;
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
  cross: makeCrossDrawer(1),

  // Diagonal patterns
  dnDiag: makeDiagonalDrawer(1, false),
  upDiag: makeDiagonalDrawer(1, true),
  ltDnDiag: makeDiagonalDrawer(0.5, false),
  ltUpDiag: makeDiagonalDrawer(0.5, true),
  dkDnDiag: makeDiagonalDrawer(2, false),
  dkUpDiag: makeDiagonalDrawer(2, true),
  wdDnDiag: makeDiagonalDrawer(3, false),
  wdUpDiag: makeDiagonalDrawer(3, true),
  dashDnDiag: (...args) => {
    const [ctx, fg, bg, size] = args;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = fg;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    drawDiagonalPattern(ctx, fg, bg, size, 1, false);
    ctx.setLineDash([]);
  },
  dashUpDiag: (...args) => {
    const [ctx, fg, bg, size] = args;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = fg;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    drawDiagonalPattern(ctx, fg, bg, size, 1, true);
    ctx.setLineDash([]);
  },
  diagCross: (...args) => {
    const [ctx, fg, bg, size] = args;
    drawDiagonalPattern(ctx, fg, bg, size, 1, false);
    drawDiagonalPattern(ctx, fg, bg, size, 1, true);
  },

  // Checker patterns
  smCheck: makeCheckerDrawer(8),
  lgCheck: makeCheckerDrawer(4),

  // Grid patterns
  smGrid: makeGridDrawer(8),
  lgGrid: makeGridDrawer(4),
  dotGrid: makeDotGridDrawer(4),

  // Confetti patterns
  smConfetti: makeConfettiDrawer(1),
  lgConfetti: makeConfettiDrawer(2),

  // Brick patterns
  horzBrick: makeBrickDrawer(true),
  diagBrick: makeBrickDrawer(false),

  // Diamond patterns
  solidDmnd: makeDiamondDrawer(true),
  openDmnd: makeDiamondDrawer(false),
  dotDmnd: (...args) => {
    const [ctx, fg, bg, size] = args;
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
  plaid: (...args) => {
    const [ctx, fg, bg, size] = args;
    drawHorizontalPattern(ctx, fg, bg, size, 2, 8);
    ctx.globalAlpha = 0.5;
    drawVerticalPattern(ctx, fg, bg, size, 2, 8);
    ctx.globalAlpha = 1;
  },
  sphere: (...args) => {
    const [ctx, fg, bg, size] = args;
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
  weave: (...args) => {
    const [ctx, fg, bg, size] = args;
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
  divot: (...args) => {
    const [ctx, fg, bg, size] = args;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(size / 4, size / 4, 2, 0, Math.PI * 2);
    ctx.arc(size * 3 / 4, size * 3 / 4, 2, 0, Math.PI * 2);
    ctx.fill();
  },
  shingle: makeBrickDrawer(true),
  wave: drawWavePattern,
  trellis: drawTrellisPattern,
  zigZag: drawZigZagPattern,
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
 * @param options - Optional configuration
 * @param options.size - Texture size (default 64)
 * @param options.tileConfig - Tile configuration for repeat and flip
 *
 * @see ECMA-376 Part 1, Section 20.1.8.47 (pattFill)
 */
export function createPatternTextureFromResolved(
  ...args: [
    preset: PatternPreset,
    fgColor: string,
    bgColor: string,
    options?: {
    readonly size?: number;
    readonly tileConfig?: PatternTileConfig;
    },
  ]
): THREE.CanvasTexture {
  const [preset, fgColor, bgColor, options] = args;
  const size = options?.size ?? 64;
  const tileConfig = options?.tileConfig ?? DEFAULT_PATTERN_TILE;

  const cacheKey = getPatternCacheKey(preset, fgColor, bgColor, size, tileConfig);
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

  // Apply flip mode (ECMA-376 compliant)
  applyTileFlipMode(texture, tileConfig.flip ?? "none");

  // Apply dynamic repeat
  texture.repeat.set(tileConfig.repeatX, tileConfig.repeatY);
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
