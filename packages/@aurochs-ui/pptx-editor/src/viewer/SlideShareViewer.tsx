/**
 * @file SlideShareViewer
 *
 * Full-featured slideshare-style viewer with URL sync, thumbnails, and slideshow.
 */

import { useState, useCallback, useMemo, type CSSProperties, type ReactNode } from "react";
import type { SlideSize } from "@aurochs-office/pptx/domain";
import { SvgContentRenderer } from "@aurochs-renderer/pptx/react";
import { SlideList } from "../slide-list";
import type { SlideWithId } from "@aurochs-office/pptx/app";
import { PresentationSlideshow, type SlideshowSlideContent } from "./PresentationSlideshow";
import { useSlideNavigation, useViewerKeyboard, useSlideshowMode } from "./hooks";
import { SlideIndicator, ProgressBar, KeyboardHints, NavigationControls } from "./components";
import {
  Button,
  IconButton,
  PlayIcon,
  ChevronLeftIcon,
  SidebarIcon,
  ShareIcon,
  DownloadIcon,
  EnterFullscreenIcon,
} from "@aurochs-ui/ui-components";

export type SlideShareViewerProps = {
  /** Total number of slides */
  readonly slideCount: number;
  /** Slide dimensions */
  readonly slideSize: SlideSize;
  /** Function to get slide SVG content by index (1-based) */
  readonly getSlideContent: (slideIndex: number) => string;
  /** Function to get slide content with timing/transition for slideshow */
  readonly getSlideshowContent?: (slideIndex: number) => SlideshowSlideContent;
  /** Function to get thumbnail SVG content (optional, uses getSlideContent if not provided) */
  readonly getThumbnailContent?: (slideIndex: number) => string;
  /** Initial slide to display (1-based, default: 1) */
  readonly initialSlide?: number;
  /** Enable slideshow mode */
  readonly enableSlideshow?: boolean;
  /** Enable download button */
  readonly enableDownload?: boolean;
  /** Enable share button */
  readonly enableShare?: boolean;
  /** Enable fullscreen button */
  readonly enableFullscreen?: boolean;
  /** Sync current slide with URL parameter */
  readonly syncWithUrl?: boolean;
  /** Base URL for share links (defaults to current URL) */
  readonly baseUrl?: string;
  /** Presentation title */
  readonly title?: string;
  /** Author name */
  readonly author?: string;
  /** Callback when slide changes */
  readonly onSlideChange?: (slideIndex: number) => void;
  /** Callback for download action */
  readonly onDownload?: () => void;
  /** Callback for share action */
  readonly onShare?: (url: string) => void;
  /** Callback when exiting viewer */
  readonly onExit?: () => void;
  /** Custom actions to show in header */
  readonly customActions?: ReactNode;
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

const headerDividerStyle: CSSProperties = {
  width: "1px",
  height: "20px",
  backgroundColor: "var(--border-strong)",
};

const titleInfoStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "2px",
};

const titleStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 500,
  color: "var(--text-primary)",
};

const authorStyle: CSSProperties = {
  fontSize: "12px",
  color: "var(--text-tertiary)",
};

const headerRightStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const mainStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  overflow: "hidden",
};

