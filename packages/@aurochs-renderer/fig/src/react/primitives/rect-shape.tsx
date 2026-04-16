/**
 * @file Rectangle shape for React — handles both uniform and per-corner radius
 *
 * SoT for rendering rect shapes in React. Uses <rect> for uniform radius,
 * <path> for per-corner radii.
 */

import type { CornerRadius } from "../../scene-graph/types";

type RectShapeProps = {
  readonly width: number;
  readonly height: number;
  readonly cornerRadius?: CornerRadius;
  readonly fill?: string;
  readonly fillOpacity?: number;
  readonly [key: string]: unknown;
};

function buildRoundedRectPathD(w: number, h: number, radii: readonly [number, number, number, number]): string {
  const [tl, tr, br, bl] = radii;
  const parts = [
    `M ${tl} 0`,
    `L ${w - tr} 0`,
    tr > 0 ? `A ${tr} ${tr} 0 0 1 ${w} ${tr}` : "",
    `L ${w} ${h - br}`,
    br > 0 ? `A ${br} ${br} 0 0 1 ${w - br} ${h}` : "",
    `L ${bl} ${h}`,
    bl > 0 ? `A ${bl} ${bl} 0 0 1 0 ${h - bl}` : "",
    `L 0 ${tl}`,
    tl > 0 ? `A ${tl} ${tl} 0 0 1 ${tl} 0` : "",
    "Z",
  ];
  return parts.filter(Boolean).join(" ");
}

export function RectShape({ width, height, cornerRadius, ...rest }: RectShapeProps) {
  if (cornerRadius !== undefined && typeof cornerRadius !== "number") {
    const d = buildRoundedRectPathD(width, height, cornerRadius);
    return <path d={d} {...rest} />;
  }

  return (
    <rect
      x={0}
      y={0}
      width={width}
      height={height}
      rx={cornerRadius}
      ry={cornerRadius}
      {...rest}
    />
  );
}
