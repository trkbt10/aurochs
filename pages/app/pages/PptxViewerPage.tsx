/**
 * @file PPTX viewer page.
 *
 * Slide viewer layout with thumbnails, navigation, and white office theme.
 * Uses SlideShareViewer from @aurochs-ui/pptx-editor/viewer.
 */

import { useCallback } from "react";
import type { LoadedPresentation } from "@aurochs-office/pptx/app";
import { renderSlideToSvg } from "@aurochs-renderer/pptx/svg";
import { SlideShareViewer, type SlideshowSlideContent } from "@aurochs-ui/pptx-viewer";
import { useLazySvgCache } from "@aurochs-renderer/pptx/react";

type Props = {
  presentation: LoadedPresentation;
  fileName: string;
  onBack: () => void;
  onStartSlideshow: (slideNumber: number) => void;
  onStartEditor: () => void;
};

/** Presentation viewer with thumbnails and slide navigation. */
export function PptxViewerPage({ presentation, fileName, onBack, onStartSlideshow: _onStartSlideshow, onStartEditor: _onStartEditor }: Props) {
  const { presentation: pres } = presentation;
  const totalSlides = pres.count;
  const slideSize = pres.size;

  const svgCache = useLazySvgCache(100);

  const getSlideContent = useCallback(
    (slideIndex: number) => {
      const cacheKey = `slide-${slideIndex}`;
      return svgCache.getOrGenerate(cacheKey, () => renderSlideToSvg(pres.getSlide(slideIndex)).svg);
    },
    [pres, svgCache],
  );

  const getSlideshowContent = useCallback(
    (slideIndex: number): SlideshowSlideContent => {
      const slide = pres.getSlide(slideIndex);
      const { svg } = renderSlideToSvg(slide);
      return {
        svg,
        timing: slide.timing,
        transition: slide.transition,
      };
    },
    [pres],
  );

  return (
    <SlideShareViewer
      slideCount={totalSlides}
      slideSize={slideSize}
      getSlideContent={getSlideContent}
      getSlideshowContent={getSlideshowContent}
      title={fileName}
      enableSlideshow
      enableFullscreen
      syncWithUrl
      onExit={onBack}
      style={{ height: "100vh" }}
    />
  );
}
