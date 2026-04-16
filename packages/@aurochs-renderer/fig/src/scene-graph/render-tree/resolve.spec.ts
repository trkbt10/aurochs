/**
 * @file RenderTree resolver unit tests
 *
 * Tests the data flow from SceneGraph nodes to RenderTree nodes,
 * verifying that all features are correctly resolved.
 */

import { resolveRenderTree } from "./resolve";
import type {
  RenderRectNode,
  RenderEllipseNode,
  RenderPathNode,
  RenderFrameNode,
} from "./types";
import type {
  SceneGraph,
  GroupNode,
  RectNode,
  EllipseNode,
  PathNode,
  FrameNode,
  SceneNodeId,
  AffineMatrix,
  Fill,
  Stroke,
} from "../types";
import { createNodeId } from "../types";

// =============================================================================
// Helpers
// =============================================================================

const IDENTITY: AffineMatrix = { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 };

function makeSceneGraph(children: GroupNode["children"]): SceneGraph {
  return {
    width: 100,
    height: 100,
    root: {
      type: "group",
      id: createNodeId("root"),
      transform: IDENTITY,
      opacity: 1,
      visible: true,
      effects: [],
      children,
    },
    version: 1,
  };
}

const RED_SOLID: Fill = { type: "solid", color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1 };
const BLUE_SOLID: Fill = { type: "solid", color: { r: 0, g: 0, b: 1, a: 1 }, opacity: 0.5, blendMode: "multiply" };
const GREEN_SOLID: Fill = { type: "solid", color: { r: 0, g: 1, b: 0, a: 1 }, opacity: 1 };

const BASIC_STROKE: Stroke = {
  width: 2,
  linecap: "butt",
  linejoin: "miter",
  color: { r: 0, g: 0, b: 0, a: 1 },
  opacity: 1,
};

// =============================================================================
// Multi-paint fill tests
// =============================================================================

describe("resolveRenderTree — multi-paint fills", () => {
  it("resolves single fill without fillLayers", () => {
    const rect: RectNode = {
      type: "rect",
      id: createNodeId("rect-1"),
      transform: IDENTITY,
      opacity: 1,
      visible: true,
      effects: [],
      width: 50,
      height: 30,
      fills: [RED_SOLID],
    };
    const sg = makeSceneGraph([rect]);
    const tree = resolveRenderTree(sg);

    const node = tree.children[0] as RenderRectNode;
    expect(node.type).toBe("rect");
    expect(node.fill.attrs.fill).toBe("#ff0000");
    expect(node.fillLayers).toBeUndefined();
  });

  it("resolves multiple fills as fillLayers", () => {
    const rect: RectNode = {
      type: "rect",
      id: createNodeId("rect-2"),
      transform: IDENTITY,
      opacity: 1,
      visible: true,
      effects: [],
      width: 50,
      height: 30,
      fills: [RED_SOLID, BLUE_SOLID],
    };
    const sg = makeSceneGraph([rect]);
    const tree = resolveRenderTree(sg);

    const node = tree.children[0] as RenderRectNode;
    expect(node.fillLayers).toBeDefined();
    expect(node.fillLayers).toHaveLength(2);
    // First layer (bottom) = RED
    expect(node.fillLayers![0].attrs.fill).toBe("#ff0000");
    // Second layer (top) = BLUE with blend mode
    expect(node.fillLayers![1].attrs.fill).toBe("#0000ff");
    expect(node.fillLayers![1].blendMode).toBe("multiply");
    // needsWrapper should be true for multi-fill
    expect(node.needsWrapper).toBe(true);
  });

  it("resolves frame background with multiple fills", () => {
    const frame: FrameNode = {
      type: "frame",
      id: createNodeId("frame-1"),
      transform: IDENTITY,
      opacity: 1,
      visible: true,
      effects: [],
      width: 100,
      height: 80,
      fills: [RED_SOLID, GREEN_SOLID],
      clipsContent: false,
      children: [],
    };
    const sg = makeSceneGraph([frame]);
    const tree = resolveRenderTree(sg);

    const node = tree.children[0] as RenderFrameNode;
    expect(node.background).toBeDefined();
    expect(node.background!.fillLayers).toBeDefined();
    expect(node.background!.fillLayers).toHaveLength(2);
  });
});

// =============================================================================
// Ellipse arcData tests
// =============================================================================

