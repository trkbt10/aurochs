/**
 * @file PPTX Viewer preview with file upload
 *
 * Tests the viewer components from @aurochs-ui/pptx-editor/viewer:
 * - EmbeddableSlide: Single slide embed
 * - SlideShareViewer: SlideShare-style viewer
 * - PresentationSlideshow: Fullscreen slideshow
 */

import { StrictMode, useState, useCallback, useMemo, type CSSProperties } from "react";
import { createRoot } from "react-dom/client";
import { injectCSSVariables, colorTokens, spacingTokens } from "@aurochs-ui/ui-components/design-tokens";
import { Button, Tabs, type TabItem } from "@aurochs-ui/ui-components/primitives";
import { UploadIcon } from "@aurochs-ui/ui-components/icons";
import {
  EmbeddableSlide,
  SlideShareViewer,
  PresentationSlideshow,
  type SlideshowSlideContent,
} from "@aurochs-ui/pptx-editor";
import { loadPptxFromFile, type LoadedPresentation } from "@aurochs-office/pptx/app/pptx-loader";
import type { Slide } from "@aurochs-office/pptx/app/types";
import { renderSlideToSvg } from "@aurochs-renderer/pptx/svg";
import type { SlideSize } from "@aurochs-office/pptx/domain";
import "@aurochs-ui/pptx-editor/preview/SlideshowPlayer.css";

injectCSSVariables();

// =============================================================================
// Types
// =============================================================================

type ViewerMode = "embeddable" | "slideshare" | "slideshow";

type LoadedData = {
  presentation: LoadedPresentation;
  slides: Slide[];
  slideSize: SlideSize;
  svgCache: Map<number, string>;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  width: "100vw",
  height: "100vh",
  display: "flex",
  flexDirection: "column",
  background: `var(--bg-primary, ${colorTokens.background.primary})`,
  fontFamily: "system-ui, sans-serif",
  color: `var(--text-primary, ${colorTokens.text.primary})`,
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: `${spacingTokens.md} ${spacingTokens.lg}`,
  background: `var(--bg-secondary, ${colorTokens.background.secondary})`,
  borderBottom: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
  flexShrink: 0,
};

const titleStyle: CSSProperties = {
  fontSize: "16px",
  fontWeight: 600,
};

const controlsStyle: CSSProperties = {
  display: "flex",
  gap: spacingTokens.sm,
  alignItems: "center",
};

const contentStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  position: "relative",
  padding: spacingTokens.lg,
};

const dropzoneStyle = (isDragging: boolean): CSSProperties => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: spacingTokens.md,
  padding: spacingTokens.xl,
  border: `2px dashed ${isDragging ? colorTokens.accent.primary : colorTokens.border.strong}`,
  borderRadius: "12px",
  background: isDragging ? "rgba(59, 130, 246, 0.1)" : `var(--bg-secondary, ${colorTokens.background.secondary})`,
  transition: "all 0.2s",
  cursor: "pointer",
});

const dropzoneTextStyle: CSSProperties = {
  fontSize: "18px",
  fontWeight: 500,
  color: `var(--text-secondary, ${colorTokens.text.secondary})`,
};

const dropzoneSubtextStyle: CSSProperties = {
  fontSize: "14px",
  color: `var(--text-tertiary, ${colorTokens.text.tertiary})`,
};

const viewerContainerStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const slideInfoStyle: CSSProperties = {
  position: "absolute",
  bottom: spacingTokens.md,
  left: "50%",
  transform: "translateX(-50%)",
  padding: `${spacingTokens.sm} ${spacingTokens.md}`,
  background: "rgba(0, 0, 0, 0.7)",
  borderRadius: "6px",
  fontSize: "13px",
  color: colorTokens.text.tertiary,
};

// =============================================================================
// Main Component
// =============================================================================

