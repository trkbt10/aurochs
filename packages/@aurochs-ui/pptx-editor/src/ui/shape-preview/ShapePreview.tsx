/**
 * @file ShapePreview component for rendering preset shape previews
 *
 * Renders a small preview of preset shapes using SVG.
 * Used in the shape selection dropdown.
 */

import { type CSSProperties, useMemo } from "react";
import { renderGeometryData } from "@aurochs-renderer/drawing-ml/svg";
import type { PresetGeometry } from "@aurochs-office/pptx/domain/shape";
import { colorTokens } from "@aurochs-ui/ui-components/design-tokens";

// =============================================================================
// Types
// =============================================================================

export type ShapePreviewProps = {
  /** Preset shape type name */
  readonly preset: string;
  /** Preview size in pixels */
  readonly size?: number;
  /** Fill color */
  readonly fillColor?: string;
  /** Stroke color */
  readonly strokeColor?: string;
  /** Additional CSS class */
  readonly className?: string;
  /** Additional styles */
  readonly style?: CSSProperties;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle = (size: number): CSSProperties => ({
  width: size,
  height: size,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
});

// =============================================================================
// Component
// =============================================================================

/**
 * Renders a preview of a preset shape.
 */
export function ShapePreview({
  preset,
  size = 24,
  fillColor = colorTokens.background.hover,
  strokeColor = colorTokens.text.secondary,
  className,
  style,
}: ShapePreviewProps) {
  // Create a PresetGeometry object
  const geometry: PresetGeometry = useMemo(
    () => ({
      type: "preset",
      preset,
      adjustValues: [],
    }),
    [preset],
  );

  // Calculate path data
  const pathData = useMemo(() => {
    try {
      // Use a slightly smaller size for padding
      const innerSize = size - 4;
      return renderGeometryData(geometry, innerSize, innerSize);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- error intentionally unused, unsupported preset falls back to empty
    } catch (error: unknown) {
      // Fallback to a simple rect if preset is not supported
      return "";
    }
  }, [geometry, size]);

  // If no valid path, render a placeholder rect
  const hasValidPath = pathData.length > 0;
  const innerSize = size - 4;

  function renderShapeElement() {
    if (hasValidPath) {
      return <path d={pathData} fill={fillColor} stroke={strokeColor} strokeWidth={1} />;
    }
    return (
      <rect x={0} y={0} width={innerSize} height={innerSize} fill={fillColor} stroke={strokeColor} strokeWidth={1} />
    );
  }

  return (
    <div className={className} style={{ ...containerStyle(size), ...style }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`translate(2, 2)`}>{renderShapeElement()}</g>
      </svg>
    </div>
  );
}