describe("resolveRenderTree — ellipse arcData", () => {
  it("resolves full ellipse as ellipse node", () => {
    const ell: EllipseNode = {
      type: "ellipse",
      id: createNodeId("ell-1"),
      transform: IDENTITY,
      opacity: 1,
      visible: true,
      effects: [],
      cx: 25,
      cy: 25,
      rx: 25,
      ry: 25,
      fills: [RED_SOLID],
    };
    const sg = makeSceneGraph([ell]);
    const tree = resolveRenderTree(sg);

    const node = tree.children[0] as RenderEllipseNode;
    expect(node.type).toBe("ellipse");
  });

  it("resolves ellipse with arcData as path node", () => {
    const ell: EllipseNode = {
      type: "ellipse",
      id: createNodeId("ell-arc"),
      transform: IDENTITY,
      opacity: 1,
      visible: true,
      effects: [],
      cx: 25,
      cy: 25,
      rx: 25,
      ry: 25,
      fills: [RED_SOLID],
      arcData: { startingAngle: 0, endingAngle: Math.PI, innerRadius: 0 },
    };
    const sg = makeSceneGraph([ell]);
    const tree = resolveRenderTree(sg);

    const node = tree.children[0];
    // Arc data converts to path
    expect(node.type).toBe("path");
    const pathNode = node as RenderPathNode;
    expect(pathNode.paths).toHaveLength(1);
    expect(pathNode.paths[0].d).toContain("A"); // Arc command
  });

  it("resolves donut (innerRadius > 0) as path node with evenodd", () => {
    const ell: EllipseNode = {
      type: "ellipse",
      id: createNodeId("ell-donut"),
      transform: IDENTITY,
      opacity: 1,
      visible: true,
      effects: [],
      cx: 50,
      cy: 50,
      rx: 50,
      ry: 50,
      fills: [RED_SOLID],
      arcData: { startingAngle: 0, endingAngle: Math.PI * 2, innerRadius: 0.5 },
    };
    const sg = makeSceneGraph([ell]);
    const tree = resolveRenderTree(sg);

    const node = tree.children[0] as RenderPathNode;
    expect(node.type).toBe("path");
    expect(node.paths[0].fillRule).toBe("evenodd");
    // Donut path should contain both outer and inner arcs
    expect(node.paths[0].d).toContain("Z");
  });
});

// =============================================================================
// Per-corner radius tests
// =============================================================================

describe("resolveRenderTree — per-corner radius", () => {
  it("resolves uniform corner radius as number", () => {
    const rect: RectNode = {
      type: "rect",
      id: createNodeId("rect-cr1"),
      transform: IDENTITY,
      opacity: 1,
      visible: true,
      effects: [],
      width: 50,
      height: 30,
      cornerRadius: 10,
      fills: [RED_SOLID],
    };
    const sg = makeSceneGraph([rect]);
    const tree = resolveRenderTree(sg);

    const node = tree.children[0] as RenderRectNode;
    expect(node.cornerRadius).toBe(10);
  });

  it("resolves per-corner radius as tuple", () => {
    const rect: RectNode = {
      type: "rect",
      id: createNodeId("rect-cr-tuple"),
      transform: IDENTITY,
      opacity: 1,
      visible: true,
      effects: [],
      width: 50,
      height: 30,
      cornerRadius: [10, 20, 5, 15] as const,
      fills: [RED_SOLID],
    };
    const sg = makeSceneGraph([rect]);
    const tree = resolveRenderTree(sg);

    const node = tree.children[0] as RenderRectNode;
    expect(Array.isArray(node.cornerRadius)).toBe(true);
  });

  it("clamps corner radius to min(width, height) / 2", () => {
    const rect: RectNode = {
      type: "rect",
      id: createNodeId("rect-cr-clamp"),
      transform: IDENTITY,
      opacity: 1,
      visible: true,
      effects: [],
      width: 20,
      height: 10,
      cornerRadius: 100, // way larger than half the smallest dim
      fills: [RED_SOLID],
    };
    const sg = makeSceneGraph([rect]);
    const tree = resolveRenderTree(sg);

    const node = tree.children[0] as RenderRectNode;
    expect(node.cornerRadius).toBe(5); // min(20, 10) / 2
  });
});

// =============================================================================
// Angular/diamond gradient def collection tests
// =============================================================================

