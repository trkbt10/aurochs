/**
 * @file Slide list styles
 *
 * CSS-in-JS style definitions for the slide list component.
 */

import type { CSSProperties } from "react";
import type { SlideListOrientation, SlideListMode } from "./types";
import {
  colorTokens,
  radiusTokens,
  spacingTokens,
  fontTokens,
} from "../ui/design-tokens/index";

// =============================================================================
// Container styles
// =============================================================================

/** Gap size used for consistent spacing */
const CONTAINER_GAP = 8;

export function getContainerStyle(
  orientation: SlideListOrientation
): CSSProperties {
  return {
    display: "flex",
    flexDirection: orientation === "vertical" ? "column" : "row",
    // Consistent gap in both modes
    gap: `${CONTAINER_GAP}px`,
    padding: orientation === "vertical" ? "8px 8px" : "8px 8px",
    overflow: "auto",
    height: "100%",
  };
}

// =============================================================================
// Item wrapper styles
// =============================================================================

export function getItemWrapperStyle(
  orientation: SlideListOrientation
): CSSProperties {
  return {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: orientation === "vertical" ? "6px" : "3px",
    flexDirection: orientation === "vertical" ? "row" : "column",
    flexShrink: 0,
  };
}

// =============================================================================
// Number badge styles (positioned outside slide)
// =============================================================================

export function getNumberBadgeStyle(
  orientation: SlideListOrientation
): CSSProperties {
  const base: CSSProperties = {
    fontSize: fontTokens.size.sm,
    fontWeight: fontTokens.weight.medium,
    fontVariantNumeric: "tabular-nums",
    // Dark theme - use muted text color
    color: colorTokens.text.tertiary,
    textAlign: "center",
    userSelect: "none",
    flexShrink: 0,
    lineHeight: 1,
  };

  if (orientation === "vertical") {
    return {
      ...base,
      minWidth: "20px",
    };
  }

  // horizontal
  return {
    ...base,
    marginBottom: "2px",
  };
}

// =============================================================================
// Thumbnail styles
// =============================================================================

/**
 * Selection ring color based on state.
 * Uses box-shadow inset to avoid layout shift.
 */
function getSelectionRing(
  isSelected: boolean,
  isPrimary: boolean,
  isActive: boolean
): string {
  if (isSelected) {
    const color = isPrimary
      ? colorTokens.selection.primary
      : colorTokens.selection.secondary;
    return `inset 0 0 0 2px ${color}`;
  }
  if (isActive) {
    return `inset 0 0 0 2px ${colorTokens.accent.primary}`;
  }
  return "none";
}

export function getThumbnailContainerStyle(
  aspectRatio: string,
  isSelected: boolean,
  isPrimary: boolean,
  isActive: boolean
): CSSProperties {
  const selectionRing = getSelectionRing(isSelected, isPrimary, isActive);
  // Subtle shadow for depth on dark backgrounds
  const baseShadow = "0 1px 3px rgba(0, 0, 0, 0.3)";

  return {
    width: "100%",
    height: "auto",
    aspectRatio,
    // Slide content is white (PowerPoint slides)
    backgroundColor: "#fff",
    borderRadius: radiusTokens.sm,
    boxShadow: selectionRing !== "none"
      ? `${selectionRing}, ${baseShadow}`
      : baseShadow,
    transition: "box-shadow 0.12s ease",
    position: "relative",
    overflow: "hidden",
    cursor: "pointer",
  };
}

export const thumbnailContentStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  // Ensure SVG children scale properly to fill container
  overflow: "hidden",
  // Allow clicks to pass through to parent container (which has onClick)
  pointerEvents: "none",
};

/**
 * Style for thumbnail content wrapper to ensure SVGs fill properly.
 * Apply to div containing SVG or image content.
 */
export const thumbnailInnerStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "block",
  lineHeight: 0,
};

/** Style for children of thumbnailContent to fill the container */
export const thumbnailFillStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

export const thumbnailFallbackStyle: CSSProperties = {
  color: "rgba(0, 0, 0, 0.3)",
  fontSize: "10px",
};

// =============================================================================
// Delete button styles (circular)
// =============================================================================

export function getDeleteButtonStyle(visible: boolean): CSSProperties {
  return {
    position: "absolute",
    top: spacingTokens.xs,
    right: spacingTokens.xs,
    width: "18px",
    height: "18px",
    borderRadius: radiusTokens.sm,
    // Semi-transparent dark background
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    color: colorTokens.text.primary,
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: fontTokens.size.md,
    opacity: visible ? 1 : 0,
    transition: "opacity 0.12s ease, background-color 0.12s ease",
    zIndex: 10,
  };
}

// =============================================================================
// Fx button styles
// =============================================================================

export function getFxButtonStyle(visible: boolean): CSSProperties {
  return {
    position: "absolute",
    bottom: spacingTokens.xs,
    right: spacingTokens.xs,
    width: "22px",
    height: "22px",
    padding: 0,
    borderRadius: "999px",
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    color: colorTokens.text.primary,
    border: "1px solid rgba(255, 255, 255, 0.12)",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
    opacity: visible ? 1 : 0,
    pointerEvents: visible ? "auto" : "none",
    transition: "opacity 0.12s ease, background-color 0.12s ease",
    zIndex: 10,
  };
}

