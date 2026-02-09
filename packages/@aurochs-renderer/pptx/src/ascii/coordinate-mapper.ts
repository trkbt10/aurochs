/**
 * @file Local wrappers for coordinate mapper from drawing-ml shared primitives
 */

import type {
  MapperConfig as _MapperConfig,
  GridRect as _GridRect,
} from "@aurochs-renderer/drawing-ml/ascii";

import {
  createMapperConfig as _createMapperConfig,
  mapBoundsToGrid as _mapBoundsToGrid,
} from "@aurochs-renderer/drawing-ml/ascii";

/** Configuration for mapping slide coordinates to grid */
export type MapperConfig = _MapperConfig;
/** A rectangle on the grid */
export type GridRect = _GridRect;

/** Create a mapper configuration from slide and grid dimensions */
export function createMapperConfig(
  slideWidth: number,
  slideHeight: number,
  terminalWidth: number,
): MapperConfig {
  return _createMapperConfig(slideWidth, slideHeight, terminalWidth);
}

/** Map slide-space bounds to grid coordinates */
export function mapBoundsToGrid(
  config: MapperConfig,
  bounds: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
): GridRect | undefined {
  return _mapBoundsToGrid(config, bounds);
}
