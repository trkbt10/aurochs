/**
 * @file SlideshowPage
 *
 * Full-screen slideshow presentation viewer with animation support.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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

  const containerRef = useRef<HTMLDivElement>(null);
  const slideContentRef = useRef<HTMLDivElement>(null);
  const transitionContainerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<number | undefined>(undefined);

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
      goToNext,
      goToPrev,
      goToFirst: () => goToSlide(1),
      goToLast: () => goToSlide(totalSlides),
      toggleFullscreen,
      toggleBlackScreen,
      toggleWhiteScreen,
      onExit,
    }),
    [goToNext, goToPrev, goToSlide, totalSlides, toggleFullscreen, toggleBlackScreen, toggleWhiteScreen, onExit]
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
        goToNext();
      }
    },
    [goToNext]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      goToPrev();
    },
    [goToPrev]
  );

  // Auto-hide controls
  useEffect(() => {
    function handleMouseMove() {
      setShowControls(true);
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = window.setTimeout(() => {
        if (isFullscreen) {
          setShowControls(false);
        }
      }, 3000);
    }

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(controlsTimeoutRef.current);
    };
  }, [isFullscreen]);

  // Fullscreen change listener
  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const progress = (currentSlide / totalSlides) * 100;

  return (
    <div
      ref={containerRef}
      className="slideshow-container"
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      {/* Overlay screens */}
      <div className={`screen-overlay black ${isBlackScreen ? "active" : ""}`} />
      <div className={`screen-overlay white ${isWhiteScreen ? "active" : ""}`} />

      {/* Slide content */}
      <div className="slideshow-stage">
        <div
          className="slideshow-slide-container"
          style={{ aspectRatio: `${slideSize.width} / ${slideSize.height}` }}
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
            style={isTransitioning ? {
              "--transition-duration": `${transitionDuration}ms`,
            } as React.CSSProperties : undefined}
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