describe("resolveRenderTree — angular/diamond gradients", () => {
  it("collects angular gradient defs", () => {
    const rect: RectNode = {
      type: "rect",
      id: createNodeId("rect-ag"),
      transform: IDENTITY,
      opacity: 1,
      visible: true,
      effects: [],
      width: 50,
      height: 30,
      fills: [{
        type: "angular-gradient",
        center: { x: 0.5, y: 0.5 },
        rotation: 0,
        stops: [
          { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
          { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
        ],
        opacity: 1,
      }],
    };
    const sg = makeSceneGraph([rect]);
    const tree = resolveRenderTree(sg);

    const node = tree.children[0] as RenderRectNode;
    expect(node.fill.attrs.fill).toContain("url(#");
    const angularDefs = node.defs.filter((d) => d.type === "angular-gradient");
    expect(angularDefs).toHaveLength(1);
  });

  it("collects diamond gradient defs", () => {
    const rect: RectNode = {
      type: "rect",
      id: createNodeId("rect-dg"),
      transform: IDENTITY,
      opacity: 1,
      visible: true,
      effects: [],
      width: 50,
      height: 30,
      fills: [{
        type: "diamond-gradient",
        center: { x: 0.5, y: 0.5 },
        stops: [
          { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
          { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
        ],
        opacity: 1,
      }],
    };
    const sg = makeSceneGraph([rect]);
    const tree = resolveRenderTree(sg);

    const node = tree.children[0] as RenderRectNode;
    expect(node.fill.attrs.fill).toContain("url(#");
    const diamondDefs = node.defs.filter((d) => d.type === "diamond-gradient");
    expect(diamondDefs).toHaveLength(1);
  });
});

// =============================================================================
// Per-path fillOverride tests
// =============================================================================

describe("resolveRenderTree — per-path fillOverride", () => {
  it("resolves contour fillOverride to per-path fill", () => {
    const pathNode: PathNode = {
      type: "path",
      id: createNodeId("path-override"),
      transform: IDENTITY,
      opacity: 1,
      visible: true,
      effects: [],
      contours: [
        {
          commands: [
            { type: "M", x: 0, y: 0 },
            { type: "L", x: 10, y: 0 },
            { type: "L", x: 10, y: 10 },
            { type: "Z" },
          ],
          windingRule: "nonzero",
        },
        {
          commands: [
            { type: "M", x: 20, y: 0 },
            { type: "L", x: 30, y: 0 },
            { type: "L", x: 30, y: 10 },
            { type: "Z" },
          ],
          windingRule: "nonzero",
          fillOverride: GREEN_SOLID,
        },
      ],
      fills: [RED_SOLID],
    };
    const sg = makeSceneGraph([pathNode]);
    const tree = resolveRenderTree(sg);

    const node = tree.children[0] as RenderPathNode;
    expect(node.paths).toHaveLength(2);
    // First contour: no override
    expect(node.paths[0].fillOverride).toBeUndefined();
    // Second contour: green override
    expect(node.paths[1].fillOverride).toBeDefined();
    expect(node.paths[1].fillOverride!.attrs.fill).toBe("#00ff00");
  });
});

// =============================================================================
// Stroke layers tests
// =============================================================================

describe("resolveRenderTree — stroke layers", () => {
  it("resolves single stroke without layers", () => {
    const rect: RectNode = {
      type: "rect",
      id: createNodeId("rect-stroke1"),
      transform: IDENTITY,
      opacity: 1,
      visible: true,
      effects: [],
      width: 50,
      height: 30,
      fills: [RED_SOLID],
      stroke: BASIC_STROKE,
    };
    const sg = makeSceneGraph([rect]);
    const tree = resolveRenderTree(sg);

    const node = tree.children[0] as RenderRectNode;
    expect(node.stroke).toBeDefined();
    expect(node.strokeLayers).toBeUndefined();
  });

  it("resolves multi-paint stroke as layers", () => {
    const rect: RectNode = {
      type: "rect",
      id: createNodeId("rect-stroke-multi"),
      transform: IDENTITY,
      opacity: 1,
      visible: true,
      effects: [],
      width: 50,
      height: 30,
      fills: [RED_SOLID],
      stroke: {
        ...BASIC_STROKE,
        layers: [
          { color: { r: 0, g: 0, b: 0, a: 1 }, opacity: 1 },
          { color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 0.5, blendMode: "multiply" },
        ],
      },
    };
    const sg = makeSceneGraph([rect]);
    const tree = resolveRenderTree(sg);

    const node = tree.children[0] as RenderRectNode;
    expect(node.strokeLayers).toBeDefined();
    expect(node.strokeLayers).toHaveLength(2);
    expect(node.strokeLayers![0].attrs.stroke).toBe("#000000");
    expect(node.strokeLayers![1].attrs.stroke).toBe("#ff0000");
    expect(node.strokeLayers![1].blendMode).toBe("multiply");
  });
});

// =============================================================================
// Effect blend mode tests
// =============================================================================

describe("resolveRenderTree — effect blend mode", () => {
  it("applies blend mode to drop shadow feBlend", () => {
    const rect: RectNode = {
      type: "rect",
      id: createNodeId("rect-shadow-blend"),
      transform: IDENTITY,
      opacity: 1,
      visible: true,
      effects: [{
        type: "drop-shadow",
        offset: { x: 0, y: 4 },
        radius: 8,
        color: { r: 0, g: 0, b: 0, a: 0.5 },
        blendMode: "multiply",
      }],
      width: 50,
      height: 30,
      fills: [RED_SOLID],
    };
    const sg = makeSceneGraph([rect]);
    const tree = resolveRenderTree(sg);

    const node = tree.children[0] as RenderRectNode;
    // Filter should exist
    const filterDefs = node.defs.filter((d) => d.type === "filter");
    expect(filterDefs).toHaveLength(1);
    // Check that the blend mode made it into the filter primitives
    const filterDef = filterDefs[0];
    if (filterDef.type === "filter") {
      const blendPrimitives = filterDef.filter.primitives.filter(
        (p) => p.type === "feBlend" && p.mode === "multiply",
      );
      expect(blendPrimitives.length).toBeGreaterThan(0);
    }
  });
});
