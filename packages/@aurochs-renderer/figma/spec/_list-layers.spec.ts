import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { it } from "vitest";
import { parseFigFile, buildNodeTree, findNodesByType, getNodeType } from "@aurochs/fig/parser";
import type { FigNode } from "@aurochs/fig/types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIG_FILE = path.join(__dirname, "../fixtures/realfiles/apple-ios26.fig");

it("list layers", { timeout: 30_000 }, async () => {
  if (!fs.existsSync(FIG_FILE)) {
    console.log("SKIP");
    return;
  }
  const data = fs.readFileSync(FIG_FILE);
  const parsed = await parseFigFile(new Uint8Array(data));
  const { roots } = buildNodeTree(parsed.nodeChanges);

  // Target dimensions from SVG files
  const targets = [
    { name: "Action Sheet", w: 380, h: 622 },
    { name: "Activity View", w: 450, h: 920 },
    { name: "Date and time - Pickers", w: 490, h: 501 },
    { name: "Segmented control", w: 410, h: 734 },
    { name: "Window Controls Bright", w: 80, h: 100 },
    { name: "Window Controls Dim", w: 80, h: 100 },
  ];

  // Deep search for frames matching target dimensions
  function walkAll(node: FigNode, parentPath: string, depth: number) {
    const nd = node as Record<string, unknown>;
    const size = nd.size as { x?: number; y?: number } | undefined;
    const w = Math.round(size?.x ?? 0);
    const h = Math.round(size?.y ?? 0);
    const type = getNodeType(node);
    const currentPath = parentPath ? `${parentPath} > ${node.name}` : (node.name ?? "");

    for (const t of targets) {
      if (w === t.w && h === t.h) {
        console.log(`MATCH [${t.name}]: "${currentPath}" type=${type} ${w}x${h}`);
      }
    }

    for (const child of node.children ?? []) {
      walkAll(child, currentPath, depth + 1);
    }
  }

  const canvases = findNodesByType(roots, "CANVAS");
  for (const canvas of canvases) {
    const cd = canvas as Record<string, unknown>;
    if (cd.internalOnly) continue;
    walkAll(canvas, "", 0);
  }

  // List children of Examples canvas using includes match
  console.log("\n=== Examples canvas - full listing (3 levels) ===");
  for (const canvas of canvases) {
    if (!(canvas.name ?? "").includes("Examples")) continue;
    console.log(`Canvas name: [${canvas.name}] (length=${(canvas.name ?? "").length})`);
    for (const child of canvas.children ?? []) {
      const nd = child as Record<string, unknown>;
      const size = nd.size as { x?: number; y?: number } | undefined;
      const type = getNodeType(child);
      const w = Math.round(size?.x ?? 0);
      const h = Math.round(size?.y ?? 0);
      console.log(`"${child.name}" type=${type} ${w}x${h}`);
      for (const gc of child.children ?? []) {
        const gnd = gc as Record<string, unknown>;
        const gsize = gnd.size as { x?: number; y?: number } | undefined;
        const gtype = getNodeType(gc);
        const gw = Math.round(gsize?.x ?? 0);
        const gh = Math.round(gsize?.y ?? 0);
        console.log(`  "${gc.name}" type=${gtype} ${gw}x${gh}`);
        for (const ggc of gc.children ?? []) {
          const ggnd = ggc as Record<string, unknown>;
          const ggsize = ggnd.size as { x?: number; y?: number } | undefined;
          const ggtype = getNodeType(ggc);
          const ggw = Math.round(ggsize?.x ?? 0);
          const ggh = Math.round(ggsize?.y ?? 0);
          console.log(`    "${ggc.name}" type=${ggtype} ${ggw}x${ggh}`);
        }
      }
    }
  }

  // Now look specifically at the SVG node IDs from the exported SVGs
  // Action Sheet: mask0_50_74342 -> node 50:74342
  // Activity View: mask0_50_31177 -> node 50:31177
  // Date and time - Pickers: filter0_d_50_84903 -> node 50:84903
  // Segmented control: clip0_50_85577 -> node 50:85577
  // Window Controls Bright: clip0_50_92976 -> node 50:92976
  // Window Controls Dim: clip0_50_92966 -> node 50:92966
  // Note: The 50:XXXXX format in the ID hints at Figma node GUIDs

  // Use includes-based matching for canvas names (they have special chars/spaces)
  function listAllNodes(node: FigNode, indent: string, maxDepth: number, depth: number) {
    const nd = node as Record<string, unknown>;
    const size = nd.size as { x?: number; y?: number } | undefined;
    const type = getNodeType(node);
    const w = Math.round(size?.x ?? 0);
    const h = Math.round(size?.y ?? 0);
    console.log(`${indent}"${node.name}" type=${type} ${w}x${h}`);
    if (depth < maxDepth) {
      for (const child of node.children ?? []) {
        listAllNodes(child, indent + "  ", maxDepth, depth + 1);
      }
    }
  }

  console.log("\n=== Detailed: Action Sheets canvas ===");
  for (const canvas of canvases) {
    if (!(canvas.name ?? "").includes("Action Sheets")) continue;
    console.log(`Canvas: [${JSON.stringify(canvas.name)}]`);
    for (const child of canvas.children ?? []) {
      listAllNodes(child, "  ", 5, 0);
    }
  }

  console.log("\n=== Detailed: Activity Views canvas ===");
  for (const canvas of canvases) {
    if (!(canvas.name ?? "").includes("Activity Views")) continue;
    console.log(`Canvas: [${JSON.stringify(canvas.name)}]`);
    for (const child of canvas.children ?? []) {
      listAllNodes(child, "  ", 4, 0);
    }
  }

  console.log("\n=== Detailed: Pickers canvas ===");
  for (const canvas of canvases) {
    if (!(canvas.name ?? "").includes("Pickers")) continue;
    console.log(`Canvas: [${JSON.stringify(canvas.name)}]`);
    for (const child of canvas.children ?? []) {
      listAllNodes(child, "  ", 4, 0);
    }
  }
});
