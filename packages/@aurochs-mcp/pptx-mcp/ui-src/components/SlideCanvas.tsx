/**
 * @file Slide canvas component for rendering slides
 */

import { useRef, useState, useEffect, type ReactElement } from "react";
import { tokens } from "@aurochs-ui/ui-components";
import { SlideRendererSvg } from "@aurochs-renderer/pptx/react";
import type { SlideData } from "../App";

type SlideCanvasProps = {
  readonly slide?: SlideData;
  readonly width: number;
  readonly height: number;
};

function renderSlideContent(slide: SlideData): ReactElement {
  const { color } = tokens;

  if (slide.slide && slide.slideSize) {
    return (
      <SlideRendererSvg
        slide={slide.slide}
        slideSize={slide.slideSize}
        colorContext={slide.colorContext}
        fontScheme={slide.fontScheme}
        options={slide.options}
        resolvedBackground={slide.resolvedBackground}
        layoutShapes={slide.layoutShapes}
        style={{ width: "100%", height: "100%" }}
      />
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: color.text.inverse,
        fontSize: "24px",
      }}
    >
      <span>Slide {slide.number}</span>
    </div>
  );
}

type FitToContainerParams = {
  readonly containerW: number;
  readonly containerH: number;
  readonly aspectRatio: number;
  readonly maxWidth: number;
};

/**
 * Compute the largest dimensions that fit within the container
 * while maintaining the given aspect ratio, capped at maxWidth.
 */
function fitToContainer(params: FitToContainerParams): { w: number; h: number } {
  const { containerW, containerH, aspectRatio, maxWidth } = params;
  const initialW = Math.min(containerW, maxWidth);
  const initialH = initialW / aspectRatio;
  if (initialH > containerH) {
    const h = containerH;
    const w = h * aspectRatio;
    return { w: Math.round(w), h: Math.round(h) };
  }
  return { w: Math.round(initialW), h: Math.round(initialH) };
}

/**
 * Resolve slide container dimensions based on measured dims.
 */
function resolveSlideDimensions(dims: { w: number; h: number } | null, aspectRatio: number): React.CSSProperties {
  if (dims) {
    return { width: dims.w, height: dims.h };
  }
  return { width: "100%", maxWidth: 800, aspectRatio };
}

/**
 * Render slide content or placeholder when no slide is loaded.
 */
function renderSlideOrPlaceholder(params: {
  readonly slide?: SlideData;
  readonly slideStyle: React.CSSProperties;
  readonly color: typeof tokens.color;
  readonly spacing: typeof tokens.spacing;
  readonly radius: typeof tokens.radius;
  readonly font: typeof tokens.font;
}): ReactElement {
  const { slide, slideStyle, color, spacing, radius, font } = params;
  if (slide) {
    return <div style={slideStyle}>{renderSlideContent(slide)}</div>;
  }
  return (
    <div style={{ ...slideStyle, color: color.text.tertiary }}>
      <div style={{ textAlign: "center", padding: spacing.xl }}>
        <p style={{ marginBottom: spacing.sm }}>No presentation loaded</p>
        <p>
          Use{" "}
          <code
            style={{
              background: color.background.hover,
              padding: `${spacing.xs} ${spacing.sm}`,
              borderRadius: radius.sm,
              fontSize: font.size.md,
            }}
          >
            pptx_create_presentation
          </code>{" "}
          to start
        </p>
      </div>
    </div>
  );
}

/** Slide canvas for displaying the current slide */
export function SlideCanvas({ slide, width, height }: SlideCanvasProps): ReactElement {
  const aspectRatio = width / height;
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const { color, spacing, radius, font } = tokens;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {return;}

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) {return;}
      const { width: cw, height: ch } = entry.contentRect;
      if (cw > 0 && ch > 0) {
        setDims(fitToContainer({ containerW: cw, containerH: ch, aspectRatio, maxWidth: 800 }));
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [aspectRatio]);

  const slideStyle: React.CSSProperties = {
    background: "#fff",
    borderRadius: radius.sm,
    boxShadow: "0 4px 24px rgba(0, 0, 0, 0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    ...resolveSlideDimensions(dims, aspectRatio),
  };

  const content = renderSlideOrPlaceholder({ slide, slideStyle, color, spacing, radius, font });

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      {content}
    </div>
  );
}
