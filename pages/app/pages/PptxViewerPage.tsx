/**
 * @file PPTX viewer page.
 *
 * Slide viewer layout with thumbnails, navigation, and white office theme.
 */

import { useMemo, useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { LoadedPresentation } from "@aurochs-office/pptx/app";
import { SlideList } from "@aurochs-ui/pptx-editor/slide-list";
import type { SlideWithId } from "@aurochs-office/pptx/app";
import { useLazySvgCache, SvgContentRenderer } from "@aurochs-renderer/pptx/react";
import { renderSlideToSvg } from "@aurochs-renderer/pptx/svg";
import { useSlideNavigation, useViewerKeyboard } from "../hooks";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlayIcon,
  EditIcon,
  SidebarIcon,
  IconButton,
} from "@aurochs-ui/ui-components";
import { ProgressBar, KeyboardHints } from "../components/ui";
import { useSvgFontLoader } from "../fonts/useSvgFontLoader";

type Props = {
  presentation: LoadedPresentation;
  fileName: string;
  onBack: () => void;
  onStartSlideshow: (slideNumber: number) => void;
  onStartEditor: () => void;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  backgroundColor: "var(--bg-primary)",
  color: "var(--text-primary)",
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 16px",
  backgroundColor: "var(--bg-secondary)",
  borderBottom: "1px solid var(--border-subtle)",
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
  border: "1px solid var(--border-strong)",
  borderRadius: "6px",
  color: "var(--text-secondary)",
  cursor: "pointer",
  fontSize: "13px",
};

const headerDividerStyle: CSSProperties = {
  width: "1px",
  height: "20px",
  backgroundColor: "var(--border-strong)",
};

const fileInfoStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "2px",
};

const fileNameStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 500,
  color: "var(--text-primary)",
};

const slideCounterStyle: CSSProperties = {
  fontSize: "12px",
  color: "var(--text-tertiary)",
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
  border: "1px solid var(--border-strong)",
  borderRadius: "6px",
  color: "var(--text-secondary)",
  cursor: "pointer",
  fontSize: "13px",
};

const presentButtonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  padding: "6px 16px",
  background: "var(--accent-blue)",
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
  backgroundColor: "var(--bg-secondary)",
  borderRight: "1px solid var(--border-subtle)",
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
  borderBottom: "1px solid var(--border-subtle)",
};

const sidebarTitleStyle: CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  color: "var(--text-tertiary)",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const sidebarCountStyle: CSSProperties = {
  fontSize: "11px",
  color: "var(--text-tertiary)",
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
  backgroundColor: "var(--bg-tertiary)",
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
  background: "rgba(0, 0, 0, 0.4)",
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
  boxShadow: "var(--shadow-lg)",
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
  backgroundColor: "var(--bg-secondary)",
  borderTop: "1px solid var(--border-subtle)",
  fontSize: "12px",
  color: "var(--text-tertiary)",
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
  overflow: "hidden",
};

// =============================================================================
// Component
// =============================================================================

/** Presentation viewer with thumbnails and slide navigation. */
export function PptxViewerPage({ presentation, fileName, onBack, onStartSlideshow, onStartEditor }: Props) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const slideContainerRef = useRef<HTMLDivElement>(null);

  const { presentation: pres } = presentation;
  const totalSlides = pres.count;
  const slideSize = pres.size;

  const nav = useSlideNavigation({ totalSlides });

  const keyboardActions = useMemo(
    () => ({
      goToNext: nav.goToNext,
      goToPrev: nav.goToPrev,
      goToFirst: nav.goToFirst,
      goToLast: nav.goToLast,
      onStartSlideshow: () => onStartSlideshow(nav.currentSlide),
      onExit: onBack,
    }),
    [nav, onStartSlideshow, onBack],
  );
  useViewerKeyboard(keyboardActions);

  const svgCache = useLazySvgCache(100);

  const slides = useMemo((): readonly SlideWithId[] => {
    const result: SlideWithId[] = [];
    for (let i = 1; i <= totalSlides; i++) {
      result.push({
        id: `slide-${i}`,
        slide: { shapes: [] },
      });
    }
    return result;
  }, [totalSlides]);

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

  const handleSlideClick = useCallback(
    (slideId: string) => {
      const slideNumber = parseInt(slideId.replace("slide-", ""), 10);
      nav.setCurrentSlide(slideNumber);
    },
    [nav],
  );

  const renderThumbnail = useCallback(
    (slideWithId: SlideWithId) => {
      const slideNum = parseInt(slideWithId.id.replace("slide-", ""), 10);
      const svg = svgCache.getOrGenerate(slideWithId.id, () => renderSlideToSvg(pres.getSlide(slideNum)).svg);
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
          <IconButton icon={<SidebarIcon size={18} />} onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
          <button style={editButtonStyle} onClick={onStartEditor}>
            <EditIcon size={16} />
            <span>Edit</span>
          </button>
          <button style={presentButtonStyle} onClick={() => onStartSlideshow(nav.currentSlide)}>
            <PlayIcon size={16} />
            <span>Present</span>
          </button>
        </div>
      </header>

      <div style={mainStyle}>
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

      <footer style={footerStyle}>
        <div>
          {slideSize.width} x {slideSize.height}
        </div>
        <div style={footerCenterStyle}>
          <ProgressBar progress={nav.progress} variant="dark" />
        </div>
        <KeyboardHints
          hints={[
            { keys: ["\u2190", "\u2192"], label: "Navigate" },
            { keys: ["F"], label: "Present" },
          ]}
          variant="dark"
        />
      </footer>
    </div>
  );
}
