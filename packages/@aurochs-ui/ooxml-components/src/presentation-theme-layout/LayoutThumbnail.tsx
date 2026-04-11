/**
 * @file Layout thumbnail component
 *
 * Renders a slide layout as an SVG thumbnail for preview.
 * Uses renderSlideSvg output for accurate layout rendering,
 * falling back to wireframe rendering when SVG is not available.
 */

import { useMemo, type CSSProperties, type ReactNode } from "react";
import type { SlideSize, Shape, SpShape } from "@aurochs-office/pptx/domain";
import { parseSvgString, svgChildrenToJsx } from "@aurochs-renderer/svg";

// =============================================================================
// Types
// =============================================================================

export type LayoutThumbnailProps = {
  /** Layout shapes to render (used for wireframe fallback) */
  readonly shapes: readonly Shape[];
  /** SVG string from renderSlideSvg */
  readonly svg?: string;
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

const svgStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "block",
};

// =============================================================================
// Placeholder Type Labels (for wireframe fallback)
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
 * Render layout as thumbnail.
 *
 * Uses SVG from renderSlideSvg when available, falls back to wireframe rendering.
 */
export function LayoutThumbnail({ shapes, svg, slideSize, width = 80, height, className, style }: LayoutThumbnailProps) {
  const aspectRatio = (slideSize.width as number) / (slideSize.height as number);
  const finalHeight = height ?? width / aspectRatio;

  const viewBox = `0 0 ${slideSize.width} ${slideSize.height}`;

  // Parse SVG string into React elements when available
  const svgContent = useMemo(() => {
    if (!svg) {
      return null;
    }
    const root = parseSvgString(svg);
    if (root === null) {
      return null;
    }
    return svgChildrenToJsx(root.children, "layout");
  }, [svg]);

  if (svgContent) {
    return (
      <div className={className} style={{ ...containerStyle, width, height: finalHeight, ...style }}>
        <svg
          style={svgStyle}
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
        >
          {svgContent}
        </svg>
      </div>
    );
  }

  // Fallback: wireframe rendering
  return <LayoutThumbnailWireframe shapes={shapes} slideSize={slideSize} width={width} height={finalHeight} className={className} style={style} />;
}

// =============================================================================
// Wireframe Fallback (renders React elements directly)
// =============================================================================

function LayoutThumbnailWireframe({
  shapes,
  slideSize,
  width,
  height,
  className,
  style,
}: {
  shapes: readonly Shape[];
  slideSize: SlideSize;
  width: number;
  height: number;
  className?: string;
  style?: CSSProperties;
}) {
  const svgContent = useMemo(() => {
    return renderWireframeLayout(shapes, slideSize);
  }, [shapes, slideSize]);

  const viewBox = `0 0 ${slideSize.width} ${slideSize.height}`;

  return (
    <div className={className} style={{ ...containerStyle, width, height, ...style }}>
      <svg
        width="100%"
        height="100%"
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
      >
        {svgContent}
      </svg>
    </div>
  );
}

/**
 * Render shapes as wireframe boxes (React elements).
 */
function renderWireframeLayout(shapes: readonly Shape[], slideSize: SlideSize): ReactNode {
  const w = slideSize.width as number;
  const h = slideSize.height as number;

  const background = <rect key="bg" width={w} height={h} fill="#fafafa" />;

  if (shapes.length === 0) {
    const textSize = Math.min(w, h) * 0.06;
    return (
      <>
        {background}
        <text
          key="empty"
          x={w / 2}
          y={h / 2}
          fontSize={textSize}
          fill="#ccc"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          Empty
        </text>
      </>
    );
  }

  const shapeElements = shapes.map((shape, i) => renderShapeWireframe(shape, slideSize, i));

  return (
    <>
      {background}
      {shapeElements}
    </>
  );
}

/**
 * Render a single shape as wireframe.
 */
function renderShapeWireframe(shape: Shape, slideSize: SlideSize, index: number): ReactNode {
  if (shape.type !== "sp") {
    return null;
  }

  const sp = shape as SpShape;
  const xform = sp.properties?.transform;
  if (!xform) {
    return null;
  }

  const x = xform.x as number;
  const y = xform.y as number;
  const w = xform.width as number;
  const h = xform.height as number;

  // Skip very small shapes (like slide numbers)
  const minSize = Math.min(slideSize.width as number, slideSize.height as number) * 0.05;
  if (w < minSize && h < minSize) {
    return null;
  }

  // Get placeholder type
  const phType = sp.placeholder?.type ?? "";
  const label = PLACEHOLDER_LABELS[phType] ?? "";

  // Choose color based on placeholder type
  const color = getPlaceholderColor(phType);
  const textSize = Math.min(w, h) * 0.25;
  const showLabel = label && textSize > 8;

  return (
    <g key={`shape-${index}`}>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill={`${color}10`}
        stroke={color}
        strokeWidth={2}
        strokeDasharray="4,2"
      />
      {showLabel && (
        <text
          x={x + w / 2}
          y={y + h / 2}
          fontSize={textSize}
          fill={color}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="system-ui"
        >
          {label}
        </text>
      )}
    </g>
  );
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
