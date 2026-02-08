/**
 * @file Diagnostic test: analyze real text data from .fig files
 *
 * Loads real .fig data, builds scene graph, and inspects text nodes
 * to understand why text rendering fails in the WebGL renderer.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect, beforeAll } from "vitest";
import { parseFigFile, buildNodeTree, findNodesByType, type FigBlob, type FigImage } from "@aurochs/fig/parser";
import type { FigNode } from "@aurochs/fig/types";
import { buildSceneGraph } from "../src/scene-graph/builder";
import type { SceneGraph, SceneNode, TextNode, PathContour } from "../src/scene-graph/types";
import { tessellateContours, flattenPathCommands } from "../src/webgl/tessellation";
import { tessellateTextNode } from "../src/webgl/text-renderer";

// =============================================================================
// Setup
// =============================================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, "../fixtures/twitter-ui");
const FIG_FILE = path.join(FIXTURES_DIR, "twitter_ui.fig");

let allTextNodes: { frameName: string; node: TextNode }[] = [];

function signedArea(coords: readonly number[]): number {
  const n = coords.length >> 1;
  let area = 0;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    area += (coords[j * 2] - coords[i * 2]) * (coords[j * 2 + 1] + coords[i * 2 + 1]);
  }
  return area;
}

function normalizeRootNode(node: FigNode): FigNode {
  const nodeData = node as Record<string, unknown>;
  const transform = nodeData.transform as { m02?: number; m12?: number } | undefined;
  if (!transform) return node;
  return { ...node, transform: { ...transform, m02: 0, m12: 0 } } as FigNode;
}

function collectTextNodes(node: SceneNode, result: TextNode[]): void {
  if (node.type === "text") {
    result.push(node);
  }
  if ("children" in node) {
    for (const child of node.children) {
      collectTextNodes(child, result);
    }
  }
}

beforeAll(async () => {
  if (!fs.existsSync(FIG_FILE)) {
    console.log("SKIP: twitter_ui.fig not found");
    return;
  }

  const data = fs.readFileSync(FIG_FILE);
  const parsed = await parseFigFile(new Uint8Array(data));
  const { roots, nodeMap } = buildNodeTree(parsed.nodeChanges);

  const twitterCanvas = findNodesByType(roots, "CANVAS").find((c) => c.name === "Twitter");
  if (!twitterCanvas) throw new Error("Twitter canvas not found");

  const TEST_FRAMES = ["Twitter Home", "Twitter Profile (Tweets)", "Twitter Search", "Twitter Menu"];

  for (const child of twitterCanvas.children ?? []) {
    const name = child.name ?? "unnamed";
    if (!TEST_FRAMES.includes(name)) continue;

    const nodeData = child as Record<string, unknown>;
    const size = nodeData.size as { x?: number; y?: number } | undefined;
    const width = size?.x ?? 100;
    const height = size?.y ?? 100;

    const normalizedNode = normalizeRootNode(child);
    const sg = buildSceneGraph([normalizedNode], {
      blobs: parsed.blobs,
      images: parsed.images,
      canvasSize: { width, height },
      symbolMap: nodeMap,
      showHiddenNodes: false,
    });

    const texts: TextNode[] = [];
    collectTextNodes(sg.root, texts);
    for (const t of texts) {
      allTextNodes.push({ frameName: name, node: t });
    }
  }
}, 30000);

// =============================================================================
// Diagnostics
// =============================================================================

describe("Text node diagnostics (real .fig data)", () => {
  it("counts text nodes by rendering path", () => {
    if (!allTextNodes.length) return;

    let withGlyphContours = 0;
    let withFallbackText = 0;
    let withBoth = 0;
    let withNeither = 0;
    let emptyGlyphContours = 0;

    for (const { node } of allTextNodes) {
      const hasGlyphs = node.glyphContours !== undefined;
      const hasFallback = node.fallbackText !== undefined;

      if (hasGlyphs && hasFallback) withBoth++;
      else if (hasGlyphs) withGlyphContours++;
      else if (hasFallback) withFallbackText++;
      else withNeither++;

      if (hasGlyphs && node.glyphContours!.length === 0) {
        emptyGlyphContours++;
      }
    }

    console.log("\n=== Text Node Rendering Path Distribution ===");
    console.log(`  Total text nodes: ${allTextNodes.length}`);
    console.log(`  With glyphContours only: ${withGlyphContours}`);
    console.log(`  With fallbackText only: ${withFallbackText}`);
    console.log(`  With both: ${withBoth}`);
    console.log(`  With neither (!): ${withNeither}`);
    console.log(`  Empty glyphContours array (!): ${emptyGlyphContours}`);

    expect(allTextNodes.length).toBeGreaterThan(0);
  });

  it("analyzes glyph contour tessellation success rate", () => {
    if (!allTextNodes.length) return;

    let totalWithContours = 0;
    let tessellationSuccess = 0;
    let tessellationEmpty = 0;
    let totalContourCount = 0;
    let totalVertexCount = 0;
    let outerContours = 0;
    let holeContours = 0;
    let tooFewPoints = 0;

    for (const { node } of allTextNodes) {
      if (!node.glyphContours || node.glyphContours.length === 0) continue;
      totalWithContours++;
      totalContourCount += node.glyphContours.length;

      // Classify each contour
      for (const contour of node.glyphContours) {
        const coords = flattenPathCommands(contour.commands);
        if (coords.length < 6) {
          tooFewPoints++;
          continue;
        }
        const area = signedArea(coords);
        if (area < 0) outerContours++;
        else holeContours++;
      }

      // Try tessellation
      const vertices = tessellateContours(node.glyphContours as PathContour[], 0.25, true);
      if (vertices.length > 0) {
        tessellationSuccess++;
        totalVertexCount += vertices.length;
      } else {
        tessellationEmpty++;
      }
    }

    console.log("\n=== Glyph Contour Tessellation Analysis ===");
    console.log(`  Nodes with glyphContours: ${totalWithContours}`);
    console.log(`  Tessellation success: ${tessellationSuccess}`);
    console.log(`  Tessellation empty (!): ${tessellationEmpty}`);
    console.log(`  Total contours: ${totalContourCount}`);
    console.log(`  - Outer (negative area): ${outerContours}`);
    console.log(`  - Hole (positive area): ${holeContours}`);
    console.log(`  - Too few points: ${tooFewPoints}`);
    console.log(`  Total vertices produced: ${totalVertexCount}`);
    if (tessellationSuccess > 0) {
      console.log(`  Avg vertices per node: ${(totalVertexCount / tessellationSuccess).toFixed(0)}`);
    }

    if (totalWithContours > 0) {
      const successRate = (tessellationSuccess / totalWithContours) * 100;
      console.log(`  Success rate: ${successRate.toFixed(1)}%`);
    }
  });

  it("identifies text nodes that fail tessellation", () => {
    if (!allTextNodes.length) return;

    const failures: { name: string; contourCount: number; reason: string }[] = [];

    for (const { frameName, node } of allTextNodes) {
      if (!node.glyphContours || node.glyphContours.length === 0) continue;

      const vertices = tessellateContours(node.glyphContours as PathContour[], 0.25, true);
      if (vertices.length > 0) continue;

      // Diagnose why it failed
      let allHoles = true;
      let allTooSmall = true;
      const contourDetails: string[] = [];

      for (const contour of node.glyphContours) {
        const coords = flattenPathCommands(contour.commands);
        if (coords.length >= 6) {
          allTooSmall = false;
          const area = signedArea(coords);
          if (area < 0) allHoles = false;
          contourDetails.push(`area=${area.toFixed(1)}, pts=${coords.length / 2}`);
        } else {
          contourDetails.push(`pts=${coords.length / 2} (too few)`);
        }
      }

      let reason = "unknown";
      if (allTooSmall) reason = "all contours have <3 points";
      else if (allHoles) reason = "ALL contours classified as HOLES (winding issue!)";

      failures.push({
        name: `${frameName}/${node.name}`,
        contourCount: node.glyphContours.length,
        reason,
      });

      if (failures.length <= 10) {
        console.log(`\n  FAILED: ${frameName}/${node.name}`);
        console.log(`    Contours: ${node.glyphContours.length}, reason: ${reason}`);
        for (const detail of contourDetails.slice(0, 5)) {
          console.log(`      ${detail}`);
        }
        if (contourDetails.length > 5) {
          console.log(`      ... and ${contourDetails.length - 5} more`);
        }
      }
    }

    console.log(`\n=== Tessellation Failures: ${failures.length} total ===`);
    if (failures.length > 0) {
      const reasons = new Map<string, number>();
      for (const f of failures) {
        reasons.set(f.reason, (reasons.get(f.reason) ?? 0) + 1);
      }
      for (const [reason, count] of reasons) {
        console.log(`  ${reason}: ${count} nodes`);
      }
    }
  });

  it("samples contour data from a successful text node", () => {
    if (!allTextNodes.length) return;

    for (const { frameName, node } of allTextNodes) {
      if (!node.glyphContours || node.glyphContours.length === 0) continue;

      const vertices = tessellateContours(node.glyphContours as PathContour[], 0.25, true);
      if (vertices.length === 0) continue;

      console.log(`\n=== Sample Successful Text Node ===`);
      console.log(`  Frame: ${frameName}, Name: "${node.name}"`);
      console.log(`  Contours: ${node.glyphContours.length}`);
      console.log(`  Vertices produced: ${vertices.length / 2}`);
      console.log(
        `  Fill: rgba(${node.fill.color.r.toFixed(2)}, ${node.fill.color.g.toFixed(2)}, ${node.fill.color.b.toFixed(2)}, ${node.fill.opacity})`,
      );
      console.log(
        `  Transform: [${node.transform.m00.toFixed(2)}, ${node.transform.m01.toFixed(2)}, ${node.transform.m02.toFixed(2)}, ${node.transform.m10.toFixed(2)}, ${node.transform.m11.toFixed(2)}, ${node.transform.m12.toFixed(2)}]`,
      );

      // Show first 3 contours
      for (let i = 0; i < Math.min(3, node.glyphContours.length); i++) {
        const c = node.glyphContours[i];
        const coords = flattenPathCommands(c.commands);
        const area = signedArea(coords);
        console.log(`  Contour ${i}: ${c.commands.length} cmds, ${coords.length / 2} pts, area=${area.toFixed(1)}`);

        let minX = Infinity,
          minY = Infinity,
          maxX = -Infinity,
          maxY = -Infinity;
        for (let j = 0; j < coords.length; j += 2) {
          minX = Math.min(minX, coords[j]);
          maxX = Math.max(maxX, coords[j]);
          minY = Math.min(minY, coords[j + 1]);
          maxY = Math.max(maxY, coords[j + 1]);
        }
        console.log(`    bbox: [${minX.toFixed(1)}, ${minY.toFixed(1)}] to [${maxX.toFixed(1)}, ${maxY.toFixed(1)}]`);
      }

      break;
    }
  });

  it("per-frame text node summary", () => {
    if (!allTextNodes.length) return;

    console.log("\n=== Per-Frame Text Summary ===");
    const frameGroups = new Map<string, typeof allTextNodes>();
    for (const entry of allTextNodes) {
      const list = frameGroups.get(entry.frameName) ?? [];
      list.push(entry);
      frameGroups.set(entry.frameName, list);
    }

    for (const [frame, entries] of frameGroups) {
      let withGlyphs = 0;
      let withFallback = 0;
      let tessSuccess = 0;
      let tessEmpty = 0;

      for (const { node } of entries) {
        if (node.glyphContours && node.glyphContours.length > 0) {
          withGlyphs++;
          const verts = tessellateContours(node.glyphContours as PathContour[], 0.25, true);
          if (verts.length > 0) tessSuccess++;
          else tessEmpty++;
        } else if (node.fallbackText) {
          withFallback++;
        }
      }

      console.log(`  ${frame}: ${entries.length} text nodes`);
      console.log(`    glyphContours: ${withGlyphs} (tess ok: ${tessSuccess}, tess empty: ${tessEmpty})`);
      console.log(`    fallbackText: ${withFallback}`);
    }
  });
});
