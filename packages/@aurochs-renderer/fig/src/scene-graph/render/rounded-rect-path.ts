/**
 * @file Rounded-rect SVG path-d builder — single source of truth.
 *
 * The same path-d string is consumed by:
 *   - scene-renderer.ts (rect fill/stroke shapes)
 *   - resolve.ts (clipPath shapes)
 *   - react/primitives/rect-shape.tsx (React renderer)
 *
 * All three MUST produce the same path so that fill, stroke, and clip
 * align to the same sub-pixels. Using SVG `<rect rx>` or `A` arc
 * commands instead of cubic Bézier corners causes resvg-js to
 * rasterise the rounded corner one sub-pixel off from Figma's
 * exporter, producing a ~0.1% AA-only diff at large corner radii.
 */

/**
 * Standard quarter-circle approximation constant.
 *
 * For a circle of radius r, the cubic Bézier with control points
 * pulled toward the corner by `r * (1 - kappa)` along each axis
 * approximates the quarter-arc with maximum error ≈ 2.7e-4 of the
 * radius — sub-pixel for any practical corner.
 *
 * Figma's SVG exporter uses this exact constant: a 24-radius corner
 * exports as `C 0 34.7452 10.7452 24 24 24` where 34.7452 ≈ 48 - 24K.
 */
export const CORNER_KAPPA = 0.5522847498307933;

/**
 * Build a rounded rect SVG path d string using cubic Bézier corners.
 *
 * Output verbatim shape (for tl=tr=br=bl=r, origin (X,Y), size (W,H)):
 *
 *   M X+r Y                  (top edge start)
 *   L X+W-r Y
 *   C ... X+W Y+r            (top-right corner)
 *   L X+W Y+H-r
 *   C ... X+W-r Y+H          (bottom-right corner)
 *   L X+r Y+H
 *   C ... X Y+H-r            (bottom-left corner)
 *   L X Y+r
 *   C ... X+r Y              (top-left corner)
 *   Z
 *
 * For (X,Y)=(0,0), r=24, W=390, H=342 this matches Figma's exporter:
 *   `M0 48C0 34.7452 10.7452 24 24 24 H366C379.255 24 390 34.7452 390 48...`
 * (modulo command spacing — semantically identical).
 *
 * Origin defaults to (0, 0). A non-zero origin is used by clip-path
 * resolution when the clip is expanded outward by a stroke margin —
 * the expanded rect spans `(-margin, -margin) → (W+margin, H+margin)`.
 */
export function buildRoundedRectPathD(
  w: number,
  h: number,
  radii: readonly [number, number, number, number],
  origin: { x: number; y: number } = { x: 0, y: 0 },
): string {
  const [tl, tr, br, bl] = radii;
  const cTl = tl * (1 - CORNER_KAPPA);
  const cTr = tr * (1 - CORNER_KAPPA);
  const cBr = br * (1 - CORNER_KAPPA);
  const cBl = bl * (1 - CORNER_KAPPA);
  const x = origin.x;
  const y = origin.y;
  const parts = [
    `M ${x + tl} ${y}`,
    `L ${x + w - tr} ${y}`,
    tr > 0 ? `C ${x + w - cTr} ${y} ${x + w} ${y + cTr} ${x + w} ${y + tr}` : "",
    `L ${x + w} ${y + h - br}`,
    br > 0 ? `C ${x + w} ${y + h - cBr} ${x + w - cBr} ${y + h} ${x + w - br} ${y + h}` : "",
    `L ${x + bl} ${y + h}`,
    bl > 0 ? `C ${x + cBl} ${y + h} ${x} ${y + h - cBl} ${x} ${y + h - bl}` : "",
    `L ${x} ${y + tl}`,
    tl > 0 ? `C ${x} ${y + cTl} ${x + cTl} ${y} ${x + tl} ${y}` : "",
    "Z",
  ];
  return parts.filter(Boolean).join(" ");
}
