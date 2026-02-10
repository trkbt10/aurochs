/**
 * @file IconButton primitive component
 *
 * A button that displays an icon, optionally with a label.
 * When label is omitted, renders as a square icon-only button.
 */

import { type ReactNode, type CSSProperties, type MouseEvent } from "react";
import type { ButtonVariant } from "../types";
import { colorTokens, radiusTokens, fontTokens } from "../design-tokens";

export type IconButtonSize = "sm" | "md" | "lg";

export type IconButtonProps = {
  readonly icon: ReactNode;
  readonly label?: string;
  readonly onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  readonly variant?: ButtonVariant;
  readonly size?: IconButtonSize;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly style?: CSSProperties;
};

const baseStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
  fontWeight: fontTokens.weight.medium,
  fontFamily: "inherit",
  border: "none",
  cursor: "pointer",
  transition: "all 150ms ease",
  outline: "none",
};

const sizeStyles: Record<IconButtonSize, CSSProperties> = {
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

const iconOnlySizeStyles: Record<IconButtonSize, CSSProperties> = {
  sm: {
    padding: "4px",
    width: "28px",
    height: "28px",
  },
  md: {
    padding: "6px",
    width: "32px",
    height: "32px",
  },
  lg: {
    padding: "8px",
    width: "40px",
    height: "40px",
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
  outline: {
    color: `var(--text-secondary, ${colorTokens.text.secondary})`,
    backgroundColor: "transparent",
    border: `1px solid var(--border-strong, ${colorTokens.border.strong})`,
  },
};

const disabledStyle: CSSProperties = {
  opacity: 0.5,
  cursor: "not-allowed",
};

/**
 * Icon button primitive. Renders a square button when label is omitted,
 * or a standard button with icon and label text when label is provided.
 */
export function IconButton({
  icon,
  label,
  onClick,
  variant = "ghost",
  size = "md",
  disabled,
  className,
  style,
}: IconButtonProps) {
  const isIconOnly = !label;
  const sizeStyle = isIconOnly ? iconOnlySizeStyles[size] : sizeStyles[size];

  const combinedStyle: CSSProperties = {
    ...baseStyle,
    ...variantStyles[variant],
    ...sizeStyle,
    borderRadius: isIconOnly ? radiusTokens.sm : radiusTokens.md,
    ...(disabled ? disabledStyle : {}),
    ...style,
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={combinedStyle}
      aria-label={label || undefined}
    >
      {icon}
      {label && <span>{label}</span>}
    </button>
  );
}
