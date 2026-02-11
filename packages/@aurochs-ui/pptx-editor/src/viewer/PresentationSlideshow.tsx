/**
 * @file Presentation slideshow
 *
 * Shared slideshow player for preview and app pages.
 * Uses decomposed hooks and shared viewer components.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import type { SlideSize, SlideTransition } from "@aurochs-office/pptx/domain";
import type { Timing } from "@aurochs-office/pptx/domain/animation";
import { useSlideAnimation, useSlideTransition, SvgContentRenderer } from "@aurochs-renderer/pptx/react";
import { CloseIcon, EnterFullscreenIcon, ExitFullscreenIcon, ChevronLeftIcon, ChevronRightIcon } from "@aurochs-ui/ui-components/icons";
import { useSlideNavigation } from "./hooks";
import { SlideIndicator, ProgressBar } from "./components";
import {
  useSlideshowAutoAdvance,
  useSlideshowControls,
  useSlideshowKeyboard,
  useSlideshowRenderSize,
} from "./hooks";
import {
  getContainerStyle,
  getScreenOverlayStyle,
  getStageStyle,
  getSlideContainerStyle,
  slidePreviousStyle,
  getSlideCurrentStyle,
  slideContentStyle,
  getControlsStyle,
  controlsTopStyle,
  controlsProgressStyle,
  controlButtonStyle,
  getNavButtonStyle,
} from "./slideshow-styles";


export type SlideshowSlideContent = {
  readonly svg: string;
  readonly timing?: Timing;
  readonly transition?: SlideTransition;
};

export type PresentationSlideshowProps = {
  readonly slideCount: number;
  readonly slideSize: SlideSize;
  readonly startSlideIndex?: number;
  readonly getSlideContent: (slideIndex: number) => SlideshowSlideContent;
  readonly onExit: () => void;
};

/**
 * Shared slideshow player.
 */
