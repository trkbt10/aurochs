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
  const style = wrapper.blendMode
    ? { mixBlendMode: wrapper.blendMode as React.CSSProperties["mixBlendMode"] }
    : undefined;

  return (
    <g
      transform={wrapper.transform}
      opacity={wrapper.opacity}
      filter={wrapper.filterAttr}
      mask={mask?.maskAttr}
      style={style}
    >
      {children}
    </g>
  );
}
