/** @file WebGL render culling tests. */

import type { RenderPathNode, RenderRectNode } from "../scene-graph/render-tree";
import type { PathNode, RectNode, SceneNodeId } from "../scene-graph/types";
import { shouldRenderVisualNode } from "./render-culling";

function makeRect(overrides: Partial<RenderRectNode> = {}): RenderRectNode {
  const source: RectNode = {
    id: "rect" as SceneNodeId,
    type: "rect",
    name: "Rect",
    visible: true,
    transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
    width: 100,
    height: 80,
    fills: [],
    stroke: undefined,
    effects: [],
    opacity: 1,
  };
  return {
    id: "rect" as SceneNodeId,
    type: "rect",
    width: 100,
    height: 80,
    fill: { attrs: { fill: "none" } },
    wrapper: {},
    defs: [],
    needsWrapper: false,
    source,
    sourceFills: [],
    ...overrides,
  };
}

function makeResolvedPath(): RenderPathNode {
  const source: PathNode = {
    id: "path" as SceneNodeId,
    type: "path",
    name: "Path",
    visible: true,
    transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
    contours: [],
    fills: [],
    effects: [],
    opacity: 1,
  };
  return {
    id: "path" as SceneNodeId,
    type: "path",
    paths: [{ d: "M 1200 1200 L 1300 1200 L 1300 1300 Z" }],
    fill: { attrs: { fill: "none" } },
    wrapper: {},
    defs: [],
    needsWrapper: false,
    source,
    sourceContours: [],
    sourceFills: [],
  };
}

describe("WebGL render culling", () => {
  it("skips visual nodes outside the padded viewport", () => {
    const node = makeRect();

    expect(shouldRenderVisualNode({
      node,
      transform: { m00: 1, m01: 0, m02: 1200, m10: 0, m11: 1, m12: 0 },
      viewport: { x: 0, y: 0, width: 500, height: 500 },
      options: { paddingPx: 100 },
    })).toBe(false);
  });

  it("keeps effect-inflated nodes near the viewport", () => {
    const node = makeRect({
      source: {
        ...makeRect().source,
        effects: [{ type: "drop-shadow", offset: { x: 200, y: 0 }, radius: 40, color: { r: 0, g: 0, b: 0, a: 1 } }],
      },
    });

    expect(shouldRenderVisualNode({
      node,
      transform: { m00: 1, m01: 0, m02: 620, m10: 0, m11: 1, m12: 0 },
      viewport: { x: 0, y: 0, width: 500, height: 500 },
      options: { paddingPx: 0 },
    })).toBe(true);
  });

  it("uses min pixel area as a lightweight LOD cutoff", () => {
    const node = makeRect();

    expect(shouldRenderVisualNode({
      node,
      transform: { m00: 0.001, m01: 0, m02: 10, m10: 0, m11: 0.001, m12: 10 },
      viewport: { x: 0, y: 0, width: 500, height: 500 },
      options: { paddingPx: 0, minPixelArea: 1 },
    })).toBe(false);
  });

  it("keeps tiny transformed stroke-only geometry when stroke width is still visible", () => {
    const node = makeRect({
      sourceStroke: {
        width: 1000,
        linecap: "butt",
        linejoin: "miter",
        color: { r: 1, g: 0, b: 0, a: 1 },
        opacity: 1,
      },
      source: {
        ...makeRect().source,
        stroke: {
          width: 1000,
          linecap: "butt",
          linejoin: "miter",
          color: { r: 1, g: 0, b: 0, a: 1 },
          opacity: 1,
        },
      },
    });

    expect(shouldRenderVisualNode({
      node,
      transform: { m00: 0.001, m01: 0, m02: 10, m10: 0, m11: 0.001, m12: 10 },
      viewport: { x: 0, y: 0, width: 500, height: 500 },
      options: { paddingPx: 0, minPixelArea: 1 },
    })).toBe(true);
  });

  it("uses resolved RenderTree path data for path bounds", () => {
    expect(shouldRenderVisualNode({
      node: makeResolvedPath(),
      transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
      viewport: { x: 0, y: 0, width: 500, height: 500 },
      options: { paddingPx: 0 },
    })).toBe(false);
  });
});
