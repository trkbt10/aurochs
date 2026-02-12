/**
 * @file Geometry rendering functions
 *
 * Main entry points for rendering DrawingML geometry to SVG.
 *
 * @see ECMA-376 Part 1, Section 20.1.9 - DrawingML Shapes
 */

import type { Geometry, CustomGeometry, GeometryPath } from "@aurochs-office/drawing-ml/domain/geometry";
import { renderGeometryPathData, scaleCommand } from "./path-commands";
import { renderPresetGeometryData } from "./preset-shapes";

// Re-export for convenience
export { renderPresetGeometryData };

/**
 * Render custom geometry to SVG path data with scaling.
 *
 * Per ECMA-376 Part 1, Section 20.1.9.15 (a:path):
 * - The path's w and h attributes define its coordinate system
 * - Path coordinates must be scaled to fit the shape's actual dimensions
 *
 * @param geom - Custom geometry with paths
 * @param targetWidth - Target shape width
 * @param targetHeight - Target shape height
 * @returns SVG path data string with scaled coordinates
 *
 * @see ECMA-376 Part 1, Section 20.1.9.8 (a:custGeom)
 * @see ECMA-376 Part 1, Section 20.1.9.15 (a:path)
 */
export function renderCustomGeometryData(geom: CustomGeometry, targetWidth?: number, targetHeight?: number): string {
  return geom.paths
    .map((p) => {
      // If no target dimensions or path dimensions are zero, use unscaled
      if (targetWidth === undefined || targetHeight === undefined || p.width === 0 || p.height === 0) {
        return renderGeometryPathData(p);
      }

      // Calculate scale factors from path coordinate space to shape space
      const scaleX = targetWidth / p.width;
      const scaleY = targetHeight / p.height;

      // Scale all commands
      const scaledCommands = p.commands.map((cmd) => scaleCommand(cmd, scaleX, scaleY));

      // Create a virtual scaled path for rendering
      const scaledPath: GeometryPath = {
        ...p,
        commands: scaledCommands,
      };

      return renderGeometryPathData(scaledPath);
    })
    .join(" ");
}

/**
 * Render geometry to SVG path data
 *
 * @param geom - Geometry (preset or custom)
 * @param width - Target shape width
 * @param height - Target shape height
 * @returns SVG path data string
 */
export function renderGeometryData(geom: Geometry, width: number, height: number): string {
  switch (geom.type) {
    case "preset":
      return renderPresetGeometryData(geom, width, height);
    case "custom":
      return renderCustomGeometryData(geom, width, height);
  }
}
