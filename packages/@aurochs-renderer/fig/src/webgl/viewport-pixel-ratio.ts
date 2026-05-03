/** @file WebGL viewport backing-store pixel ratio policy. */

export type WebGLViewportPixelRatioInput = {
  readonly devicePixelRatio: number;
  readonly viewportScale: number;
  readonly surfaceWidth: number;
  readonly surfaceHeight: number;
  readonly maxBackingStorePixels?: number;
  readonly maxPixelRatio?: number;
  readonly step?: number;
};

const DEFAULT_MAX_PIXEL_RATIO = 3;
const DEFAULT_STEP = 0.5;
const DEFAULT_MAX_BACKING_STORE_PIXELS = 4_000_000;
const MIN_PIXEL_RATIO = 0.25;

function finitePositiveOrOne(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }
  return value;
}

function quantizeUp(value: number, step: number): number {
  const normalizedStep = finitePositiveOrOne(step);
  return Math.ceil(value / normalizedStep) * normalizedStep;
}

function requireFinitePositive(name: string, value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`WebGL viewport pixel ratio requires positive ${name}`);
  }
  return value;
}

/**
 * Resolve the backing-store ratio for a WebGL viewport.
 *
 * DPR is the baseline. Zoom only increases the backing store by sqrt(scale),
 * then quantizes to coarse buckets. This keeps zoom crisp enough without
 * resizing the canvas on every wheel tick or allocating unbounded FBOs.
 */
export function resolveWebGLViewportPixelRatio({
  devicePixelRatio,
  viewportScale,
  surfaceWidth,
  surfaceHeight,
  maxBackingStorePixels = DEFAULT_MAX_BACKING_STORE_PIXELS,
  maxPixelRatio = DEFAULT_MAX_PIXEL_RATIO,
  step = DEFAULT_STEP,
}: WebGLViewportPixelRatioInput): number {
  const dpr = Math.max(1, finitePositiveOrOne(devicePixelRatio));
  const scale = Math.max(1, finitePositiveOrOne(viewportScale));
  const max = Math.max(1, finitePositiveOrOne(maxPixelRatio));
  const desired = dpr * Math.sqrt(scale);
  const surfacePixels = requireFinitePositive("surfaceWidth", surfaceWidth) * requireFinitePositive("surfaceHeight", surfaceHeight);
  const pixelBudgetRatio = Math.sqrt(finitePositiveOrOne(maxBackingStorePixels) / surfacePixels);
  const budgetedMax = Math.max(MIN_PIXEL_RATIO, Math.min(max, pixelBudgetRatio));
  return Math.min(budgetedMax, Math.max(MIN_PIXEL_RATIO, quantizeUp(desired, step)));
}
