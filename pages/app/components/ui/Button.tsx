/**
 * @file Button components
 *
 * Shared button components with various styles.
 */

import type { CSSProperties, ReactNode, MouseEvent } from "react";

// =============================================================================
// Types
// =============================================================================

type ButtonVariant = "ghost" | "outline" | "primary" | "secondary";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  className?: string;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
};

type IconButtonProps = {
  icon: ReactNode;
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  className?: string;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
};

// =============================================================================
// Styles
// =============================================================================

const baseStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: 500,
  transition: "all 0.15s ease",
};

const variantStyles: Record<ButtonVariant, CSSProperties> = {
  ghost: {
    background: "none",
    color: "#a1a1a1",
  },
  outline: {
    background: "none",
    border: "1px solid #444",
    color: "#a1a1a1",
  },
  primary: {
    background: "#3b82f6",
    color: "#fff",
  },
  secondary: {
    background: "rgba(255, 255, 255, 0.1)",
    color: "rgba(255, 255, 255, 0.9)",
    backdropFilter: "blur(12px)",
  },
};

const sizeStyles: Record<ButtonSize, CSSProperties> = {
  sm: {
    padding: "4px 8px",
    fontSize: "12px",
  },
  md: {
    padding: "6px 12px",
    fontSize: "13px",
  },
  lg: {
    padding: "8px 16px",
    fontSize: "14px",
  },
};

const iconOnlySizeStyles: Record<ButtonSize, CSSProperties> = {
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

const disabledStyle: CSSProperties = {
  opacity: 0.5,
  cursor: "not-allowed",
};

// =============================================================================
// Components
// =============================================================================











export function Button({
  children,
  variant = "ghost",
  size = "md",
  disabled = false,
  className,
  onClick,
}: ButtonProps) {
  const style: CSSProperties = {
    ...baseStyle,
    ...variantStyles[variant],
    ...sizeStyles[size],
    ...(disabled ? disabledStyle : {}),
  };

  return (
    <button
      style={style}
      className={className}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}











export function IconButton({
  icon,
  label,
  variant = "ghost",
  size = "md",
  disabled = false,
  className,
  onClick,
}: IconButtonProps) {
  const isIconOnly = !label;
  const sizeStyle = isIconOnly ? iconOnlySizeStyles[size] : sizeStyles[size];

  const style: CSSProperties = {
    ...baseStyle,
    ...variantStyles[variant],
    ...sizeStyle,
    ...(disabled ? disabledStyle : {}),
    borderRadius: isIconOnly ? "4px" : "6px",
  };

  return (
    <button
      style={style}
      className={className}
      disabled={disabled}
      onClick={onClick}
      aria-label={label || undefined}
    >
      {icon}
      {label && <span>{label}</span>}
    </button>
  );
}
