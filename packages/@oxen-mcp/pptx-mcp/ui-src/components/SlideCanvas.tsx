/**
 * @file Slide canvas component for rendering slides
 */

import { useRef, useState, useEffect, type ReactElement } from "react";
import { tokens } from "@oxen-ui/ui-components";

type SlideData = {
  readonly number: number;
  readonly svg?: string;
};

type SlideCanvasProps = {
  readonly slide?: SlideData;
  readonly width: number;
  readonly height: number;
};

function renderSlideContent(slide: SlideData): ReactElement {
  const { color } = tokens;

  if (slide.svg) {
    return (
      <div
        style={{ width: "100%", height: "100%" }}
        // biome-ignore lint: SVG content is from trusted source
        dangerouslySetInnerHTML={{ __html: slide.svg }}
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

/**
 * Compute the largest dimensions that fit within the container
 * while maintaining the given aspect ratio, capped at maxWidth.
 */
function fitToContainer(
  containerW: number,
  containerH: number,
  aspectRatio: number,
  maxWidth: number,
): { w: number; h: number } {
  let w = Math.min(containerW, maxWidth);
  let h = w / aspectRatio;
  if (h > containerH) {
    h = containerH;
    w = h * aspectRatio;
  }
  return { w: Math.round(w), h: Math.round(h) };
}

/** Slide canvas for displaying the current slide */
export function SlideCanvas({ slide, width, height }: SlideCanvasProps): ReactElement {
  const aspectRatio = width / height;
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const { color, spacing, radius, font } = tokens;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width: cw, height: ch } = entry.contentRect;
      if (cw > 0 && ch > 0) {
        setDims(fitToContainer(cw, ch, aspectRatio, 800));
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
    ...(dims ? { width: dims.w, height: dims.h } : { width: "100%", maxWidth: 800, aspectRatio }),
  };

  const content = slide ? (
    <div style={slideStyle}>{renderSlideContent(slide)}</div>
  ) : (
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

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      {content}
    </div>
  );
}
