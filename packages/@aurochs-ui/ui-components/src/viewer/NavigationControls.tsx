/**
 * @file NavigationControls
 *
 * Prev/Next navigation buttons for viewers.
 * Unified component for PPTX/DOCX/XLSX viewers.
 */

import type { CSSProperties, ReactNode } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "../icons";
import { spacingTokens, radiusTokens, iconTokens, colorTokens } from "../design-tokens";

export type NavigationControlsVariant = "overlay" | "inline" | "minimal";

export type NavigationControlsProps = {
  /** Navigate to previous item */
  readonly onPrev: () => void;
  /** Navigate to next item */
  readonly onNext: () => void;
  /** Whether previous navigation is available */
  readonly canGoPrev: boolean;
  /** Whether next navigation is available */
  readonly canGoNext: boolean;
  /** Visual variant */
  readonly variant?: NavigationControlsVariant;
  /** Icon size in pixels (default: 24 for overlay, 18 for inline/minimal) */
  readonly iconSize?: number;
  /** Custom previous button content */
  readonly prevContent?: ReactNode;
  /** Custom next button content */
  readonly nextContent?: ReactNode;
  /** Additional CSS class */
  readonly className?: string;
};

/** Overlay button size (40px) */
const OVERLAY_BUTTON_SIZE = 40;
/** Inline button size (36px) */
const INLINE_BUTTON_SIZE = 36;
/** Minimal button size (28px) */
const MINIMAL_BUTTON_SIZE = 28;

const overlayButtonBase: CSSProperties = {
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  width: OVERLAY_BUTTON_SIZE,
  height: OVERLAY_BUTTON_SIZE,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: colorTokens.overlay.darkBgControl,
  border: "none",
  borderRadius: "50%",
  color: colorTokens.overlay.lightText,
  cursor: "pointer",
  transition: "opacity 0.2s ease, background 0.2s ease",
  zIndex: 10,
};

const overlayPrevStyle: CSSProperties = {
  ...overlayButtonBase,
  left: spacingTokens.lg,
};

const overlayNextStyle: CSSProperties = {
  ...overlayButtonBase,
  right: spacingTokens.lg,
};

const inlineContainerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.sm,
};

const inlineButtonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: INLINE_BUTTON_SIZE,
  height: INLINE_BUTTON_SIZE,
  background: colorTokens.background.secondary,
  border: `1px solid ${colorTokens.border.subtle}`,
  borderRadius: radiusTokens.md,
  color: colorTokens.text.primary,
  cursor: "pointer",
  transition: "background 0.15s ease, border-color 0.15s ease",
};

const minimalButtonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: MINIMAL_BUTTON_SIZE,
  height: MINIMAL_BUTTON_SIZE,
  background: "transparent",
  border: "none",
  borderRadius: radiusTokens.sm,
  color: colorTokens.text.secondary,
  cursor: "pointer",
  transition: "background 0.15s ease, color 0.15s ease",
};

const disabledStyle: CSSProperties = {
  opacity: 0.3,
  cursor: "default",
  pointerEvents: "none",
};

function getDefaultIconSize(variant: NavigationControlsVariant): number {
  return variant === "overlay" ? iconTokens.size["2xl"] : iconTokens.size.lg;
}

/**
 * Navigation controls for moving between items.
 *
 * @example
 * ```tsx
 * <NavigationControls
 *   onPrev={nav.goToPrev}
 *   onNext={nav.goToNext}
 *   canGoPrev={!nav.isFirst}
 *   canGoNext={!nav.isLast}
 *   variant="inline"
 * />
 * ```
 */
export function NavigationControls({
  onPrev,
  onNext,
  canGoPrev,
  canGoNext,
  variant = "inline",
  iconSize,
  prevContent,
  nextContent,
  className,
}: NavigationControlsProps) {
  const size = iconSize ?? getDefaultIconSize(variant);

  if (variant === "overlay") {
    return (
      <>
        <button
          style={{
            ...overlayPrevStyle,
            ...(canGoPrev ? { opacity: 0.7 } : disabledStyle),
          }}
          onClick={onPrev}
          disabled={!canGoPrev}
          aria-label="Previous"
          className={className}
        >
          {prevContent ?? <ChevronLeftIcon size={size} />}
        </button>
        <button
          style={{
            ...overlayNextStyle,
            ...(canGoNext ? { opacity: 0.7 } : disabledStyle),
          }}
          onClick={onNext}
          disabled={!canGoNext}
          aria-label="Next"
          className={className}
        >
          {nextContent ?? <ChevronRightIcon size={size} />}
        </button>
      </>
    );
  }

  const buttonStyle = variant === "inline" ? inlineButtonStyle : minimalButtonStyle;

  return (
    <div style={inlineContainerStyle} className={className}>
      <button
        style={{ ...buttonStyle, ...(canGoPrev ? {} : disabledStyle) }}
        onClick={onPrev}
        disabled={!canGoPrev}
        aria-label="Previous"
      >
        {prevContent ?? <ChevronLeftIcon size={size} />}
      </button>
      <button
        style={{ ...buttonStyle, ...(canGoNext ? {} : disabledStyle) }}
        onClick={onNext}
        disabled={!canGoNext}
        aria-label="Next"
      >
        {nextContent ?? <ChevronRightIcon size={size} />}
      </button>
    </div>
  );
}
