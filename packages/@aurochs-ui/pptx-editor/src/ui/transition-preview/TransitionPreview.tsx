/**
 * @file TransitionPreview component for rendering transition animations
 *
 * Shows a small animated preview of slide transition types.
 * Uses the existing browser-effects animation system.
 */

import { useEffect, useRef, useCallback, type CSSProperties } from "react";
import type { TransitionType } from "@aurochs-office/pptx/domain/transition";
import { applyBrowserEffect, type BrowserEffectType } from "@aurochs-renderer/pptx/animation";
import { colorTokens } from "@aurochs-ui/ui-components/design-tokens";

// =============================================================================
// Types
// =============================================================================

export type TransitionPreviewProps = {
  /** Transition type to preview */
  readonly type: TransitionType;
  /** Preview size in pixels */
  readonly size?: number;
  /** Whether to animate (for dropdown items) */
  readonly animate?: boolean;
  /** Additional CSS class */
  readonly className?: string;
  /** Additional styles */
  readonly style?: CSSProperties;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle = (size: number): CSSProperties => ({
  width: size,
  height: size,
  position: "relative",
  overflow: "hidden",
  borderRadius: "2px",
  flexShrink: 0,
});

const slideStyle = (color: string): CSSProperties => ({
  position: "absolute",
  inset: 0,
  backgroundColor: color,
});

// =============================================================================
// Transition Type Mapping
// =============================================================================

type EffectMapping = {
  readonly effect: BrowserEffectType;
  readonly direction: string;
};

/**
 * Map TransitionType to BrowserEffectType with direction
 */
function getEffectMapping(type: TransitionType): EffectMapping | null {
  switch (type) {
    case "none":
      return null;
    case "cut":
      return null;
    case "fade":
      return { effect: "fade", direction: "in" };
    case "dissolve":
      return { effect: "dissolve", direction: "in" };
    case "wipe":
      return { effect: "wipe", direction: "right" };
    case "push":
      return { effect: "slide", direction: "left" };
    case "pull":
      return { effect: "slide", direction: "right" };
    case "cover":
      return { effect: "slide", direction: "left" };
    case "blinds":
      return { effect: "blinds", direction: "horizontal" };
    case "checker":
      return { effect: "checkerboard", direction: "across" };
    case "circle":
      return { effect: "circle", direction: "in" };
    case "comb":
      return { effect: "blinds", direction: "vertical" };
    case "diamond":
      return { effect: "diamond", direction: "in" };
    case "newsflash":
      return { effect: "box", direction: "in" };
    case "plus":
      return { effect: "plus", direction: "in" };
    case "random":
      return { effect: "dissolve", direction: "in" };
    case "randomBar":
      return { effect: "randombar", direction: "horizontal" };
    case "split":
      return { effect: "barn", direction: "inHorizontal" };
    case "strips":
      return { effect: "strips", direction: "downRight" };
    case "wedge":
      return { effect: "wedge", direction: "in" };
    case "wheel":
      return { effect: "wheel", direction: "4" };
    case "zoom":
      return { effect: "box", direction: "in" };
    default:
      return { effect: "fade", direction: "in" };
  }
}

// =============================================================================
// Component
// =============================================================================

/**
 * Renders an animated preview of a slide transition.
 */
export function TransitionPreview({ type, size = 24, animate = true, className, style }: TransitionPreviewProps) {
  const foregroundRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);

  const foregroundColor = colorTokens.accent.primary;
  const backgroundColor = colorTokens.background.hover;

  const runAnimation = useCallback(async () => {
    const el = foregroundRef.current;
    if (!el || isAnimatingRef.current) {
      return;
    }

    const mapping = getEffectMapping(type);
    if (!mapping) {
      // For "none" or "cut", just show static
      el.style.visibility = "visible";
      el.style.opacity = "1";
      el.style.clipPath = "";
      el.style.transform = "";
      el.style.filter = "";
      el.style.maskImage = "";
      return;
    }

    isAnimatingRef.current = true;

    // Reset element state before animation
    el.style.visibility = "hidden";
    el.style.opacity = "0";
    el.style.clipPath = "";
    el.style.transform = "";
    el.style.filter = "";
    el.style.maskImage = "";
    el.style.maskSize = "";
    el.style.maskPosition = "";

    try {
      await applyBrowserEffect({ el, type: mapping.effect, duration: 1500, direction: mapping.direction });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- error intentionally unused, animation cancellation is expected
    } catch (error: unknown) {
      // Animation cancelled or failed
    }

    isAnimatingRef.current = false;

    // Schedule next animation loop
    if (animate) {
      animationRef.current = window.setTimeout(() => {
        runAnimation();
      }, 500);
    }
  }, [type, animate]);

  useEffect(() => {
    if (animate) {
      runAnimation();
    }

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
        animationRef.current = null;
      }
      isAnimatingRef.current = false;
    };
  }, [animate, type, runAnimation]);

  // Static preview for "none" type
  if (type === "none") {
    return (
      <div className={className} style={{ ...containerStyle(size), ...style }}>
        <div style={slideStyle(backgroundColor)} />
      </div>
    );
  }

  // Static preview for "cut" type
  if (type === "cut") {
    return (
      <div className={className} style={{ ...containerStyle(size), ...style }}>
        <div style={slideStyle(backgroundColor)} />
        <div
          style={{
            ...slideStyle(foregroundColor),
            clipPath: "inset(0 50% 0 0)",
          }}
        />
      </div>
    );
  }

  return (
    <div className={className} style={{ ...containerStyle(size), ...style }}>
      {/* Background (next slide) */}
      <div style={slideStyle(backgroundColor)} />
      {/* Foreground (current slide) with animation */}
      <div
        ref={foregroundRef}
        style={{
          ...slideStyle(foregroundColor),
          visibility: "hidden",
        }}
      />
    </div>
  );
}