// =============================================================================
// Gap styles (for add button and drop indicator)
// =============================================================================

/** Fixed gap size - matches CONTAINER_GAP */
const GAP_SIZE = 8;

export function getGapStyle(
  orientation: SlideListOrientation
): CSSProperties {
  // Gap component uses zero size - doesn't affect layout
  // CSS gap on container handles all spacing
  // Interactive elements (+ button, drop indicator) use overflow: visible
  if (orientation === "vertical") {
    return {
      height: 0,
      width: "100%",
      overflow: "visible",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      zIndex: 2,
    };
  }
  return {
    width: 0,
    height: "100%",
    overflow: "visible",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    zIndex: 2,
  };
}

export function getGapDropIndicatorStyle(
  orientation: SlideListOrientation
): CSSProperties {
  // Simple line indicator - no layout impact
  if (orientation === "vertical") {
    return {
      position: "absolute",
      left: "26px",
      right: 0,
      height: "2px",
      top: "50%",
      transform: "translateY(-50%)",
      backgroundColor: colorTokens.selection.primary,
      borderRadius: "1px",
      pointerEvents: "none",
    };
  }

  return {
    position: "absolute",
    top: "16px",
    bottom: 0,
    width: "2px",
    left: "50%",
    transform: "translateX(-50%)",
    backgroundColor: colorTokens.selection.primary,
    borderRadius: "1px",
    pointerEvents: "none",
  };
}

/**
 * Hover zone style for Gap component.
 * Since Gap has height: 0, this provides an invisible clickable area.
 * Positioned exactly on the visual boundary line between slides.
 *
 * DOM structure places Gap at TOP of its wrapper, but the visual boundary
 * (center of CSS gap) is CONTAINER_GAP/2 pixels ABOVE the Gap's mount position.
 * Button is a child of this zone, centered within it.
 */
export function getGapHoverZoneStyle(
  orientation: SlideListOrientation
): CSSProperties {
  // Hover zone height/width for reliable hover detection
  const hoverSize = CONTAINER_GAP + 8; // 16px

  // Gap is mounted at top of wrapper, but visual boundary is
  // CONTAINER_GAP/2 (4px) above the mount position (center of CSS gap)
  const boundaryOffset = CONTAINER_GAP / 2; // 4px

  if (orientation === "vertical") {
    return {
      position: "absolute",
      // Offset to account for number badge (26px) - center on thumbnail
      left: "26px",
      right: 0,
      height: `${hoverSize}px`,
      // Center the zone on the visual boundary:
      // - Gap mount is at y=0
      // - Visual boundary is at y=-4px (boundaryOffset above mount)
      // - Zone center should be at y=-4px
      // - Zone top = center - height/2 = -4 - 8 = -12px
      top: `${-boundaryOffset - hoverSize / 2}px`,
      cursor: "pointer",
      // Center the button child exactly on the boundary
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      // Debug: uncomment to see hover zone
      // backgroundColor: "rgba(255, 0, 0, 0.1)",
    };
  }
  return {
    position: "absolute",
    // Offset for number badge in horizontal mode
    top: "14px",
    bottom: 0,
    width: `${hoverSize}px`,
    // Center on visual boundary (CONTAINER_GAP/2 to the left of mount)
    left: `${-boundaryOffset - hoverSize / 2}px`,
    cursor: "pointer",
    // Center the button child
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
}

/**
 * Add button style.
 * Small, subtle button that appears centered in the hover zone.
 */
export function getAddButtonStyle(
  visible: boolean,
  _orientation: SlideListOrientation
): CSSProperties {
  // Button size - compact and unobtrusive
  const size = 18;

  return {
    // No absolute positioning - centered by parent flexbox
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: radiusTokens.sm,
    // Subtle appearance - matches design system
    backgroundColor: visible
      ? colorTokens.accent.primary
      : "transparent",
    color: colorTokens.text.primary,
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    // Clean typography
    fontSize: fontTokens.size.sm,
    fontWeight: fontTokens.weight.medium,
    lineHeight: 1,
    // Smooth appearance
    opacity: visible ? 1 : 0,
    pointerEvents: visible ? "auto" : "none",
    transition: "opacity 0.12s ease, transform 0.12s ease, background-color 0.12s ease",
    transform: visible ? "scale(1)" : "scale(0.85)",
    // Subtle shadow when visible
    boxShadow: visible
      ? "0 1px 4px rgba(0, 0, 0, 0.15)"
      : "none",
    // Prevent text selection
    userSelect: "none",
    // Prevent shrinking in flex container
    flexShrink: 0,
  };
}

// =============================================================================
// Hover styles for item
// =============================================================================

export const itemHoverOverlayStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  backgroundColor: "rgba(0, 0, 0, 0.02)",
  pointerEvents: "none",
  opacity: 0,
  transition: "opacity 0.15s ease",
};
