/**
 * @file Background blur React primitive
 *
 * Renders a background blur effect using foreignObject + CSS backdrop-filter.
 * SVG has no native background blur — this uses the same technique as
 * Figma's SVG export and the SVG string renderer's formatBackgroundBlur.
 */

import type { RenderBackgroundBlur } from "../../scene-graph/render-tree";

type Props = {
  readonly blur: RenderBackgroundBlur;
};

/**
 * Background blur element — foreignObject with CSS backdrop-filter,
 * clipped to the node's shape via a clipPath.
 */
export function BackgroundBlurElement({ blur }: Props) {
  return (
    <g clipPath={`url(#${blur.clipId})`}>
      <foreignObject
        x={blur.bounds.x}
        y={blur.bounds.y}
        width={blur.bounds.width}
        height={blur.bounds.height}
      >
        <div
          // xmlns is required for foreignObject content in SVG
          // @ts-expect-error — React does not type xmlns on div, but it's valid in foreignObject
          xmlns="http://www.w3.org/1999/xhtml"
          style={{
            backdropFilter: `blur(${blur.radius}px)`,
            width: "100%",
            height: "100%",
          }}
        />
      </foreignObject>
    </g>
  );
}
