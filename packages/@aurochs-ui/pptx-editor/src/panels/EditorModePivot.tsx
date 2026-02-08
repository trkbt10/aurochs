/**
 * @file Editor mode pivot component
 *
 * Unity/Blender-style mode switching toggle for the editor.
 * Allows switching between "slide" and "theme" editing modes.
 */

import { useCallback, type CSSProperties } from "react";
import type { EditorMode } from "../context/presentation/editor/types";
import { colorTokens, fontTokens, radiusTokens, spacingTokens } from "@aurochs-ui/ui-components/design-tokens";

export type EditorModePivotProps = {
  readonly mode: EditorMode;
  readonly onModeChange: (mode: EditorMode) => void;
  readonly disabled?: boolean;
};

const containerStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 0,
  backgroundColor: `var(--bg-tertiary, ${colorTokens.background.tertiary})`,
  borderRadius: `var(--radius-md, ${radiusTokens.md})`,
  padding: "2px",
  border: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
};

const buttonBaseStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: `${spacingTokens.xs} ${spacingTokens.md}`,
  fontSize: fontTokens.size.sm,
  fontWeight: fontTokens.weight.medium,
  fontFamily: "inherit",
  border: "none",
  borderRadius: `calc(var(--radius-md, ${radiusTokens.md}) - 2px)`,
  backgroundColor: "transparent",
  color: `var(--text-secondary, ${colorTokens.text.secondary})`,
  cursor: "pointer",
  transition: "all 150ms ease",
  userSelect: "none",
  minWidth: "64px",
};

const activeButtonStyle: CSSProperties = {
  backgroundColor: `var(--bg-primary, ${colorTokens.background.primary})`,
  color: `var(--text-primary, ${colorTokens.text.primary})`,
  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.15)",
};

const disabledStyle: CSSProperties = {
  opacity: 0.5,
  cursor: "not-allowed",
};

type ModeConfig = {
  readonly mode: EditorMode;
  readonly label: string;
};

const MODES: readonly ModeConfig[] = [
  { mode: "slide", label: "Slide" },
  { mode: "theme", label: "Theme" },
];

/**
 * Editor mode pivot component.
 *
 * Provides a Unity/Blender-style toggle between editor modes.
 * Positioned in the top-left of the toolbar area.
 */
export function EditorModePivot({ mode, onModeChange, disabled }: EditorModePivotProps) {
  const handleClick = useCallback(
    (newMode: EditorMode) => {
      if (!disabled && newMode !== mode) {
        onModeChange(newMode);
      }
    },
    [disabled, mode, onModeChange],
  );

  return (
    <div style={containerStyle} role="tablist" aria-label="Editor mode">
      {MODES.map((config) => {
        const isActive = mode === config.mode;
        const combinedStyle: CSSProperties = {
          ...buttonBaseStyle,
          ...(isActive ? activeButtonStyle : {}),
          ...(disabled ? disabledStyle : {}),
        };

        return (
          <button
            key={config.mode}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => handleClick(config.mode)}
            disabled={disabled}
            style={combinedStyle}
          >
            {config.label}
          </button>
        );
      })}
    </div>
  );
}
