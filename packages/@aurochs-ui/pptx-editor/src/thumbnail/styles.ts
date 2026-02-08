/**
 * @file Slide thumbnail panel styles
 *
 * CSS-in-JS style definitions for the slide thumbnail panel.
 */

import type { CSSProperties } from "react";
import { colorTokens, radiusTokens, fontTokens, iconTokens } from "@aurochs-ui/ui-components/design-tokens";

// =============================================================================
// Icon size
// =============================================================================

export const ICON_SIZE = iconTokens.size.sm;

// =============================================================================
// Panel styles
// =============================================================================

export const panelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  backgroundColor: `var(--bg-secondary, ${colorTokens.background.secondary})`,
  borderRight: `1px solid var(--border-strong, ${colorTokens.border.strong})`,
  overflow: "hidden",
};

export const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "8px 12px",
  borderBottom: `1px solid var(--border-strong, ${colorTokens.border.strong})`,
  backgroundColor: `var(--bg-primary, ${colorTokens.background.primary})`,
};

export const headerTitleStyle: CSSProperties = {
  fontSize: fontTokens.size.md,
  fontWeight: fontTokens.weight.semibold,
  color: `var(--text-secondary, ${colorTokens.text.secondary})`,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

export const buttonGroupStyle: CSSProperties = {
  display: "flex",
  gap: "4px",
};

// =============================================================================
// Icon button styles
// =============================================================================

export const iconButtonStyle: CSSProperties = {
  width: "24px",
  height: "24px",
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
};

export const iconButtonHoverStyle: CSSProperties = {
  ...iconButtonStyle,
  backgroundColor: `var(--bg-hover, ${colorTokens.background.hover})`,
  color: `var(--text-primary, ${colorTokens.text.primary})`,
};

export const iconButtonDisabledStyle: CSSProperties = {
  ...iconButtonStyle,
  opacity: 0.4,
  cursor: "not-allowed",
};

// =============================================================================
// List styles
// =============================================================================

export const listStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
  padding: "8px",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

// =============================================================================
// Thumbnail styles
// =============================================================================

export const thumbnailWrapperStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  flexShrink: 0,
  cursor: "pointer",
  borderRadius: "4px",
  overflow: "hidden",
  transition: "transform 0.15s ease",
};

/** Get style for thumbnail container with aspect ratio */
export function getThumbnailStyle(aspectRatio: string): CSSProperties {
  return {
    width: "100%",
    height: "auto",
    aspectRatio,
    backgroundColor: "#fff",
    border: "2px solid transparent",
    borderRadius: "4px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
    transition: "border-color 0.15s ease",
    position: "relative",
    overflow: "hidden",
  };
}

/** Get style for active thumbnail with selection highlight */
export function getThumbnailActiveStyle(aspectRatio: string): CSSProperties {
  return {
    ...getThumbnailStyle(aspectRatio),
    border: `2px solid var(--selection-primary, ${colorTokens.selection.primary})`,
  };
}

export const thumbnailNumberStyle: CSSProperties = {
  position: "absolute",
  top: "4px",
  left: "4px",
  fontSize: "10px",
  fontWeight: 600,
  color: "#fff",
  backgroundColor: "rgba(0,0,0,0.6)",
  padding: "2px 6px",
  borderRadius: "3px",
};

export const deleteButtonStyle: CSSProperties = {
  position: "absolute",
  top: "4px",
  right: "4px",
  width: "18px",
  height: "18px",
  padding: 0,
  border: "none",
  borderRadius: "3px",
  backgroundColor: "rgba(0,0,0,0.6)",
  color: "#fff",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  opacity: 0,
  transition: "opacity 0.15s ease",
};

// =============================================================================
// Drag indicator
// =============================================================================

export const dragIndicatorStyle: CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  height: "2px",
  backgroundColor: `var(--selection-primary, ${colorTokens.selection.primary})`,
  zIndex: 10,
};
