/**
 * @file PresentationViewer
 *
 * Full-featured presentation viewer with thumbnail sidebar and navigation.
 */

import { useMemo, useCallback, type CSSProperties, type ReactNode } from "react";
import type { SlideSize } from "@aurochs-office/pptx/domain";
import { SvgContentRenderer } from "@aurochs-renderer/pptx/react";
import { SlideList } from "../slide-list";
import type { SlideWithId } from "@aurochs-office/pptx/app";
import { useSlideNavigation, useViewerKeyboard } from "./hooks";
import { SlideIndicator, ProgressBar, KeyboardHints, NavigationControls } from "./components";

export type PresentationViewerProps = {
  /** Total number of slides */
  readonly slideCount: number;
  /** Slide dimensions */
  readonly slideSize: SlideSize;
  /** Function to get slide SVG content by index (1-based) */
  readonly getSlideContent: (slideIndex: number) => string;
  /** Function to get thumbnail SVG content (optional, uses getSlideContent if not provided) */
  readonly getThumbnailContent?: (slideIndex: number) => string;
  /** Initial slide to display (1-based, default: 1) */
  readonly initialSlide?: number;
  /** Show thumbnail sidebar */
  readonly showThumbnails?: boolean;
  /** Thumbnail sidebar position */
  readonly thumbnailPosition?: "left" | "bottom";
  /** Show navigation controls */
  readonly showControls?: boolean;
  /** Show progress bar */
  readonly showProgress?: boolean;
  /** Show keyboard hints */
  readonly showKeyboardHints?: boolean;
  /** Sync current slide with URL parameter */
  readonly urlSync?: boolean;
  /** Callback when slide changes */
  readonly onSlideChange?: (slideIndex: number) => void;
  /** Callback to start slideshow */
  readonly onStartSlideshow?: (slideIndex: number) => void;
  /** Callback when exiting viewer */
  readonly onExit?: () => void;
  /** Custom header content */
  readonly header?: ReactNode;
  /** Custom footer content */
  readonly footer?: ReactNode;
  /** Additional CSS class */
  readonly className?: string;
  /** Additional inline styles */
  readonly style?: CSSProperties;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  backgroundColor: "var(--bg-primary)",
  color: "var(--text-primary)",
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

const defaultFooterStyle: CSSProperties = {
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
  padding: "0 16px",
};

const thumbnailPreviewStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "block",
  lineHeight: 0,
  overflow: "hidden",
};

/**
 * Full-featured presentation viewer with thumbnail sidebar and navigation.
 *
 * @example
 * ```tsx
 * <PresentationViewer
 *   slideCount={presentation.count}
 *   slideSize={presentation.size}
 *   getSlideContent={(index) => renderSlideToSvg(pres.getSlide(index)).svg}
 *   showThumbnails
 *   showControls
 *   showProgress
 *   onStartSlideshow={(index) => navigate(`/slideshow/${index}`)}
 * />
 * ```
 */
export function PresentationViewer({
  slideCount,
  slideSize,
  getSlideContent,
  getThumbnailContent,
  initialSlide = 1,
  showThumbnails = true,
  thumbnailPosition = "left",
  showControls = true,
  showProgress = true,
  showKeyboardHints = true,
  urlSync = false,
  onSlideChange,
  onStartSlideshow,
  onExit,
  header,
  footer,
  className,
  style,
}: PresentationViewerProps) {
  const nav = useSlideNavigation({
    totalSlides: slideCount,
    initialSlide,
    urlSync,
    onSlideChange,
  });

  const keyboardActions = useMemo(
    () => ({
      goToNext: nav.goToNext,
      goToPrev: nav.goToPrev,
      goToFirst: nav.goToFirst,
      goToLast: nav.goToLast,
      onStartSlideshow: () => onStartSlideshow?.(nav.currentSlide),
      onExit: () => onExit?.(),
    }),
    [nav, onStartSlideshow, onExit],
  );
  useViewerKeyboard(keyboardActions);

  const slides = useMemo((): readonly SlideWithId[] => {
    const result: SlideWithId[] = [];
    for (let i = 1; i <= slideCount; i++) {
      result.push({
        id: `slide-${i}`,
        slide: { shapes: [] },
      });
    }
    return result;
  }, [slideCount]);

  const renderedContent = useMemo(() => getSlideContent(nav.currentSlide), [getSlideContent, nav.currentSlide]);

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
      const thumbnailGetter = getThumbnailContent ?? getSlideContent;
      const svg = thumbnailGetter(slideNum);
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
    [getSlideContent, getThumbnailContent, slideSize],
  );

  const shouldShowThumbnails = showThumbnails;
  const activeSlideId = `slide-${nav.currentSlide}`;

  const defaultKeyboardHints = useMemo(
    () => [
      { keys: ["\u2190", "\u2192"], label: "Navigate" },
      ...(onStartSlideshow ? [{ keys: ["F"], label: "Present" }] : []),
    ],
    [onStartSlideshow],
  );

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      {header}

      <div style={mainStyle}>
        {shouldShowThumbnails && thumbnailPosition === "left" && (
          <aside style={sidebarStyle}>
            <div style={sidebarHeaderStyle}>
              <span style={sidebarTitleStyle}>Slides</span>
              <span style={sidebarCountStyle}>{slideCount}</span>
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
        )}

        <main style={slideAreaStyle}>
          {showControls && (
            <NavigationControls
              onPrev={nav.goToPrev}
              onNext={nav.goToNext}
              canGoPrev={!nav.isFirst}
              canGoNext={!nav.isLast}
              variant="overlay"
            />
          )}

          <div style={slideWrapperStyle}>
            <div
              style={{
                ...slideContainerStyle,
                aspectRatio: `${slideSize.width} / ${slideSize.height}`,
              }}
            >
              <SvgContentRenderer
                svg={renderedContent}
                width={slideSize.width}
                height={slideSize.height}
                mode="full"
                style={slideContentStyle}
              />
            </div>
          </div>
        </main>
      </div>

      {footer ?? (
        <footer style={defaultFooterStyle}>
          <SlideIndicator current={nav.currentSlide} total={slideCount} variant="compact" />
          {showProgress && (
            <div style={footerCenterStyle}>
              <ProgressBar
                progress={nav.progress}
                variant="dark"
                interactive
                onSeek={(progress) => {
                  const targetSlide = Math.max(1, Math.ceil((progress / 100) * slideCount));
                  nav.goToSlide(targetSlide);
                }}
              />
            </div>
          )}
          {showKeyboardHints && <KeyboardHints hints={defaultKeyboardHints} variant="dark" />}
        </footer>
      )}
    </div>
  );
}

// Re-export utility for external use
export { useSlideNavigation, useViewerKeyboard } from "./hooks";
