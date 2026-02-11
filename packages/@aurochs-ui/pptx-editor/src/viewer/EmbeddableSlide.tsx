/**
 * @file EmbeddableSlide
 *
 * Lightweight embeddable slide component for iframe embedding.
 */

import { useCallback, useEffect, useRef, type CSSProperties } from "react";
import type { SlideSize } from "@aurochs-office/pptx/domain";
import { SvgContentRenderer } from "@aurochs-renderer/pptx/react";
import { useSlideNavigation } from "./hooks";
import { SlideIndicator, ProgressBar, NavigationControls } from "./components";

export type EmbeddableSlideProps = {
  /** Total number of slides */
  readonly slideCount: number;
  /** Slide dimensions */
  readonly slideSize: SlideSize;
  /** Function to get slide SVG content by index (1-based) */
  readonly getSlideContent: (slideIndex: number) => string;
  /** Initial slide to display (1-based, default: 1) */
  readonly initialSlide?: number;
  /** Show navigation arrows */
  readonly showNavigation?: boolean;
  /** Show slide indicator (current/total) */
  readonly showIndicator?: boolean;
  /** Show progress bar */
  readonly showProgress?: boolean;
  /** Enable auto-play slideshow */
  readonly autoPlay?: boolean;
  /** Auto-play interval in milliseconds (default: 5000) */
  readonly autoPlayInterval?: number;
  /** Pause auto-play on hover */
  readonly pauseOnHover?: boolean;
  /** Loop back to first slide after last */
  readonly loop?: boolean;
  /** Aspect ratio constraint */
  readonly aspectRatio?: "16:9" | "4:3" | "auto";
  /** Maximum width */
  readonly maxWidth?: string | number;
  /** Maximum height */
  readonly maxHeight?: string | number;
  /** Callback when slide changes */
  readonly onSlideChange?: (slideIndex: number) => void;
  /** Callback for fullscreen request */
  readonly onFullscreenRequest?: () => void;
  /** Additional CSS class */
  readonly className?: string;
  /** Additional inline styles */
  readonly style?: CSSProperties;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  position: "relative",
  display: "flex",
  flexDirection: "column",
  backgroundColor: "#1a1a1a",
  borderRadius: "8px",
  overflow: "hidden",
};

const slideAreaStyle: CSSProperties = {
  position: "relative",
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#000",
};

const slideContainerStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const slideContentStyle: CSSProperties = {
  maxWidth: "100%",
  maxHeight: "100%",
  objectFit: "contain",
};

const controlsOverlayStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  pointerEvents: "none",
  opacity: 0,
  transition: "opacity 0.2s ease",
};

const controlsVisibleStyle: CSSProperties = {
  ...controlsOverlayStyle,
  opacity: 1,
};

const topControlsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  padding: "8px 12px",
  background: "linear-gradient(to bottom, rgba(0, 0, 0, 0.5), transparent)",
  pointerEvents: "auto",
};

const bottomControlsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "8px 12px",
  background: "linear-gradient(to top, rgba(0, 0, 0, 0.5), transparent)",
  pointerEvents: "auto",
};

const progressContainerStyle: CSSProperties = {
  flex: 1,
  margin: "0 12px",
};

/**
 * Lightweight embeddable slide viewer for iframe embedding.
 *
 * @example
 * ```tsx
 * <EmbeddableSlide
 *   slideCount={10}
 *   slideSize={{ width: 960, height: 540 }}
 *   getSlideContent={(index) => slides[index].svg}
 *   showNavigation
 *   showIndicator
 *   autoPlay
 *   autoPlayInterval={5000}
 *   loop
 * />
 * ```
 */
export function EmbeddableSlide({
  slideCount,
  slideSize,
  getSlideContent,
  initialSlide = 1,
  showNavigation = true,
  showIndicator = true,
  showProgress = true,
  autoPlay = false,
  autoPlayInterval = 5000,
  pauseOnHover = true,
  loop = false,
  aspectRatio = "auto",
  maxWidth,
  maxHeight,
  onSlideChange,
  onFullscreenRequest,
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

  // Auto-play functionality
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

  const computedAspectRatio =
    aspectRatio === "auto"
      ? `${slideSize.width} / ${slideSize.height}`
      : aspectRatio === "16:9"
        ? "16 / 9"
        : "4 / 3";

  const computedStyle: CSSProperties = {
    ...containerStyle,
    aspectRatio: computedAspectRatio,
    maxWidth: maxWidth ?? "100%",
    maxHeight: maxHeight ?? "100%",
    ...style,
  };

  return (
    <div
      ref={containerRef}
      style={computedStyle}
      className={className}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div style={slideAreaStyle}>
        <div style={slideContainerStyle}>
          <SvgContentRenderer
            svg={svg}
            width={slideSize.width}
            height={slideSize.height}
            mode="full"
            style={slideContentStyle}
          />
        </div>

        <div style={controlsVisibleStyle}>
          {showIndicator && (
            <div style={topControlsStyle}>
              <SlideIndicator current={nav.currentSlide} total={slideCount} variant="light" />
            </div>
          )}

          <div style={bottomControlsStyle}>
            {showNavigation && (
              <NavigationControls
                onPrev={nav.goToPrev}
                onNext={nav.goToNext}
                canGoPrev={!nav.isFirst || loop}
                canGoNext={!nav.isLast || loop}
                variant="minimal"
                iconSize={20}
              />
            )}
            {showProgress && (
              <div style={progressContainerStyle}>
                <ProgressBar
                  progress={nav.progress}
                  variant="light"
                  interactive
                  onSeek={(progress) => {
                    const targetSlide = Math.max(1, Math.ceil((progress / 100) * slideCount));
                    nav.goToSlide(targetSlide);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
