/**
 * @file Regression — ELLIPSE INSIDE/OUTSIDE stroke mask must produce an
 * ellipse-shaped mask (NOT a rect or path) and must clip the doubled
 * stroke width to the correct half of the circle.
 *
 * Before this fix, resolveEllipseNode passed `strokeShape` but not
 * `maskClipShape` to resolveStrokeRendering, so the INSIDE/OUTSIDE mask
 * branch was skipped entirely. Elliptical strokes fell through to
 * "uniform" mode and the stroke bled outside the circle.
 */

import { resolveRenderTree } from "./resolve";
import type { SceneGraph, EllipseNode } from "../types";

const EMPTY_IMAGES = new Map<string, import("@aurochs/fig/parser").FigImage>();

function makeSceneGraph(nodes: readonly import("../types").SceneNode[]): SceneGraph {
  return { root: { type: "group", id: "root" as import("../types").SceneNodeId, name: "root", transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 }, opacity: 1, visible: true, effects: [], blendMode: undefined, children: nodes }, blobs: [], images: EMPTY_IMAGES };
}

describe("ELLIPSE stroke rendering", () => {
  it("INSIDE-aligned stroke produces an ellipse-shaped stroke-mask def", () => {
    const ellipse: EllipseNode = {
      type: "ellipse",
      id: "e1" as import("../types").SceneNodeId,
      name: "avatar",
      transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
      opacity: 1,
      visible: true,
      effects: [],
      blendMode: undefined,
      cx: 50,
      cy: 50,
      rx: 50,
      ry: 50,
      fills: [{ type: "solid", color: { r: 0, g: 0, b: 0, a: 1 }, opacity: 1 }],
      stroke: {
        color: { r: 1, g: 1, b: 1, a: 1 },
        width: 4,
        opacity: 1,
        linecap: "butt",
        linejoin: "miter",
        align: "INSIDE",
      },
    };
    const tree = resolveRenderTree(makeSceneGraph([ellipse]));
    const node = tree.children[0];
    expect(node.type).toBe("ellipse");
    if (node.type !== "ellipse") { return; }

    // A stroke-mask def must exist in the node's defs.
    const strokeMaskDef = node.defs.find((d) => d.type === "stroke-mask");
    expect(strokeMaskDef, "INSIDE ellipse stroke must emit a stroke-mask def").toBeDefined();
    if (!strokeMaskDef || strokeMaskDef.type !== "stroke-mask") { return; }

    // The mask shape must match the ellipse (NOT a rect), otherwise the
    // mask clips a rectangular region and the elliptical stroke bleeds
    // outside the actual circle on rendering.
    expect(strokeMaskDef.shape.kind, "mask shape must be ellipse-kind").toBe("ellipse");
    if (strokeMaskDef.shape.kind !== "ellipse") { return; }
    expect(strokeMaskDef.shape.cx).toBe(50);
    expect(strokeMaskDef.shape.cy).toBe(50);
    expect(strokeMaskDef.shape.rx).toBe(50);
    expect(strokeMaskDef.shape.ry).toBe(50);

    // Stroke rendering mode must be "masked" so the stroke actually uses
    // the mask (otherwise it falls through to "uniform" and INSIDE/OUTSIDE
    // has no visual effect).
    expect(node.strokeRendering?.mode, "INSIDE stroke must use masked mode").toBe("masked");
  });

  it("OUTSIDE-aligned stroke produces an ellipse mask with OUTSIDE alignment", () => {
    const ellipse: EllipseNode = {
      type: "ellipse",
      id: "e2" as import("../types").SceneNodeId,
      name: "container",
      transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
      opacity: 1,
      visible: true,
      effects: [],
      blendMode: undefined,
      cx: 10,
      cy: 10,
      rx: 10,
      ry: 10,
      fills: [{ type: "solid", color: { r: 0, g: 0, b: 0, a: 0.2 }, opacity: 0.2 }],
      stroke: {
        color: { r: 1, g: 1, b: 1, a: 1 },
        width: 2,
        opacity: 0.2,
        linecap: "butt",
        linejoin: "miter",
        align: "OUTSIDE",
      },
    };
    const tree = resolveRenderTree(makeSceneGraph([ellipse]));
    const node = tree.children[0];
    if (node.type !== "ellipse") { return; }

    const strokeMaskDef = node.defs.find((d) => d.type === "stroke-mask");
    expect(strokeMaskDef).toBeDefined();
    if (!strokeMaskDef || strokeMaskDef.type !== "stroke-mask") { return; }
    expect(strokeMaskDef.shape.kind).toBe("ellipse");
    expect(strokeMaskDef.strokeAlign).toBe("OUTSIDE");
    expect(node.strokeRendering?.mode).toBe("masked");
  });

  it("ELLIPSE with background-blur clips backdrop-filter to ellipse shape", () => {
    // Regression: background-blur's clip-path used a rectangle even for
    // ELLIPSE nodes, so the backdrop-filter blur area appeared as a
    // square bleeding past the circle's silhouette. User's Bento
    // "Container" bug (133:964).
    const ellipse: EllipseNode = {
      type: "ellipse",
      id: "e-bg" as import("../types").SceneNodeId,
      name: "container",
      transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
      opacity: 1,
      visible: true,
      effects: [{ type: "background-blur", radius: 8 }],
      blendMode: undefined,
      cx: 10,
      cy: 10,
      rx: 10,
      ry: 10,
      fills: [{ type: "solid", color: { r: 0, g: 0, b: 0, a: 1 }, opacity: 0.2 }],
    };
    const tree = resolveRenderTree(makeSceneGraph([ellipse]));
    const node = tree.children[0];
    if (node.type !== "ellipse") { return; }
    const clipDef = node.defs.find((d) => d.type === "clip-path" && d.id.startsWith("bg-blur-clip"));
    expect(clipDef, "ELLIPSE with background-blur must emit bg-blur-clip-path def").toBeDefined();
    if (!clipDef || clipDef.type !== "clip-path") { return; }
    expect(clipDef.shape.kind, "clip-path must be ellipse-kind").toBe("ellipse");
  });

  it("CENTER-aligned stroke does NOT emit a stroke-mask def (uniform mode)", () => {
    const ellipse: EllipseNode = {
      type: "ellipse",
      id: "e3" as import("../types").SceneNodeId,
      name: "plain",
      transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
      opacity: 1,
      visible: true,
      effects: [],
      blendMode: undefined,
      cx: 50,
      cy: 50,
      rx: 50,
      ry: 50,
      fills: [{ type: "solid", color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1 }],
      stroke: {
        color: { r: 0, g: 0, b: 0, a: 1 },
        width: 2,
        opacity: 1,
        linecap: "butt",
        linejoin: "miter",
        // align undefined → CENTER (no mask needed)
      },
    };
    const tree = resolveRenderTree(makeSceneGraph([ellipse]));
    const node = tree.children[0];
    if (node.type !== "ellipse") { return; }
    expect(node.defs.find((d) => d.type === "stroke-mask")).toBeUndefined();
    expect(node.strokeRendering?.mode).toBe("uniform");
  });
});
