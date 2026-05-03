/** @file WebGL effect attribute coverage tests */

import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { SceneGraph, RectNode, SceneNode } from "../../../src/scene-graph/types";
import { createNodeId } from "../../../src/scene-graph/types";
import { renderSceneGraphToSvg } from "../../../src/svg/scene-renderer";
import {
  captureWebGL,
  comparePngs,
  startHarness,
  stopHarness,
  svgToPng,
  type WebGLHarness,
} from "./test-utils";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_CONFIG = path.resolve(__dirname, "harness/vite.config.ts");
const IDENTITY = { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 };

function rect(
  { id, x, y, width, height, color, effects = [], opacity = 1 }: {
    readonly id: string;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly color: { readonly r: number; readonly g: number; readonly b: number; readonly a: number };
    readonly effects?: RectNode["effects"];
    readonly opacity?: number;
  },
): RectNode {
  return {
    id: createNodeId(id),
    type: "rect",
    transform: { ...IDENTITY, m02: x, m12: y },
    opacity,
    visible: true,
    effects,
    width,
    height,
    fills: [{ type: "solid", color, opacity: color.a }],
  };
}

function scene(children: readonly SceneNode[]): SceneGraph {
  return {
    width: 120,
    height: 90,
    viewport: { x: 0, y: 0, width: 120, height: 90 },
    root: {
      id: createNodeId("root"),
      type: "group",
      transform: IDENTITY,
      opacity: 1,
      visible: true,
      effects: [],
      children,
    },
    version: 1,
  };
}

function renderSvgPng(sceneGraph: SceneGraph): Buffer {
  return svgToPng(renderSceneGraphToSvg(sceneGraph) as string, sceneGraph.width);
}

describe("WebGL effect attributes", () => {
  const harnessRef = { value: undefined as WebGLHarness | undefined };

  beforeAll(async () => {
    harnessRef.value = await startHarness(HARNESS_CONFIG);
  }, 30000);

  afterAll(async () => {
    if (harnessRef.value) {
      await stopHarness(harnessRef.value);
    }
  });

  it("tracks drop-shadow spread against SVG output", async () => {
    const graph = scene([
      rect({ id: "target", x: 40, y: 25, width: 32, height: 28, color: { r: 0.9, g: 0.9, b: 0.9, a: 1 }, effects: [{
        type: "drop-shadow",
        offset: { x: 0, y: 0 },
        radius: 0,
        spread: 7,
        color: { r: 0, g: 0, b: 0, a: 0.45 },
      }] }),
    ]);
    const webgl = await captureWebGL(harnessRef.value!.page, graph);
    const svg = renderSvgPng(graph);
    const result = comparePngs({ actual: svg, rendered: webgl, frameName: "drop-shadow-spread" });
    expect(result.diffPercent).toBeLessThan(10);
  });

  it("tracks drop-shadow blendMode and showShadowBehindNode against SVG output", async () => {
    const graph = scene([
      rect({ id: "bg", x: 0, y: 0, width: 120, height: 90, color: { r: 1, g: 0.2, b: 0.2, a: 1 } }),
      rect({ id: "target", x: 42, y: 26, width: 34, height: 28, opacity: 0.65, color: { r: 0.95, g: 0.95, b: 0.95, a: 1 }, effects: [{
        type: "drop-shadow",
        offset: { x: 8, y: 8 },
        radius: 8,
        spread: 2,
        color: { r: 0.1, g: 0.1, b: 1, a: 0.7 },
        blendMode: "multiply",
        showShadowBehindNode: false,
      }] }),
    ]);
    const webgl = await captureWebGL(harnessRef.value!.page, graph);
    const svg = renderSvgPng(graph);
    const result = comparePngs({ actual: svg, rendered: webgl, frameName: "drop-shadow-blend-mode" });
    expect(result.diffPercent).toBeLessThan(8);
  });
});
