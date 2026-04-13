/**
 * @file Verify INSTANCE color inheritance through scene graph
 */

import { describe, it, expect } from "vitest";
import { createDemoFigDesignDocument } from "@aurochs-builder/fig/context";
import { buildSceneGraph } from "./builder";
import type { SceneNode, FrameNode, Fill } from "./types";

function findSceneNode(nodes: readonly SceneNode[], predicate: (n: SceneNode) => boolean): SceneNode | undefined {
  for (const node of nodes) {
    if (predicate(node)) return node;
    if ("children" in node && node.children) {
      const found = findSceneNode(node.children, predicate);
      if (found) return found;
    }
  }
  return undefined;
}

describe("INSTANCE color inheritance in scene graph", () => {
  it("default INSTANCE inherits SYMBOL fills", async () => {
    const doc = await createDemoFigDesignDocument();
    const compPage = doc.pages.find((p) => p.name === "Components & Effects")!;

    const sg = buildSceneGraph(compPage.children, {
      blobs: doc._loaded?.blobs ?? [],
      images: doc.images,
      canvasSize: { width: 1200, height: 800 },
      symbolMap: doc.components,
    });

    // Find the "Default" button instance
    const defaultBtn = findSceneNode(sg.root.children, (n) => n.name === "Default") as FrameNode | undefined;
    expect(defaultBtn, "Default button instance should exist in scene graph").toBeDefined();
    expect(defaultBtn!.type).toBe("frame");
    expect(defaultBtn!.fills.length).toBeGreaterThan(0);

    // Default button should have BLUE fill inherited from SYMBOL
    // BLUE = { r: 0.24, g: 0.47, b: 0.85, a: 1 }
    const topFill = defaultBtn!.fills[defaultBtn!.fills.length - 1];
    expect(topFill.type).toBe("solid");
    if (topFill.type === "solid") {
      expect(topFill.color.r).toBeCloseTo(0.24, 1);
      expect(topFill.color.b).toBeCloseTo(0.85, 1);
    }
  }, 30_000);

  it("overrideBackground INSTANCE uses its own fills", async () => {
    const doc = await createDemoFigDesignDocument();
    const compPage = doc.pages.find((p) => p.name === "Components & Effects")!;

    const sg = buildSceneGraph(compPage.children, {
      blobs: doc._loaded?.blobs ?? [],
      images: doc.images,
      canvasSize: { width: 1200, height: 800 },
      symbolMap: doc.components,
    });

    // Find the "Danger" button instance (overrideBackground(RED))
    const dangerBtn = findSceneNode(sg.root.children, (n) => n.name === "Danger") as FrameNode | undefined;
    expect(dangerBtn, "Danger button instance should exist in scene graph").toBeDefined();
    expect(dangerBtn!.type).toBe("frame");
    expect(dangerBtn!.fills.length).toBeGreaterThan(0);

    // Danger button should have RED fill from overrideBackground
    // RED = { r: 0.90, g: 0.25, b: 0.25, a: 1 }
    const topFill = dangerBtn!.fills[dangerBtn!.fills.length - 1];
    expect(topFill.type).toBe("solid");
    if (topFill.type === "solid") {
      expect(topFill.color.r).toBeCloseTo(0.9, 1);
      expect(topFill.color.g).toBeCloseTo(0.25, 1);
    }
  }, 30_000);

  it("INSTANCE inherits children from SYMBOL", async () => {
    const doc = await createDemoFigDesignDocument();
    const compPage = doc.pages.find((p) => p.name === "Components & Effects")!;

    const sg = buildSceneGraph(compPage.children, {
      blobs: doc._loaded?.blobs ?? [],
      images: doc.images,
      canvasSize: { width: 1200, height: 800 },
      symbolMap: doc.components,
    });

    // Default button should have children (bg rect + label text)
    const defaultBtn = findSceneNode(sg.root.children, (n) => n.name === "Default") as FrameNode | undefined;
    expect(defaultBtn).toBeDefined();
    expect(defaultBtn!.children.length).toBeGreaterThan(0);
  }, 30_000);

  it("INSTANCE inherits cornerRadius from SYMBOL", async () => {
    const doc = await createDemoFigDesignDocument();
    const compPage = doc.pages.find((p) => p.name === "Components & Effects")!;

    const sg = buildSceneGraph(compPage.children, {
      blobs: doc._loaded?.blobs ?? [],
      images: doc.images,
      canvasSize: { width: 1200, height: 800 },
      symbolMap: doc.components,
    });

    const defaultBtn = findSceneNode(sg.root.children, (n) => n.name === "Default") as FrameNode | undefined;
    expect(defaultBtn).toBeDefined();
    // Button SYMBOL has cornerRadius(8)
    expect(defaultBtn!.cornerRadius).toBe(8);
  }, 30_000);
});
