/** @file Corner radius editing domain tests. */

import type { FigDesignNode, FigNodeId } from "@aurochs/fig/domain";
import {
  collapseToUniformCornerRadius,
  expandToIndividualCornerRadii,
  hasIndividualCornerRadii,
  isCornerRadiusEditableNode,
  resolveIndividualCornerRadii,
  setIndividualCornerRadius,
  setUniformCornerRadius,
} from "./corner-radius-domain";

function makeRectangle(overrides: Partial<FigDesignNode> = {}): FigDesignNode {
  return {
    id: "rect" as FigNodeId,
    type: "RECTANGLE",
    name: "Rectangle",
    visible: true,
    opacity: 1,
    transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
    size: { x: 100, y: 80 },
    fills: [],
    strokes: [],
    strokeWeight: 0,
    effects: [],
    ...overrides,
  };
}

describe("corner radius editing domain", () => {
  it("treats plain rectangles as corner-radius editable even when r is absent", () => {
    const rectangle = makeRectangle();

    expect(isCornerRadiusEditableNode(rectangle)).toBe(true);
    expect(hasIndividualCornerRadii(rectangle)).toBe(false);
    expect(resolveIndividualCornerRadii(rectangle)).toEqual([0, 0, 0, 0]);
  });

  it("switches between uniform and individual radii without leaving competing radius sources", () => {
    const uniform = setUniformCornerRadius(makeRectangle(), 12);
    const individual = expandToIndividualCornerRadii(uniform);
    const edited = setIndividualCornerRadius(individual, 2, 24);
    const collapsed = collapseToUniformCornerRadius(edited);

    expect(uniform).toMatchObject({ cornerRadius: 12, rectangleCornerRadii: undefined });
    expect(individual).toMatchObject({ cornerRadius: undefined, rectangleCornerRadii: [12, 12, 12, 12] });
    expect(edited).toMatchObject({ cornerRadius: undefined, rectangleCornerRadii: [12, 12, 24, 12] });
    expect(collapsed).toMatchObject({ cornerRadius: 12, rectangleCornerRadii: undefined });
  });
});
