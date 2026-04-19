/**
 * @file Scene graph builder integration tests
 *
 * Verifies that the full pipeline from FigDesignDocument → SceneGraph
 * correctly produces renderable nodes for all content types in the demo.
 */


// eslint-disable-next-line custom/no-builder-import-in-renderer -- spec file: uses builder to create test fixture data for renderer integration tests
import { createDemoFigDesignDocument } from "@aurochs-builder/fig/context";
import type { FigDesignDocument, FigDesignNode } from "@aurochs/fig/domain";
import { buildSceneGraph } from "./builder";
import type { SceneGraph, SceneNode, RectNode, EllipseNode, PathNode, TextNode, FrameNode, Fill } from "./types";

// eslint-disable-next-line no-restricted-syntax -- mutable test-suite variable initialized in beforeAll
let doc: FigDesignDocument;
// eslint-disable-next-line no-restricted-syntax -- mutable test-suite variable initialized in beforeAll
let sceneGraphs: SceneGraph[];

beforeAll(async () => {
  doc = await createDemoFigDesignDocument();
  sceneGraphs = doc.pages.map((page) =>
    buildSceneGraph(page.children, {
      blobs: doc.blobs,
      images: doc.images,
      canvasSize: { width: 1200, height: 800 },
      symbolMap: doc.components,
      styleRegistry: doc.styleRegistry,
      showHiddenNodes: false,
      warnings: [],
    }),
  );
});

function _findNodeByName(nodes: readonly SceneNode[], name: string): SceneNode | undefined {
  for (const node of nodes) {
    if (node.name === name) {return node;}
    if ("children" in node && node.children) {
      const found = _findNodeByName(node.children, name);
      if (found) {return found;}
    }
  }
  return undefined;
}

function findAllByType(nodes: readonly SceneNode[], type: string): SceneNode[] {
  const result: SceneNode[] = [];
  for (const node of nodes) {
    if (node.type === type) {result.push(node);}
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
        switch (gf.type) {
          case "linear-gradient":
            expect(gf.stops.length).toBeGreaterThanOrEqual(2);
            expect(typeof gf.start.x).toBe("number");
            expect(typeof gf.end.x).toBe("number");
            break;
          case "radial-gradient":
            expect(gf.stops.length).toBeGreaterThanOrEqual(2);
            expect(typeof gf.center.x).toBe("number");
            expect(typeof gf.radius).toBe("number");
            break;
          default:
            break;
        }
      }
    });
  });

  describe("Page 2: Typography", () => {
    it("produces text nodes with textLineLayout text data", () => {
      const sg = sceneGraphs[1];
      const textNodes = findAllByType(sg.root.children, "text");
      expect(textNodes.length).toBeGreaterThan(0);

      // Each text node should have either glyphContours or textLineLayout
      for (const tn of textNodes) {
        const text = tn as TextNode;
        const hasGlyphs = text.glyphContours && text.glyphContours.length > 0;
        const hasFallback = text.textLineLayout && text.textLineLayout.lines.length > 0;
        expect(hasGlyphs || hasFallback).toBe(true);
      }
    });

    it("text nodes have non-empty textLineLayout text content", () => {
      const sg = sceneGraphs[1];
      const textNodes = findAllByType(sg.root.children, "text") as TextNode[];
      expect(textNodes.length).toBeGreaterThan(0);

      // Debug: check what the text nodes contain
      for (const t of textNodes) {
        const hasFallback = t.textLineLayout !== undefined;
        const hasGlyphs = t.glyphContours && t.glyphContours.length > 0;
        // At least one rendering path should be available
        expect(hasFallback || hasGlyphs).toBe(true);
      }

      // Check domain textData on original nodes
      const page = doc.pages[1];
      function collectTextNodes(nodes: readonly FigDesignNode[]): FigDesignNode[] {
        const result: FigDesignNode[] = [];
        for (const n of nodes) {
          if (n.type === "TEXT") {result.push(n);}
          if (n.children) {result.push(...collectTextNodes(n.children));}
        }
        return result;
      }
      const domainTextNodes = collectTextNodes(page.children);
      expect(domainTextNodes.length).toBeGreaterThan(0);
      // Check if textData.characters has content
      for (const dn of domainTextNodes) {
        const chars = dn.textData?.characters ?? (dn._raw?.characters as string | undefined) ?? "";
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
          if ("children" in n && n.children) {collect(n.children);}
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

  describe("FRAME decoration preservation", () => {
    function collectFrames(nodes: readonly SceneNode[]): FrameNode[] {
      const result: FrameNode[] = [];
      for (const n of nodes) {
        if (n.type === "frame") {result.push(n);}
        if ("children" in n && n.children) {result.push(...collectFrames(n.children));}
      }
      return result;
    }

    it("every FRAME built with .background(color) has a solid fill in the scene graph", () => {
      // Page 0 "Shapes & Fills" has FRAMEs built with .background(WHITE) —
      // each artboard FRAME calls .background(WHITE) in demo-document.ts.
      // If fills drop between builder and scene graph, this test fails.
      const sg = sceneGraphs[0];
      const frames = collectFrames(sg.root.children);
      expect(frames.length).toBeGreaterThan(0);

      const namedArtboards = frames.filter((f) => f.name === "Basic Shapes" || f.name === "Gradient Fills");
      expect(namedArtboards.length).toBeGreaterThan(0);
      for (const f of namedArtboards) {
        expect(f.fills.length, `FRAME "${f.name}" must carry its .background(WHITE) fill`).toBeGreaterThan(0);
        const solid = f.fills.find((fill) => fill.type === "solid");
        expect(solid, `FRAME "${f.name}" fill must be a solid paint`).toBeDefined();
      }
    });

    it("FRAME decoration survives through to SVG output", async () => {
      // End-to-end: the SVG string must contain the FRAME's fill colour.
      // .background(WHITE) emits r=g=b=1 → "#ffffff" or "rgb(255,255,255)".
      const { renderSceneGraphToSvg } = await import("../svg/scene-renderer");
      const sg = sceneGraphs[0];
      const svg = renderSceneGraphToSvg(sg);
      const frames = collectFrames(sg.root.children);
      const whiteFrame = frames.find((f) =>
        f.name === "Basic Shapes" &&
        f.fills.some((fill) => fill.type === "solid" && fill.color.r === 1 && fill.color.g === 1 && fill.color.b === 1),
      );
      expect(whiteFrame, "Demo Basic Shapes FRAME must have WHITE solid fill").toBeDefined();
      // SVG must mention white somewhere — either as hex or named.
      const mentionsWhite = /#ffffff|#fff\b|rgb\(255, ?255, ?255\)|white/i.test(svg);
      expect(mentionsWhite, "FRAME background fill must appear in SVG output").toBe(true);
    });
  });
});
