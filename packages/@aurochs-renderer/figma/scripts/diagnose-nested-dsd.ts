/**
 * Deep diagnostic of DSD/override application for nested instances.
 * Traces GUID translation and DSD propagation at each level.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFigFile, buildNodeTree, getNodeType, guidToString, type FigGuid } from "@aurochs/fig/parser";
import type { FigNode } from "@aurochs/fig/types";
import { getEffectiveSymbolID } from "@aurochs/fig/symbols";
import { buildGuidTranslationMap, translateOverrides } from "../src/symbols/guid-translation";
import {
  cloneSymbolChildren,
  collectComponentPropAssignments,
  getInstanceSymbolOverrides,
  resolveSymbolGuidStr,
  type FigDerivedSymbolData,
  type FigSymbolOverride,
} from "../src/symbols/symbol-resolver";
import { preResolveSymbols } from "../src/symbols/symbol-pre-resolver";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIG_FILE = path.join(__dirname, "../fixtures/realfiles/apple-ios26.fig");

type NodeData = Record<string, unknown>;

function getSize(n: FigNode) {
  return (n as NodeData).size as { x: number; y: number } | undefined;
}
function getTransform(n: FigNode) {
  return n.transform as { m02?: number; m12?: number } | undefined;
}

/**
 * Resolve a single INSTANCE, printing diagnostic info, and return resolved children.
 */
