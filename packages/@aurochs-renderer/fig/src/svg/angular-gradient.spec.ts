/**
 * @file Angular / diamond gradient — SVG-native sectored rendering tests
 *
 * Regression: Chromium refuses to render `<foreignObject>` nested inside
 * a `<pattern>`, so the prior foreignObject + CSS conic-gradient approach
 * produced a blank fill (Hologram FRAME 126:420). The sectored SVG-only
 * replacement must emit native `<path>` sectors for both renderers so
 * the gradient works in every SVG consumer (Chromium, Firefox, Safari,
 * resvg, react-native SVG).
 */

import { renderSceneGraphToSvg } from "./scene-renderer";
import type { SceneGraph, FrameNode } from "../scene-graph/types";

const IDENTITY = { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 };
const EMPTY_IMAGES = new Map<string, import("@aurochs/fig/parser").FigImage>();

function makeSceneGraph(children: readonly import("../scene-graph/types").SceneNode[]): SceneGraph {
  return {
    root: {
      type: "group", id: "root" as import("../scene-graph/types").SceneNodeId,
      name: "root", transform: IDENTITY, opacity: 1, visible: true,
      effects: [], blendMode: undefined, children,
    },
    blobs: [], images: EMPTY_IMAGES,
  };
}

describe("Angular gradient — sectored SVG rendering", () => {
  it("emits SVG-native <path> sectors inside a pattern (no foreignObject)", () => {
    const frame: FrameNode = {
      type: "frame",
      id: "f1" as import("../scene-graph/types").SceneNodeId,
      name: "Hologram",
      transform: IDENTITY,
      opacity: 1,
      visible: true,
      effects: [],
      blendMode: undefined,
      width: 38,
      height: 38,
      cornerRadius: 8,
      fills: [
        {
          type: "angular-gradient",
          center: { x: 0.5, y: 0.5 },
          radius: 0.5,
          rotation: 0,
          stops: [
            { position: 0, color: { r: 0.75, g: 0.89, b: 0.97, a: 1 } },
            { position: 0.5, color: { r: 0.96, g: 0.90, b: 0.88, a: 1 } },
            { position: 1, color: { r: 0.71, g: 0.65, b: 0.87, a: 1 } },
          ],
        },
      ],
      clipsContent: false,
      children: [],
    };
    const sg = makeSceneGraph([frame]);
    const svg = renderSceneGraphToSvg(sg);

    // Must NOT use foreignObject (Chromium nested-pattern bug) nor CSS
    // conic-gradient (not portable across SVG renderers).
    expect(svg).not.toContain("<foreignObject");
    expect(svg).not.toContain("conic-gradient(");

    // Must emit a <pattern> with many <path> sector elements.
    expect(svg).toMatch(/<pattern\b/);
    const pathMatches = svg.match(/<path[^>]*fill="rgb\(/g) ?? [];
    // 64 sectors per spec in scene-renderer.ts.
    expect(pathMatches.length, "angular gradient must emit sectored paths").toBeGreaterThanOrEqual(32);
  });

  it("sector colours sample across all declared stops", () => {
    const frame: FrameNode = {
      type: "frame",
      id: "f2" as import("../scene-graph/types").SceneNodeId,
      name: "Spectrum",
      transform: IDENTITY,
      opacity: 1,
      visible: true,
      effects: [],
      blendMode: undefined,
      width: 100,
      height: 100,
      fills: [
        {
          type: "angular-gradient",
          center: { x: 0.5, y: 0.5 },
          radius: 0.5,
          rotation: 0,
          stops: [
            { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
            { position: 0.5, color: { r: 0, g: 1, b: 0, a: 1 } },
            { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
          ],
        },
      ],
      clipsContent: false,
      children: [],
    };
    const sg = makeSceneGraph([frame]);
    const svg = renderSceneGraphToSvg(sg);

    // Pure R, pure G, and pure B sector colours must all appear among
    // the 64 sector samples (red near t=0, green near t=0.5, blue near t=1).
    // The interpolation may produce slightly off-pure values at sector
    // midpoints, so we accept nearby colours.
    const colours = [...new Set((svg.match(/fill="rgb\([^)]+\)"/g) ?? []))];
    const hasReddish = colours.some((c) => /rgb\((2[4-9]\d|25[0-5]),(\d|[1-9]\d),(\d|[1-9]\d)\)/.test(c));
    const hasGreenish = colours.some((c) => /rgb\((\d|[1-9]\d),(2[4-9]\d|25[0-5]),(\d|[1-9]\d)\)/.test(c));
    const hasBluish = colours.some((c) => /rgb\((\d|[1-9]\d),(\d|[1-9]\d),(2[4-9]\d|25[0-5])\)/.test(c));
    expect(hasReddish, "red hue must appear in sectored output").toBe(true);
    expect(hasGreenish, "green hue must appear").toBe(true);
    expect(hasBluish, "blue hue must appear").toBe(true);
  });
});

describe("Diamond gradient — sectored rendering", () => {
  it("emits concentric diamond paths", () => {
    const frame: FrameNode = {
      type: "frame",
      id: "f3" as import("../scene-graph/types").SceneNodeId,
      name: "Diamond",
      transform: IDENTITY,
      opacity: 1,
      visible: true,
      effects: [],
      blendMode: undefined,
      width: 100,
      height: 100,
      fills: [
        {
          type: "diamond-gradient",
          center: { x: 0.5, y: 0.5 },
          radius: 0.5,
          stops: [
            { position: 0, color: { r: 1, g: 1, b: 1, a: 1 } },
            { position: 1, color: { r: 0, g: 0, b: 0, a: 1 } },
          ],
        },
      ],
      clipsContent: false,
      children: [],
    };
    const sg = makeSceneGraph([frame]);
    const svg = renderSceneGraphToSvg(sg);

    expect(svg).not.toContain("<foreignObject");
    // Diamond paths are 4-vertex rhombuses: "M x1,y L x2,y2 L x3,y L x4,y2 Z".
    const diamondPaths = svg.match(/<path[^>]*d="M[^"]*L[^"]*L[^"]*L[^"]*Z"[^>]*fill="rgb\(/g) ?? [];
    expect(diamondPaths.length, "diamond gradient must emit concentric rhombus paths").toBeGreaterThan(8);
  });
});
