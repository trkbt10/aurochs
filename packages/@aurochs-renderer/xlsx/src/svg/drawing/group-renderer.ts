/**
 * @file Group renderer for XLSX drawings
 *
 * Renders XlsxGroupShape elements to SVG with recursive child rendering.
 */

import type { XlsxGroupShape, XlsxDrawingContent, XlsxGroupTransform } from "@aurochs-office/xlsx/domain/drawing/types";
import type { DrawingBounds } from "../drawing-layout";
import { emuToPixels } from "../drawing-layout";
import type { WarningsCollector } from "../types";

// =============================================================================
// Types
// =============================================================================

/**
 * Content renderer function type.
 * Used to render child content recursively.
 */
export type ContentRenderer = (content: XlsxDrawingContent, bounds: DrawingBounds) => string;

/**
 * Options for rendering a group shape.
 */
export type RenderGroupShapeOptions = {
  /** The group shape element to render */
  readonly group: XlsxGroupShape;
  /** Calculated pixel bounds for the group */
  readonly bounds: DrawingBounds;
  /** Function to render child content */
  readonly renderContent: ContentRenderer;
  /** Warnings collector */
  readonly warnings?: WarningsCollector;
};

// =============================================================================
// Transform Calculation
// =============================================================================

/**
 * Calculate child bounds within a group.
 *
 * Group shapes define a coordinate space transformation:
 * - (x, y, cx, cy) = the bounds of the group in parent coordinates
 * - (chOffX, chOffY, chExtCx, chExtCy) = the child coordinate space
 *
 * Child elements are positioned in child coordinates and need to be
 * mapped to parent coordinates.
 */
function _calculateChildBounds(
  childBoundsEmu: DrawingBounds,
  groupTransform: XlsxGroupTransform | undefined,
  groupBounds: DrawingBounds,
): DrawingBounds {
  if (!groupTransform) {
    // No transform - position relative to group origin
    return {
      x: groupBounds.x + childBoundsEmu.x,
      y: groupBounds.y + childBoundsEmu.y,
      width: childBoundsEmu.width,
      height: childBoundsEmu.height,
    };
  }

  // Calculate scale factors
  const scaleX = groupTransform.chExtCx > 0 ? groupBounds.width / emuToPixels(groupTransform.chExtCx) : 1;
  const scaleY = groupTransform.chExtCy > 0 ? groupBounds.height / emuToPixels(groupTransform.chExtCy) : 1;

  // Map child coordinates to group coordinates
  const offsetX = childBoundsEmu.x - emuToPixels(groupTransform.chOffX);
  const offsetY = childBoundsEmu.y - emuToPixels(groupTransform.chOffY);

  return {
    x: groupBounds.x + offsetX * scaleX,
    y: groupBounds.y + offsetY * scaleY,
    width: childBoundsEmu.width * scaleX,
    height: childBoundsEmu.height * scaleY,
  };
}

/**
 * Build SVG transform attribute from group transform.
 */
function _buildGroupTransformAttr(
  transform: XlsxGroupTransform | undefined,
  bounds: DrawingBounds,
): string {
  const transforms: string[] = [];

  // Apply translation
  transforms.push(`translate(${bounds.x}, ${bounds.y})`);

  if (transform) {
    // Apply rotation (convert from 60000ths of a degree)
    if (transform.rot) {
      const degrees = transform.rot / 60000;
      const cx = bounds.width / 2;
      const cy = bounds.height / 2;
      transforms.push(`rotate(${degrees}, ${cx}, ${cy})`);
    }

    // Apply flips
    if (transform.flipH) {
      transforms.push(`translate(${bounds.width}, 0) scale(-1, 1)`);
    }
    if (transform.flipV) {
      transforms.push(`translate(0, ${bounds.height}) scale(1, -1)`);
    }
  }

  return transforms.join(" ");
}

// =============================================================================
// Rendering
// =============================================================================

/**
 * Render a group shape element to SVG.
 *
 * @param options - Render options
 * @returns SVG string for the group
 */
export function renderGroupShape(options: RenderGroupShapeOptions): string {
  const { group, bounds, renderContent } = options;

  // Skip if no bounds
  if (bounds.width <= 0 || bounds.height <= 0) {
    return "";
  }

  // Skip if no children
  if (group.children.length === 0) {
    return "";
  }

  const childElements: string[] = [];

  // Render each child
  for (const child of group.children) {
    // For group children, we need to get their bounds from their own transform/position
    // This is a simplified approach - real implementation would extract bounds from each child type
    const childBounds = getChildContentBounds(child, group.transform, bounds);
    const childSvg = renderContent(child, childBounds);
    if (childSvg) {
      childElements.push(childSvg);
    }
  }

  if (childElements.length === 0) {
    return "";
  }

  const name = group.nvGrpSpPr.name;
  const title = name ? `<title>${escapeXmlAttr(name)}</title>` : "";

  return `<g class="group-shape" transform="translate(${bounds.x}, ${bounds.y})">${title}${childElements.join("")}</g>`;
}

/**
 * Get bounds for a child content element.
 * This is a placeholder - actual implementation would extract bounds from each child type.
 */
function getChildContentBounds(
  child: XlsxDrawingContent,
  _groupTransform: XlsxGroupTransform | undefined,
  groupBounds: DrawingBounds,
): DrawingBounds {
  // For now, distribute children evenly within the group
  // Real implementation would use child's own positioning information

  // This is a simplified approach - in practice, child shapes have their own
  // xfrm (transform) that defines their position within the group's coordinate space

  return {
    x: 0,
    y: 0,
    width: groupBounds.width,
    height: groupBounds.height,
  };
}

/**
 * Escape XML special characters.
 */
function escapeXmlAttr(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
