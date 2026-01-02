/**
 * @file ColorSwatch component
 *
 * A small color preview square for color pickers and fill editors.
 * Displays transparency with a checkerboard pattern.
 */

import { useCallback, type CSSProperties } from "react";

export type ColorSwatchSize = "sm" | "md" | "lg";

export type ColorSwatchProps = {
  /** Color to display (hex string without #, e.g., "FF0000") */
  readonly color: string;
  /** Alpha/opacity value (0-1), shows checkerboard when < 1 */
  readonly alpha?: number;
  /** Size variant */
  readonly size?: ColorSwatchSize;
  /** Click handler for interactive swatches */
  readonly onClick?: () => void;
  /** Selected state (shows highlight border) */
  readonly selected?: boolean;
  /** Disable interaction */
  readonly disabled?: boolean;
  /** Additional CSS class */
  readonly className?: string;
  /** Inline style overrides */
  readonly style?: CSSProperties;
};

const sizeMap: Record<ColorSwatchSize, number> = {
  sm: 16,
  md: 24,
  lg: 32,
};

const checkerboardPattern = [
  "linear-gradient(45deg, #808080 25%, transparent 25%)",
  "linear-gradient(-45deg, #808080 25%, transparent 25%)",
  "linear-gradient(45deg, transparent 75%, #808080 75%)",
  "linear-gradient(-45deg, transparent 75%, #808080 75%)",
].join(", ");

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

function getBorderStyle(selected: boolean): string {
  if (selected) {
    return "2px solid var(--accent-blue, #0070f3)";
  }
  return "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))";
}

const swatchContainerStyle = (
  size: number,
  hasOnClick: boolean,
  disabled: boolean,
  selected: boolean
): CSSProperties => ({
  position: "relative",
  width: `${size}px`,
  height: `${size}px`,
  borderRadius: "4px",
  overflow: "hidden",
  cursor: hasOnClick && !disabled ? "pointer" : "default",
  border: getBorderStyle(selected),
  boxSizing: "border-box",
  opacity: disabled ? 0.5 : 1,
  transition: "border-color 150ms ease, box-shadow 150ms ease",
  flexShrink: 0,
});

const checkerboardLayerStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  backgroundImage: checkerboardPattern,
  backgroundSize: "8px 8px",
  backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
  backgroundColor: "#ffffff",
};

const colorLayerStyle = (color: string, alpha: number): CSSProperties => ({
  position: "absolute",
  inset: 0,
  backgroundColor: `rgba(${hexToRgb(color)}, ${alpha})`,
});

/**
 * A color swatch component displaying a color preview square.
 */
export function ColorSwatch({
  color,
  alpha = 1,
  size = "md",
  onClick,
  selected = false,
  disabled,
  className,
  style,
}: ColorSwatchProps) {
  const sizeValue = sizeMap[size];
  const showCheckerboard = alpha < 1;

  const handleClick = useCallback(() => {
    if (!disabled && onClick) {
      onClick();
    }
  }, [disabled, onClick]);

  return (
    <div
      style={{
        ...swatchContainerStyle(sizeValue, !!onClick, disabled ?? false, selected),
        ...style,
      }}
      className={className}
      onClick={handleClick}
      role={onClick ? "button" : undefined}
    >
      {showCheckerboard && <div style={checkerboardLayerStyle} />}
      <div style={colorLayerStyle(color, alpha)} />
    </div>
  );
}
