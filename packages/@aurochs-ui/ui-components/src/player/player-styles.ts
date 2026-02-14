/**
 * @file Player component styles
 *
 * Style utilities for player variants and states.
 */

import type { CSSProperties } from "react";
import { colorTokens, spacingTokens, radiusTokens, shadowTokens } from "../design-tokens";
import type { PlayerVariant, MainButtonMode, PlayerState } from "./types";

// =============================================================================
// Constants
// =============================================================================

/** Main play button size (larger) */
export const PLAY_BUTTON_SIZE = 44;

/** Action button size */
export const ACTION_BUTTON_SIZE = 36;

/** Icon sizes */
export const PLAY_ICON_SIZE = 20;
export const ACTION_ICON_SIZE = 18;

// =============================================================================
// Container Styles
// =============================================================================

const floatingContainerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.md,
  padding: `${spacingTokens.sm} ${spacingTokens.lg}`,
  background: colorTokens.overlay.darkBgOverlay,
  backdropFilter: "blur(12px)",
  borderRadius: radiusTokens.lg,
  boxShadow: shadowTokens.lg,
};

const toolbarContainerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.md,
  padding: `${spacingTokens.xs} ${spacingTokens.sm}`,
};

const panelContainerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.md,
  padding: spacingTokens.md,
  background: colorTokens.background.secondary,
  border: `1px solid ${colorTokens.border.subtle}`,
  borderRadius: radiusTokens.md,
};

export function getContainerStyle(variant: PlayerVariant): CSSProperties {
  switch (variant) {
    case "floating":
      return floatingContainerStyle;
    case "toolbar":
      return toolbarContainerStyle;
    case "panel":
      return panelContainerStyle;
  }
}

// =============================================================================
// Button Styles
// =============================================================================

const baseButtonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  cursor: "pointer",
  transition: "background 0.15s ease, opacity 0.15s ease, transform 0.1s ease",
  flexShrink: 0,
};

// Play button (larger, prominent)
const floatingPlayButtonStyle: CSSProperties = {
  ...baseButtonStyle,
  width: PLAY_BUTTON_SIZE,
  height: PLAY_BUTTON_SIZE,
  borderRadius: "50%",
  background: colorTokens.accent.success,
  color: colorTokens.text.inverse,
};

const lightPlayButtonStyle: CSSProperties = {
  ...baseButtonStyle,
  width: PLAY_BUTTON_SIZE,
  height: PLAY_BUTTON_SIZE,
  borderRadius: "50%",
  background: colorTokens.accent.success,
  color: colorTokens.text.inverse,
};

// Action buttons (secondary)
const floatingActionButtonStyle: CSSProperties = {
  ...baseButtonStyle,
  width: ACTION_BUTTON_SIZE,
  height: ACTION_BUTTON_SIZE,
  borderRadius: radiusTokens.md,
  background: "transparent",
  color: colorTokens.overlay.lightText,
};

const lightActionButtonStyle: CSSProperties = {
  ...baseButtonStyle,
  width: ACTION_BUTTON_SIZE,
  height: ACTION_BUTTON_SIZE,
  borderRadius: radiusTokens.md,
  background: "transparent",
  color: colorTokens.text.primary,
};

export function getPlayButtonStyle(variant: PlayerVariant): CSSProperties {
  return variant === "floating" ? floatingPlayButtonStyle : lightPlayButtonStyle;
}

export function getActionButtonStyle(variant: PlayerVariant): CSSProperties {
  return variant === "floating" ? floatingActionButtonStyle : lightActionButtonStyle;
}

export const disabledButtonStyle: CSSProperties = {
  opacity: 0.4,
  cursor: "default",
  pointerEvents: "none",
};

export const hoverButtonStyle: CSSProperties = {
  transform: "scale(1.05)",
};

// =============================================================================
// Display Styles
// =============================================================================

const floatingDisplayStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.sm,
  flex: 1,
  minWidth: 0,
};

const lightDisplayStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.sm,
  flex: 1,
  minWidth: 0,
};

export function getDisplayStyle(variant: PlayerVariant): CSSProperties {
  return variant === "floating" ? floatingDisplayStyle : lightDisplayStyle;
}

const floatingTextStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: spacingTokens["2xs"],
  minWidth: 0,
};

const lightTextStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: spacingTokens["2xs"],
  minWidth: 0,
};

export function getTextContainerStyle(variant: PlayerVariant): CSSProperties {
  return variant === "floating" ? floatingTextStyle : lightTextStyle;
}

export function getTitleStyle(variant: PlayerVariant): CSSProperties {
  const base: CSSProperties = {
    fontSize: "13px",
    fontWeight: 500,
    lineHeight: 1.3,
    margin: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  return {
    ...base,
    color: variant === "floating" ? colorTokens.overlay.lightText : colorTokens.text.primary,
  };
}

export function getSubtitleStyle(variant: PlayerVariant): CSSProperties {
  const base: CSSProperties = {
    fontSize: "11px",
    fontWeight: 400,
    lineHeight: 1.3,
    margin: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  return {
    ...base,
    color:
      variant === "floating"
        ? colorTokens.overlay.lightTextSecondary
        : colorTokens.text.secondary,
  };
}

// =============================================================================
// Thumbnail Styles
// =============================================================================

export const thumbnailContainerStyle: CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: radiusTokens.sm,
  overflow: "hidden",
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

export function getThumbnailBackgroundStyle(variant: PlayerVariant): CSSProperties {
  return {
    background:
      variant === "floating" ? colorTokens.overlay.lightBgSubtle : colorTokens.background.tertiary,
  };
}

// =============================================================================
// Controls Container
// =============================================================================

export const controlsContainerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.xs,
};

// =============================================================================
// Main Button State Colors
// =============================================================================

/**
 * Get color style for main button based on mode and state.
 */
export function getMainButtonColorStyle(mode: MainButtonMode, state: PlayerState): CSSProperties {
  switch (mode) {
    case "play":
    case "resume":
      // Green for play/resume
      return {
        background: colorTokens.accent.success,
        color: colorTokens.text.inverse,
      };

    case "pause":
      // Primary blue for pause (active state)
      return {
        background: colorTokens.accent.primary,
        color: colorTokens.text.inverse,
      };

    case "replay":
      // Cyan/teal for replay (completed)
      return {
        background: colorTokens.accent.cyan,
        color: "#000",
      };

    case "retry":
      // Red for retry (error)
      return {
        background: colorTokens.accent.danger,
        color: colorTokens.text.inverse,
      };

    case "running":
      // Muted for running (not interactive)
      return {
        background: colorTokens.background.tertiary,
        color: colorTokens.text.secondary,
      };
  }
}
