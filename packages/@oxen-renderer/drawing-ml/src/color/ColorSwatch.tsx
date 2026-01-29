/**
 * @file Color swatch display component
 *
 * Visual component for displaying resolved colors.
 * Useful for testing and debugging color resolution.
 */

import { memo } from "react";
import type { Color } from "@oxen-office/ooxml/domain/color";
import { useColor, type ResolvedColorResult } from "./useColor";

/**
 * Format color info text for display.
 */
function formatColorInfo(resolved: ResolvedColorResult): string {
  if (!resolved.isResolved) {
    return "unresolved";
  }
  const alphaText = resolved.alpha < 1 ? ` (${Math.round(resolved.alpha * 100)}%)` : "";
  return `#${resolved.hex}${alphaText}`;
}

// =============================================================================
// Types
// =============================================================================

/**
 * Props for ColorSwatch component
 */
export type ColorSwatchProps = {
  /** Color to display */
  readonly color: Color | undefined;
  /** Size of the swatch in pixels (default: 24) */
  readonly size?: number;
  /** Whether to show color info label (default: false) */
  readonly showInfo?: boolean;
  /** CSS class name for the container */
  readonly className?: string;
  /** Whether to show checkerboard pattern for transparency (default: true) */
  readonly showTransparency?: boolean;
};

/**
 * Props for ColorSwatchDisplay component (internal)
 */
type ColorSwatchDisplayProps = {
  readonly resolved: ResolvedColorResult;
  readonly size: number;
  readonly showInfo: boolean;
  readonly showTransparency: boolean;
  readonly className?: string;
};

// =============================================================================
// Components
// =============================================================================

/**
 * Checkerboard pattern definition for transparency display
 */
function CheckerboardPattern({ id }: { readonly id: string }) {
  return (
    <pattern id={id} width="8" height="8" patternUnits="userSpaceOnUse">
      <rect width="4" height="4" fill="#ccc" />
      <rect x="4" y="4" width="4" height="4" fill="#ccc" />
      <rect x="4" width="4" height="4" fill="#fff" />
      <rect y="4" width="4" height="4" fill="#fff" />
    </pattern>
  );
}

/**
 * Internal display component that receives resolved color
 */
function ColorSwatchDisplay({
  resolved,
  size,
  showInfo,
  showTransparency,
  className,
}: ColorSwatchDisplayProps) {
  const patternId = `checkerboard-${Math.random().toString(36).slice(2, 9)}`;
  const hasTransparency = resolved.alpha < 1;

  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "4px",
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{
          border: "1px solid #ccc",
          borderRadius: "2px",
        }}
      >
        <defs>
          {showTransparency && hasTransparency && (
            <CheckerboardPattern id={patternId} />
          )}
        </defs>

        {/* Checkerboard background for transparency */}
        {showTransparency && hasTransparency && (
          <rect
            width={size}
            height={size}
            fill={`url(#${patternId})`}
          />
        )}

        {/* Color fill */}
        <rect
          width={size}
          height={size}
          fill={resolved.cssColor}
          fillOpacity={resolved.alpha}
        />

        {/* X mark for unresolved colors */}
        {!resolved.isResolved && (
          <g stroke="#999" strokeWidth="1">
            <line x1="4" y1="4" x2={size - 4} y2={size - 4} />
            <line x1={size - 4} y1="4" x2="4" y2={size - 4} />
          </g>
        )}
      </svg>

      {showInfo && (
        <span
          style={{
            fontSize: "10px",
            fontFamily: "monospace",
            color: "#666",
          }}
        >
          {formatColorInfo(resolved)}
        </span>
      )}
    </div>
  );
}

/**
 * Color swatch component for displaying resolved colors.
 *
 * @example
 * ```tsx
 * <ColorSwatch color={{ spec: { type: "srgb", value: "FF0000" } }} />
 * <ColorSwatch color={schemeColor} size={32} showInfo />
 * ```
 */
export const ColorSwatch = memo(function ColorSwatch({
  color,
  size = 24,
  showInfo = false,
  showTransparency = true,
  className,
}: ColorSwatchProps) {
  const resolved = useColor(color);

  return (
    <ColorSwatchDisplay
      resolved={resolved}
      size={size}
      showInfo={showInfo}
      showTransparency={showTransparency}
      className={className}
    />
  );
});

/**
 * Color swatch row for displaying multiple colors.
 *
 * @example
 * ```tsx
 * <ColorSwatchRow
 *   colors={[color1, color2, color3]}
 *   labels={["Primary", "Secondary", "Accent"]}
 * />
 * ```
 */
export type ColorSwatchRowProps = {
  /** Array of colors to display */
  readonly colors: readonly (Color | undefined)[];
  /** Optional labels for each color */
  readonly labels?: readonly string[];
  /** Size of each swatch */
  readonly size?: number;
  /** Gap between swatches */
  readonly gap?: number;
};

export const ColorSwatchRow = memo(function ColorSwatchRow({
  colors,
  labels,
  size = 24,
  gap = 8,
}: ColorSwatchRowProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: `${gap}px`,
        alignItems: "flex-start",
      }}
    >
      {colors.map((color, index) => (
        <div
          key={index}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <ColorSwatch color={color} size={size} showInfo />
          {labels?.[index] && (
            <span
              style={{
                fontSize: "11px",
                color: "#333",
              }}
            >
              {labels[index]}
            </span>
          )}
        </div>
      ))}
    </div>
  );
});
