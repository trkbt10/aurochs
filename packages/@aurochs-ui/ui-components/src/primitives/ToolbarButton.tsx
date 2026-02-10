/**
 * @file Toolbar button component
 *
 * Unified icon button for toolbars with hover and active state management.
 */

import { type CSSProperties, type MouseEvent, type ReactNode, useState, useCallback } from "react";
import { colorTokens, radiusTokens, iconTokens } from "../design-tokens";

export type ToolbarButtonSize = "tiny" | "sm" | "md" | "lg";

export type ToolbarButtonProps = {
  /** Pre-rendered icon element */
  readonly icon: ReactNode;
  /** Accessible label / tooltip */
  readonly label: string;
  /** Active/selected state */
  readonly active?: boolean;
  /** Disabled state */
  readonly disabled?: boolean;
  /** Click handler */
  readonly onClick: () => void;
  /** Button size variant */
  readonly size?: ToolbarButtonSize;
  /** Additional class name */
  readonly className?: string;
  /** Style overrides */
  readonly style?: CSSProperties;
};

const SIZE_MAP = {
  tiny: { button: 20, icon: 12 },
  sm: { button: 24, icon: iconTokens.size.sm },
  md: { button: 28, icon: iconTokens.size.md },
  lg: { button: 32, icon: iconTokens.size.lg },
} as const;

type ButtonStyleInput = {
  readonly size: ToolbarButtonSize;
  readonly active: boolean;
  readonly disabled: boolean;
  readonly hovered: boolean;
};

function getButtonStyle({ size, active, disabled, hovered }: ButtonStyleInput): CSSProperties {
  const sizeConfig = SIZE_MAP[size];

  const base: CSSProperties = {
    width: sizeConfig.button,
    height: sizeConfig.button,
    padding: 0,
    border: "none",
    borderRadius: radiusTokens.sm,
    backgroundColor: "transparent",
    color: `var(--text-secondary, ${colorTokens.text.secondary})`,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.15s ease",
    flexShrink: 0,
  };

  if (disabled) {
    return {
      ...base,
      opacity: 0.4,
      cursor: "not-allowed",
    };
  }

  if (active) {
    return {
      ...base,
      backgroundColor: `var(--selection-primary, ${colorTokens.selection.primary})`,
      color: "#ffffff",
    };
  }

  if (hovered) {
    return {
      ...base,
      backgroundColor: `var(--bg-hover, ${colorTokens.background.hover})`,
      color: `var(--text-primary, ${colorTokens.text.primary})`,
    };
  }

  return base;
}

/** Icon size lookup for callers that need to match their icon to the button size. */
export const TOOLBAR_BUTTON_ICON_SIZE = SIZE_MAP;

/**
 * Toolbar button with icon, hover, and active state.
 */
export function ToolbarButton({
  icon,
  label,
  active = false,
  disabled = false,
  onClick,
  size = "md",
  className,
  style,
}: ToolbarButtonProps) {
  const [hovered, setHovered] = useState(false);

  const handleMouseEnter = useCallback(() => {
    if (!disabled) {
      setHovered(true);
    }
  }, [disabled]);

  const handleMouseLeave = useCallback(() => {
    setHovered(false);
  }, []);

  const handleClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (!disabled) {
        onClick();
      }
    },
    [disabled, onClick],
  );

  const buttonStyle = getButtonStyle({ size, active, disabled, hovered });

  return (
    <button
      type="button"
      className={className}
      style={{ ...buttonStyle, ...style }}
      title={label}
      disabled={disabled}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {icon}
    </button>
  );
}
