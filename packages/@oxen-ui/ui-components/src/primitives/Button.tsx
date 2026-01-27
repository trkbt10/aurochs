/**
 * @file Button primitive component
 *
 * A minimal button component with variant and size support.
 */

import { type ReactNode, type CSSProperties, type MouseEvent } from "react";
import type { ButtonVariant } from "../types";
import { colorTokens, radiusTokens, fontTokens } from "../design-tokens";

export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = {
  readonly children: ReactNode;
  readonly onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly type?: "button" | "submit" | "reset";
  readonly title?: string;
};

const baseStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: fontTokens.weight.medium,
  fontFamily: "inherit",
  borderRadius: `var(--radius-sm, ${radiusTokens.sm})`,
  border: "none",
  cursor: "pointer",
  transition: "all 150ms ease",
  outline: "none",
};

const sizeStyles: Record<ButtonSize, CSSProperties> = {
  sm: {
    padding: "4px 8px",
    fontSize: fontTokens.size.xs,
  },
  md: {
    padding: "6px 12px",
    fontSize: fontTokens.size.sm,
  },
  lg: {
    padding: "8px 16px",
    fontSize: fontTokens.size.lg,
  },
};

const variantStyles: Record<ButtonVariant, CSSProperties> = {
  primary: {
    color: colorTokens.text.inverse,
    backgroundColor: `var(--accent-primary, ${colorTokens.accent.primary})`,
  },
  secondary: {
    color: `var(--text-primary, ${colorTokens.text.primary})`,
    backgroundColor: `var(--bg-tertiary, ${colorTokens.background.tertiary})`,
    border: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
  },
  ghost: {
    color: `var(--text-secondary, ${colorTokens.text.secondary})`,
    backgroundColor: "transparent",
  },
};

const disabledStyle: CSSProperties = {
  opacity: 0.5,
  cursor: "not-allowed",
};

/**
 * Button primitive with variants and sizes.
 */
export function Button({
  children,
  onClick,
  variant = "secondary",
  size = "md",
  disabled,
  className,
  style,
  type = "button",
  title,
}: ButtonProps) {
  const combinedStyle: CSSProperties = {
    ...baseStyle,
    ...sizeStyles[size],
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
      title={title}
    >
      {children}
    </button>
  );
}
