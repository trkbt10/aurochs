/**
 * @file Slide viewer layout + interactions.
 *
 * Uses the shared SlideList component for the sidebar thumbnails.
 */

import { useState, useMemo, useCallback, useEffect, useRef, type CSSProperties } from "react";
import type { LoadedPresentation } from "../lib/pptx-loader";
import { SlideList } from "../../../src/pptx-editor/slide-list";
import type { SlideWithId } from "../../../src/pptx-editor/presentation/types";

type Props = {
  presentation: LoadedPresentation;
  fileName: string;
  onBack: () => void;
  onStartSlideshow: (slideNumber: number) => void;
  onStartEditor: () => void;
};

// =============================================================================
// Styles (CSS-in-JS replacing SlideViewer.css)
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  backgroundColor: "#0a0a0a",
  color: "#fafafa",
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 16px",
  backgroundColor: "#111",
  borderBottom: "1px solid #333",
  flexShrink: 0,
};

const headerLeftStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

const backButtonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  padding: "6px 12px",
  background: "none",
  border: "1px solid #444",
  borderRadius: "6px",
  color: "#a1a1a1",
  cursor: "pointer",
  fontSize: "13px",
};

const headerDividerStyle: CSSProperties = {
  width: "1px",
  height: "20px",
  backgroundColor: "#333",
};

const fileInfoStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "2px",
};

const fileNameStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 500,
  color: "#fafafa",
};

const slideCounterStyle: CSSProperties = {
  fontSize: "12px",
  color: "#737373",
};

const headerRightStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const headerActionStyle: CSSProperties = {
  padding: "6px",
  background: "none",
  border: "none",
  borderRadius: "4px",
  color: "#a1a1a1",
  cursor: "pointer",
};

const editButtonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  padding: "6px 12px",
  background: "none",
  border: "1px solid #444",
  borderRadius: "6px",
  color: "#a1a1a1",
  cursor: "pointer",
  fontSize: "13px",
};

const presentButtonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  padding: "6px 16px",
  background: "#3b82f6",
  border: "none",
  borderRadius: "6px",
  color: "#fff",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: 500,
};

const mainStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  overflow: "hidden",
};

const sidebarStyle: CSSProperties = {
  width: "180px",
  backgroundColor: "#1a1a1a",
  borderRight: "1px solid #333",
  display: "flex",
  flexDirection: "column",
  flexShrink: 0,
  transition: "width 0.2s ease",
};

const sidebarCollapsedStyle: CSSProperties = {
  ...sidebarStyle,
  width: 0,
  overflow: "hidden",
};

const sidebarHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px",
  borderBottom: "1px solid #333",
};

const sidebarTitleStyle: CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  color: "#737373",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const sidebarCountStyle: CSSProperties = {
  fontSize: "11px",
  color: "#525252",
};

const thumbnailListStyle: CSSProperties = {
  flex: 1,
  overflow: "auto",
};

const slideAreaStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
  backgroundColor: "#111",
  padding: "24px",
};

const navArrowStyle: CSSProperties = {
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  width: "40px",
  height: "40px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(0, 0, 0, 0.5)",
  border: "none",
  borderRadius: "50%",
  color: "#fff",
  cursor: "pointer",
  opacity: 0.7,
  transition: "opacity 0.2s ease",
  zIndex: 10,
};

const navPrevStyle: CSSProperties = {
  ...navArrowStyle,
  left: "16px",
};

const navNextStyle: CSSProperties = {
  ...navArrowStyle,
  right: "16px",
};

const slideWrapperStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  maxWidth: "100%",
  maxHeight: "100%",
};

const slideContainerStyle: CSSProperties = {
  backgroundColor: "#fff",
  boxShadow: "0 4px 24px rgba(0, 0, 0, 0.5)",
  borderRadius: "4px",
  overflow: "hidden",
  maxWidth: "100%",
  maxHeight: "100%",
};

const slideContentStyle: CSSProperties = {
  width: "100%",
  height: "100%",
};

const loadingStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  height: "100%",
};

const footerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "8px 16px",
  backgroundColor: "#111",
  borderTop: "1px solid #333",
  fontSize: "12px",
  color: "#737373",
  flexShrink: 0,
};

const footerCenterStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  justifyContent: "center",
};

const progressBarStyle: CSSProperties = {
  width: "200px",
  height: "4px",
  backgroundColor: "#333",
  borderRadius: "2px",
  overflow: "hidden",
};

const progressFillStyle: CSSProperties = {
  height: "100%",
  backgroundColor: "#3b82f6",
  transition: "width 0.2s ease",
};

const keyboardHintStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const kbdStyle: CSSProperties = {
  padding: "2px 6px",
  backgroundColor: "#1a1a1a",
  borderRadius: "3px",
  fontSize: "11px",
  fontFamily: "monospace",
};

const thumbnailPreviewStyle: CSSProperties = {
  width: "100%",
  height: "100%",
};

// =============================================================================
// Component
// =============================================================================

/**
 * Presentation viewer with thumbnails and slide navigation.
 */
