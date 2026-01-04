/**
 * @file FieldGroup layout component
 *
 * A labeled group for form fields with Figma-style compact layout.
 * Supports inline (single-line) and stacked layouts.
 */

import { type ReactNode, type CSSProperties } from "react";

export type FieldGroupProps = {
  readonly label: string;
  readonly children: ReactNode;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly hint?: string;
  /**
   * Inline layout: label on left, content on right (single line).
   * Use for simple inputs like X, Y, Width, Height.
   */
  readonly inline?: boolean;
  /**
   * Label width for inline layout (default: 40px).
   * Helps align labels in adjacent fields.
   */
  readonly labelWidth?: number | string;
};

// =============================================================================
// Stacked Layout Styles (default)
// =============================================================================

const stackedContainerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const stackedLabelStyle: CSSProperties = {
  fontSize: "11px",
  fontWeight: 500,
  color: "var(--text-tertiary, #737373)",
  lineHeight: 1.2,
};

const stackedContentStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

// =============================================================================
// Inline Layout Styles (Figma-style single line)
// =============================================================================

const inlineContainerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  minHeight: "28px",
};

const inlineLabelStyle = (width?: number | string): CSSProperties => ({
  fontSize: "11px",
  fontWeight: 500,
  color: "var(--text-tertiary, #737373)",
  flexShrink: 0,
  width: width ?? 40,
  minWidth: width ?? 40,
});

const inlineContentStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
};

// =============================================================================
// Shared Styles
// =============================================================================

const hintStyle: CSSProperties = {
  fontSize: "10px",
  color: "var(--text-tertiary, #737373)",
  opacity: 0.8,
};

// =============================================================================
// Component
// =============================================================================

/**
 * Labeled group of related fields.
 */
export function FieldGroup({
  label,
  children,
  className,
  style,
  hint,
  inline = false,
  labelWidth,
}: FieldGroupProps) {
  if (inline) {
    return (
      <div style={{ ...inlineContainerStyle, ...style }} className={className}>
        <span style={inlineLabelStyle(labelWidth)}>{label}</span>
        <div style={inlineContentStyle}>{children}</div>
        {hint && <span style={hintStyle}>{hint}</span>}
      </div>
    );
  }

  return (
    <div style={{ ...stackedContainerStyle, ...style }} className={className}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
        <span style={stackedLabelStyle}>{label}</span>
        {hint && <span style={hintStyle}>{hint}</span>}
      </div>
      <div style={stackedContentStyle}>{children}</div>
    </div>
  );
}
