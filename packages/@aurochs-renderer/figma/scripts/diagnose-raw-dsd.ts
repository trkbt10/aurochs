/**
 * Dump RAW derivedSymbolData entries for a specific INSTANCE.
 * Shows the original override GUIDs and their properties before translation.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFigFile, buildNodeTree, getNodeType, guidToString, type FigGuid } from "@aurochs/fig/parser";
import type { FigNode } from "@aurochs/fig/types";
import type { FigDerivedSymbolData, FigSymbolOverride } from "../src/symbols/symbol-resolver";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIG_FILE = path.join(__dirname, "../fixtures/realfiles/apple-ios26.fig");

type NodeData = Record<string, unknown>;

function dumpOverride(entry: FigSymbolOverride, indent: string): void {
  const guids = entry.guidPath?.guids ?? [];
  const guidPath = guids.map((g) => guidToString(g)).join(" → ");
  const e = entry as Record<string, unknown>;

  const keys = Object.keys(e).filter((k) => k !== "guidPath");
  const interesting: Record<string, unknown> = {};
  for (const k of keys) {
    const v = e[k];
    if (k === "size" || k === "transform") {
      interesting[k] = v;
    } else if (k === "derivedTextData") {
      interesting[k] = "(present)";
    } else if (k === "fillPaints" || k === "strokePaints") {
      interesting[k] = `(${(v as unknown[])?.length ?? 0} paints)`;
    } else if (k === "componentPropAssignments") {
      interesting[k] = `(${(v as unknown[])?.length ?? 0} assignments)`;
    } else if (k === "overriddenSymbolID") {
      interesting[k] = v && typeof v === "object" ? guidToString(v as FigGuid) : v;
    } else if (k === "visible" || k === "opacity") {
      interesting[k] = v;
    } else if (k === "textData" || k === "characters") {
      interesting[k] = typeof v === "string" ? v.slice(0, 30) : "(obj)";
    } else {
      interesting[k] = typeof v;
    }
  }
  console.log(`${indent}[${guids.length}] ${guidPath}: ${JSON.stringify(interesting)}`);
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
    console.log("No System canvas");
    return;
  }

  const systemSection = (systemCanvas.children ?? []).find((c) => getNodeType(c) === "SECTION" && c.name === "System");
  if (!systemSection) {
    console.log("No System SECTION");
    return;
  }

  // Pick a specific instance
  const target = (systemSection.children ?? []).find(
    (c) => c.name === "_Home Screen Quick Actions" && getNodeType(c) === "INSTANCE",
  );
  if (!target) {
    console.log("Target not found");
    return;
  }

  const nd = target as NodeData;
  const rawDSD = nd.derivedSymbolData as FigDerivedSymbolData | undefined;

  console.log(`INSTANCE "${target.name}" DSD: ${rawDSD?.length ?? 0} entries\n`);

  if (rawDSD) {
    // Group by first GUID session
    const bySession = new Map<number, FigSymbolOverride[]>();
    for (const entry of rawDSD) {
      const firstGuid = entry.guidPath?.guids?.[0];
      if (firstGuid) {
        const s = firstGuid.sessionID;
        let arr = bySession.get(s);
        if (!arr) {
          arr = [];
          bySession.set(s, arr);
        }
        arr.push(entry);
      }
    }

    for (const [session, entries] of bySession) {
      console.log(`Session ${session} (${entries.length} entries):`);
      for (const entry of entries) {
        dumpOverride(entry, "  ");
      }
      console.log("");
    }
  }

  // Also look at what the SYMBOL's children structure looks like
  const effectiveID = (nd as NodeData).symbolData as { symbolID: FigGuid } | undefined;
  if (effectiveID?.symbolID) {
    const symGuidStr = guidToString(effectiveID.symbolID);
    const sym = nodeMap.get(symGuidStr);
    if (sym) {
      console.log(`\nSYMBOL "${sym.name}" (${symGuidStr}) children:`);
      function dumpChildren(node: FigNode, depth: number, maxD: number) {
        const g = (node as NodeData).guid as FigGuid | undefined;
        const s = (node as NodeData).size as { x: number; y: number } | undefined;
        const t = node.transform as { m02?: number; m12?: number } | undefined;
        const indent = "  ".repeat(depth);
        console.log(
          `${indent}${getNodeType(node)} "${node.name}" ${g ? guidToString(g) : ""} ${s ? `${Math.round(s.x)}x${Math.round(s.y)}` : ""} pos(${t?.m02?.toFixed(0) ?? "?"}, ${t?.m12?.toFixed(0) ?? "?"})`,
        );
        if (depth < maxD) {
          for (const child of node.children ?? []) {
            dumpChildren(child, depth + 1, maxD);
          }
        }
      }
      for (const child of sym.children ?? []) {
        dumpChildren(child, 1, 4);
      }
    }
  }
}

main().catch(console.error);
