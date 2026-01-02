import { useState, useEffect, useRef, useCallback } from "react";
import type { LoadedPresentation } from "../lib/pptx-loader";
import "./SlideshowPage.css";

type Props = {
  presentation: LoadedPresentation;
  startSlide: number;
  onExit: () => void;
};

export function SlideshowPage({ presentation, startSlide, onExit }: Props) {
  const { presentation: pres } = presentation;
  const totalSlides = pres.count;
  const slideSize = pres.size;

  const [currentSlide, setCurrentSlide] = useState(startSlide);
  const [renderedContent, setRenderedContent] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBlackScreen, setIsBlackScreen] = useState(false);
  const [isWhiteScreen, setIsWhiteScreen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<number | undefined>(undefined);

  // Render slide with transition
  useEffect(() => {
    setIsTransitioning(true);
    const slide = pres.getSlide(currentSlide);
    const svg = slide.renderSVG();

    const timeout = setTimeout(() => {
      setRenderedContent(svg);
      setIsTransitioning(false);
    }, 150);

    return () => clearTimeout(timeout);
  }, [pres, currentSlide]);

  // Navigation
  const goToNext = useCallback(() => {
    if (currentSlide < totalSlides) {
      setCurrentSlide((s) => s + 1);
      setIsBlackScreen(false);
      setIsWhiteScreen(false);
    }
  }, [currentSlide, totalSlides]);

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
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  }, []);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
        case " ":
        case "Enter":
        case "n":
        case "N":
        case "PageDown":
          e.preventDefault();
          goToNext();
          break;

        case "ArrowLeft":
        case "ArrowUp":
        case "Backspace":
        case "p":
        case "P":
        case "PageUp":
          e.preventDefault();
          goToPrev();
          break;

        case "Escape":
          e.preventDefault();
          if (document.fullscreenElement) {
            document.exitFullscreen();
          }
          onExit();
          break;

        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          break;

        case "b":
        case "B":
        case ".":
          e.preventDefault();
          setIsBlackScreen((b) => !b);
          setIsWhiteScreen(false);
          break;

        case "w":
        case "W":
        case ",":
          e.preventDefault();
          setIsWhiteScreen((w) => !w);
          setIsBlackScreen(false);
          break;

        case "Home":
          e.preventDefault();
          goToSlide(1);
          break;

        case "End":
          e.preventDefault();
          goToSlide(totalSlides);
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrev, goToSlide, toggleFullscreen, onExit, totalSlides]);

  // Mouse click navigation
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-controls]")) return;

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
          className={`slideshow-slide ${isTransitioning ? "transitioning" : ""}`}
          style={{ aspectRatio: `${slideSize.width} / ${slideSize.height}` }}
        >
          <div
            className="slideshow-content"
            dangerouslySetInnerHTML={{ __html: renderedContent }}
          />
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            <span>Exit</span>
          </button>

          <div className="slide-indicator">
            <span className="current">{currentSlide}</span>
            <span className="separator">/</span>
            <span className="total">{totalSlides}</span>
          </div>

          <button className="control-button fullscreen" onClick={toggleFullscreen}>
            {isFullscreen ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="4 14 4 20 10 20" />
                <polyline points="20 10 20 4 14 4" />
                <line x1="14" y1="10" x2="21" y2="3" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            )}
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
        <button
          className="nav-button prev"
          onClick={(e) => {
            e.stopPropagation();
            goToPrev();
          }}
          disabled={currentSlide === 1}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <button
          className="nav-button next"
          onClick={(e) => {
            e.stopPropagation();
            goToNext();
          }}
          disabled={currentSlide === totalSlides}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

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
