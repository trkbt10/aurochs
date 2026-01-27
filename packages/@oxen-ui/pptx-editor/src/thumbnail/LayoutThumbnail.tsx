/**
 * @file Layout thumbnail component
 *
 * Renders a slide layout as an SVG wireframe thumbnail for preview.
 * Shows placeholder shapes as labeled boxes.
 */

import { useMemo, type CSSProperties } from "react";
import type { SlideSize, Shape, SpShape } from "@oxen/pptx/domain";

// =============================================================================
// Types
// =============================================================================

export type LayoutThumbnailProps = {
  /** Layout shapes to render */
  readonly shapes: readonly Shape[];
  /** Slide size for viewBox */
  readonly slideSize: SlideSize;
  /** Thumbnail width in pixels */
  readonly width?: number;
  /** Thumbnail height in pixels */
  readonly height?: number;
  /** CSS class */
  readonly className?: string;
  /** CSS style */
  readonly style?: CSSProperties;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  backgroundColor: "#fff",
  borderRadius: "2px",
  border: "1px solid var(--border-subtle, #333)",
};

// =============================================================================
// Placeholder Type Labels
// =============================================================================

const PLACEHOLDER_LABELS: Record<string, string> = {
  title: "Title",
  ctrTitle: "Title",
  subTitle: "Subtitle",
  body: "Body",
  obj: "Content",
  chart: "Chart",
  tbl: "Table",
  clipArt: "Clip Art",
  dgm: "Diagram",
  media: "Media",
  sldNum: "#",
  dt: "Date",
  ftr: "Footer",
  hdr: "Header",
  sldImg: "Image",
  pic: "Picture",
};

// =============================================================================
// Component
// =============================================================================

/**
 * Render layout shapes as wireframe thumbnail.
 *
 * Shows placeholder shapes as labeled boxes for quick identification.
 */
export function LayoutThumbnail({
  shapes,
  slideSize,
  width = 80,
  height,
  className,
  style,
}: LayoutThumbnailProps) {
  const aspectRatio = (slideSize.width as number) / (slideSize.height as number);
  const finalHeight = height ?? width / aspectRatio;

  const svgContent = useMemo(() => {
    return renderWireframeLayout(shapes, slideSize);
  }, [shapes, slideSize]);

  const viewBox = `0 0 ${slideSize.width} ${slideSize.height}`;

  return (
    <div
      className={className}
      style={{ ...containerStyle, width, height: finalHeight, ...style }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    </div>
  );
}

/**
 * Render shapes as wireframe boxes.
 */
function renderWireframeLayout(shapes: readonly Shape[], slideSize: SlideSize): string {
  const w = slideSize.width as number;
  const h = slideSize.height as number;

  const background = `<rect width="${w}" height="${h}" fill="#fafafa"/>`;

  if (shapes.length === 0) {
    const textSize = Math.min(w, h) * 0.06;
    const emptyLabel = `<text x="${w / 2}" y="${h / 2}" font-size="${textSize}" fill="#ccc" text-anchor="middle" dominant-baseline="middle">Empty</text>`;
    return background + emptyLabel;
  }

  const shapesSvg = shapes.map((shape) => renderShapeWireframe(shape, slideSize)).join("");
  return background + shapesSvg;
}

/**
 * Render a single shape as wireframe.
 */
function renderShapeWireframe(shape: Shape, slideSize: SlideSize): string {
  if (shape.type !== "sp") {
    return "";
  }

  const sp = shape as SpShape;
  const xform = sp.properties?.transform;
  if (!xform) {
    return "";
  }

  const x = xform.x as number;
  const y = xform.y as number;
  const w = xform.width as number;
  const h = xform.height as number;

  // Skip very small shapes (like slide numbers)
  const minSize = Math.min(slideSize.width as number, slideSize.height as number) * 0.05;
  if (w < minSize && h < minSize) {
    return "";
  }

  // Get placeholder type
  const phType = sp.placeholder?.type ?? "";
  const label = PLACEHOLDER_LABELS[phType] ?? "";

  // Choose color based on placeholder type
  const color = getPlaceholderColor(phType);
  const textSize = Math.min(w, h) * 0.25;

  const rect = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}10" stroke="${color}" stroke-width="2" stroke-dasharray="4,2"/>`;
  const labelSvg = buildLabelSvg(label, textSize, x + w / 2, y + h / 2, color);
  return rect + labelSvg;
}

function buildLabelSvg(label: string, textSize: number, cx: number, cy: number, color: string): string {
  const showLabel = label && textSize > 8;
  if (!showLabel) {
    return "";
  }
  return `<text x="${cx}" y="${cy}" font-size="${textSize}" fill="${color}" text-anchor="middle" dominant-baseline="middle" font-family="system-ui">${label}</text>`;
}

/**
 * Get color for placeholder type.
 */
function getPlaceholderColor(phType: string): string {
  switch (phType) {
    case "title":
    case "ctrTitle":
      return "#2563eb"; // blue
    case "subTitle":
      return "#7c3aed"; // violet
    case "body":
      return "#059669"; // green
    case "obj":
    case "chart":
    case "tbl":
    case "dgm":
      return "#d97706"; // amber
    case "pic":
    case "clipArt":
    case "media":
      return "#dc2626"; // red
    default:
      return "#6b7280"; // gray
  }
}
