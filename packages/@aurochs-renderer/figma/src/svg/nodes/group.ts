/**
 * @file Group node renderer
 */

import type { FigNode } from "@aurochs/fig/types";
import type { FigSvgRenderContext } from "../../types";
import { g, type SvgString, EMPTY_SVG } from "../primitives";
import { buildTransformAttr } from "../transform";
import { extractBaseProps } from "./extract-props";

// =============================================================================
// Group Node
// =============================================================================

/**
 * Render a GROUP node to SVG
 *
 * @param node - The group node
 * @param ctx - Render context
 * @param renderedChildren - Pre-rendered children SVG strings
 */
export function renderGroupNode(
  node: FigNode,
  ctx: FigSvgRenderContext,
  renderedChildren: readonly SvgString[],
): SvgString {
  const { transform, opacity, visible } = extractBaseProps(node);

  if (!visible) {
    return EMPTY_SVG;
  }

  const transformStr = buildTransformAttr(transform);

  return g(
    {
      transform: transformStr || undefined,
      opacity: opacity < 1 ? opacity : undefined,
    },
    ...renderedChildren,
  );
}
