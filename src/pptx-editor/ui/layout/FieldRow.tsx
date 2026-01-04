/**
 * @file FieldRow layout component
 *
 * A horizontal row for multiple form fields.
 */

import { type ReactNode, type CSSProperties } from "react";

export type FieldRowProps = {
  readonly children: ReactNode;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly gap?: number;
};

const rowStyle = (gap: number): CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: `${gap}px`,
});

/**
 * Horizontal row for grouping fields.
 */
export function FieldRow({
  children,
  className,
  style,
  gap = 8,
}: FieldRowProps) {
  return (
    <div style={{ ...rowStyle(gap), ...style }} className={className}>
      {children}
    </div>
  );
}
