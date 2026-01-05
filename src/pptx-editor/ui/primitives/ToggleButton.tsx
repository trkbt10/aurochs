/**
 * @file ToggleButton primitive component
 *
 * A button-style toggle for compact on/off states.
 */

import { useCallback, type CSSProperties } from "react";
import { colorTokens, fontTokens, radiusTokens } from "../design-tokens";

export type ToggleButtonProps = {
  readonly pressed: boolean;
  readonly onChange: (pressed: boolean) => void;
  readonly label: string;
  readonly ariaLabel?: string;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly style?: CSSProperties;
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
  border: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
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
}: ToggleButtonProps) {
  const handleClick = useCallback(() => {
    if (!disabled) {
      onChange(!pressed);
    }
  }, [disabled, onChange, pressed]);

  const combinedStyle: CSSProperties = {
    ...baseStyle,
    ...(pressed ? pressedStyle : {}),
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
      aria-pressed={pressed}
      aria-label={ariaLabel ?? label}
    >
      {label}
    </button>
  );
}
