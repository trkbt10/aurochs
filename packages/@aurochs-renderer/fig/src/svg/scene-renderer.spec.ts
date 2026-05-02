import { describe, expect, it } from "vitest";
import { renderSceneGraphToSvg } from "./scene-renderer";
import type { SceneGraph } from "../scene-graph/types";
import { createNodeId } from "../scene-graph/types";

describe("renderSceneGraphToSvg viewport", () => {
  it("uses the SceneGraph viewport as the SVG viewBox", () => {
    const sceneGraph: SceneGraph = {
      width: 300,
      height: 200,
      viewport: { x: -120, y: -40, width: 300, height: 200 },
      root: {
        type: "group",
        id: createNodeId("root"),
        transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
        opacity: 1,
        visible: true,
        effects: [],
        children: [],
      },
      version: 1,
    };

    const svg = renderSceneGraphToSvg(sceneGraph) as string;

    expect(svg).toContain('width="300"');
    expect(svg).toContain('height="200"');
    expect(svg).toContain('viewBox="-120 -40 300 200"');
  });
});
