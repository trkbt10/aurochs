/**
 * @file Rectangle shape for React — handles both uniform and per-corner radius
 *
 * Sharp-cornered rects (cornerRadius undefined or 0) emit `<rect>`. Rounded
 * rects emit `<path>` with cubic Bézier corners — the path-d builder is
 * the shared SoT (scene-graph/render/rounded-rect-path) used by the SVG
 * scene renderer and the RenderTree clip-path resolver. Using `<rect rx>`
 * for rounded corners would rasterise at slightly different sub-pixels
 * from Figma's exporter and produce AA-only diff regressions.
 */

import type { CornerRadius } from "../../scene-graph/types";
import { buildRoundedRectPathD } from "../../scene-graph/render/rounded-rect-path";

type RectShapeProps = {
  readonly width: number;
  readonly height: number;
  readonly cornerRadius?: CornerRadius;
  readonly fill?: string;
  readonly fillOpacity?: number;
  readonly [key: string]: unknown;
};

export function RectShape({ width, height, cornerRadius, ...rest }: RectShapeProps) {
  if (cornerRadius !== undefined && typeof cornerRadius !== "number") {
    const d = buildRoundedRectPathD(width, height, cornerRadius);
    return <path d={d} {...rest} />;
  }

  if (cornerRadius !== undefined && cornerRadius > 0) {
    const d = buildRoundedRectPathD(width, height, [cornerRadius, cornerRadius, cornerRadius, cornerRadius]);
    return <path d={d} {...rest} />;
  }

  return (
    <rect
      x={0}
      y={0}
      width={width}
      height={height}
      {...rest}
    />
  );
}
