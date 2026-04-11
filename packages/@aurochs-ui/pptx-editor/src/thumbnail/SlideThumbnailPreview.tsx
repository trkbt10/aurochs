/**
 * @file Slide thumbnail preview component
 *
 * Renders a slide thumbnail using the React component-based SlideRenderer.
 * This enables shape-level memoization via ShapeRenderer's memo: when a single
 * shape changes, only that shape re-renders — all other shapes are skipped by
 * React's reconciliation.
 *
 * The previous implementation converted slides to SVG strings via renderSlideSvg(),
 * then parsed them back into React elements. That approach forced a full rebuild
 * of the entire SVG tree on every change, defeating React's diffing capabilities.
 */

import { useMemo, type CSSProperties } from "react";
import type { Slide, Shape } from "@aurochs-office/pptx/domain";
import type { ColorContext } from "@aurochs-office/drawing-ml/domain/color-context";
import type { FontScheme } from "@aurochs-office/ooxml/domain/font-scheme";
import type { ResolvedBackgroundFill } from "@aurochs-office/drawing-ml/domain/background-fill";
import type { ResourceStore } from "@aurochs-office/ooxml/domain/resource-store";
import type { Pixels } from "@aurochs-office/drawing-ml/domain/units";
import { SlideRenderer } from "@aurochs-renderer/pptx/react";
import { prepareSlide } from "../resource/register-slide-resources";

// =============================================================================
// Types
// =============================================================================

export type SlideThumbnailPreviewProps = {
  /** Parsed domain slide */
  readonly slide: Slide;
  /** Slide width in pixels */
  readonly slideWidth: Pixels;
  /** Slide height in pixels */
  readonly slideHeight: Pixels;
  /** Color context for color resolution */
  readonly colorContext?: ColorContext;
  /** Font scheme for theme fonts */
  readonly fontScheme?: FontScheme;
  /** Pre-resolved background fill */
  readonly resolvedBackground?: ResolvedBackgroundFill;
  /** Non-placeholder shapes from slide layout */
  readonly layoutShapes?: readonly Shape[];
  /** Centralized resource store */
  readonly resourceStore?: ResourceStore;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  overflow: "hidden",
  backgroundColor: "#fff",
};

const svgStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "block",
};

// =============================================================================
// Component
// =============================================================================

/**
 * Slide thumbnail preview component
 *
 * Renders a slide using the same React component pipeline as the main editor canvas.
 * ShapeRenderer's memo ensures only changed shapes re-render within the thumbnail.
 */
export function SlideThumbnailPreview({
  slide,
  slideWidth,
  slideHeight,
  colorContext,
  fontScheme,
  resolvedBackground,
  layoutShapes,
  resourceStore,
}: SlideThumbnailPreviewProps) {
  const slideSize = useMemo(
    () => ({ width: slideWidth, height: slideHeight }),
    [slideWidth, slideHeight],
  );

  const viewBox = `0 0 ${slideWidth} ${slideHeight}`;

  // Register builder-generated resources (editor-created charts/diagrams).
  // This is idempotent: already-registered resources are not overwritten.
  // Same pattern as PresentationEditor's prepareSlide call for the main canvas.
  useMemo(() => {
    if (resourceStore) {
      prepareSlide(slide, resourceStore);
    }
  }, [slide, resourceStore]);

  return (
    <div style={containerStyle}>
      <svg
        style={svgStyle}
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
      >
        <SlideRenderer
          slide={slide}
          slideSize={slideSize}
          colorContext={colorContext}
          fontScheme={fontScheme}
          resolvedBackground={resolvedBackground}
          layoutShapes={layoutShapes}
          resourceStore={resourceStore}
        />
      </svg>
    </div>
  );
}