function diagnoseInstance(
  node: FigNode,
  symbolMap: ReadonlyMap<string, FigNode>,
  resolvedCache: ReadonlyMap<string, FigNode>,
  depth: number = 0,
  maxDepth: number = 2,
): FigNode[] | undefined {
  const indent = "  ".repeat(depth);
  const nd = node as NodeData;
  const guid = nd.guid as FigGuid | undefined;
  const guidStr = guid ? guidToString(guid) : "?";
  const size = getSize(node);
  const transform = getTransform(node);

  console.log(
    `${indent}INSTANCE "${node.name}" ${guidStr} ${size ? `${Math.round(size.x)}x${Math.round(size.y)}` : ""} pos(${transform?.m02?.toFixed(0) ?? "?"}, ${transform?.m12?.toFixed(0) ?? "?"})`,
  );

  const effectiveID = getEffectiveSymbolID(nd);
  if (!effectiveID) {
    console.log(`${indent}  ❌ No effective symbolID`);
    return undefined;
  }

  const resolved = resolveSymbolGuidStr(effectiveID, symbolMap);
  if (!resolved) {
    console.log(`${indent}  ❌ SYMBOL not found: ${effectiveID.sessionID}:${effectiveID.localID}`);
    return undefined;
  }

  const symNode = resolvedCache.get(resolved.guidStr) ?? resolved.node;
  const originalSymNode = resolved.node;
  const symSize = getSize(symNode);
  console.log(
    `${indent}  → SYMBOL "${symNode.name}" ${resolved.guidStr} ${symSize ? `${Math.round(symSize.x)}x${Math.round(symSize.y)}` : ""}`,
  );

  // Show symbol children
  const origChildren = originalSymNode.children ?? [];
  console.log(`${indent}  Original children: ${origChildren.length}`);
  for (const child of origChildren) {
    const ct = getNodeType(child);
    const cs = getSize(child);
    const cg = (child as NodeData).guid as FigGuid | undefined;
    const ct2 = getTransform(child);
    console.log(
      `${indent}    ${ct} "${child.name}" ${cg ? guidToString(cg) : ""} ${cs ? `${Math.round(cs.x)}x${Math.round(cs.y)}` : ""} pos(${ct2?.m02?.toFixed(0) ?? "?"}, ${ct2?.m12?.toFixed(0) ?? "?"})`,
    );
  }

  // DSD and overrides
  const rawDSD = nd.derivedSymbolData as FigDerivedSymbolData | undefined;
  const rawSO = getInstanceSymbolOverrides(nd);
  const dsdCount = rawDSD?.length ?? 0;
  const soCount = rawSO?.length ?? 0;
  console.log(`${indent}  DSD: ${dsdCount}, SO: ${soCount}`);

  // GUID translation
  const translationMap = buildGuidTranslationMap(originalSymNode.children ?? [], rawDSD, rawSO);
  console.log(`${indent}  Translation map: ${translationMap.size} entries`);
  if (translationMap.size > 0 && translationMap.size <= 20) {
    for (const [from, to] of translationMap) {
      console.log(`${indent}    ${from} → ${to}`);
    }
  }

  // Translate overrides
  const symbolOverrides = translationMap.size > 0 && rawSO ? translateOverrides(rawSO, translationMap) : rawSO;
  const derivedSymbolData =
    translationMap.size > 0 && rawDSD ? (translateOverrides(rawDSD, translationMap) as FigDerivedSymbolData) : rawDSD;

  // Show translated DSD entries that target direct children (depth-1)
  if (derivedSymbolData) {
    const depth1Entries = derivedSymbolData.filter((e) => e.guidPath?.guids?.length === 1);
    const depthNEntries = derivedSymbolData.filter((e) => (e.guidPath?.guids?.length ?? 0) > 1);
    console.log(`${indent}  DSD depth-1: ${depth1Entries.length}, depth-N: ${depthNEntries.length}`);

    // Show which depth-1 entries actually match children
    const childGuidSet = new Set(
      origChildren
        .map((c) => {
          const cg = (c as NodeData).guid as FigGuid | undefined;
          return cg ? guidToString(cg) : "";
        })
        .filter(Boolean),
    );

    let matched = 0,
      unmatched = 0;
    for (const entry of depth1Entries) {
      const targetGuid = entry.guidPath.guids[0];
      const targetStr = guidToString(targetGuid);
      if (childGuidSet.has(targetStr)) {
        matched++;
        // Show transform/size changes
        const e = entry as NodeData;
        const entrySize = e.size as { x: number; y: number } | undefined;
        const entryTransform = e.transform as { m02?: number; m12?: number } | undefined;
        if (entrySize || entryTransform) {
          const origChild = origChildren.find((c) => {
            const cg = (c as NodeData).guid as FigGuid | undefined;
            return cg && guidToString(cg) === targetStr;
          });
          if (origChild) {
            const origSize = getSize(origChild);
            const origTrans = getTransform(origChild);
            const changes: string[] = [];
            if (entrySize) {
              changes.push(
                `size: ${origSize ? `${Math.round(origSize.x)}x${Math.round(origSize.y)}` : "?"} → ${Math.round(entrySize.x)}x${Math.round(entrySize.y)}`,
              );
            }
            if (entryTransform) {
              changes.push(
                `pos: (${origTrans?.m02?.toFixed(0) ?? "?"}, ${origTrans?.m12?.toFixed(0) ?? "?"}) → (${entryTransform.m02?.toFixed(0) ?? "?"}, ${entryTransform.m12?.toFixed(0) ?? "?"})`,
              );
            }
            if (changes.length > 0) {
              console.log(`${indent}    ✅ ${targetStr} → "${origChild.name}": ${changes.join(", ")}`);
            }
          }
        }
      } else {
        unmatched++;
        console.log(`${indent}    ❌ ${targetStr} — no matching child`);
      }
    }
    console.log(`${indent}  DSD depth-1 match: ${matched}/${depth1Entries.length} (${unmatched} unmatched)`);

    // For depth-N, show which first-level targets they route through
    if (depthNEntries.length > 0) {
      const routeMap = new Map<string, number>();
      for (const entry of depthNEntries) {
        const firstGuid = guidToString(entry.guidPath.guids[0]);
        routeMap.set(firstGuid, (routeMap.get(firstGuid) ?? 0) + 1);
      }
      console.log(`${indent}  DSD depth-N routes through ${routeMap.size} first-level targets:`);
      for (const [targetStr, count] of routeMap) {
        const matchesChild = childGuidSet.has(targetStr);
        const origChild = origChildren.find((c) => {
          const cg = (c as NodeData).guid as FigGuid | undefined;
          return cg && guidToString(cg) === targetStr;
        });
        console.log(
          `${indent}    ${matchesChild ? "✅" : "❌"} ${targetStr} (${count} entries)${origChild ? ` "${origChild.name}" ${getNodeType(origChild)}` : ""}`,
        );
      }
    }
  }

  // Clone and resolve
  const cpa = collectComponentPropAssignments(nd);
  const children = cloneSymbolChildren(symNode, {
    symbolOverrides,
    derivedSymbolData,
    componentPropAssignments: cpa.length > 0 ? cpa : undefined,
  });

  // Show resolved children positions
  console.log(`${indent}  Resolved children: ${children.length}`);
  for (const child of children) {
    const ct = getNodeType(child);
    const cs = getSize(child);
    const cg = (child as NodeData).guid as FigGuid | undefined;
    const ct2 = getTransform(child);
    const cd = child as NodeData;
    const hasPropagatedDSD = !!(cd.derivedSymbolData as unknown[])?.length;
    const dsdFlag = hasPropagatedDSD ? ` [propagated DSD:${(cd.derivedSymbolData as unknown[]).length}]` : "";
    console.log(
      `${indent}    ${ct} "${child.name}" ${cg ? guidToString(cg) : ""} ${cs ? `${Math.round(cs.x)}x${Math.round(cs.y)}` : ""} pos(${ct2?.m02?.toFixed(0) ?? "?"}, ${ct2?.m12?.toFixed(0) ?? "?"})${dsdFlag}`,
    );
  }

  // Recurse into INSTANCE children
  if (depth < maxDepth) {
    for (const child of children) {
      if (getNodeType(child) === "INSTANCE") {
        console.log("");
        diagnoseInstance(child, symbolMap, resolvedCache, depth + 1, maxDepth);
      }
    }
  }

  return children as FigNode[];
}

async function main() {
  const data = fs.readFileSync(FIG_FILE);
  const parsed = await parseFigFile(new Uint8Array(data));
  const tree = buildNodeTree(parsed.nodeChanges);
  const { roots, nodeMap } = tree;

  const warnings: string[] = [];
  const resolvedCache = preResolveSymbols(nodeMap, { warnings });
  console.log(`Pre-resolved ${resolvedCache.size} SYMBOLs (${warnings.length} warnings)`);

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

  // Find the System SECTION
  const systemSection = (systemCanvas.children ?? []).find((c) => getNodeType(c) === "SECTION" && c.name === "System");
  if (!systemSection) {
    console.log("System SECTION not found");
    return;
  }

  // Pick target instances with DSD
  const targetNames = ["_Home Screen Quick Actions", "Home Screen Quick Actions - iPhone", "Control Center - iPhone"];

  const sectionChildren = systemSection.children ?? [];
  for (const targetName of targetNames) {
    const target = sectionChildren.find((c) => c.name === targetName && getNodeType(c) === "INSTANCE");
    if (!target) {
      console.log(`\n⚠️ Not found: "${targetName}"`);
      continue;
    }
    console.log(`\n${"=".repeat(60)}`);
    diagnoseInstance(target, nodeMap, resolvedCache, 0, 2);
  }
}

main().catch(console.error);