function App() {
  const [loaded, setLoaded] = useState<LoadedData | null>(null);
  const [viewerMode, setViewerMode] = useState<ViewerMode>("slideshare");
  const [currentSlide, setCurrentSlide] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSlideshowOpen, setIsSlideshowOpen] = useState(false);

  const handleFileLoad = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await loadPptxFromFile(file);
      const { presentation } = result;

      const slides: Slide[] = [];
      const svgCache = new Map<number, string>();

      for (const slide of presentation.slides()) {
        slides.push(slide);
        const { svg } = renderSlideToSvg(slide);
        svgCache.set(slide.number, svg);
      }

      setLoaded({
        presentation: result,
        slides,
        slideSize: presentation.size,
        svgCache,
      });
      setCurrentSlide(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load presentation");
      console.error("Failed to load presentation:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith(".pptx")) {
        handleFileLoad(file);
      } else {
        setError("Please drop a .pptx file");
      }
    },
    [handleFileLoad],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileLoad(file);
      }
    },
    [handleFileLoad],
  );

  const handleClear = useCallback(() => {
    setLoaded(null);
    setCurrentSlide(1);
    setError(null);
  }, []);

  const getSvg = useCallback(
    (slideNumber: number): string => {
      return loaded?.svgCache.get(slideNumber) ?? "";
    },
    [loaded],
  );

  const getSlideContent = useCallback(
    (slideIndex: number): SlideshowSlideContent => {
      return {
        svg: getSvg(slideIndex),
        transition: undefined,
        timing: undefined,
      };
    },
    [getSvg],
  );

  const tabItems: TabItem<ViewerMode>[] = useMemo(
    () => [
      {
        id: "embeddable",
        label: "Embeddable",
        content: loaded ? (
          <div style={viewerContainerStyle}>
            <div style={{ maxWidth: "800px", width: "100%" }}>
              <EmbeddableSlide
                slideCount={loaded.slides.length}
                slideSize={loaded.slideSize}
                getSlideContent={getSvg}
                initialSlide={currentSlide}
                showNavigation
                showIndicator
                showProgress
              />
            </div>
            <div style={slideInfoStyle}>EmbeddableSlide component</div>
          </div>
        ) : null,
      },
      {
        id: "slideshare",
        label: "SlideShare",
        content: loaded ? (
          <div style={viewerContainerStyle}>
            <div style={{ maxWidth: "900px", width: "100%", height: "100%", maxHeight: "600px" }}>
              <SlideShareViewer
                slideCount={loaded.slides.length}
                slideSize={loaded.slideSize}
                getSlideContent={getSvg}
                initialSlide={currentSlide}
              />
            </div>
            <div style={slideInfoStyle}>SlideShareViewer component</div>
          </div>
        ) : null,
      },
      {
        id: "slideshow",
        label: "Slideshow",
        content: loaded ? (
          <div style={viewerContainerStyle}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: spacingTokens.lg }}>
              <p style={{ color: colorTokens.text.secondary, fontSize: "14px" }}>
                Click the button below to start the fullscreen slideshow
              </p>
              <Button variant="primary" onClick={() => setIsSlideshowOpen(true)}>
                Start Slideshow
              </Button>
            </div>
            <div style={slideInfoStyle}>PresentationSlideshow component</div>
          </div>
        ) : null,
      },
    ],
    [loaded, currentSlide, getSvg],
  );

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <div style={titleStyle}>PPTX Viewer Preview</div>
        <div style={controlsStyle}>
          {loaded && (
            <Button variant="ghost" onClick={handleClear}>
              Clear
            </Button>
          )}
          {!loaded && (
            <label>
              <Button variant="primary" style={{ cursor: "pointer" }} onClick={() => {}}>
                <UploadIcon size={16} />
                Open File
              </Button>
              <input
                type="file"
                accept=".pptx"
                onChange={handleFileInput}
                style={{ display: "none" }}
              />
            </label>
          )}
        </div>
      </header>

      <div style={contentStyle}>
        {isLoading && (
          <div style={{ color: colorTokens.text.secondary }}>Loading presentation...</div>
        )}

        {error && (
          <div style={{ color: colorTokens.accent.danger, textAlign: "center" }}>
            <p style={{ marginBottom: spacingTokens.md }}>{error}</p>
            <Button variant="primary" onClick={handleClear}>
              Try Again
            </Button>
          </div>
        )}

        {!loaded && !isLoading && !error && (
          <div
            style={dropzoneStyle(isDragging)}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
          >
            <UploadIcon size={48} />
            <div style={dropzoneTextStyle}>Drop a PPTX file here</div>
            <div style={dropzoneSubtextStyle}>or click to browse</div>
            <input
              type="file"
              accept=".pptx"
              onChange={handleFileInput}
              style={{ display: "none" }}
            />
          </div>
        )}

        {loaded && !isLoading && (
          <Tabs
            items={tabItems}
            value={viewerMode}
            onChange={setViewerMode}
            style={{ width: "100%", height: "100%" }}
          />
        )}
      </div>

      {isSlideshowOpen && loaded && (
        <PresentationSlideshow
          slideCount={loaded.slides.length}
          slideSize={loaded.slideSize}
          startSlideIndex={currentSlide}
          getSlideContent={getSlideContent}
          onExit={() => setIsSlideshowOpen(false)}
        />
      )}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
