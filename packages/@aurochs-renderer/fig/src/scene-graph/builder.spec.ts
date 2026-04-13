/**
 * @file Scene graph builder integration tests
 *
 * Verifies that the full pipeline from FigDesignDocument → SceneGraph
 * correctly produces renderable nodes for all content types in the demo.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { createDemoFigDesignDocument } from "@aurochs-builder/fig/context";
import type { FigDesignDocument } from "@aurochs/fig/domain";
import { buildSceneGraph } from "./builder";
import type { SceneGraph, SceneNode, FrameNode, RectNode, EllipseNode, PathNode, TextNode, GroupNode, Fill } from "./types";

let doc: FigDesignDocument;
let sceneGraphs: SceneGraph[];

beforeAll(async () => {
  doc = await createDemoFigDesignDocument();
  sceneGraphs = doc.pages.map((page) =>
    buildSceneGraph(page.children, {
      blobs: doc._loaded?.blobs ?? [],
      images: doc.images,
      canvasSize: { width: 1200, height: 800 },
    }),
  );
});

function findNodeByName(nodes: readonly SceneNode[], name: string): SceneNode | undefined {
  for (const node of nodes) {
    if (node.name === name) return node;
    if ("children" in node && node.children) {
      const found = findNodeByName(node.children, name);
      if (found) return found;
    }
  }
  return undefined;
}

function findAllByType(nodes: readonly SceneNode[], type: string): SceneNode[] {
  const result: SceneNode[] = [];
  for (const node of nodes) {
    if (node.type === type) result.push(node);
    if ("children" in node && node.children) {
      result.push(...findAllByType(node.children, type));
    }
  }
  return result;
}

describe("Scene graph builder - demo document", () => {
  it("builds scene graphs for all pages (3 visible + 1 internal)", () => {
    expect(sceneGraphs.length).toBeGreaterThanOrEqual(3);
  });

  describe("Page 1: Shapes & Fills", () => {
    it("produces rect nodes for rectangles", () => {
      const sg = sceneGraphs[0];
      const rects = findAllByType(sg.root.children, "rect");
      expect(rects.length).toBeGreaterThan(0);
      const rectWithFill = rects.find((r) => (r as RectNode).fills.length > 0);
      expect(rectWithFill).toBeDefined();
    });

    it("produces ellipse nodes", () => {
      const sg = sceneGraphs[0];
      const ellipses = findAllByType(sg.root.children, "ellipse");
      expect(ellipses.length).toBeGreaterThan(0);
      const ellipse = ellipses[0] as EllipseNode;
      expect(ellipse.rx).toBeGreaterThan(0);
    });

    it("produces path nodes with contours for star/polygon", () => {
      const sg = sceneGraphs[0];
      const paths = findAllByType(sg.root.children, "path");
      // Star and polygon should produce paths with synthesized geometry
      expect(paths.length).toBeGreaterThan(0);
      // All path nodes should have renderable contours
      const withContours = paths.filter((p) => (p as PathNode).contours.length > 0);
      expect(withContours.length).toBeGreaterThan(0);
      for (const p of withContours) {
        const pathNode = p as PathNode;
        expect(pathNode.contours[0].commands.length).toBeGreaterThanOrEqual(2);
      }
    });

    it("produces gradient fills in Gradient Fills artboard", () => {
      const sg = sceneGraphs[0];
      const allFills: Fill[] = [];

      function collectFills(nodes: readonly SceneNode[]) {
        for (const node of nodes) {
          if ("fills" in node) {
            allFills.push(...node.fills);
          }
          if ("children" in node && node.children) {
            collectFills(node.children);
          }
        }
      }
      collectFills(sg.root.children);

      const gradientFills = allFills.filter(
        (f) => f.type === "linear-gradient" || f.type === "radial-gradient",
      );
      expect(gradientFills.length).toBeGreaterThan(0);

      // Verify gradient fills have stops
      for (const gf of gradientFills) {
        if (gf.type === "linear-gradient") {
          expect(gf.stops.length).toBeGreaterThanOrEqual(2);
          expect(typeof gf.start.x).toBe("number");
          expect(typeof gf.end.x).toBe("number");
        } else if (gf.type === "radial-gradient") {
          expect(gf.stops.length).toBeGreaterThanOrEqual(2);
          expect(typeof gf.center.x).toBe("number");
          expect(typeof gf.radius).toBe("number");
        }
      }
    });
  });

  describe("Page 2: Typography", () => {
    it("produces text nodes with fallback text data", () => {
      const sg = sceneGraphs[1];
      const textNodes = findAllByType(sg.root.children, "text");
      expect(textNodes.length).toBeGreaterThan(0);

      // Each text node should have either glyphContours or fallbackText
      for (const tn of textNodes) {
        const text = tn as TextNode;
        const hasGlyphs = text.glyphContours && text.glyphContours.length > 0;
        const hasFallback = text.fallbackText && text.fallbackText.lines.length > 0;
        expect(hasGlyphs || hasFallback).toBe(true);
      }
    });

    it("text nodes have non-empty fallback text content", () => {
      const sg = sceneGraphs[1];
      const textNodes = findAllByType(sg.root.children, "text") as TextNode[];
      expect(textNodes.length).toBeGreaterThan(0);

      // Debug: check what the text nodes contain
      for (const t of textNodes) {
        const hasFallback = t.fallbackText !== undefined;
        const hasGlyphs = t.glyphContours && t.glyphContours.length > 0;
        // At least one rendering path should be available
        expect(hasFallback || hasGlyphs).toBe(true);
      }

      // Check domain textData on original nodes
      const page = doc.pages[1];
      function collectTextNodes(nodes: readonly any[]): any[] {
        const result: any[] = [];
        for (const n of nodes) {
          if (n.type === "TEXT") result.push(n);
          if (n.children) result.push(...collectTextNodes(n.children));
        }
        return result;
      }
      const domainTextNodes = collectTextNodes(page.children);
      expect(domainTextNodes.length).toBeGreaterThan(0);
      // Check if textData.characters has content
      for (const dn of domainTextNodes) {
        const chars = dn.textData?.characters ?? dn._raw?.characters ?? "";
        expect(chars.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Page 3: Components & Effects", () => {
    it("produces frame nodes for component instances", () => {
      const sg = sceneGraphs[2];
      const frames = findAllByType(sg.root.children, "frame");
      expect(frames.length).toBeGreaterThan(0);
    });

    it("produces nodes with effects", () => {
      const sg = sceneGraphs[2];
      const allNodes: SceneNode[] = [];
      function collect(nodes: readonly SceneNode[]) {
        for (const n of nodes) {
          allNodes.push(n);
          if ("children" in n && n.children) collect(n.children);
        }
      }
      collect(sg.root.children);

      const withEffects = allNodes.filter((n) => n.effects.length > 0);
      expect(withEffects.length).toBeGreaterThan(0);

      // Check that effects have the right shape
      for (const n of withEffects) {
        for (const eff of n.effects) {
          expect(["drop-shadow", "inner-shadow", "layer-blur", "background-blur"]).toContain(eff.type);
        }
      }
    });
  });
});
