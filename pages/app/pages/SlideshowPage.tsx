/**
 * @file SlideshowPage
 *
 * Full-screen slideshow presentation viewer with animation support.
 */

import { useCallback } from "react";
import type { LoadedPresentation } from "@oxen-office/pptx/app";
import { PresentationSlideshow } from "@oxen-ui/pptx-editor";
import { renderSlideToSvg } from "@oxen-renderer/pptx/svg";
import { useSvgFontLoader } from "../fonts/useSvgFontLoader";

type Props = {
  presentation: LoadedPresentation;
  startSlide: number;
  onExit: () => void;
};

/**
 * Full-screen slideshow presentation viewer.
 */
export function SlideshowPage({ presentation, startSlide, onExit }: Props) {
  const { presentation: pres } = presentation;
  const loadSvgFonts = useSvgFontLoader();

  const getSlideContent = useCallback(
    (slideIndex: number) => {
      const slide = pres.getSlide(slideIndex);
      const { svg } = renderSlideToSvg(slide);
      if (loadSvgFonts) {
        void loadSvgFonts(svg);
      }
      return {
        svg,
        timing: slide.timing,
        transition: slide.transition,
      };
    },
    [pres, loadSvgFonts],
  );

  return (
    <PresentationSlideshow
      slideCount={pres.count}
      slideSize={pres.size}
      startSlideIndex={startSlide}
      getSlideContent={getSlideContent}
      onExit={onExit}
    />
  );
}
