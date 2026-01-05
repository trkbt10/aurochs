/**
 * @file SlideshowPage
 *
 * Full-screen slideshow presentation viewer with animation support.
 */

import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from "react";
import type { LoadedPresentation } from "@lib/pptx/app";
import { useSlideAnimation, useSlideTransition, SvgContentRenderer } from "../../../src/pptx/render/react";
import { useSlideshowKeyboard } from "../hooks/useSlideshowKeyboard";
import { NavButton } from "./slideshow";
import {
  CloseIcon,
  EnterFullscreenIcon,
  ExitFullscreenIcon,
  SlideIndicator,
} from "./ui";
import "./SlideshowPage.css";

type Props = {
  presentation: LoadedPresentation;
  startSlide: number;
  onExit: () => void;
};

/**
 * Full-screen slideshow presentation viewer.
 *
 * Features:
 * - Keyboard navigation (arrows, space, etc.)
 * - Mouse click navigation (left-click next, right-click prev)
 * - Animation playback with skip functionality
 * - Fullscreen support
 * - Black/white screen overlays
 */
export function SlideshowPage({ presentation, startSlide, onExit }: Props) {
  const { presentation: pres } = presentation;
  const totalSlides = pres.count;
  const slideSize = pres.size;

  const [currentSlide, setCurrentSlide] = useState(startSlide);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBlackScreen, setIsBlackScreen] = useState(false);
  const [isWhiteScreen, setIsWhiteScreen] = useState(false);
  const [renderSize, setRenderSize] = useState(() => ({
    width: slideSize.width,
    height: slideSize.height,
  }));

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const slideContentRef = useRef<HTMLDivElement>(null);
  const transitionContainerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<number | undefined>(undefined);

  // Ref for reading latest value in event handlers without triggering effect re-runs
  const isFullscreenRef = useRef(isFullscreen);
  if (isFullscreenRef.current !== isFullscreen) {
    isFullscreenRef.current = isFullscreen;
  }

  // Get current slide (timing is accessed via slide.timing)
  const slide = useMemo(() => pres.getSlide(currentSlide), [pres, currentSlide]);

  // Memoize slide content (synchronous rendering)
  const renderedContent = useMemo(() => slide.renderSVG(), [slide]);

  // Use slide transition hook for slide change effects
  // Returns previous content to render behind current during transition
  const {
    isTransitioning,
    previousContent,
    transitionClass,
    transitionDuration,
  } = useSlideTransition({
    slideIndex: currentSlide,
    currentContent: renderedContent,
    transition: slide.transition,
    containerRef: transitionContainerRef,
  });

  // Use slide animation hook for clean animation control
  const { isAnimating, skipAnimation, hasAnimations } = useSlideAnimation({
    slideIndex: currentSlide,
    timing: slide.timing,
    containerRef: slideContentRef,
    autoPlay: true,
  });

  // Extract advance settings from current slide's transition
  // @see ECMA-376 Part 1, Section 19.5.91 (p:transition)
  // advClick: Specifies whether a mouse click will advance the slide (default: true)
  // advTm: Time in ms after which to auto-advance (measured from transition completion)
  const advanceOnClick = slide.transition?.advanceOnClick ?? true;
  const advanceAfter = slide.transition?.advanceAfter;

  // Track when transition completes for advanceAfter timing
  const transitionCompleteTimeRef = useRef<number>(0);

  // Update transition complete time when transition ends
  useLayoutEffect(() => {
    if (!isTransitioning) {
      // Transition just completed (or never started) - record the time
      transitionCompleteTimeRef.current = performance.now();
    }
  }, [isTransitioning]);

  // Resize slide to fit stage (respecting slide aspect ratio)
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }

    function updateRenderSize() {
      const availableWidth = stage.clientWidth;
      const availableHeight = stage.clientHeight;

      if (availableWidth <= 0 || availableHeight <= 0) {
        return;
      }

      if (slideSize.width <= 0 || slideSize.height <= 0) {
        throw new Error("Slide size must be positive to compute fullscreen scale.");
      }

      const scale = Math.min(
        availableWidth / slideSize.width,
        availableHeight / slideSize.height
      );

      const nextWidth = Math.round(slideSize.width * scale);
      const nextHeight = Math.round(slideSize.height * scale);

      setRenderSize((prev) => {
        if (prev.width === nextWidth && prev.height === nextHeight) {
          return prev;
        }
        return { width: nextWidth, height: nextHeight };
      });
    }

    updateRenderSize();

    const resizeObserver = new ResizeObserver(() => {
      updateRenderSize();
    });
    resizeObserver.observe(stage);

    return () => {
      resizeObserver.disconnect();
    };
  }, [isFullscreen, slideSize.height, slideSize.width]);

  // Auto-advance timer (advanceAfter)
  // Starts counting from when the transition completes
  // @see ECMA-376: "time starts from the point when the slide has transitioned"
  useLayoutEffect(() => {
    // Only set up timer if advanceAfter is specified and we're not at the last slide
    if (!advanceAfter || currentSlide >= totalSlides) {
      return;
    }

    // Don't start timer while transitioning
    if (isTransitioning) {
      return;
    }

    // Don't auto-advance if screen is blacked/whited out
    if (isBlackScreen || isWhiteScreen) {
      return;
    }

    // Calculate remaining time based on when transition completed
    const elapsed = performance.now() - transitionCompleteTimeRef.current;
    const remaining = Math.max(0, advanceAfter - elapsed);

    const timerId = window.setTimeout(() => {
      setCurrentSlide((s) => Math.min(s + 1, totalSlides));
    }, remaining);

    return () => {
      clearTimeout(timerId);
    };
  }, [advanceAfter, currentSlide, totalSlides, isTransitioning, isBlackScreen, isWhiteScreen]);

  // Navigation with animation awareness
  const goToNext = useCallback(() => {
    if (isAnimating) {
      // Skip animation - show all shapes
      skipAnimation();
      return;
    }

    if (currentSlide < totalSlides) {
      setCurrentSlide((s) => s + 1);
      setIsBlackScreen(false);
      setIsWhiteScreen(false);
    }
  }, [currentSlide, totalSlides, isAnimating, skipAnimation]);

  // Handle click/keyboard advance (respects advanceOnClick setting)
  const handleAdvance = useCallback(() => {
    // Always allow skipping animation
    if (isAnimating) {
      skipAnimation();
      return;
    }

    // Check advanceOnClick setting
    if (!advanceOnClick) {
      // advanceOnClick is false - don't advance on click
      return;
    }

    if (currentSlide < totalSlides) {
      setCurrentSlide((s) => s + 1);
      setIsBlackScreen(false);
      setIsWhiteScreen(false);
    }
  }, [advanceOnClick, isAnimating, skipAnimation, currentSlide, totalSlides]);

  const goToPrev = useCallback(() => {
    if (currentSlide > 1) {
      setCurrentSlide((s) => s - 1);
      setIsBlackScreen(false);
      setIsWhiteScreen(false);
    }
  }, [currentSlide]);

  const goToSlide = useCallback(
    (num: number) => {
      const target = Math.max(1, Math.min(totalSlides, num));
      setCurrentSlide(target);
      setIsBlackScreen(false);
      setIsWhiteScreen(false);
    },
    [totalSlides]
  );

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) {
      return;
    }

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  }, []);

  // Keyboard navigation
  const toggleBlackScreen = useCallback(() => {
    setIsBlackScreen((b) => !b);
    setIsWhiteScreen(false);
  }, []);

  const toggleWhiteScreen = useCallback(() => {
    setIsWhiteScreen((w) => !w);
    setIsBlackScreen(false);
  }, []);

  const keyboardActions = useMemo(
    () => ({
      goToNext: handleAdvance,
      goToPrev,
      goToFirst: () => goToSlide(1),
      goToLast: () => goToSlide(totalSlides),
      toggleFullscreen,
      toggleBlackScreen,
      toggleWhiteScreen,
      onExit,
    }),
    [handleAdvance, goToPrev, goToSlide, totalSlides, toggleFullscreen, toggleBlackScreen, toggleWhiteScreen, onExit]
  );

  useSlideshowKeyboard(keyboardActions);

  // Mouse click navigation
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-controls]")) {
        return;
      }

      if (e.button === 0) {
        handleAdvance();
      }
    },
    [handleAdvance]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      goToPrev();
    },
    [goToPrev]
  );

  // Auto-hide controls
  // Uses ref to read isFullscreen without re-running effect (useEffectEvent pattern)
  useEffect(() => {
    function handleMouseMove() {
      setShowControls(true);
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = window.setTimeout(() => {
        if (isFullscreenRef.current) {
          setShowControls(false);
        }
      }, 3000);
    }

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  // Fullscreen change listener
  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const progress = (currentSlide / totalSlides) * 100;
  const transitionStyle = useMemo(() => {
    if (!isTransitioning) {
      return undefined;
    }
    return {
      "--transition-duration": `${transitionDuration}ms`,
    } as React.CSSProperties;
  }, [isTransitioning, transitionDuration]);

  return (
    <div
      ref={containerRef}
      className={`slideshow-container${isFullscreen ? " fullscreen" : ""}`}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      {/* Overlay screens */}
      <div className={`screen-overlay black ${isBlackScreen ? "active" : ""}`} />
      <div className={`screen-overlay white ${isWhiteScreen ? "active" : ""}`} />

      {/* Slide content */}
      <div ref={stageRef} className="slideshow-stage">
        <div
          className="slideshow-slide-container"
          style={{ width: `${renderSize.width}px`, height: `${renderSize.height}px` }}
        >
          {/* Previous slide (behind) - shown during transition */}
          {isTransitioning && previousContent && (
            <div className="slideshow-slide slideshow-slide-previous">
              <SvgContentRenderer
                svg={previousContent}
                width={slideSize.width}
                height={slideSize.height}
                mode="full"
                className="slideshow-content"
              />
            </div>
          )}

          {/* Current slide (on top) - with transition animation */}
          <div
            ref={transitionContainerRef}
            className={`slideshow-slide slideshow-slide-current ${isTransitioning ? transitionClass : ""}`}
            style={transitionStyle}
          >
            <SvgContentRenderer
              ref={slideContentRef}
              svg={renderedContent}
              width={slideSize.width}
              height={slideSize.height}
              mode="full"
              className="slideshow-content"
            />
          </div>
        </div>
      </div>

      {/* Controls overlay */}
      <div
        data-controls
        className={`slideshow-controls ${showControls ? "visible" : ""}`}
      >
        {/* Top bar */}
        <div className="controls-top">
          <button className="control-button exit" onClick={onExit}>
            <CloseIcon size={16} />
            <span>Exit</span>
          </button>

          <SlideIndicator
            current={currentSlide}
            total={totalSlides}
            variant="light"
            showAnimation={hasAnimations}
          />

          <button className="control-button fullscreen" onClick={toggleFullscreen}>
            {isFullscreen ? <ExitFullscreenIcon size={16} /> : <EnterFullscreenIcon size={16} />}
            <span className="button-label">{isFullscreen ? "Exit" : "Fullscreen"}</span>
          </button>
        </div>

        {/* Progress bar */}
        <div className="controls-progress">
          <div className="progress-track">
            <div className="progress-bar" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Navigation arrows */}
        <NavButton
          direction="prev"
          onClick={goToPrev}
          disabled={currentSlide === 1}
        />
        <NavButton
          direction="next"
          onClick={goToNext}
          disabled={currentSlide === totalSlides && !isAnimating}
        />

        {/* Keyboard hints */}
        <div className="keyboard-hints">
          <span><kbd>←</kbd><kbd>→</kbd> Navigate</span>
          <span><kbd>F</kbd> Fullscreen</span>
          <span><kbd>B</kbd> Black</span>
          <span><kbd>Esc</kbd> Exit</span>
        </div>
      </div>
    </div>
  );
}
