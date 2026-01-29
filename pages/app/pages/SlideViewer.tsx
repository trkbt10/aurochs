/**
 * @file Slide viewer layout + interactions.
 *
 * Uses the shared SlideList component for the sidebar thumbnails.
 */

import { useMemo, useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { LoadedPresentation } from "@oxen-office/pptx/app";
import { SlideList } from "@oxen-ui/pptx-editor/slide-list";
import type { SlideWithId } from "@oxen-office/pptx/app";
import { useLazySvgCache, SvgContentRenderer } from "@oxen-renderer/pptx/react";
import { renderSlideToSvg } from "@oxen-renderer/pptx/svg";
import { useSlideNavigation, useViewerKeyboard } from "../hooks";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlayIcon,
  EditIcon,
  SidebarIcon,
  ProgressBar,
  KeyboardHints,
  IconButton,
  } from "../components/ui";
import { useSvgFontLoader } from "../fonts/useSvgFontLoader";

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


const thumbnailPreviewStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "block",
  lineHeight: 0,
  // Ensure inline SVG scales to fill container
  overflow: "hidden",
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const slideContainerRef = useRef<HTMLDivElement>(null);

  const { presentation: pres } = presentation;
  const totalSlides = pres.count;
  const slideSize = pres.size;

  // Slide navigation state and actions
  const nav = useSlideNavigation({ totalSlides });

  // Keyboard navigation
  const keyboardActions = useMemo(
    () => ({
      goToNext: nav.goToNext,
      goToPrev: nav.goToPrev,
      goToFirst: nav.goToFirst,
      goToLast: nav.goToLast,
      onStartSlideshow: () => onStartSlideshow(nav.currentSlide),
      onExit: onBack,
    }),
    [nav, onStartSlideshow, onBack]
  );
  useViewerKeyboard(keyboardActions);

  // Lazy SVG cache for thumbnails (generates on demand, LRU eviction)
  const svgCache = useLazySvgCache(100);

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

  // Memoize main slide content (synchronous, no useEffect needed)
  const renderedContent = useMemo(
    () => renderSlideToSvg(pres.getSlide(nav.currentSlide)).svg,
    [pres, nav.currentSlide],
  );

  const loadSvgFonts = useSvgFontLoader();
  useEffect(() => {
    if (!loadSvgFonts) {
      return;
    }
    void loadSvgFonts(renderedContent);
  }, [loadSvgFonts, renderedContent]);

  const handleSlideClick = useCallback((slideId: string) => {
    const slideNumber = parseInt(slideId.replace("slide-", ""), 10);
    nav.setCurrentSlide(slideNumber);
  }, [nav]);

  const renderThumbnail = useCallback(
    (slideWithId: SlideWithId) => {
      const slideNum = parseInt(slideWithId.id.replace("slide-", ""), 10);
      // Lazy generation: only renders when thumbnail becomes visible
      const svg = svgCache.getOrGenerate(slideWithId.id, () =>
        renderSlideToSvg(pres.getSlide(slideNum)).svg,
      );
      return (
        <SvgContentRenderer
          svg={svg}
          width={slideSize.width}
          height={slideSize.height}
          mode="inner"
          style={thumbnailPreviewStyle}
        />
      );
    },
    [pres, slideSize, svgCache],
  );

  const renderSlideContent = () => {
    return (
      <SvgContentRenderer
        svg={renderedContent}
        width={slideSize.width}
        height={slideSize.height}
        mode="full"
        style={slideContentStyle}
      />
    );
  };

  const activeSlideId = `slide-${nav.currentSlide}`;

  return (
    <div style={containerStyle}>
      {/* Header */}
      <header style={headerStyle}>
        <div style={headerLeftStyle}>
          <button style={backButtonStyle} onClick={onBack}>
            <ChevronLeftIcon size={16} />
            <span>Back</span>
          </button>
          <div style={headerDividerStyle} />
          <div style={fileInfoStyle}>
            <span style={fileNameStyle}>{fileName}</span>
            <span style={slideCounterStyle}>
              {nav.currentSlide} / {totalSlides}
            </span>
          </div>
        </div>

        <div style={headerRightStyle}>
          <IconButton
            icon={<SidebarIcon size={18} />}
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
          <button style={editButtonStyle} onClick={onStartEditor}>
            <EditIcon size={16} />
            <span>Edit</span>
          </button>
          <button
            style={presentButtonStyle}
            onClick={() => onStartSlideshow(nav.currentSlide)}
          >
            <PlayIcon size={16} />
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
              opacity: nav.isFirst ? 0.3 : 0.7,
              cursor: nav.isFirst ? "default" : "pointer",
            }}
            onClick={nav.goToPrev}
            disabled={nav.isFirst}
          >
            <ChevronLeftIcon size={24} />
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
              opacity: nav.isLast ? 0.3 : 0.7,
              cursor: nav.isLast ? "default" : "pointer",
            }}
            onClick={nav.goToNext}
            disabled={nav.isLast}
          >
            <ChevronRightIcon size={24} />
          </button>
        </main>
      </div>

      {/* Footer */}
      <footer style={footerStyle}>
        <div>
          {slideSize.width} x {slideSize.height}
        </div>
        <div style={footerCenterStyle}>
          <ProgressBar progress={nav.progress} variant="dark" />
        </div>
        <KeyboardHints
          hints={[
            { keys: ["←", "→"], label: "Navigate" },
            { keys: ["F"], label: "Present" },
          ]}
          variant="dark"
        />
      </footer>
    </div>
  );
}
