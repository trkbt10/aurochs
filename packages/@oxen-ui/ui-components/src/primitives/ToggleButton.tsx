/**
 * @file ToggleButton primitive component
 *
 * A button-style toggle for compact on/off states.
 */

import { useCallback, type CSSProperties, type ReactNode } from "react";
import { colorTokens, fontTokens, radiusTokens } from "../design-tokens";

export type ToggleButtonProps = {
  readonly pressed: boolean;
  readonly onChange: (pressed: boolean) => void;
  /** Text label (displayed if no children provided, always used for aria-label) */
  readonly label: string;
  readonly ariaLabel?: string;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly style?: CSSProperties;
  /** Show mixed indicator (for multi-selection with differing values) */
  readonly mixed?: boolean;
  /** Custom content (icon, etc.) - if provided, replaces label text */
  readonly children?: ReactNode;
};

const baseStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "28px",
  height: "28px",
  padding: "0 8px",
  fontSize: fontTokens.size.md,
  fontWeight: fontTokens.weight.semibold,
  fontFamily: "inherit",
  borderRadius: `var(--radius-sm, ${radiusTokens.sm})`,
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: `var(--border-subtle, ${colorTokens.border.subtle})`,
  backgroundColor: `var(--bg-tertiary, ${colorTokens.background.tertiary})`,
  color: `var(--text-secondary, ${colorTokens.text.secondary})`,
  cursor: "pointer",
  transition: "all 150ms ease",
  userSelect: "none",
};

const pressedStyle: CSSProperties = {
  backgroundColor: `var(--accent-secondary, ${colorTokens.accent.secondary})`,
  borderColor: `var(--accent-secondary, ${colorTokens.accent.secondary})`,
  color: `var(--text-inverse, ${colorTokens.text.inverse})`,
};

const disabledStyle: CSSProperties = {
  opacity: 0.5,
  cursor: "not-allowed",
};

const mixedStyle: CSSProperties = {
  backgroundColor: `var(--bg-tertiary, ${colorTokens.background.tertiary})`,
  borderStyle: "dashed",
  color: `var(--text-tertiary, ${colorTokens.text.tertiary})`,
};

/**
 * Toggle button with pressed state styling.
 */
export function ToggleButton({
  pressed,
  onChange,
  label,
  ariaLabel,
  disabled,
  className,
  style,
  mixed,
  children,
}: ToggleButtonProps) {
  const handleClick = useCallback(() => {
    if (!disabled) {
      // When mixed, clicking always sets to true
      onChange(mixed ? true : !pressed);
    }
  }, [disabled, onChange, pressed, mixed]);

  const combinedStyle: CSSProperties = {
    ...baseStyle,
    ...(mixed ? mixedStyle : pressed ? pressedStyle : {}),
    ...(disabled ? disabledStyle : {}),
    ...style,
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={className}
      style={combinedStyle}
      aria-pressed={mixed ? "mixed" : pressed}
      aria-label={ariaLabel ?? label}
    >
      {children ?? label}
    </button>
  );
}
