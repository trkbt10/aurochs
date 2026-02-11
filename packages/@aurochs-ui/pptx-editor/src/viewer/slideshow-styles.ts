/**
 * @file Slideshow styles
 *
 * CSS-in-JS style definitions for the slideshow components.
 */

import type { CSSProperties } from "react";

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
    background: "#000",
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
    background: variant === "black" ? "#000" : "#fff",
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
    padding: isFullscreen ? 0 : "16px",
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
    boxShadow: isFullscreen ? "none" : "0 4px 24px rgba(0, 0, 0, 0.3)",
  };
}

export const slideBaseStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  background: "#fff",
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
  padding: "12px 16px",
  background: "linear-gradient(to bottom, rgba(0, 0, 0, 0.5), transparent)",
  pointerEvents: "auto",
};

export const controlsProgressStyle: CSSProperties = {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  padding: "0 24px 16px",
  pointerEvents: "auto",
};

// =============================================================================
// Control button styles
// =============================================================================

export const controlButtonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "8px 16px",
  fontSize: "14px",
  fontWeight: 500,
  color: "rgba(255, 255, 255, 0.9)",
  background: "rgba(255, 255, 255, 0.1)",
  border: "none",
  borderRadius: "6px",
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
    left: direction === "prev" ? "12px" : undefined,
    right: direction === "next" ? "12px" : undefined,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "44px",
    height: "44px",
    padding: 0,
    color: disabled ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.6)",
    background: "rgba(0, 0, 0, 0.25)",
    border: "none",
    borderRadius: "50%",
    backdropFilter: "blur(8px)",
    cursor: disabled ? "default" : "pointer",
    transition: "all 0.15s ease-out",
    opacity: disabled ? 0.2 : 0.7,
    pointerEvents: disabled ? "none" : "auto",
  };
}
