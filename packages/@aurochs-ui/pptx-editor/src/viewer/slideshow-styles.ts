/**
 * @file Slideshow styles
 *
 * CSS-in-JS style definitions for the slideshow components.
 */

import type { CSSProperties } from "react";
import { spacingTokens, fontTokens, radiusTokens, colorTokens, shadowTokens } from "@aurochs-ui/ui-components/design-tokens";

// =============================================================================
// Layout constants
// =============================================================================

/** Navigation button size (44px) */
const NAV_BUTTON_SIZE = 44;
/** Navigation button offset from edge (12px) */
const NAV_BUTTON_OFFSET = spacingTokens.md;

// =============================================================================
// Container styles
// =============================================================================

/** Returns styles for the slideshow dialog container. */
export function getContainerStyle(_isFullscreen: boolean): CSSProperties {
  return {
    position: "fixed",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: colorTokens.overlay.darkBg,
    userSelect: "none",
    overflow: "hidden",
    zIndex: 2147483647,
    border: "none",
    padding: 0,
    margin: 0,
    width: "100vw",
    height: "100vh",
    maxWidth: "none",
    maxHeight: "none",
  };
}

// =============================================================================
// Screen overlay styles
// =============================================================================

/** Returns styles for black/white screen overlay. */
export function getScreenOverlayStyle(variant: "black" | "white", active: boolean): CSSProperties {
  return {
    position: "absolute",
    inset: 0,
    zIndex: 100,
    opacity: active ? 1 : 0,
    pointerEvents: active ? "auto" : "none",
    transition: "opacity 0.3s ease-out",
    background: variant === "black" ? colorTokens.overlay.darkBg : colorTokens.background.primary,
  };
}

// =============================================================================
// Stage styles
// =============================================================================

/** Returns styles for the slide stage area. */
export function getStageStyle(isFullscreen: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
    padding: isFullscreen ? 0 : spacingTokens.lg,
  };
}

/** Returns styles for the slide container with dimensions. */
export function getSlideContainerStyle(width: number, height: number, isFullscreen: boolean): CSSProperties {
  return {
    position: "relative",
    width: `${width}px`,
    height: `${height}px`,
    maxWidth: "100%",
    maxHeight: "100%",
    boxShadow: isFullscreen ? "none" : shadowTokens.lg,
  };
}

export const slideBaseStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  background: colorTokens.background.primary,
};

export const slidePreviousStyle: CSSProperties = {
  ...slideBaseStyle,
  position: "absolute",
  inset: 0,
  zIndex: 1,
};

/** Returns styles for the current slide with transition animation. */
export function getSlideCurrentStyle(isTransitioning: boolean, transitionDuration?: number): CSSProperties {
  return {
    ...slideBaseStyle,
    position: "relative",
    zIndex: 2,
    animationDuration: isTransitioning && transitionDuration ? `${transitionDuration}ms` : undefined,
  };
}

export const slideContentStyle: CSSProperties = {
  width: "100%",
  height: "100%",
};

// =============================================================================
// Controls styles
// =============================================================================

/** Returns styles for the controls overlay. */
export function getControlsStyle(visible: boolean): CSSProperties {
  return {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    opacity: visible ? 1 : 0,
    transition: "opacity 0.3s ease-out",
  };
}

export const controlsTopStyle: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: `${spacingTokens.md} ${spacingTokens.lg}`,
  background: `linear-gradient(to bottom, ${colorTokens.overlay.darkBgOverlay}, transparent)`,
  pointerEvents: "auto",
};

export const controlsProgressStyle: CSSProperties = {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  padding: `0 ${spacingTokens.xl} ${spacingTokens.lg}`,
  pointerEvents: "auto",
};

// =============================================================================
// Control button styles
// =============================================================================

export const controlButtonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.sm,
  padding: `${spacingTokens.sm} ${spacingTokens.lg}`,
  fontSize: fontTokens.size.xl,
  fontWeight: fontTokens.weight.medium,
  color: colorTokens.overlay.lightText,
  background: colorTokens.overlay.lightBgHover,
  border: "none",
  borderRadius: radiusTokens.md,
  backdropFilter: "blur(12px)",
  cursor: "pointer",
  transition: "all 0.15s ease-out",
};

// =============================================================================
// Navigation button styles
// =============================================================================

/** Returns styles for navigation buttons (prev/next). */
export function getNavButtonStyle(direction: "prev" | "next", disabled: boolean): CSSProperties {
  return {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    left: direction === "prev" ? NAV_BUTTON_OFFSET : undefined,
    right: direction === "next" ? NAV_BUTTON_OFFSET : undefined,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: NAV_BUTTON_SIZE,
    height: NAV_BUTTON_SIZE,
    padding: 0,
    color: disabled ? colorTokens.overlay.lightTextMuted : colorTokens.overlay.lightTextSecondary,
    background: colorTokens.overlay.darkBgSubtle,
    border: "none",
    borderRadius: "50%",
    backdropFilter: "blur(8px)",
    cursor: disabled ? "default" : "pointer",
    transition: "all 0.15s ease-out",
    opacity: disabled ? 0.2 : 0.7,
    pointerEvents: disabled ? "none" : "auto",
  };
}
