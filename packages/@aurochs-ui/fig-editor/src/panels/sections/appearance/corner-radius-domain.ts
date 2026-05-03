/** @file Corner radius editing domain for parametric rectangular nodes. */

import type { FigDesignNode } from "@aurochs/fig/domain";

const CORNER_RADIUS_TYPES = new Set([
  "RECTANGLE",
  "ROUNDED_RECTANGLE",
  "FRAME",
  "COMPONENT",
  "SYMBOL",
]);

export type CornerRadiusIndex = 0 | 1 | 2 | 3;

/** Return whether a node owns editable rectangular corner-radius fields. */
export function isCornerRadiusEditableNode(node: FigDesignNode): boolean {
  return CORNER_RADIUS_TYPES.has(node.type);
}

/** Return whether the node currently stores independent TL/TR/BR/BL radii. */
export function hasIndividualCornerRadii(node: FigDesignNode): boolean {
  return node.rectangleCornerRadii !== undefined && node.rectangleCornerRadii.length === 4;
}

/** Resolve the uniform radius used by the property panel when corners are linked. */
export function resolveUniformCornerRadius(node: FigDesignNode): number {
  return node.cornerRadius ?? 0;
}

/** Resolve TL/TR/BR/BL radii from either explicit individual radii or the uniform radius. */
export function resolveIndividualCornerRadii(node: FigDesignNode): readonly [number, number, number, number] {
  const radii = node.rectangleCornerRadii;
  if (radii !== undefined && radii.length === 4) {
    return [
      radii[0] ?? 0,
      radii[1] ?? 0,
      radii[2] ?? 0,
      radii[3] ?? 0,
    ];
  }
  const radius = resolveUniformCornerRadius(node);
  return [radius, radius, radius, radius];
}

/** Store a uniform non-negative radius and clear independent radii. */
export function setUniformCornerRadius(node: FigDesignNode, radius: number): FigDesignNode {
  return {
    ...node,
    cornerRadius: Math.max(0, radius),
    rectangleCornerRadii: undefined,
  };
}

/** Expand the current uniform radius into explicit TL/TR/BR/BL radii. */
export function expandToIndividualCornerRadii(node: FigDesignNode): FigDesignNode {
  const radius = resolveUniformCornerRadius(node);
  return {
    ...node,
    cornerRadius: undefined,
    rectangleCornerRadii: [radius, radius, radius, radius],
  };
}

/** Collapse independent radii back to one uniform radius using the top-left value. */
export function collapseToUniformCornerRadius(node: FigDesignNode): FigDesignNode {
  const radii = resolveIndividualCornerRadii(node);
  return setUniformCornerRadius(node, radii[0]);
}

/** Set one independent corner radius while clearing the competing uniform source. */
export function setIndividualCornerRadius(
  node: FigDesignNode,
  index: CornerRadiusIndex,
  radius: number,
): FigDesignNode {
  const radii = [...resolveIndividualCornerRadii(node)] as [number, number, number, number];
  radii[index] = Math.max(0, radius);
  return {
    ...node,
    cornerRadius: undefined,
    rectangleCornerRadii: radii,
  };
}
