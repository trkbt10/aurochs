/**
 * @file Picture renderer for XLSX drawings
 *
 * Renders XlsxPicture elements to SVG.
 */

import type { XlsxPicture } from "@aurochs-office/xlsx/domain/drawing/types";
import type { DrawingBounds } from "../drawing-layout";
import type { WarningsCollector } from "../types";

// =============================================================================
// Types
// =============================================================================

/**
 * Image resolver function type.
 * Returns a data URI or path for the given relationship ID.
 */
export type ImageResolver = (relId: string) => string | undefined;

/**
 * Options for rendering a picture.
 */
export type RenderPictureOptions = {
  /** The picture element to render */
  readonly picture: XlsxPicture;
  /** Calculated pixel bounds */
  readonly bounds: DrawingBounds;
  /** Function to resolve image relationship ID to data URI */
  readonly resolveImage?: ImageResolver;
  /** Warnings collector */
  readonly warnings?: WarningsCollector;
};

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

/**
 * Render a picture element to SVG.
 *
 * @param options - Render options
 * @returns SVG string for the picture
 */
export function renderPicture(options: RenderPictureOptions): string {
  const { picture, bounds, resolveImage, warnings } = options;

  // Skip if no bounds
  if (bounds.width <= 0 || bounds.height <= 0) {
    return "";
  }

  // Resolve image source
  let href: string | undefined;

  if (picture.imagePath) {
    // Already resolved path (data URI or path)
    href = picture.imagePath;
  } else if (picture.blipRelId && resolveImage) {
    // Resolve from relationship
    href = resolveImage(picture.blipRelId);
  }

  if (!href) {
    warnings?.add(`Image not found: ${picture.nvPicPr.name || picture.blipRelId || "unknown"}`);
    return renderPlaceholder(bounds, picture.nvPicPr.name);
  }

  // Build SVG image element
  const name = picture.nvPicPr.name;
  const title = name ? `<title>${escapeXmlAttr(name)}</title>` : "";

  return `<image x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" href="${escapeXmlAttr(href)}" preserveAspectRatio="none">${title}</image>`;
}

/**
 * Render a placeholder when image is not available.
 */
function renderPlaceholder(bounds: DrawingBounds, name?: string): string {
  const { x, y, width, height } = bounds;

  // Draw a gray rectangle with an X
  const parts = [
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="#f0f0f0" stroke="#ccc" stroke-width="1"/>`,
    `<line x1="${x}" y1="${y}" x2="${x + width}" y2="${y + height}" stroke="#ccc" stroke-width="1"/>`,
    `<line x1="${x + width}" y1="${y}" x2="${x}" y2="${y + height}" stroke="#ccc" stroke-width="1"/>`,
  ];

  // Add name text if available
  if (name && width > 40 && height > 20) {
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    parts.push(
      `<text x="${centerX}" y="${centerY}" text-anchor="middle" dominant-baseline="middle" font-size="10" fill="#999">${escapeXmlAttr(name)}</text>`,
    );
  }

  return `<g class="picture-placeholder">${parts.join("")}</g>`;
}
