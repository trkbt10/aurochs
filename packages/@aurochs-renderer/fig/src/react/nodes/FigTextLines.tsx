/**
 * @file Shared SVG text line renderer
 *
 * Renders text lines as SVG <text> elements from TextLineLayout.
 * This is the single source of truth for SVG text rendering — used by
 * both TextNodeRenderer (normal display) and the fig-editor's text
 * editing overlay (FigTextEditOverlay).
 *
 * By sharing this component, the text displayed during editing is
 * guaranteed to match the normal rendering exactly.
 */

import { memo, type ReactElement } from "react";
import type { TextLineLayout } from "../../scene-graph/types";

type FigTextLinesProps = {
  /** Text line layout data with positions and font info */
  readonly textLineLayout: TextLineLayout;
  /** Fill color as CSS color string (e.g., "#000000") */
  readonly fill: string;
  /** Fill opacity (only rendered if < 1) */
  readonly fillOpacity?: number;
};

function FigTextLinesImpl({ textLineLayout, fill, fillOpacity }: FigTextLinesProps): ReactElement | null {
  const fb = textLineLayout;
  const textAnchor = fb.textAnchor !== "start" ? fb.textAnchor : undefined;
  const opacity = fillOpacity !== undefined && fillOpacity < 1 ? fillOpacity : undefined;

  if (fb.lines.length === 0) {
    return null;
  }

  return (
    <>
      {fb.lines.map((line, i) => (
        <text
          key={i}
          x={line.x}
          y={line.y}
          fill={fill}
          fillOpacity={opacity}
          fontFamily={fb.fontFamily}
          fontSize={fb.fontSize}
          fontWeight={fb.fontWeight}
          fontStyle={fb.fontStyle}
          letterSpacing={fb.letterSpacing}
          textAnchor={textAnchor}
        >
          {line.text}
        </text>
      ))}
    </>
  );
}

export const FigTextLines = memo(FigTextLinesImpl);
