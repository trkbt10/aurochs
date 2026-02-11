/**
 * @file NavigationControls
 *
 * Prev/Next navigation buttons for slide viewer.
 */

import type { CSSProperties, ReactNode } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@aurochs-ui/ui-components/icons";

export type NavigationControlsVariant = "overlay" | "inline" | "minimal";

export type NavigationControlsProps = {
  /** Navigate to previous slide */
  readonly onPrev: () => void;
  /** Navigate to next slide */
  readonly onNext: () => void;
  /** Whether previous navigation is available */
  readonly canGoPrev: boolean;
  /** Whether next navigation is available */
  readonly canGoNext: boolean;
  /** Visual variant */
  readonly variant?: NavigationControlsVariant;
  /** Icon size in pixels (default: 24) */
  readonly iconSize?: number;
  /** Custom previous button content */
  readonly prevContent?: ReactNode;
  /** Custom next button content */
  readonly nextContent?: ReactNode;
  /** Additional CSS class */
  readonly className?: string;
};

const overlayButtonStyle: CSSProperties = {
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  width: "40px",
  height: "40px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(0, 0, 0, 0.4)",
  border: "none",
  borderRadius: "50%",
  color: "#fff",
  cursor: "pointer",
  transition: "opacity 0.2s ease, background 0.2s ease",
  zIndex: 10,
};

const overlayPrevStyle: CSSProperties = {
  ...overlayButtonStyle,
  left: "16px",
};

const overlayNextStyle: CSSProperties = {
  ...overlayButtonStyle,
  right: "16px",
};

const inlineContainerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const inlineButtonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "36px",
  height: "36px",
  background: "var(--bg-secondary)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "6px",
  color: "var(--text-primary)",
  cursor: "pointer",
  transition: "background 0.15s ease, border-color 0.15s ease",
};

const minimalButtonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "28px",
  height: "28px",
  background: "transparent",
  border: "none",
  borderRadius: "4px",
  color: "var(--text-secondary)",
  cursor: "pointer",
  transition: "background 0.15s ease, color 0.15s ease",
};

const disabledStyle: CSSProperties = {
  opacity: 0.3,
  cursor: "default",
  pointerEvents: "none",
};

/**
 * Navigation controls for moving between slides.
 *
 * @example
 * ```tsx
 * // Overlay variant (for slide area)
 * <NavigationControls
 *   onPrev={nav.goToPrev}
 *   onNext={nav.goToNext}
 *   canGoPrev={!nav.isFirst}
 *   canGoNext={!nav.isLast}
 *   variant="overlay"
 * />
 *
 * // Inline variant (for toolbar)
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
  variant = "overlay",
  iconSize = 24,
  prevContent,
  nextContent,
  className,
}: NavigationControlsProps) {
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
          aria-label="Previous slide"
          className={className}
        >
          {prevContent ?? <ChevronLeftIcon size={iconSize} />}
        </button>
        <button
          style={{
            ...overlayNextStyle,
            ...(canGoNext ? { opacity: 0.7 } : disabledStyle),
          }}
          onClick={onNext}
          disabled={!canGoNext}
          aria-label="Next slide"
          className={className}
        >
          {nextContent ?? <ChevronRightIcon size={iconSize} />}
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
        aria-label="Previous slide"
      >
        {prevContent ?? <ChevronLeftIcon size={iconSize} />}
      </button>
      <button
        style={{ ...buttonStyle, ...(canGoNext ? {} : disabledStyle) }}
        onClick={onNext}
        disabled={!canGoNext}
        aria-label="Next slide"
      >
        {nextContent ?? <ChevronRightIcon size={iconSize} />}
      </button>
    </div>
  );
}
