/**
 * @file SlideShareViewer
 *
 * Full-featured slideshare-style viewer with thumbnails and slideshow.
 *
 * Design principles:
 * - Content first: Slide content is never obstructed by UI
 * - Media player controls: All controls in a bottom bar
 * - Keyboard-primary: Arrow keys for navigation, F for fullscreen/present
 */

import { useState, useCallback, useMemo, type CSSProperties } from "react";
import type { SlideSize } from "@aurochs-office/pptx/domain";
import { SvgContentRenderer } from "@aurochs-renderer/pptx/react";
import { SlideList } from "../slide-list";
import type { SlideWithId } from "@aurochs-office/pptx/app";
import { PresentationSlideshow, type SlideshowSlideContent } from "./PresentationSlideshow";
import { useSlideNavigation, useViewerKeyboard, useSlideshowMode } from "./hooks";
import { ViewerControls, type ControlAction } from "./components";
import {
  ChevronLeftIcon,
  PlayIcon,
  SidebarIcon,
  ShareIcon,
  DownloadIcon,
  EnterFullscreenIcon,
} from "@aurochs-ui/ui-components/icons";
import { spacingTokens, fontTokens, colorTokens, shadowTokens, radiusTokens } from "@aurochs-ui/ui-components/design-tokens";

export type SlideShareViewerProps = {
  /** Total number of slides */
  readonly slideCount: number;
  /** Slide dimensions */
  readonly slideSize: SlideSize;
  /** Function to get slide SVG content by index (1-based) */
  readonly getSlideContent: (slideIndex: number) => string;
  /** Function to get slide content with timing/transition for slideshow */
  readonly getSlideshowContent?: (slideIndex: number) => SlideshowSlideContent;
  /** Function to get thumbnail SVG content */
  readonly getThumbnailContent?: (slideIndex: number) => string;
  /** Initial slide to display (1-based) */
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
  /** Base URL for share links */
  readonly baseUrl?: string;
  /** Callback when slide changes */
  readonly onSlideChange?: (slideIndex: number) => void;
  /** Callback for download action */
  readonly onDownload?: () => void;
  /** Callback for share action */
  readonly onShare?: (url: string) => void;
  /** Callback when exiting viewer */
  readonly onExit?: () => void;
  /** Custom actions for right side of controls */
  readonly customActions?: readonly ControlAction[];
  /** Additional CSS class */
  readonly className?: string;
  /** Additional inline styles */
  readonly style?: CSSProperties;
};

// =============================================================================
// Styles
// =============================================================================

const SIDEBAR_WIDTH = 200;

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  backgroundColor: colorTokens.background.primary,
  color: colorTokens.text.primary,
};

const mainStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  overflow: "hidden",
};

const sidebarStyle: CSSProperties = {
  width: SIDEBAR_WIDTH,
  backgroundColor: colorTokens.background.secondary,
  borderRight: `1px solid ${colorTokens.border.subtle}`,
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
  padding: spacingTokens.md,
  borderBottom: `1px solid ${colorTokens.border.subtle}`,
};

const sidebarTitleStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  fontWeight: fontTokens.weight.semibold,
  color: colorTokens.text.tertiary,
  textTransform: "uppercase",
  letterSpacing: fontTokens.letterSpacing.uppercase,
};

const sidebarCountStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  color: colorTokens.text.tertiary,
};

const thumbnailListStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: "hidden",
};

const slideAreaStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: colorTokens.background.tertiary,
  padding: spacingTokens.lg,
};

const slideContainerStyle: CSSProperties = {
  backgroundColor: colorTokens.background.primary,
  boxShadow: shadowTokens.lg,
  borderRadius: radiusTokens.sm,
  overflow: "hidden",
  width: "100%",
  height: "auto",
  maxHeight: "100%",
};

const slideContentStyle: CSSProperties = {
  width: "100%",
  height: "100%",
};

const thumbnailPreviewStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "block",
  lineHeight: 0,
  overflow: "hidden",
};

/**
 * Full-featured slideshare-style viewer.
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
  onSlideChange,
  onDownload,
  onShare,
  onExit,
  customActions = [],
  className,
  style,
}: SlideShareViewerProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
      result.push({ id: `slide-${i}`, slide: { shapes: [] } });
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

  // Build control actions
  const leftActions = useMemo((): ControlAction[] => {
    const actions: ControlAction[] = [];

    if (onExit) {
      actions.push({
        key: "exit",
        icon: <ChevronLeftIcon size={16} />,
        onClick: onExit,
        label: "Exit",
      });
    }

    actions.push({
      key: "sidebar",
      icon: <SidebarIcon size={18} />,
      onClick: () => setIsSidebarOpen(!isSidebarOpen),
      label: "Toggle sidebar",
      active: isSidebarOpen,
    });

    if (enableSlideshow) {
      actions.push({
        key: "present",
        icon: <PlayIcon size={16} />,
        onClick: () => slideshow.startSlideshow(nav.currentSlide),
        label: "Present",
        primary: true,
      });
    }

    return actions;
  }, [onExit, isSidebarOpen, enableSlideshow, slideshow, nav.currentSlide]);

  const rightActions = useMemo((): ControlAction[] => {
    const actions: ControlAction[] = [];

    if (enableShare) {
      actions.push({
        key: "share",
        icon: <ShareIcon size={18} />,
        onClick: handleShare,
        label: "Share",
      });
    }

    if (enableDownload && onDownload) {
      actions.push({
        key: "download",
        icon: <DownloadIcon size={18} />,
        onClick: onDownload,
        label: "Download",
      });
    }

    actions.push(...customActions);

    if (enableFullscreen) {
      actions.push({
        key: "fullscreen",
        icon: <EnterFullscreenIcon size={18} />,
        onClick: handleFullscreen,
        label: "Fullscreen",
      });
    }

    return actions;
  }, [enableShare, handleShare, enableDownload, onDownload, customActions, enableFullscreen, handleFullscreen]);

  const activeSlideId = `slide-${nav.currentSlide}`;

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      <div style={mainStyle}>
        <aside style={isSidebarOpen ? sidebarStyle : sidebarCollapsedStyle}>
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
          <div style={{ ...slideContainerStyle, aspectRatio: `${slideSize.width} / ${slideSize.height}` }}>
            <SvgContentRenderer
              svg={renderedContent}
              width={slideSize.width}
              height={slideSize.height}
              mode="full"
              style={slideContentStyle}
            />
          </div>
        </main>
      </div>

      <ViewerControls
        navigation={{
          onPrev: nav.goToPrev,
          onNext: nav.goToNext,
          canGoPrev: !nav.isFirst,
          canGoNext: !nav.isLast,
        }}
        position={{
          current: nav.currentSlide,
          total: slideCount,
          progress: nav.progress,
          onSeek: (targetSlide) => nav.goToSlide(targetSlide),
        }}
        leftActions={leftActions}
        rightActions={rightActions}
      />

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