export function SlideViewer({
  presentation,
  fileName,
  onBack,
  onStartSlideshow,
  onStartEditor,
}: Props) {
  const [currentSlide, setCurrentSlide] = useState(1);
  const [renderedContent, setRenderedContent] = useState<string>("");
  const [isRendering, setIsRendering] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const slideContainerRef = useRef<HTMLDivElement>(null);

  const { presentation: pres } = presentation;
  const totalSlides = pres.count;
  const slideSize = pres.size;

  // Create SlideWithId-compatible data for SlideList
  const slides = useMemo((): readonly SlideWithId[] => {
    const result: SlideWithId[] = [];
    for (let i = 1; i <= totalSlides; i++) {
      result.push({
        id: `slide-${i}`,
        slide: { shapes: [] }, // Empty shapes, we use renderThumbnail
      });
    }
    return result;
  }, [totalSlides]);

  // Pre-render thumbnails
  const thumbnailSvgs = useMemo(() => {
    const svgs: Map<string, string> = new Map();
    for (let i = 1; i <= totalSlides; i++) {
      const slide = pres.getSlide(i);
      svgs.set(`slide-${i}`, slide.renderSVG());
    }
    return svgs;
  }, [pres, totalSlides]);

  // Render current slide
  useEffect(() => {
    const cancelled = { current: false };
    setIsRendering(true);

    const slide = pres.getSlide(currentSlide);
    const svg = slide.renderSVG();

    if (!cancelled.current) {
      setRenderedContent(svg);
      setIsRendering(false);
    }

    return () => {
      cancelled.current = true;
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

  const handlePrev = useCallback(() => {
    setCurrentSlide((s) => Math.max(1, s - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentSlide((s) => Math.min(totalSlides, s + 1));
  }, [totalSlides]);

  const handleSlideClick = useCallback((slideId: string) => {
    const slideNumber = parseInt(slideId.replace("slide-", ""), 10);
    setCurrentSlide(slideNumber);
  }, []);

  const renderThumbnail = useCallback(
    (slideWithId: SlideWithId) => {
      const svg = thumbnailSvgs.get(slideWithId.id);
      if (!svg) return null;
      return (
        <div
          style={thumbnailPreviewStyle}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      );
    },
    [thumbnailSvgs]
  );

  const renderSlideContent = () => {
    if (isRendering) {
      return (
        <div style={loadingStyle}>
          <div className="loading-spinner" />
        </div>
      );
    }

    return (
      <div
        style={slideContentStyle}
        dangerouslySetInnerHTML={{ __html: renderedContent }}
      />
    );
  };

  const activeSlideId = `slide-${currentSlide}`;

  return (
    <div style={containerStyle}>
      {/* Header */}
      <header style={headerStyle}>
        <div style={headerLeftStyle}>
          <button style={backButtonStyle} onClick={onBack}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>Back</span>
          </button>
          <div style={headerDividerStyle} />
          <div style={fileInfoStyle}>
            <span style={fileNameStyle}>{fileName}</span>
            <span style={slideCounterStyle}>
              {currentSlide} / {totalSlides}
            </span>
          </div>
        </div>

        <div style={headerRightStyle}>
          <button
            style={headerActionStyle}
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 3v18" />
            </svg>
          </button>
          <button style={editButtonStyle} onClick={onStartEditor}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            <span>Edit</span>
          </button>
          <button
            style={presentButtonStyle}
            onClick={() => onStartSlideshow(currentSlide)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <span>Present</span>
          </button>
        </div>
      </header>

      <div style={mainStyle}>
        {/* Sidebar */}
        <aside style={isSidebarCollapsed ? sidebarCollapsedStyle : sidebarStyle}>
          <div style={sidebarHeaderStyle}>
            <span style={sidebarTitleStyle}>Slides</span>
            <span style={sidebarCountStyle}>{totalSlides}</span>
          </div>
          <div style={thumbnailListStyle}>
            <SlideList
              slides={slides}
              slideWidth={slideSize.width}
              slideHeight={slideSize.height}
              orientation="vertical"
              mode="readonly"
              activeSlideId={activeSlideId}
              renderThumbnail={renderThumbnail}
              onSlideClick={handleSlideClick}
            />
          </div>
        </aside>

        {/* Slide Area */}
        <main style={slideAreaStyle}>
          <button
            style={{
              ...navPrevStyle,
              opacity: currentSlide === 1 ? 0.3 : 0.7,
              cursor: currentSlide === 1 ? "default" : "pointer",
            }}
            onClick={handlePrev}
            disabled={currentSlide === 1}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div style={slideWrapperStyle}>
            <div
              ref={slideContainerRef}
              style={{
                ...slideContainerStyle,
                aspectRatio: `${slideSize.width} / ${slideSize.height}`,
              }}
            >
              {renderSlideContent()}
            </div>
          </div>

          <button
            style={{
              ...navNextStyle,
              opacity: currentSlide === totalSlides ? 0.3 : 0.7,
              cursor: currentSlide === totalSlides ? "default" : "pointer",
            }}
            onClick={handleNext}
            disabled={currentSlide === totalSlides}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </main>
      </div>

      {/* Footer */}
      <footer style={footerStyle}>
        <div>
          {slideSize.width} x {slideSize.height}
        </div>
        <div style={footerCenterStyle}>
          <div style={progressBarStyle}>
            <div
              style={{
                ...progressFillStyle,
                width: `${(currentSlide / totalSlides) * 100}%`,
              }}
            />
          </div>
        </div>
        <div style={keyboardHintStyle}>
          <span style={kbdStyle}>←</span>
          <span style={kbdStyle}>→</span>
          Navigate
          <span style={{ margin: "0 4px" }}>·</span>
          <span style={kbdStyle}>F</span>
          Present
        </div>
      </footer>
    </div>
  );
}
