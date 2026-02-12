/**
 * @file Slideshow styles
 *
 * CSS-in-JS style definitions for the slideshow components.
 *
 * Design principles:
 * - Slide fills 100% of viewport (no padding reducing display area)
 * - Controls at absolute screen edges, never overlapping slide content
 * - Auto-hiding UI with graceful fade transitions
 * - Click-to-advance as primary navigation pattern
 */

import type { CSSProperties } from "react";
import { spacingTokens, fontTokens, radiusTokens, colorTokens } from "@aurochs-ui/ui-components/design-tokens";

// =============================================================================
// Container styles
// =============================================================================

/** Returns styles for the slideshow dialog container. */
export function getContainerStyle(_isFullscreen: boolean): CSSProperties {
  return {
    // Reset dialog defaults completely
    position: "fixed",
    inset: 0,
    display: "flex",
    flexDirection: "column",
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
    boxSizing: "border-box",
    // Prevent browser edge swipe gestures (back/forward) while allowing vertical scroll and pinch zoom
    touchAction: "pan-y pinch-zoom",
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
// Stage styles - Slide fills entire viewport
// =============================================================================

/** Returns styles for the slide stage area. NO PADDING - slide fills viewport. */
export function getStageStyle(_isFullscreen: boolean): CSSProperties {
  return {
    // Fill entire viewport
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    // NO padding - slide uses full available space
    padding: 0,
    minHeight: 0,
  };
}

/** Returns styles for the slide container with dimensions. */
export function getSlideContainerStyle(slideWidth: number, slideHeight: number, _isFullscreen: boolean): CSSProperties {
  return {
    position: "relative",
    // Use aspect-ratio with constraints - fills viewport while maintaining ratio
    aspectRatio: `${slideWidth} / ${slideHeight}`,
    width: "100%",
    height: "100%",
    maxWidth: "100%",
    maxHeight: "100%",
    // Object-fit behavior via flex container
    flexShrink: 0,
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
// Controls bar styles - At screen edges, not overlapping slide
// =============================================================================

/** Top control bar - at very top of screen. */
export const controlsTopBarStyle: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: `${spacingTokens.md} ${spacingTokens.lg}`,
  background: `linear-gradient(to bottom, ${colorTokens.overlay.darkBgOverlay}, transparent)`,
  zIndex: 50,
  pointerEvents: "auto",
};

/** Bottom control bar - at very bottom of screen. */
export const controlsBottomBarStyle: CSSProperties = {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: `${spacingTokens.md} ${spacingTokens.xl}`,
  background: `linear-gradient(to top, ${colorTokens.overlay.darkBgOverlay}, transparent)`,
  zIndex: 50,
};

/** Returns styles for the controls wrapper with visibility. */
export function getControlsWrapperStyle(visible: boolean): CSSProperties {
  return {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    opacity: visible ? 1 : 0,
    transition: "opacity 0.3s ease-out",
    zIndex: 40,
  };
}

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
  pointerEvents: "auto",
};

// =============================================================================
// Progress bar styles
// =============================================================================

export const progressWrapperStyle: CSSProperties = {
  flex: 1,
  maxWidth: 600,
  pointerEvents: "auto",
};

// =============================================================================
// Click hint overlay - Shows navigation hints
// =============================================================================

/** Style for left/right click zones (invisible, for interaction). */
export function getClickZoneStyle(side: "left" | "right"): CSSProperties {
  return {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "20%",
    left: side === "left" ? 0 : undefined,
    right: side === "right" ? 0 : undefined,
    cursor: "pointer",
    zIndex: 30,
  };
}

/** Hint arrow that appears on hover. */
export function getHintArrowStyle(side: "left" | "right", visible: boolean, disabled: boolean): CSSProperties {
  return {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    left: side === "left" ? spacingTokens.lg : undefined,
    right: side === "right" ? spacingTokens.lg : undefined,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 48,
    height: 48,
    background: colorTokens.overlay.darkBgSubtle,
    backdropFilter: "blur(8px)",
    borderRadius: "50%",
    color: disabled ? colorTokens.overlay.lightTextMuted : colorTokens.overlay.lightText,
    opacity: visible && !disabled ? 0.8 : 0,
    transition: "opacity 0.15s ease-out",
    pointerEvents: "none",
  };
}

// =============================================================================
// Deprecated - Kept for backward compatibility during transition
// =============================================================================

/** @deprecated Use controlsTopBarStyle instead */
export const controlsTopStyle = controlsTopBarStyle;

/** @deprecated Use controlsBottomBarStyle instead */
export const controlsProgressStyle = controlsBottomBarStyle;

/** @deprecated Use getControlsWrapperStyle instead */
export function getControlsStyle(visible: boolean): CSSProperties {
  return getControlsWrapperStyle(visible);
}

/** @deprecated Navigation buttons removed - use click zones instead */
export function getNavButtonStyle(_direction: "prev" | "next", _disabled: boolean): CSSProperties {
  return { display: "none" };
}
