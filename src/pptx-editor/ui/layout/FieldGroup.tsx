/**
 * @file FieldGroup layout component
 *
 * A labeled group for form fields.
 */

import { type ReactNode, type CSSProperties } from "react";

export type FieldGroupProps = {
  readonly label: string;
  readonly children: ReactNode;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly hint?: string;
};

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const labelStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 500,
  color: "var(--text-secondary, #a1a1a1)",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const hintStyle: CSSProperties = {
  fontSize: "11px",
  color: "var(--text-tertiary, #737373)",
};

const contentStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};






export function FieldGroup({
  label,
  children,
  className,
  style,
  hint,
}: FieldGroupProps) {
  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      <div>
        <span style={labelStyle}>{label}</span>
        {hint && <span style={hintStyle}> — {hint}</span>}
      </div>
      <div style={contentStyle}>{children}</div>
    </div>
  );
}
