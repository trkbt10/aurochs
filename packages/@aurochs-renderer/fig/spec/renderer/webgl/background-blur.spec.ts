/** @file WebGL background blur tests */

import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { readPng } from "@aurochs/png";
import type { SceneGraph, SceneNode, RectNode } from "../../../src/scene-graph/types";
import { createNodeId } from "../../../src/scene-graph/types";
import {
  captureWebGL,
  startHarness,
  stopHarness,
  type WebGLHarness,
} from "./test-utils";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_CONFIG = path.resolve(__dirname, "harness/vite.config.ts");
const IDENTITY = { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 };

function rect(
  { id, x, y, width, height, color, effects = [] }: {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color: { r: number; g: number; b: number; a: number };
    effects?: RectNode["effects"];
  },
): RectNode {
  return {
    id: createNodeId(id),
    type: "rect",
    transform: { ...IDENTITY, m02: x, m12: y },
    opacity: 1,
    visible: true,
    effects,
    width,
    height,
    fills: [{ type: "solid", color, opacity: color.a }],
  };
}

function makeScene(overlayEffects: RectNode["effects"]): SceneGraph {
  const children: SceneNode[] = [
    rect({ id: "left", x: 0, y: 0, width: 50, height: 50, color: { r: 1, g: 0, b: 0, a: 1 } }),
    rect({ id: "right", x: 50, y: 0, width: 50, height: 50, color: { r: 0, g: 0, b: 1, a: 1 } }),
    rect({
      id: "blur",
      x: 35,
      y: 0,
      width: 30,
      height: 50,
      color: { r: 1, g: 1, b: 1, a: 0 },
      effects: overlayEffects,
    }),
  ];

  return {
    width: 100,
    height: 50,
    viewport: { x: 0, y: 0, width: 100, height: 50 },
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

function pixelAt(png: Buffer, x: number, y: number): readonly [number, number, number, number] {
  const image = readPng(png);
  const index = (y * image.width + x) * 4;
  return [
    image.data[index],
    image.data[index + 1],
    image.data[index + 2],
    image.data[index + 3],
  ];
}

describe("WebGL background blur", () => {
  const harnessRef = { value: undefined as WebGLHarness | undefined };

  beforeAll(async () => {
    harnessRef.value = await startHarness(HARNESS_CONFIG);
  }, 30000);

  afterAll(async () => {
    if (harnessRef.value) {
      await stopHarness(harnessRef.value);
    }
  });

  it("blurs already-rendered backdrop inside the target shape", async () => {
    const withoutBlur = await captureWebGL(harnessRef.value!.page, makeScene([]));
    const withBlur = await captureWebGL(harnessRef.value!.page, makeScene([{ type: "background-blur", radius: 12 }]));

    const plain = pixelAt(withoutBlur, 49, 25);
    const blurred = pixelAt(withBlur, 49, 25);

    expect(plain[0]).toBeGreaterThan(240);
    expect(plain[2]).toBeLessThan(20);
    expect(blurred[0]).toBeLessThan(plain[0] - 20);
    expect(blurred[2]).toBeGreaterThan(plain[2] + 20);
  });
});
