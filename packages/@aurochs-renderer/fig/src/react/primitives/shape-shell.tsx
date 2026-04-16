/**
 * @file Shape shell — assembles a shape node's defs, content, and background blur
 *
 * All shape nodes (rect, ellipse, path) share the same assembly pattern:
 * 1. Render defs
 * 2. Render shape content (fills, strokes)
 * 3. Render background blur (if present)
 * 4. Wrap in RenderWrapper
 *
 * This component is the React counterpart of SVG's assembleShapeNode.
 */

import type { ReactNode } from "react";
import type { ResolvedWrapperAttrs, RenderDef, RenderBackgroundBlur, RenderMask } from "../../scene-graph/render-tree";
import { formatRenderDefs } from "./render-defs";
import { RenderWrapper } from "./wrapper";
import { BackgroundBlurElement } from "./background-blur";

type ShapeShellProps = {
  readonly wrapper: ResolvedWrapperAttrs;
  readonly defs: readonly RenderDef[];
  readonly backgroundBlur?: RenderBackgroundBlur;
  readonly mask?: RenderMask;
  readonly children: ReactNode;
};

/**
 * Wraps shape content with defs, background blur, mask, and wrapper <g>.
 */
export function ShapeShell({ wrapper, defs, backgroundBlur, mask, children }: ShapeShellProps) {
  return (
    <RenderWrapper wrapper={wrapper} mask={mask}>
      {formatRenderDefs(defs)}
      {children}
      {backgroundBlur && <BackgroundBlurElement blur={backgroundBlur} />}
    </RenderWrapper>
  );
}
