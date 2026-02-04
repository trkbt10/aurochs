/**
 * @file Section (SECTION node type) parsing & rendering tests
 *
 * Section .fig file is manually created in Figma (builder cannot generate valid sections yet).
 * Section SVGs from Figma include chrome (title, border) so rendering comparison is limited.
 * Focus: parsing correctness and basic render ability.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFigFile, buildNodeTree, findNodesByType, getNodeType, type FigBlob, type FigImage } from "@oxen/fig/parser";
import type { FigNode } from "@oxen/fig/types";
import { renderCanvas } from "../src/svg/renderer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, "../fixtures/section");
const ACTUAL_DIR = path.join(FIXTURES_DIR, "actual");
const SNAPSHOTS_DIR = path.join(FIXTURES_DIR, "snapshots");
const FIG_FILE = path.join(FIXTURES_DIR, "section.fig");

type ParsedData = {
  canvases: readonly FigNode[];
  allNodes: readonly FigNode[];
  blobs: readonly FigBlob[];
  images: ReadonlyMap<string, FigImage>;
  nodeMap: ReadonlyMap<string, FigNode>;
};

let parsedDataCache: ParsedData | null = null;

async function loadFigFile(): Promise<ParsedData> {
  if (parsedDataCache) return parsedDataCache;

  if (!fs.existsSync(FIG_FILE)) {
    throw new Error(`Fixture file not found: ${FIG_FILE}`);
  }

  const data = fs.readFileSync(FIG_FILE);
  const parsed = await parseFigFile(new Uint8Array(data));
  const { roots, nodeMap } = buildNodeTree(parsed.nodeChanges);
  const canvases = findNodesByType(roots, "CANVAS");

  parsedDataCache = {
    canvases,
    allNodes: parsed.nodeChanges as unknown as FigNode[],
    blobs: parsed.blobs,
    images: parsed.images,
    nodeMap,
  };
  return parsedDataCache;
}

describe("Section Parsing", () => {
  beforeAll(async () => {
    await loadFigFile();
    if (!fs.existsSync(SNAPSHOTS_DIR)) {
      fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
    }
  });

  it("parses section.fig successfully", async () => {
    const data = await loadFigFile();
    expect(data.canvases.length).toBeGreaterThan(0);
  });

  it("finds SECTION nodes in the tree", async () => {
    const data = await loadFigFile();
    const sections: FigNode[] = [];

    for (const canvas of data.canvases) {
      for (const child of canvas.children ?? []) {
        if (getNodeType(child) === "SECTION") {
          sections.push(child);
        }
      }
    }

    console.log(`\n=== Sections found: ${sections.length} ===`);
    for (const sec of sections) {
      const nodeData = sec as Record<string, unknown>;
      const size = nodeData.size as { x?: number; y?: number } | undefined;
      const childCount = sec.children?.length ?? 0;
      console.log(`  "${sec.name}" - ${size?.x ?? "?"}x${size?.y ?? "?"} - ${childCount} children`);

      // Log section-specific fields
      if (nodeData.sectionContentsHidden !== undefined) {
        console.log(`    sectionContentsHidden: ${nodeData.sectionContentsHidden}`);
      }
      if (nodeData.opacity !== undefined) {
        console.log(`    opacity: ${nodeData.opacity}`);
      }
    }

    expect(sections.length).toBeGreaterThan(0);
  });

  it("section nodes have expected fields", async () => {
    const data = await loadFigFile();
    const sections: FigNode[] = [];

    for (const canvas of data.canvases) {
      for (const child of canvas.children ?? []) {
        if (getNodeType(child) === "SECTION") {
          sections.push(child);
        }
      }
    }

    for (const sec of sections) {
      const nodeData = sec as Record<string, unknown>;

      // All sections should have name and size
      expect(sec.name).toBeDefined();
      expect(nodeData.size).toBeDefined();

      // Log all fields for debugging builder
      console.log(`\n=== Section "${sec.name}" fields ===`);
      for (const [key, value] of Object.entries(nodeData)) {
        if (key === "children") {
          console.log(`  ${key}: [${(value as FigNode[])?.length ?? 0} items]`);
        } else if (typeof value === "object" && value !== null) {
          console.log(`  ${key}: ${JSON.stringify(value)}`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      }
    }
  });

  it("renders frames inside sections", async () => {
    const data = await loadFigFile();

    // Find sections that have child frames
    for (const canvas of data.canvases) {
      for (const child of canvas.children ?? []) {
        if (getNodeType(child) !== "SECTION") continue;
        if (!child.children?.length) continue;

        // Try to render each child frame inside the section
        for (const sectionChild of child.children) {
          if (getNodeType(sectionChild) !== "FRAME") continue;

          const nodeData = sectionChild as Record<string, unknown>;
          const size = nodeData.size as { x?: number; y?: number } | undefined;
          const w = size?.x ?? 100;
          const h = size?.y ?? 100;

          const wrapperCanvas: FigNode = {
            type: "CANVAS",
            name: sectionChild.name ?? "frame",
            children: [sectionChild],
          };

          const result = renderCanvas(wrapperCanvas, {
            width: w,
            height: h,
            blobs: data.blobs,
            images: data.images,
            symbolMap: data.nodeMap,
          });

          const safeName = (sectionChild.name ?? "frame").replace(/[^a-zA-Z0-9-_]/g, "_");
          fs.writeFileSync(path.join(SNAPSHOTS_DIR, `${safeName}.svg`), result.svg);

          console.log(`  Rendered section child "${sectionChild.name}": ${result.svg.length} bytes`);

          expect(result.svg).toContain("<svg");
        }
      }
    }
  });
});

describe("Section Node Structure Debug", () => {
  it("dumps full node tree for section.fig", async () => {
    const data = await loadFigFile();

    function dumpTree(nodes: readonly FigNode[], indent: string = ""): void {
      for (const node of nodes) {
        const type = getNodeType(node);
        const nodeData = node as Record<string, unknown>;
        const size = nodeData.size as { x?: number; y?: number } | undefined;
        console.log(`${indent}${type}: "${node.name}" ${size?.x ?? "?"}x${size?.y ?? "?"}`);
        if (node.children?.length) {
          dumpTree(node.children, indent + "  ");
        }
      }
    }

    console.log("\n=== Full node tree ===");
    for (const canvas of data.canvases) {
      if ((canvas as Record<string, unknown>).internalOnly) continue;
      console.log(`CANVAS: "${canvas.name}"`);
      dumpTree(canvas.children ?? [], "  ");
    }
  });
});