const sidebarStyle: CSSProperties = {
  width: "200px",
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
 * Full-featured slideshare-style viewer with URL sync, thumbnails, and slideshow.
 *
 * @example
 * ```tsx
 * <SlideShareViewer
 *   slideCount={presentation.count}
 *   slideSize={presentation.size}
 *   getSlideContent={(index) => slides[index].svg}
 *   getSlideshowContent={(index) => ({
 *     svg: slides[index].svg,
 *     timing: slides[index].timing,
 *     transition: slides[index].transition,
 *   })}
 *   title="My Presentation"
 *   author="John Doe"
 *   enableSlideshow
 *   enableShare
 *   syncWithUrl
 * />
 * ```
 */
export function SlideShareViewer({
  slideCount,
  slideSize,
  getSlideContent,
  getSlideshowContent,
  getThumbnailContent,
  initialSlide = 1,
  enableSlideshow = true,
  enableDownload = false,
  enableShare = false,
  enableFullscreen = true,
  syncWithUrl = true,
  baseUrl,
  title,
  author,
  onSlideChange,
  onDownload,
  onShare,
  onExit,
  customActions,
  className,
  style,
}: SlideShareViewerProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const nav = useSlideNavigation({
    totalSlides: slideCount,
    initialSlide,
    urlSync: syncWithUrl,
    onSlideChange,
  });

  const slideshow = useSlideshowMode({
    onEnter: (index) => nav.setCurrentSlide(index),
    startFullscreen: true,
  });

  const keyboardActions = useMemo(
    () => ({
      goToNext: nav.goToNext,
      goToPrev: nav.goToPrev,
      goToFirst: nav.goToFirst,
      goToLast: nav.goToLast,
      onStartSlideshow: () => enableSlideshow && slideshow.startSlideshow(nav.currentSlide),
      onExit: () => onExit?.(),
    }),
    [nav, enableSlideshow, slideshow, onExit],
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

  const handleShare = useCallback(() => {
    const url = new URL(baseUrl ?? window.location.href);
    url.searchParams.set("slide", String(nav.currentSlide));
    const shareUrl = url.toString();

    if (onShare) {
      onShare(shareUrl);
    } else {
      navigator.clipboard.writeText(shareUrl).catch(() => undefined);
    }
  }, [baseUrl, nav.currentSlide, onShare]);

  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => undefined);
    } else {
      document.exitFullscreen().catch(() => undefined);
    }
  }, []);

  const getSlideshowContentFn = useCallback(
    (index: number): SlideshowSlideContent => {
      if (getSlideshowContent) {
        return getSlideshowContent(index);
      }
      return { svg: getSlideContent(index) };
    },
    [getSlideContent, getSlideshowContent],
  );

  const activeSlideId = `slide-${nav.currentSlide}`;

  const keyboardHints = useMemo(
    () => [
      { keys: ["\u2190", "\u2192"], label: "Navigate" },
      ...(enableSlideshow ? [{ keys: ["F"], label: "Present" }] : []),
    ],
    [enableSlideshow],
  );

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      <header style={headerStyle}>
        <div style={headerLeftStyle}>
          {onExit && (
            <>
              <Button variant="outline" size="md" onClick={onExit}>
                <ChevronLeftIcon size={16} />
                Back
              </Button>
              <div style={headerDividerStyle} />
            </>
          )}
          {(title || author) && (
            <div style={titleInfoStyle}>
              {title && <span style={titleStyle}>{title}</span>}
              {author && <span style={authorStyle}>by {author}</span>}
            </div>
          )}
        </div>

        <div style={headerRightStyle}>
          <IconButton icon={<SidebarIcon size={18} />} onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
          {enableDownload && onDownload && (
            <IconButton icon={<DownloadIcon size={18} />} onClick={onDownload} aria-label="Download" />
          )}
          {enableShare && <IconButton icon={<ShareIcon size={18} />} onClick={handleShare} aria-label="Share" />}
          {enableFullscreen && (
            <IconButton icon={<EnterFullscreenIcon size={18} />} onClick={handleFullscreen} aria-label="Fullscreen" />
          )}
          {customActions}
          {enableSlideshow && (
            <Button variant="primary" size="md" onClick={() => slideshow.startSlideshow(nav.currentSlide)}>
              <PlayIcon size={16} />
              Present
            </Button>
          )}
        </div>
      </header>

      <div style={mainStyle}>
        <aside style={isSidebarCollapsed ? sidebarCollapsedStyle : sidebarStyle}>
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

        <main style={slideAreaStyle}>
          <NavigationControls
            onPrev={nav.goToPrev}
            onNext={nav.goToNext}
            canGoPrev={!nav.isFirst}
            canGoNext={!nav.isLast}
            variant="overlay"
          />

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

      <footer style={footerStyle}>
        <SlideIndicator current={nav.currentSlide} total={slideCount} variant="compact" />
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
        <KeyboardHints hints={keyboardHints} variant="dark" />
      </footer>

      {slideshow.isActive && (
        <PresentationSlideshow
          slideCount={slideCount}
          slideSize={slideSize}
          startSlideIndex={slideshow.startSlideIndex}
          getSlideContent={getSlideshowContentFn}
          onExit={slideshow.exitSlideshow}
        />
      )}
    </div>
  );
}
