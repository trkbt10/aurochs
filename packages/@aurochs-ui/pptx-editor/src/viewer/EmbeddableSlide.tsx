/**
 * @file EmbeddableSlide
 *
 * Lightweight embeddable slide component for iframe embedding.
 *
 * Design principles:
 * - Content first: Slide is always fully visible
 * - Controls outside content: Control bar below slide
 * - Minimal by default: Clean appearance without UI clutter
 */

import { useCallback, useEffect, useMemo, useRef, type CSSProperties } from "react";
import type { SlideSize } from "@aurochs-office/pptx/domain";
import { SvgContentRenderer } from "@aurochs-renderer/pptx/react";
import { useSlideNavigation, useViewerKeyboard } from "./hooks";
import { ViewerControls } from "./components";
import { radiusTokens, colorTokens } from "@aurochs-ui/ui-components/design-tokens";

export type EmbeddableSlideProps = {
  /** Total number of slides */
  readonly slideCount: number;
  /** Slide dimensions */
  readonly slideSize: SlideSize;
  /** Function to get slide SVG content by index (1-based) */
  readonly getSlideContent: (slideIndex: number) => string;
  /** Initial slide to display (1-based) */
  readonly initialSlide?: number;
  /** Show controls bar */
  readonly showControls?: boolean;
  /** Enable auto-play slideshow */
  readonly autoPlay?: boolean;
  /** Auto-play interval in milliseconds */
  readonly autoPlayInterval?: number;
  /** Pause auto-play on hover */
  readonly pauseOnHover?: boolean;
  /** Loop back to first slide after last */
  readonly loop?: boolean;
  /** Maximum width */
  readonly maxWidth?: string | number;
  /** Maximum height */
  readonly maxHeight?: string | number;
  /** Callback when slide changes */
  readonly onSlideChange?: (slideIndex: number) => void;
  /** Additional CSS class */
  readonly className?: string;
  /** Additional inline styles */
  readonly style?: CSSProperties;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  backgroundColor: colorTokens.background.tertiary,
  borderRadius: radiusTokens.lg,
  overflow: "hidden",
};

const slideAreaStyle: CSSProperties = {
  position: "relative",
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 0,
};

const slideContainerStyle: CSSProperties = {
  width: "100%",
  height: "100%",
};

/**
 * Lightweight embeddable slide viewer.
 */
export function EmbeddableSlide({
  slideCount,
  slideSize,
  getSlideContent,
  initialSlide = 1,
  showControls = true,
  autoPlay = false,
  autoPlayInterval = 5000,
  pauseOnHover = true,
  loop = false,
  maxWidth,
  maxHeight,
  onSlideChange,
  className,
  style,
}: EmbeddableSlideProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isPausedRef = useRef(false);

  const nav = useSlideNavigation({
    totalSlides: slideCount,
    initialSlide,
    loop,
    onSlideChange,
  });

  const keyboardActions = useMemo(
    () => ({
      goToNext: nav.goToNext,
      goToPrev: nav.goToPrev,
      goToFirst: nav.goToFirst,
      goToLast: nav.goToLast,
      onStartSlideshow: () => {},
      onExit: () => {},
    }),
    [nav],
  );
  useViewerKeyboard(keyboardActions);

  useEffect(() => {
    if (!autoPlay) {
      return;
    }
    const intervalId = setInterval(() => {
      if (!isPausedRef.current) {
        nav.goToNext();
      }
    }, autoPlayInterval);
    return () => clearInterval(intervalId);
  }, [autoPlay, autoPlayInterval, nav]);

  const handleMouseEnter = useCallback(() => {
    if (pauseOnHover) {
      isPausedRef.current = true;
    }
  }, [pauseOnHover]);

  const handleMouseLeave = useCallback(() => {
    if (pauseOnHover) {
      isPausedRef.current = false;
    }
  }, [pauseOnHover]);

  const svg = getSlideContent(nav.currentSlide);

  const computedStyle: CSSProperties = {
    ...containerStyle,
    maxWidth: maxWidth ?? "100%",
    maxHeight: maxHeight ?? "100%",
    ...style,
  };

  return (
    <div
      ref={containerRef}
      style={computedStyle}
      className={className}
      tabIndex={0}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div style={slideAreaStyle}>
        <div style={{ ...slideContainerStyle, aspectRatio: `${slideSize.width} / ${slideSize.height}` }}>
          <SvgContentRenderer svg={svg} width={slideSize.width} height={slideSize.height} mode="full" />
        </div>
      </div>

      {showControls && (
        <ViewerControls
          navigation={{
            onPrev: nav.goToPrev,
            onNext: nav.goToNext,
            canGoPrev: loop || !nav.isFirst,
            canGoNext: loop || !nav.isLast,
          }}
          position={{
            current: nav.currentSlide,
            total: slideCount,
            progress: nav.progress,
            onSeek: (targetSlide) => nav.goToSlide(targetSlide),
          }}
        />
      )}
    </div>
  );
}
