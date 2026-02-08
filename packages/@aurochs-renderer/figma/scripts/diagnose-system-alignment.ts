/**
 * Diagnose element alignment in the System canvas.
 * Renders individual sub-frames and dumps diagnostic info about
 * nested instance resolution and DSD propagation.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFigFile, buildNodeTree, getNodeType, guidToString } from "@aurochs/fig/parser";
import type { FigNode, FigGuid } from "@aurochs/fig/types";
import { renderCanvas } from "../src/svg/renderer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIG_FILE = path.join(__dirname, "../fixtures/realfiles/apple-ios26.fig");
const OUTPUT_DIR = path.join(__dirname, "../fixtures/apple-ios26/__system_diag__");

type NodeData = Record<string, unknown>;

function getSize(node: FigNode): { x: number; y: number } | undefined {
  return (node as NodeData).size as { x: number; y: number } | undefined;
}

function getTransform(node: FigNode): number[][] | undefined {
  return (node as NodeData).transform as number[][] | undefined;
}

function getGuid(node: FigNode): FigGuid | undefined {
  return (node as NodeData).guid as FigGuid | undefined;
}

function dumpTree(node: FigNode, depth: number = 0, maxDepth: number = 3): void {
  const type = getNodeType(node);
  const size = getSize(node);
  const transform = getTransform(node);
  const guid = getGuid(node);
  const nd = node as NodeData;
  const indent = "  ".repeat(depth);

  const hasOverrides = !!(nd.derivedSymbolData as unknown[])?.length;
  const hasCPA = !!(nd.componentPropAssignments as unknown[])?.length;
  const hasSO = !!(nd.symbolOverrides as unknown[])?.length;
  const flags: string[] = [];
  if (hasOverrides) flags.push(`DSD:${(nd.derivedSymbolData as unknown[]).length}`);
  if (hasCPA) flags.push(`CPA:${(nd.componentPropAssignments as unknown[]).length}`);
  if (hasSO) flags.push(`SO:${(nd.symbolOverrides as unknown[]).length}`);

  const tx = transform ? `pos(${transform[0]?.[2]?.toFixed(0)},${transform[1]?.[2]?.toFixed(0)})` : "";
  const sz = size ? `${Math.round(size.x)}x${Math.round(size.y)}` : "";
  const guidStr = guid ? guidToString(guid) : "";
  const flagStr = flags.length > 0 ? ` [${flags.join(",")}]` : "";

  console.log(`${indent}${type} "${node.name}" ${sz} ${tx} ${guidStr}${flagStr}`);

  if (depth < maxDepth) {
    for (const child of node.children ?? []) {
      dumpTree(child, depth + 1, maxDepth);
    }
  }
}

async function main() {
  const data = fs.readFileSync(FIG_FILE);
  const parsed = await parseFigFile(new Uint8Array(data));
  const tree = buildNodeTree(parsed.nodeChanges);
  const { roots, nodeMap } = tree;

  // Find System canvas
  const canvases: FigNode[] = [];
  function findCanvases(node: FigNode) {
    if (getNodeType(node) === "CANVAS") canvases.push(node);
    for (const c of node.children ?? []) findCanvases(c);
  }
  for (const r of roots) findCanvases(r);

  const systemCanvas = canvases.find((c) => c.name?.includes("System"));
  if (!systemCanvas) {
    console.log("System canvas not found");
    return;
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Find the System SECTION
  const systemSection = (systemCanvas.children ?? []).find((c) => getNodeType(c) === "SECTION" && c.name === "System");
  if (!systemSection) {
    console.log("System SECTION not found");
    return;
  }

  // List children of System SECTION
  const sectionChildren = systemSection.children ?? [];
  console.log(`System SECTION has ${sectionChildren.length} children:`);
  for (const child of sectionChildren) {
    const type = getNodeType(child);
    const size = getSize(child);
    const childCount = (child.children ?? []).length;
    console.log(
      `  ${type} "${child.name}" ${size ? `${Math.round(size.x)}x${Math.round(size.y)}` : ""} (${childCount} children)`,
    );
  }

  // Render specific sub-frames to identify alignment issues
  const targetFrames = sectionChildren.slice(0, 10); // First 10 sub-frames

  for (const frame of targetFrames) {
    const type = getNodeType(frame);
    if (type !== "FRAME" && type !== "SECTION" && type !== "SYMBOL" && type !== "INSTANCE") continue;

    const size = getSize(frame);
    if (!size) continue;

    const safeName = (frame.name ?? "unnamed").replace(/[^a-zA-Z0-9-_]/g, "_");

    console.log(`\n--- "${frame.name}" (${type}) ${Math.round(size.x)}x${Math.round(size.y)} ---`);
    dumpTree(frame, 0, 4);

    // Wrap in a canvas for rendering
    const wrapperCanvas: FigNode = {
      type: "CANVAS",
      name: frame.name ?? "unnamed",
      children: [frame],
    };

    try {
      const result = await renderCanvas(wrapperCanvas, {
        width: Math.round(size.x),
        height: Math.round(size.y),
        blobs: parsed.blobs,
        images: parsed.images,
        symbolMap: nodeMap,
      });

      const outPath = path.join(OUTPUT_DIR, `${safeName}.svg`);
      fs.writeFileSync(outPath, result.svg);

      if (result.warnings.length > 0) {
        console.log(`  Warnings (${result.warnings.length}):`);
        for (const w of result.warnings.slice(0, 5)) {
          console.log(`    ${w}`);
        }
      }
      console.log(`  → ${safeName}.svg (${(result.svg.length / 1024).toFixed(0)}KB)`);
    } catch (e) {
      console.log(`  ERROR: ${e}`);
    }
  }

  console.log(`\nOutput written to ${OUTPUT_DIR}`);
}

main().catch(console.error);
