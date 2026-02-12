/**
 * @file PresentationViewer
 *
 * Full-featured presentation viewer with thumbnail sidebar and navigation.
 *
 * Design principles:
 * - Content first: Slide content is never obstructed by UI
 * - Media player controls: All controls in a bottom bar
 * - Keyboard-primary: Arrow keys for navigation, F for fullscreen/present
 */

import { useState, useMemo, useCallback, useRef, type CSSProperties, type ReactNode } from "react";
import type { SlideSize } from "@aurochs-office/pptx/domain";
import { SvgContentRenderer } from "@aurochs-renderer/pptx/react";
import { SlideList } from "../slide-list";
import type { SlideWithId } from "@aurochs-office/pptx/app";
import { useSlideNavigation, useViewerKeyboard, useSwipeNavigation } from "./hooks";
import { ViewerControls, type ControlAction } from "./components";
import { PlayIcon, SidebarIcon, EnterFullscreenIcon } from "@aurochs-ui/ui-components/icons";
import { spacingTokens, fontTokens, colorTokens, shadowTokens, radiusTokens } from "@aurochs-ui/ui-components/design-tokens";

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
  /** Show thumbnail sidebar (default: true) */
  readonly showThumbnails?: boolean;
  /** Enable slideshow mode */
  readonly enableSlideshow?: boolean;
  /** Enable fullscreen button */
  readonly enableFullscreen?: boolean;
  /** Sync current slide with URL parameter */
  readonly urlSync?: boolean;
  /** Callback when slide changes */
  readonly onSlideChange?: (slideIndex: number) => void;
  /** Callback to start slideshow */
  readonly onStartSlideshow?: (slideIndex: number) => void;
  /** Custom header content */
  readonly header?: ReactNode;
  /** Custom actions for right side of controls */
  readonly customActions?: readonly ControlAction[];
  /** Additional CSS class */
  readonly className?: string;
  /** Additional inline styles */
  readonly style?: CSSProperties;
};

// =============================================================================
// Layout constants
// =============================================================================

const SIDEBAR_WIDTH = 180;

// =============================================================================
// Styles
// =============================================================================

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
 * Full-featured presentation viewer with thumbnail sidebar and navigation.
 *
 * @example
 * ```tsx
 * <PresentationViewer
 *   slideCount={presentation.count}
 *   slideSize={presentation.size}
 *   getSlideContent={(index) => renderSlideToSvg(pres.getSlide(index)).svg}
 *   showThumbnails
 *   enableSlideshow
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
  enableSlideshow = true,
  enableFullscreen = true,
  urlSync = false,
  onSlideChange,
  onStartSlideshow,
  header,
  customActions = [],
  className,
  style,
}: PresentationViewerProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(showThumbnails);
  const slideAreaRef = useRef<HTMLElement>(null);

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
      onStartSlideshow: () => enableSlideshow && onStartSlideshow?.(nav.currentSlide),
      onExit: () => {},
    }),
    [nav, enableSlideshow, onStartSlideshow],
  );
  useViewerKeyboard(keyboardActions);

  // Swipe navigation for touch devices
  useSwipeNavigation({
    containerRef: slideAreaRef,
    onSwipeLeft: nav.goToNext,
    onSwipeRight: nav.goToPrev,
  });

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

  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => undefined);
    } else {
      document.exitFullscreen().catch(() => undefined);
    }
  }, []);

  // Build control actions
  const leftActions = useMemo((): ControlAction[] => {
    const actions: ControlAction[] = [];

    if (showThumbnails) {
      actions.push({
        key: "sidebar",
        icon: <SidebarIcon size={18} />,
        onClick: () => setIsSidebarOpen((prev) => !prev),
        label: "Toggle sidebar",
        active: isSidebarOpen,
      });
    }

    if (enableSlideshow && onStartSlideshow) {
      actions.push({
        key: "present",
        icon: <PlayIcon size={16} />,
        onClick: () => onStartSlideshow(nav.currentSlide),
        label: "Present",
        primary: true,
      });
    }

    return actions;
  }, [showThumbnails, isSidebarOpen, enableSlideshow, onStartSlideshow, nav.currentSlide]);

  const rightActions = useMemo((): ControlAction[] => {
    const actions: ControlAction[] = [];

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
  }, [customActions, enableFullscreen, handleFullscreen]);

  const activeSlideId = `slide-${nav.currentSlide}`;

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      {header}

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

        <main ref={slideAreaRef} style={{ ...slideAreaStyle, touchAction: "pan-y pinch-zoom" }}>
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
    </div>
  );
}

// Re-export utility for external use
export { useSlideNavigation, useViewerKeyboard } from "./hooks";
