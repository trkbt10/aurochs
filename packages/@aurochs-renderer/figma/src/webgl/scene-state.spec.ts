import { describe, it, expect } from "vitest";
import { SceneState } from "./scene-state";
import { diffSceneGraphs } from "../scene-graph/diff";
import type {
  SceneGraph,
  SceneNodeId,
  GroupNode,
  RectNode,
  AffineMatrix,
} from "../scene-graph/types";
import { createNodeId } from "../scene-graph/types";

// =============================================================================
// Test Helpers
// =============================================================================

const IDENTITY: AffineMatrix = { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 };

function makeRect(id: string, width: number, height: number): RectNode {
  return {
    id: createNodeId(id),
    type: "rect",
    transform: IDENTITY,
    opacity: 1,
    visible: true,
    effects: [],
    width,
    height,
    fills: [{ type: "solid", color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1 }],
  };
}

function makeGroup(id: string, children: (RectNode | GroupNode)[]): GroupNode {
  return {
    id: createNodeId(id),
    type: "group",
    transform: IDENTITY,
    opacity: 1,
    visible: true,
    effects: [],
    children,
  };
}

function makeScene(children: (RectNode | GroupNode)[], version = 1): SceneGraph {
  return {
    width: 800,
    height: 600,
    root: makeGroup("root", children),
    version,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("SceneState", () => {
  describe("buildFromScene", () => {
    it("should build state from a simple scene", () => {
      const scene = makeScene([
        makeRect("r1", 100, 50),
        makeRect("r2", 200, 100),
      ]);

      const state = new SceneState();
      state.buildFromScene(scene);

      expect(state.getRootId()).toBe(createNodeId("root"));
      expect(state.getNode(createNodeId("root"))).toBeDefined();
      expect(state.getNode(createNodeId("r1"))).toBeDefined();
      expect(state.getNode(createNodeId("r2"))).toBeDefined();
    });

    it("should tessellate rect nodes", () => {
      const scene = makeScene([makeRect("r1", 100, 50)]);

      const state = new SceneState();
      state.buildFromScene(scene);

      const node = state.getNode(createNodeId("r1"))!;
      expect(node.vertices).not.toBeNull();
      expect(node.vertices!.length).toBeGreaterThan(0);
      expect(node.fill).not.toBeNull();
      expect(node.fill!.type).toBe("solid");
    });

    it("should track child IDs for groups", () => {
      const scene = makeScene([
        makeRect("r1", 100, 50),
        makeGroup("g1", [
          makeRect("r2", 200, 100),
          makeRect("r3", 50, 50),
        ]),
      ]);

      const state = new SceneState();
      state.buildFromScene(scene);

      const root = state.getNode(createNodeId("root"))!;
      expect(root.childIds).toEqual([createNodeId("r1"), createNodeId("g1")]);

      const group = state.getNode(createNodeId("g1"))!;
      expect(group.childIds).toEqual([createNodeId("r2"), createNodeId("r3")]);
    });

    it("should produce a depth-first draw list", () => {
      const scene = makeScene([
        makeRect("r1", 100, 50),
        makeGroup("g1", [
          makeRect("r2", 200, 100),
        ]),
        makeRect("r3", 50, 50),
      ]);

      const state = new SceneState();
      state.buildFromScene(scene);

      const drawList = state.getDrawList();
      const ids = drawList.map((n) => n.id);
      expect(ids).toEqual([
        createNodeId("root"),
        createNodeId("r1"),
        createNodeId("g1"),
        createNodeId("r2"),
        createNodeId("r3"),
      ]);
    });

    it("should skip invisible nodes in draw list", () => {
      const rect: RectNode = {
        ...makeRect("r1", 100, 50),
        visible: false,
      };
      const scene = makeScene([rect, makeRect("r2", 200, 100)]);

      const state = new SceneState();
      state.buildFromScene(scene);

      const drawList = state.getDrawList();
      const ids = drawList.map((n) => n.id);
      expect(ids).not.toContain(createNodeId("r1"));
      expect(ids).toContain(createNodeId("r2"));
    });
  });

  describe("applyDiff", () => {
    it("should handle add operations", () => {
      const scene1 = makeScene([makeRect("r1", 100, 50)], 1);
      const scene2 = makeScene([makeRect("r1", 100, 50), makeRect("r2", 200, 100)], 2);

      const state = new SceneState();
      state.buildFromScene(scene1);
      expect(state.getNode(createNodeId("r2"))).toBeUndefined();

      const diff = diffSceneGraphs(scene1, scene2);
      state.applyDiff(diff);

      expect(state.getNode(createNodeId("r2"))).toBeDefined();
      expect(state.getNode(createNodeId("r2"))!.vertices).not.toBeNull();

      const root = state.getNode(createNodeId("root"))!;
      expect(root.childIds).toEqual([createNodeId("r1"), createNodeId("r2")]);
    });

    it("should handle remove operations", () => {
      const scene1 = makeScene([makeRect("r1", 100, 50), makeRect("r2", 200, 100)], 1);
      const scene2 = makeScene([makeRect("r1", 100, 50)], 2);

      const state = new SceneState();
      state.buildFromScene(scene1);
      expect(state.getNode(createNodeId("r2"))).toBeDefined();

      const diff = diffSceneGraphs(scene1, scene2);
      state.applyDiff(diff);

      expect(state.getNode(createNodeId("r2"))).toBeUndefined();

      const root = state.getNode(createNodeId("root"))!;
      expect(root.childIds).toEqual([createNodeId("r1")]);
    });

    it("should handle update operations (property change)", () => {
      const scene1 = makeScene([makeRect("r1", 100, 50)], 1);

      const updatedRect: RectNode = {
        ...makeRect("r1", 100, 50),
        opacity: 0.5,
      };
      const scene2 = makeScene([updatedRect], 2);

      const state = new SceneState();
      state.buildFromScene(scene1);
      expect(state.getNode(createNodeId("r1"))!.opacity).toBe(1);

      const diff = diffSceneGraphs(scene1, scene2);
      state.applyDiff(diff);

      expect(state.getNode(createNodeId("r1"))!.opacity).toBe(0.5);
    });

    it("should handle update operations (geometry change triggers re-tessellation)", () => {
      const scene1 = makeScene([makeRect("r1", 100, 50)], 1);
      const scene2 = makeScene([makeRect("r1", 200, 100)], 2);

      const state = new SceneState();
      state.buildFromScene(scene1);
      const verticesBefore = state.getNode(createNodeId("r1"))!.vertices;

      const diff = diffSceneGraphs(scene1, scene2);
      state.applyDiff(diff);

      const verticesAfter = state.getNode(createNodeId("r1"))!.vertices;
      // Vertices should be different after geometry change
      expect(verticesAfter).not.toBeNull();
      expect(verticesAfter).not.toBe(verticesBefore);
    });

    it("should handle reorder operations", () => {
      const scene1 = makeScene([makeRect("r1", 100, 50), makeRect("r2", 200, 100)], 1);
      const scene2 = makeScene([makeRect("r2", 200, 100), makeRect("r1", 100, 50)], 2);

      const state = new SceneState();
      state.buildFromScene(scene1);
      expect(state.getNode(createNodeId("root"))!.childIds).toEqual([
        createNodeId("r1"),
        createNodeId("r2"),
      ]);

      const diff = diffSceneGraphs(scene1, scene2);
      state.applyDiff(diff);

      expect(state.getNode(createNodeId("root"))!.childIds).toEqual([
        createNodeId("r2"),
        createNodeId("r1"),
      ]);
    });

    it("should handle recursive removal of nested groups", () => {
      const scene1 = makeScene([
        makeGroup("g1", [
          makeRect("r1", 100, 50),
          makeRect("r2", 200, 100),
        ]),
      ], 1);
      const scene2 = makeScene([], 2);

      const state = new SceneState();
      state.buildFromScene(scene1);
      expect(state.getNode(createNodeId("g1"))).toBeDefined();
      expect(state.getNode(createNodeId("r1"))).toBeDefined();
      expect(state.getNode(createNodeId("r2"))).toBeDefined();

      const diff = diffSceneGraphs(scene1, scene2);
      state.applyDiff(diff);

      expect(state.getNode(createNodeId("g1"))).toBeUndefined();
      expect(state.getNode(createNodeId("r1"))).toBeUndefined();
      expect(state.getNode(createNodeId("r2"))).toBeUndefined();
    });

    it("should produce same draw list whether built fresh or via diff", () => {
      const scene1 = makeScene([
        makeRect("r1", 100, 50),
        makeRect("r2", 200, 100),
      ], 1);

      const scene2 = makeScene([
        makeRect("r1", 100, 50),
        makeRect("r3", 150, 75),
        makeRect("r2", 200, 100),
      ], 2);

      // Approach 1: Build fresh from scene2
      const freshState = new SceneState();
      freshState.buildFromScene(scene2);
      const freshDrawList = freshState.getDrawList().map((n) => n.id);

      // Approach 2: Build from scene1, then apply diff
      const diffState = new SceneState();
      diffState.buildFromScene(scene1);
      const diff = diffSceneGraphs(scene1, scene2);
      diffState.applyDiff(diff);
      const diffDrawList = diffState.getDrawList().map((n) => n.id);

      expect(diffDrawList).toEqual(freshDrawList);
    });
  });
});
