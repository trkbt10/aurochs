/**
 * @file Shape renderer for XLSX drawings
 *
 * Renders XlsxShape elements to SVG using the shared DrawingML geometry renderer.
 */

import type { XlsxShape } from "@aurochs-office/xlsx/domain/drawing/types";
import type { PresetShapeType } from "@aurochs-office/drawing-ml/domain/geometry";
import { renderPresetGeometryData } from "@aurochs-renderer/drawing-ml/svg";
import type { ColorScheme } from "@aurochs-office/drawing-ml/domain/color-context";
import type { DrawingBounds } from "../drawing-layout";
import type { WarningsCollector } from "../types";

// =============================================================================
// Types
// =============================================================================

/**
 * Options for rendering a shape.
 */
export type RenderShapeOptions = {
  /** The shape element to render */
  readonly shape: XlsxShape;
  /** Calculated pixel bounds */
  readonly bounds: DrawingBounds;
  /** Warnings collector */
  readonly warnings?: WarningsCollector;
  /** Color scheme from workbook theme */
  readonly colorScheme?: ColorScheme;
};

// =============================================================================
// Preset Geometry Mapping
// =============================================================================

/**
 * Map XLSX preset geometry to DrawingML PresetShapeType.
 * Names are shared between XLSX and PPTX (both based on DrawingML).
 */
function mapToPresetShapeType(preset: string): PresetShapeType {
  // DrawingML preset geometry names are shared between XLSX and PPTX
  // @see ECMA-376 Part 1, Section 20.1.10.55 (ST_ShapeType)
  return preset as PresetShapeType;
}

// =============================================================================
// Rendering
// =============================================================================

/**
 * Escape XML special characters in attribute values.
 */
function escapeXmlAttr(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Render preset geometry path, falling back to rectangle on failure */
function renderShapeGeometryPath(options: {
  preset: string;
  width: number;
  height: number;
  warnings: WarningsCollector | undefined;
}): string {
  const { preset, width, height, warnings } = options;
  try {
    const presetGeom = {
      type: "preset" as const,
      preset: mapToPresetShapeType(preset),
      adjustValues: [],
    };
    return renderPresetGeometryData(presetGeom, width, height);
  } catch (error: unknown) {
    // Unsupported preset geometry — fall back to rectangle
    if (error instanceof Error) {
      warnings?.add(`Shape preset "${preset}" not supported, using rectangle fallback`);
    }
    const rectGeom = {
      type: "preset" as const,
      preset: "rect" as PresetShapeType,
      adjustValues: [],
    };
    return renderPresetGeometryData(rectGeom, width, height);
  }
}

/**
 * Render a shape element to SVG.
 *
 * Delegates geometry rendering to the shared DrawingML renderer for consistency
 * and to avoid code duplication.
 *
 * @param options - Render options
 * @returns SVG string for the shape
 */
/**
 * Resolve a theme color key to a hex value.
 */
function resolveThemeHex(key: string, colorScheme: ColorScheme | undefined, fallback: string): string {
  if (!colorScheme) {
    return fallback;
  }
  const val = colorScheme[key];
  if (!val) {
    return fallback;
  }
  return val.startsWith("#") ? val : `#${val}`;
}

/**
 * Render a drawing shape (e.g. rectangle, oval, connector) as an SVG string.
 */
export function renderShape(options: RenderShapeOptions): string {
  const { shape, bounds, warnings, colorScheme } = options;

  // Skip if no bounds
  if (bounds.width <= 0 || bounds.height <= 0) {
    return "";
  }

  const { x, y, width, height } = bounds;
  const preset = shape.prstGeom ?? "rect";

  // Generate geometry path using shared DrawingML renderer
  const path = renderShapeGeometryPath({ preset, width, height, warnings });

  // TODO: When XlsxShape gains spPr, resolve fill/stroke from shape properties.
  // For now, derive defaults from the workbook's theme color scheme.
  const fill = resolveThemeHex("lt2", colorScheme, "#D9D9D9");
  const stroke = resolveThemeHex("dk2", colorScheme, "#808080");
  const strokeWidth = 1;
  const textColor = resolveThemeHex("dk1", colorScheme, "#000000");

  const elements: string[] = [];

  // Shape path
  elements.push(
    `<path d="${path}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" transform="translate(${x}, ${y})"/>`,
  );

  // Add text content if present
  if (shape.txBody) {
    const textX = x + width / 2;
    const textY = y + height / 2;
    elements.push(
      `<text x="${textX}" y="${textY}" text-anchor="middle" dominant-baseline="middle" font-size="11" font-family="Calibri, sans-serif" fill="${textColor}">${escapeXmlAttr(shape.txBody)}</text>`,
    );
  }

  return `<g class="shape">${elements.join("")}</g>`;
}
