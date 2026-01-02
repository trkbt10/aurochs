import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import type { LoadedPresentation } from "../lib/pptx-loader";
import "./SlideViewer.css";

type Props = {
  presentation: LoadedPresentation;
  fileName: string;
  onBack: () => void;
  onStartSlideshow: (slideNumber: number) => void;
};

export function SlideViewer({ presentation, fileName, onBack, onStartSlideshow }: Props) {
  const [currentSlide, setCurrentSlide] = useState(1);
  const [renderedContent, setRenderedContent] = useState<string>("");
  const [isRendering, setIsRendering] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const slideContainerRef = useRef<HTMLDivElement>(null);

  const { presentation: pres } = presentation;
  const totalSlides = pres.count;
  const slideSize = pres.size;

  // Render current slide
  useEffect(() => {
    let cancelled = false;
    setIsRendering(true);

    const slide = pres.getSlide(currentSlide);
    const svg = slide.renderSVG();

    if (!cancelled) {
      setRenderedContent(svg);
      setIsRendering(false);
    }

    return () => {
      cancelled = true;
    };
  }, [pres, currentSlide]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setCurrentSlide((s) => Math.max(1, s - 1));
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setCurrentSlide((s) => Math.min(totalSlides, s + 1));
      } else if (e.key === "Home") {
        e.preventDefault();
        setCurrentSlide(1);
      } else if (e.key === "End") {
        e.preventDefault();
        setCurrentSlide(totalSlides);
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        onStartSlideshow(currentSlide);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onBack();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [totalSlides, currentSlide, onStartSlideshow, onBack]);

  // Thumbnail rendering
  const thumbnails = useMemo(() => {
    const thumbs: { number: number; svg: string }[] = [];
    for (let i = 1; i <= totalSlides; i++) {
      const slide = pres.getSlide(i);
      thumbs.push({ number: i, svg: slide.renderSVG() });
    }
    return thumbs;
  }, [pres, totalSlides]);

  const handlePrev = useCallback(() => {
    setCurrentSlide((s) => Math.max(1, s - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentSlide((s) => Math.min(totalSlides, s + 1));
  }, [totalSlides]);

  return (
    <div className="viewer-container">
      {/* Header */}
      <header className="viewer-header">
        <div className="header-left">
          <button className="back-button" onClick={onBack}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>Back</span>
          </button>
          <div className="header-divider" />
          <div className="file-info">
            <span className="file-name">{fileName}</span>
            <span className="slide-counter">
              {currentSlide} / {totalSlides}
            </span>
          </div>
        </div>

        <div className="header-right">
          <button className="header-action" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 3v18" />
            </svg>
          </button>
          <button className="present-button" onClick={() => onStartSlideshow(currentSlide)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <span>Present</span>
          </button>
        </div>
      </header>

      <div className="viewer-main">
        {/* Sidebar */}
        <aside className={`viewer-sidebar ${isSidebarCollapsed ? "collapsed" : ""}`}>
          <div className="sidebar-header">
            <span className="sidebar-title">Slides</span>
            <span className="sidebar-count">{totalSlides}</span>
          </div>
          <div className="thumbnail-list">
            {thumbnails.map((thumb) => (
              <button
                key={thumb.number}
                className={`thumbnail-item ${thumb.number === currentSlide ? "active" : ""}`}
                onClick={() => setCurrentSlide(thumb.number)}
              >
                <span className="thumbnail-number">{thumb.number}</span>
                <div
                  className="thumbnail-preview"
                  style={{ aspectRatio: `${slideSize.width} / ${slideSize.height}` }}
                  dangerouslySetInnerHTML={{ __html: thumb.svg }}
                />
              </button>
            ))}
          </div>
        </aside>

        {/* Slide Area */}
        <main className="slide-area">
          <button
            className="nav-arrow nav-prev"
            onClick={handlePrev}
            disabled={currentSlide === 1}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div className="slide-wrapper">
            <div
              ref={slideContainerRef}
              className="slide-container"
              style={{ aspectRatio: `${slideSize.width} / ${slideSize.height}` }}
            >
              {isRendering ? (
                <div className="slide-loading">
                  <div className="loading-spinner" />
                </div>
              ) : (
                <div
                  className="slide-content"
                  dangerouslySetInnerHTML={{ __html: renderedContent }}
                />
              )}
            </div>
          </div>

          <button
            className="nav-arrow nav-next"
            onClick={handleNext}
            disabled={currentSlide === totalSlides}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </main>
      </div>

      {/* Footer */}
      <footer className="viewer-footer">
        <div className="footer-left">
          <span className="footer-meta">
            {slideSize.width} x {slideSize.height}
          </span>
        </div>
        <div className="footer-center">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${(currentSlide / totalSlides) * 100}%` }}
            />
          </div>
        </div>
        <div className="footer-right">
          <span className="keyboard-hint">
            <kbd>←</kbd> <kbd>→</kbd> Navigate
            <span className="hint-separator">·</span>
            <kbd>F</kbd> Present
          </span>
        </div>
      </footer>
    </div>
  );
}
