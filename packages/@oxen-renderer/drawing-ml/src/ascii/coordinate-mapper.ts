/**
 * @file Pixel-to-terminal coordinate mapping with aspect ratio correction
 */

export type MapperConfig = {
  readonly slideWidth: number;
  readonly slideHeight: number;
  readonly gridWidth: number;
  readonly gridHeight: number;
};

export type GridRect = {
  readonly col: number;
  readonly row: number;
  readonly width: number;
  readonly height: number;
};

const CHAR_ASPECT_RATIO = 2;

/** Create mapping config with aspect-ratio-corrected grid dimensions. */
export function createMapperConfig(
  slideWidth: number,
  slideHeight: number,
  terminalWidth: number,
): MapperConfig {
  const gridWidth = terminalWidth;
  const pixelsPerCol = slideWidth / gridWidth;
  const pixelsPerRow = pixelsPerCol * CHAR_ASPECT_RATIO;
  const gridHeight = Math.max(1, Math.round(slideHeight / pixelsPerRow));

  return { slideWidth, slideHeight, gridWidth, gridHeight };
}

/** Map pixel bounds to grid coordinates, clamping to grid edges. */
export function mapBoundsToGrid(
  config: MapperConfig,
  bounds: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
): GridRect | undefined {
  const scaleX = config.gridWidth / config.slideWidth;
  const scaleY = config.gridHeight / config.slideHeight;

  const col = Math.round(bounds.x * scaleX);
  const row = Math.round(bounds.y * scaleY);
  const right = Math.round((bounds.x + bounds.width) * scaleX);
  const bottom = Math.round((bounds.y + bounds.height) * scaleY);

  const clampedCol = Math.max(0, Math.min(col, config.gridWidth - 1));
  const clampedRow = Math.max(0, Math.min(row, config.gridHeight - 1));
  const clampedRight = Math.max(clampedCol + 1, Math.min(right, config.gridWidth));
  const clampedBottom = Math.max(clampedRow + 1, Math.min(bottom, config.gridHeight));

  const w = clampedRight - clampedCol;
  const h = clampedBottom - clampedRow;

  if (w < 1 || h < 1) {
    return undefined;
  }

  return { col: clampedCol, row: clampedRow, width: w, height: h };
}
