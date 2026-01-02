/**
 * @file Button primitive component
 *
 * A minimal button component with variant support.
 */

import { type ReactNode, type CSSProperties, type MouseEvent } from "react";
import type { ButtonVariant } from "../../types";

export type ButtonProps = {
  readonly children: ReactNode;
  readonly onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  readonly variant?: ButtonVariant;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly type?: "button" | "submit" | "reset";
};

const baseStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "6px 12px",
  fontSize: "13px",
  fontWeight: 500,
  fontFamily: "inherit",
  borderRadius: "var(--radius-sm, 6px)",
  border: "none",
  cursor: "pointer",
  transition: "all 150ms ease",
  outline: "none",
};

const variantStyles: Record<ButtonVariant, CSSProperties> = {
  primary: {
    color: "#000000",
    backgroundColor: "var(--accent-primary, #ffffff)",
  },
  secondary: {
    color: "var(--text-primary, #fafafa)",
    backgroundColor: "var(--bg-tertiary, #111111)",
    border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
  },
  ghost: {
    color: "var(--text-secondary, #a1a1a1)",
    backgroundColor: "transparent",
  },
};

const disabledStyle: CSSProperties = {
  opacity: 0.5,
  cursor: "not-allowed",
};






export function Button({
  children,
  onClick,
  variant = "secondary",
  disabled,
  className,
  style,
  type = "button",
}: ButtonProps) {
  const combinedStyle: CSSProperties = {
    ...baseStyle,
    ...variantStyles[variant],
    ...(disabled ? disabledStyle : {}),
    ...style,
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={combinedStyle}
    >
      {children}
    </button>
  );
}