export function PresentationSlideshow({
  slideCount,
  slideSize,
  startSlideIndex = 1,
  getSlideContent,
  onExit,
}: PresentationSlideshowProps) {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBlackScreen, setIsBlackScreen] = useState(false);
  const [isWhiteScreen, setIsWhiteScreen] = useState(false);

  const containerRef = useRef<HTMLDialogElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const slideContentRef = useRef<HTMLDivElement>(null);
  const transitionContainerRef = useRef<HTMLDivElement>(null);

  // Slide navigation using shared hook
  const navigation = useSlideNavigation({
    totalSlides: slideCount,
    initialSlide: Math.max(1, Math.min(slideCount, startSlideIndex)),
  });

  // Get current slide content
  const { svg, timing, transition } = useMemo(
    () => getSlideContent(navigation.currentSlide),
    [getSlideContent, navigation.currentSlide],
  );

  // Slide transition effects (uses JS-based animation/effects.ts)
  const { isTransitioning, previousContent, transitionDuration } = useSlideTransition({
    slideIndex: navigation.currentSlide,
    currentContent: svg,
    transition,
    containerRef: transitionContainerRef,
  });

  // Slide animations
  const { isAnimating, skipAnimation, hasAnimations } = useSlideAnimation({
    slideIndex: navigation.currentSlide,
    timing,
    containerRef: slideContentRef,
    autoPlay: true,
  });

  // Render size based on stage dimensions
  const renderSize = useSlideshowRenderSize({ stageRef, slideSize });

  // Auto-hide controls on mouse inactivity
  const { showControls } = useSlideshowControls({ containerRef, hideDelay: 2500 });

  // Handle close
  const handleClose = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    }
    onExit();
  }, [onExit]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => undefined);
      return;
    }

    document.exitFullscreen().catch(() => undefined);
  }, []);

  // Navigation with animation skip
  const goToNext = useCallback(() => {
    if (isAnimating) {
      skipAnimation();
      return;
    }
    navigation.goToNext();
    setIsBlackScreen(false);
    setIsWhiteScreen(false);
  }, [isAnimating, skipAnimation, navigation]);

  const goToPrev = useCallback(() => {
    if (isAnimating) {
      skipAnimation();
      return;
    }
    navigation.goToPrev();
    setIsBlackScreen(false);
    setIsWhiteScreen(false);
  }, [isAnimating, skipAnimation, navigation]);

  const goToFirst = useCallback(() => {
    navigation.goToFirst();
    setIsBlackScreen(false);
    setIsWhiteScreen(false);
  }, [navigation]);

  const goToLast = useCallback(() => {
    navigation.goToLast();
    setIsBlackScreen(false);
    setIsWhiteScreen(false);
  }, [navigation]);

  // Screen overlay toggles
  const toggleBlackScreen = useCallback(() => {
    setIsBlackScreen((v) => !v);
    setIsWhiteScreen(false);
  }, []);

  const toggleWhiteScreen = useCallback(() => {
    setIsWhiteScreen((v) => !v);
    setIsBlackScreen(false);
  }, []);

  // Keyboard navigation
  useSlideshowKeyboard({
    goToNext,
    goToPrev,
    goToFirst,
    goToLast,
    toggleFullscreen,
    toggleBlackScreen,
    toggleWhiteScreen,
    onExit: handleClose,
  });

  // Auto-advance based on transition settings
  const advanceOnClick = transition?.advanceOnClick ?? true;
  const advanceAfter = transition?.advanceAfter;

  useSlideshowAutoAdvance({
    advanceAfter,
    currentSlideIndex: navigation.currentSlide,
    slideCount,
    isTransitioning,
    isBlackScreen,
    isWhiteScreen,
    onAdvance: () => navigation.setCurrentSlide(Math.min(navigation.currentSlide + 1, slideCount)),
  });

  // Track fullscreen state
  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Handle click to advance
  const handleClick = useCallback(
    (event: MouseEvent<HTMLDialogElement>) => {
      const target = event.target as HTMLElement;
      if (target.closest("[data-controls]")) {
        return;
      }

      if (isAnimating) {
        skipAnimation();
        return;
      }

      if (!advanceOnClick) {
        return;
      }

      goToNext();
    },
    [advanceOnClick, goToNext, isAnimating, skipAnimation],
  );

  // Handle right-click to go back
  const handleContextMenu = useCallback(
    (event: MouseEvent<HTMLDialogElement>) => {
      event.preventDefault();
      goToPrev();
    },
    [goToPrev],
  );

  // Portal target setup
  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  // Dialog modal setup
  useEffect(() => {
    const dialog = containerRef.current;
    if (!dialog) {
      return;
    }

    if (dialog.open) {
      return;
    }

    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }

    return () => {
      dialog.close();
    };
  }, []);

  if (!portalTarget) {
    return null;
  }

  return createPortal(
    <dialog
      ref={containerRef}
      style={getContainerStyle(isFullscreen)}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onCancel={handleClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Screen overlays */}
      <div style={getScreenOverlayStyle("black", isBlackScreen)} />
      <div style={getScreenOverlayStyle("white", isWhiteScreen)} />

      {/* Slide stage */}
      <div ref={stageRef} style={getStageStyle(isFullscreen)}>
        <div style={getSlideContainerStyle(renderSize.width, renderSize.height, isFullscreen)}>
          {isTransitioning && previousContent && (
            <div style={slidePreviousStyle}>
              <SvgContentRenderer
                svg={previousContent}
                width={slideSize.width}
                height={slideSize.height}
                mode="full"
                style={slideContentStyle}
              />
            </div>
          )}
          <div
            ref={transitionContainerRef}
            style={getSlideCurrentStyle(isTransitioning, transitionDuration)}
          >
            <SvgContentRenderer
              ref={slideContentRef}
              svg={svg}
              width={slideSize.width}
              height={slideSize.height}
              mode="full"
              style={slideContentStyle}
            />
          </div>
        </div>
      </div>

      {/* Controls overlay */}
      <div data-controls style={getControlsStyle(showControls)}>
        {/* Top bar */}
        <div style={controlsTopStyle}>
          <button type="button" style={controlButtonStyle} onClick={handleClose}>
            <CloseIcon size={16} />
            <span>Exit</span>
          </button>

          <SlideIndicator
            current={navigation.currentSlide}
            total={slideCount}
            variant="light"
            showAnimation={hasAnimations}
          />

          <button type="button" style={controlButtonStyle} onClick={toggleFullscreen}>
            {isFullscreen ? <ExitFullscreenIcon size={16} /> : <EnterFullscreenIcon size={16} />}
            <span>{isFullscreen ? "Exit" : "Fullscreen"}</span>
          </button>
        </div>

        {/* Progress bar */}
        <div style={controlsProgressStyle}>
          <ProgressBar progress={navigation.progress} variant="light" />
        </div>

        {/* Navigation buttons */}
        <button
          type="button"
          style={getNavButtonStyle("prev", navigation.isFirst)}
          onClick={goToPrev}
          disabled={navigation.isFirst}
          aria-label="Previous slide"
        >
          <ChevronLeftIcon size={18} />
        </button>
        <button
          type="button"
          style={getNavButtonStyle("next", navigation.isLast)}
          onClick={goToNext}
          disabled={navigation.isLast}
          aria-label="Next slide"
        >
          <ChevronRightIcon size={18} />
        </button>
      </div>
    </dialog>,
    portalTarget,
  );
}
