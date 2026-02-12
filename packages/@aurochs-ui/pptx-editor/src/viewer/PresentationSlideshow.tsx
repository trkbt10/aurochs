/**
 * @file Presentation slideshow
 *
 * Fullscreen slideshow player for presentations.
 *
 * Design principles:
 * - Content first: Slide fills entire viewport without UI overlap
 * - Click-to-advance: Primary navigation via click/tap
 * - Edge controls: UI at screen edges, auto-hiding on inactivity
 * - Keyboard-primary: Arrow keys, Escape, F for fullscreen
 */

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import type { SlideSize, SlideTransition } from "@aurochs-office/pptx/domain";
import type { Timing } from "@aurochs-office/pptx/domain/animation";
import { useSlideAnimation, useSlideTransition, SvgContentRenderer } from "@aurochs-renderer/pptx/react";
import { CloseIcon, EnterFullscreenIcon, ExitFullscreenIcon, ChevronLeftIcon, ChevronRightIcon } from "@aurochs-ui/ui-components/icons";
import { useSlideNavigation } from "./hooks";
import { SlideIndicator } from "./components";
import {
  useSlideshowAutoAdvance,
  useSlideshowControls,
  useSlideshowKeyboard,
} from "./hooks";
import {
  getContainerStyle,
  getScreenOverlayStyle,
  getStageStyle,
  getSlideContainerStyle,
  slidePreviousStyle,
  getSlideCurrentStyle,
  slideContentStyle,
  getControlsWrapperStyle,
  controlsTopBarStyle,
  controlButtonStyle,
  getClickZoneStyle,
  getHintArrowStyle,
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
 * Fullscreen slideshow player.
 *
 * Navigation:
 * - Click anywhere to advance
 * - Right-click to go back
 * - Hover edges for visual nav hints
 * - Keyboard: arrows, Home, End, Escape, F
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
  const [hoverSide, setHoverSide] = useState<"left" | "right" | null>(null);

  const containerRef = useRef<HTMLDialogElement>(null);
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

  // Slide transition effects
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

  // Handle click to advance (on main stage area)
  const handleStageClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      // Ignore clicks on control elements
      if (target.closest("[data-controls]") || target.closest("[data-click-zone]")) {
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

  // Handle dialog cancel (Escape key via dialog)
  const handleDialogCancel = useCallback(
    (event: Event) => {
      event.preventDefault();
      handleClose();
    },
    [handleClose],
  );

  // Click zone handlers
  const handleLeftZoneClick = useCallback(() => {
    if (!navigation.isFirst) {
      goToPrev();
    }
  }, [navigation.isFirst, goToPrev]);

  const handleRightZoneClick = useCallback(() => {
    if (!navigation.isLast) {
      goToNext();
    }
  }, [navigation.isLast, goToNext]);

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

    // Listen for cancel event (Escape key)
    dialog.addEventListener("cancel", handleDialogCancel);

    return () => {
      dialog.removeEventListener("cancel", handleDialogCancel);
      dialog.close();
    };
  }, [handleDialogCancel]);

  if (!portalTarget) {
    return null;
  }

  return createPortal(
    <dialog
      ref={containerRef}
      style={getContainerStyle(isFullscreen)}
      onContextMenu={handleContextMenu}
      role="dialog"
      aria-modal="true"
    >
      {/* Screen overlays */}
      <div style={getScreenOverlayStyle("black", isBlackScreen)} />
      <div style={getScreenOverlayStyle("white", isWhiteScreen)} />

      {/* Slide stage - fills entire viewport */}
      <div style={getStageStyle(isFullscreen)} onClick={handleStageClick}>
        <div style={getSlideContainerStyle(slideSize.width, slideSize.height, isFullscreen)}>
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

      {/* Click zones for navigation hints */}
      <div
        data-click-zone="left"
        style={getClickZoneStyle("left")}
        onClick={handleLeftZoneClick}
        onMouseEnter={() => setHoverSide("left")}
        onMouseLeave={() => setHoverSide(null)}
      >
        <div style={getHintArrowStyle("left", hoverSide === "left" && showControls, navigation.isFirst)}>
          <ChevronLeftIcon size={24} />
        </div>
      </div>
      <div
        data-click-zone="right"
        style={getClickZoneStyle("right")}
        onClick={handleRightZoneClick}
        onMouseEnter={() => setHoverSide("right")}
        onMouseLeave={() => setHoverSide(null)}
      >
        <div style={getHintArrowStyle("right", hoverSide === "right" && showControls, navigation.isLast)}>
          <ChevronRightIcon size={24} />
        </div>
      </div>

      {/* Controls overlay - auto-hides */}
      <div data-controls style={getControlsWrapperStyle(showControls)}>
        {/* Top bar: Exit, Indicator, Fullscreen */}
        <div style={controlsTopBarStyle}>
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

      </div>
    </dialog>,
    portalTarget,
  );
}
