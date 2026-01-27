/**
 * @file Presentation slideshow
 *
 * Shared slideshow player for preview and app pages.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";
import type { SlideSize, SlideTransition } from "@oxen/pptx/domain";
import type { Timing } from "@oxen/pptx/domain/animation";
import { useSlideAnimation, useSlideTransition, SvgContentRenderer } from "@oxen/pptx-render/react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  EnterFullscreenIcon,
  ExitFullscreenIcon,
} from "@oxen-ui/ui-components/icons";
import "./SlideshowPlayer.css";

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

const CONTROL_HIDE_DELAY = 2500;

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
  const [currentSlideIndex, setCurrentSlideIndex] = useState(() => {
    if (startSlideIndex < 1) {
      return 1;
    }
    if (startSlideIndex > slideCount) {
      return slideCount;
    }
    return startSlideIndex;
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBlackScreen, setIsBlackScreen] = useState(false);
  const [isWhiteScreen, setIsWhiteScreen] = useState(false);
  const [renderSize, setRenderSize] = useState(() => ({
    width: slideSize.width as number,
    height: slideSize.height as number,
  }));

  const containerRef = useRef<HTMLDialogElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const slideContentRef = useRef<HTMLDivElement>(null);
  const transitionContainerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<number | undefined>(undefined);
  const transitionCompleteTimeRef = useRef<number>(0);

  const { svg, timing, transition } = useMemo(
    () => getSlideContent(currentSlideIndex),
    [getSlideContent, currentSlideIndex],
  );

  const {
    isTransitioning,
    previousContent,
    transitionClass,
    transitionDuration,
  } = useSlideTransition({
    slideIndex: currentSlideIndex,
    currentContent: svg,
    transition,
    containerRef: transitionContainerRef,
  });

  const { isAnimating, skipAnimation, hasAnimations } = useSlideAnimation({
    slideIndex: currentSlideIndex,
    timing,
    containerRef: slideContentRef,
    autoPlay: true,
  });

  const advanceOnClick = transition?.advanceOnClick ?? true;
  const advanceAfter = transition?.advanceAfter;

  useLayoutEffect(() => {
    if (!isTransitioning) {
      transitionCompleteTimeRef.current = performance.now();
    }
  }, [isTransitioning]);

  useLayoutEffect(() => {
    const stageElement = stageRef.current;
    if (!stageElement) {
      return;
    }

    function updateRenderSize() {
      const stage = stageRef.current;
      if (!stage) {
        return;
      }
      const availableWidth = stage.clientWidth;
      const availableHeight = stage.clientHeight;
      if (availableWidth <= 0 || availableHeight <= 0) {
        return;
      }

      if (slideSize.width <= 0 || slideSize.height <= 0) {
        throw new Error("Slide size must be positive to compute preview scale.");
      }

      const scale = Math.min(
        availableWidth / slideSize.width,
        availableHeight / slideSize.height,
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
    resizeObserver.observe(stageElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [slideSize.height, slideSize.width]);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    function handleMouseMove() {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        window.clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = window.setTimeout(() => {
        setShowControls(false);
      }, CONTROL_HIDE_DELAY);
    }

    const container = containerRef.current;
    if (!container) {
      return;
    }

    container.addEventListener("mousemove", handleMouseMove);
    handleMouseMove();

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      if (controlsTimeoutRef.current) {
        window.clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  const handleClose = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    }
    onExit();
  }, [onExit]);

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

  const goToNext = useCallback(() => {
    if (isAnimating) {
      skipAnimation();
      return;
    }

    if (currentSlideIndex < slideCount) {
      setCurrentSlideIndex((index) => index + 1);
      setIsBlackScreen(false);
      setIsWhiteScreen(false);
    }
  }, [currentSlideIndex, slideCount, isAnimating, skipAnimation]);

  const goToPrev = useCallback(() => {
    if (isAnimating) {
      skipAnimation();
      return;
    }

    if (currentSlideIndex > 1) {
      setCurrentSlideIndex((index) => index - 1);
      setIsBlackScreen(false);
      setIsWhiteScreen(false);
    }
  }, [currentSlideIndex, isAnimating, skipAnimation]);

  const goToFirst = useCallback(() => {
    setCurrentSlideIndex(1);
    setIsBlackScreen(false);
    setIsWhiteScreen(false);
  }, []);

  const goToLast = useCallback(() => {
    setCurrentSlideIndex(slideCount);
    setIsBlackScreen(false);
    setIsWhiteScreen(false);
  }, [slideCount]);

  useLayoutEffect(() => {
    if (!advanceAfter || currentSlideIndex >= slideCount) {
      return;
    }
    if (isTransitioning) {
      return;
    }
    if (isBlackScreen || isWhiteScreen) {
      return;
    }

    const elapsed = performance.now() - transitionCompleteTimeRef.current;
    const remaining = Math.max(0, advanceAfter - elapsed);

    const timerId = window.setTimeout(() => {
      setCurrentSlideIndex((index) => Math.min(index + 1, slideCount));
    }, remaining);

    return () => {
      clearTimeout(timerId);
    };
  }, [advanceAfter, currentSlideIndex, slideCount, isTransitioning, isBlackScreen, isWhiteScreen]);

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

  const handleContextMenu = useCallback(
    (event: MouseEvent<HTMLDialogElement>) => {
      event.preventDefault();
      goToPrev();
    },
    [goToPrev],
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
        case " ":
        case "Enter":
        case "n":
        case "N":
        case "PageDown":
          event.preventDefault();
          goToNext();
          break;

        case "ArrowLeft":
        case "ArrowUp":
        case "Backspace":
        case "p":
        case "P":
        case "PageUp":
          event.preventDefault();
          goToPrev();
          break;

        case "Escape":
          event.preventDefault();
          handleClose();
          break;

        case "f":
        case "F":
          event.preventDefault();
          toggleFullscreen();
          break;

        case "b":
        case "B":
        case ".":
          event.preventDefault();
          setIsBlackScreen((value) => !value);
          setIsWhiteScreen(false);
          break;

        case "w":
        case "W":
        case ",":
          event.preventDefault();
          setIsWhiteScreen((value) => !value);
          setIsBlackScreen(false);
          break;

        case "Home":
          event.preventDefault();
          goToFirst();
          break;

        case "End":
          event.preventDefault();
          goToLast();
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToFirst, goToLast, goToNext, goToPrev, handleClose, toggleFullscreen]);

  const progress = slideCount > 0 ? (currentSlideIndex / slideCount) * 100 : 0;
  const transitionStyle = useMemo(() => {
    if (!isTransitioning) {
      return undefined;
    }
    return {
      animationDuration: `${transitionDuration}ms`,
    } as CSSProperties;
  }, [isTransitioning, transitionDuration]);

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

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
      className={`slideshow-container${isFullscreen ? " fullscreen" : ""}`}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onCancel={handleClose}
      role="dialog"
      aria-modal="true"
    >
      <div className={`screen-overlay black ${isBlackScreen ? "active" : ""}`} />
      <div className={`screen-overlay white ${isWhiteScreen ? "active" : ""}`} />

      <div ref={stageRef} className="slideshow-stage">
        <div
          className="slideshow-slide-container"
          style={{ width: `${renderSize.width}px`, height: `${renderSize.height}px` }}
        >
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
          <div
            ref={transitionContainerRef}
            className={`slideshow-slide slideshow-slide-current ${isTransitioning ? transitionClass : ""}`}
            style={transitionStyle}
          >
            <SvgContentRenderer
              ref={slideContentRef}
              svg={svg}
              width={slideSize.width}
              height={slideSize.height}
              mode="full"
              className="slideshow-content"
            />
          </div>
        </div>
      </div>

      <div
        data-controls
        className={`slideshow-controls ${showControls ? "visible" : ""}`}
      >
        <div className="controls-top">
          <button className="control-button exit" onClick={handleClose}>
            <CloseIcon size={16} />
            <span>Exit</span>
          </button>

          <div className="slide-indicator">
            <span className="current">{currentSlideIndex}</span>
            <span className="separator">/</span>
            <span className="total">{slideCount}</span>
            {hasAnimations && <span className="animation-indicator">●</span>}
          </div>

          <button className="control-button fullscreen" onClick={toggleFullscreen}>
            {isFullscreen ? <ExitFullscreenIcon size={16} /> : <EnterFullscreenIcon size={16} />}
            <span className="button-label">{isFullscreen ? "Exit" : "Fullscreen"}</span>
          </button>
        </div>

        <div className="controls-progress">
          <div className="progress-track">
            <div className="progress-bar" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <button
          className="nav-button prev"
          onClick={goToPrev}
          disabled={currentSlideIndex <= 1}
          aria-label="Previous slide"
        >
          <ChevronLeftIcon size={18} />
        </button>
        <button
          className="nav-button next"
          onClick={goToNext}
          disabled={currentSlideIndex >= slideCount}
          aria-label="Next slide"
        >
          <ChevronRightIcon size={18} />
        </button>
      </div>
    </dialog>,
    portalTarget,
  );
}
