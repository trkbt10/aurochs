/**
 * @file PPTX slide viewer with thumbnail sidebar and navigation.
 */

import { useState, useCallback, useEffect } from "react";
import type { PptxDataMessage } from "../types";
import { Toolbar, ToolbarSpacer, ToolbarInfo } from "../components/Toolbar";
import { ZoomControl } from "../components/ZoomControl";
import { ThumbnailSidebar } from "../components/ThumbnailSidebar";

export function PptxViewer({ slides, width, height }: PptxDataMessage): React.JSX.Element {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [zoom, setZoom] = useState(100);
  const totalSlides = slides.length;

  const goToSlide = useCallback(
    (index: number) => {
      if (index >= 0 && index < totalSlides) {
        setCurrentSlide(index);
      }
    },
    [totalSlides],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault();
          setCurrentSlide((prev) => Math.max(0, prev - 1));
          break;
        case "ArrowRight":
        case "ArrowDown":
        case " ":
          e.preventDefault();
          setCurrentSlide((prev) => Math.min(totalSlides - 1, prev + 1));
          break;
        case "Home":
          e.preventDefault();
          setCurrentSlide(0);
          break;
        case "End":
          e.preventDefault();
          setCurrentSlide(totalSlides - 1);
          break;
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [totalSlides]);

  return (
    <div className="pptx-viewer">
      <Toolbar>
        <vscode-button
          icon="chevron-left"
          secondary
          disabled={currentSlide === 0 || undefined}
          onClick={() => goToSlide(currentSlide - 1)}
        >
          Prev
        </vscode-button>
        <ToolbarInfo>
          Slide {currentSlide + 1} / {totalSlides}
        </ToolbarInfo>
        <vscode-button
          icon-after="chevron-right"
          secondary
          disabled={currentSlide === totalSlides - 1 || undefined}
          onClick={() => goToSlide(currentSlide + 1)}
        >
          Next
        </vscode-button>
        <ToolbarSpacer />
        <ZoomControl zoom={zoom} min={25} max={200} onZoomChange={setZoom} />
      </Toolbar>
      <div className="pptx-content">
        <ThumbnailSidebar
          svgs={slides}
          activeIndex={currentSlide}
          onSelect={goToSlide}
          labelPrefix="Slide"
        />
        <div className="main-area">
          <div
            className="slide-container"
            style={{ transform: `scale(${zoom / 100})` }}
          >
            <div
              className="slide"
              style={{ aspectRatio: `${width}/${height}` }}
              dangerouslySetInnerHTML={{ __html: slides[currentSlide] }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
