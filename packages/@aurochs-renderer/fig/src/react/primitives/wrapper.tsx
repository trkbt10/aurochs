/**
 * @file Wrapper <g> element for RenderNode — SoT for applying wrapper attributes
 *
 * Every RenderNode that needs a wrapping <g> (transform, opacity, filter,
 * blendMode, mask) MUST use this component. This ensures all wrapper
 * attributes are applied consistently across all node types.
 *
 * Adding a new wrapper attribute (e.g. a future "isolation" CSS prop)
 * requires changing ONLY this file — all node renderers inherit it.
 */

import type { ReactNode } from "react";
import type { ResolvedWrapperAttrs, RenderMask } from "../../scene-graph/render-tree";

type WrapperProps = {
  readonly wrapper: ResolvedWrapperAttrs;
  readonly mask?: RenderMask;
  readonly children: ReactNode;
};

/**
 * Render a wrapping <g> element with all resolved wrapper attributes.
 *
 * This is the single source of truth for how ResolvedWrapperAttrs
 * maps to SVG/React attributes. Both SVG string and React renderers
 * MUST express wrapper attributes through the same set of fields.
 */
export function RenderWrapper({ wrapper, mask, children }: WrapperProps) {
  const style: React.CSSProperties | undefined = wrapper.blendMode
    ? { mixBlendMode: wrapper.blendMode as React.CSSProperties["mixBlendMode"] }
    : undefined;

  // When this node has a blend mode, also isolate this element's OWN
  // stacking context so a SIBLING with mix-blend-mode:screen blends
  // against its proper backdrop (the parent FRAME's fill) rather than
  // leaking up through the stacking tree and blending against page
  // background. Without isolation, SCREEN/MULTIPLY/etc. can silently
  // produce "no visible effect" when the backdrop the blend sees is
  // not the one the designer intended.
  //
  // We also attach `isolation: isolate` to any wrapper whose children
  // might contain blend-moded descendants. The cheapest heuristic is
  // to always attach it when the wrapper carries a filter or itself
  // has a blendMode — both cases imply the wrapper is a compositing
  // boundary in Figma's render model.
  const needsIsolation = wrapper.blendMode || wrapper.filterAttr;
  const finalStyle: React.CSSProperties | undefined = needsIsolation
    ? { ...(style ?? {}), isolation: "isolate" as const }
    : style;

  return (
    <g
      transform={wrapper.transform}
      opacity={wrapper.opacity}
      filter={wrapper.filterAttr}
      mask={mask?.maskAttr}
      style={finalStyle}
    >
      {children}
    </g>
  );
}
