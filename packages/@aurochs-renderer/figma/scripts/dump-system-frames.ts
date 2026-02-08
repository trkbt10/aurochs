/**
 * Render each top-level frame in the System canvas and save as SVG.
 * Used to visually inspect element alignment issues.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFigFile, buildNodeTree, getNodeType, guidToString } from "@aurochs/fig/parser";
import type { FigNode, FigGuid } from "@aurochs/fig/types";
import { renderCanvas } from "../src/svg/renderer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIG_FILE = path.join(__dirname, "../fixtures/realfiles/apple-ios26.fig");
const OUTPUT_DIR = path.join(__dirname, "../fixtures/apple-ios26/__system_output__");

async function main() {
  const data = fs.readFileSync(FIG_FILE);
  const parsed = await parseFigFile(new Uint8Array(data));
  const tree = buildNodeTree(parsed.nodeChanges);
  const { roots, nodeMap } = tree;

  // Find canvases
  const canvases: FigNode[] = [];
  function findCanvases(node: FigNode) {
    if (getNodeType(node) === "CANVAS") canvases.push(node);
    for (const c of node.children ?? []) findCanvases(c);
  }
  for (const r of roots) findCanvases(r);

  console.log(`Found ${canvases.length} canvases:`);
  for (const c of canvases) {
    const children = c.children ?? [];
    console.log(`  "${c.name}" (${children.length} children)`);
  }

  // Find System canvas
  const systemCanvas = canvases.find((c) => c.name?.includes("System"));
  if (!systemCanvas) {
    console.log("System canvas not found");
    return;
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // List top-level frames in System canvas
  const topFrames = systemCanvas.children ?? [];
  console.log(`\nSystem canvas has ${topFrames.length} top-level children:`);
  for (const frame of topFrames) {
    const type = getNodeType(frame);
    const nd = frame as Record<string, unknown>;
    const size = nd.size as { x: number; y: number } | undefined;
    const guid = nd.guid ? guidToString(nd.guid as FigGuid) : "";
    console.log(`  ${type} "${frame.name}" ${size ? `${Math.round(size.x)}x${Math.round(size.y)}` : ""} ${guid}`);
  }

  // Render each top-level frame individually
  for (const frame of topFrames) {
    const type = getNodeType(frame);
    if (type !== "FRAME" && type !== "SECTION" && type !== "SYMBOL" && type !== "INSTANCE") continue;

    const nd = frame as Record<string, unknown>;
    const size = nd.size as { x: number; y: number } | undefined;
    if (!size) continue;

    const safeName = (frame.name ?? "unnamed").replace(/[^a-zA-Z0-9-_]/g, "_");

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
      console.log(`  Rendered "${frame.name}" → ${safeName}.svg (${result.warnings.length} warnings)`);
    } catch (e) {
      console.log(`  ERROR rendering "${frame.name}": ${e}`);
    }
  }

  console.log(`\nOutput written to ${OUTPUT_DIR}`);
}

main().catch(console.error);
