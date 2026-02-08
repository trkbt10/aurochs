/**
 * @file Slide thumbnails component
 */

import type { ReactElement } from "react";
import { tokens } from "@aurochs-ui/ui-components";

type SlideData = {
  readonly number: number;
  readonly svg?: string;
};

type ThumbnailsProps = {
  readonly slides: readonly SlideData[];
  readonly currentIndex: number;
  readonly onSelect: (index: number) => void;
  /** Presentation width in pixels */
  readonly width?: number;
  /** Presentation height in pixels */
  readonly height?: number;
};

function renderThumbnailContent(slide: SlideData): ReactElement {
  if (slide.svg) {
    return (
      <div
        style={{ width: "100%", height: "100%" }}
        // biome-ignore lint: SVG content is from trusted source (server-rendered)
        dangerouslySetInnerHTML={{ __html: slide.svg }}
      />
    );
  }
  return <span>{slide.number}</span>;
}

/** Slide thumbnails sidebar component */
export function Thumbnails({
  slides,
  currentIndex,
  onSelect,
  width = 960,
  height = 540,
}: ThumbnailsProps): ReactElement {
  const { color, spacing, radius, font } = tokens;
  const aspectRatio = width / height;

  const containerStyle: React.CSSProperties = {
    width: "160px",
    background: color.background.secondary,
    borderRight: `1px solid ${color.border.strong}`,
    overflowY: "auto",
    padding: spacing.sm,
  };

  if (slides.length === 0) {
    return (
      <div
        style={{
          ...containerStyle,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ color: color.text.tertiary, fontSize: font.size.md }}>No slides</div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {slides.map((slide, index) => (
        <button
          key={slide.number}
          type="button"
          onClick={() => onSelect(index)}
          style={{
            aspectRatio,
            width: "100%",
            background: "#fff",
            borderRadius: radius.sm,
            marginBottom: spacing.sm,
            cursor: "pointer",
            border: `2px solid ${index === currentIndex ? color.selection.primary : "transparent"}`,
            transition: "border-color 0.15s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: font.size.lg,
            color: color.text.inverse,
            fontWeight: font.weight.medium,
            padding: 0,
            overflow: "hidden",
          }}
        >
          {renderThumbnailContent(slide)}
        </button>
      ))}
    </div>
  );
}
