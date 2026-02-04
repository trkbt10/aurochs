/**
 * @file Generate SVG snapshots from .fig files
 *
 * Usage: bun packages/@oxen-renderer/figma/scripts/generate-snapshots.ts [scope]
 *
 * Example:
 *   bun packages/@oxen-renderer/figma/scripts/generate-snapshots.ts twitter-ui
 *   bun packages/@oxen-renderer/figma/scripts/generate-snapshots.ts text-comprehensive
 */

import * as fs from "fs";
import * as path from "path";
import {
  parseFigFile,
  buildNodeTree,
  findNodesByType,
  getNodeType,
  type FigBlob,
} from "@oxen/fig/parser";
import type { FigNode } from "@oxen/fig/types";
import { renderCanvas } from "../src/svg/renderer";

const FIXTURES_DIR = path.join(import.meta.dir, "../fixtures");

type FigGuid = { sessionID: number; localID: number };

function getNodeSize(node: FigNode): { width: number; height: number } {
  const nodeData = node as Record<string, unknown>;
  const size = nodeData.size as { x?: number; y?: number } | undefined;
  return { width: size?.x ?? 800, height: size?.y ?? 600 };
}

function getNodeGuid(node: FigNode): FigGuid | undefined {
  const nodeData = node as Record<string, unknown>;
  return nodeData.guid as FigGuid | undefined;
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_\-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50);
}

/**
 * Find the .fig file in a fixture directory
 * Looks for [scope].fig or [scope]_*.fig
 */
function findFigFile(scopeDir: string, scope: string): string | null {
  const files = fs.readdirSync(scopeDir);

  // First try exact match
  const exactMatch = files.find(f => f === `${scope}.fig`);
  if (exactMatch) return path.join(scopeDir, exactMatch);

  // Try with underscore variant (e.g., twitter-ui -> twitter_ui.fig)
  const underscoreScope = scope.replace(/-/g, "_");
  const underscoreMatch = files.find(f => f === `${underscoreScope}.fig`);
  if (underscoreMatch) return path.join(scopeDir, underscoreMatch);

  // Try any .fig file
  const anyFig = files.find(f => f.endsWith(".fig"));
  if (anyFig) return path.join(scopeDir, anyFig);

  return null;
}

async function generateSnapshots(scope: string) {
  const scopeDir = path.join(FIXTURES_DIR, scope);

  if (!fs.existsSync(scopeDir)) {
    console.error(`Fixture directory not found: ${scopeDir}`);
    console.log("\nAvailable fixtures:");
    const dirs = fs.readdirSync(FIXTURES_DIR).filter(d =>
      fs.statSync(path.join(FIXTURES_DIR, d)).isDirectory()
    );
    dirs.forEach(d => console.log(`  - ${d}`));
    process.exit(1);
  }

  const figPath = findFigFile(scopeDir, scope);
  if (!figPath) {
    console.error(`No .fig file found in ${scopeDir}`);
    process.exit(1);
  }

  console.log(`Loading ${path.basename(figPath)}...`);
  const data = fs.readFileSync(figPath);
  const parsed = await parseFigFile(new Uint8Array(data));

  console.log(`Building node tree (${parsed.nodeChanges.length} nodes)...`);
  const { roots, nodeMap } = buildNodeTree(parsed.nodeChanges);
  const blobs = parsed.blobs;

  // Find all CANVAS (page) nodes
  const canvases = findNodesByType(roots, "CANVAS");
  console.log(`Found ${canvases.length} pages, ${blobs.length} blobs\n`);

  // Output directory is fixtures/[scope]/snapshots/
  const outDir = path.join(scopeDir, "snapshots");
  fs.mkdirSync(outDir, { recursive: true });

  // Generate manifest
  const manifest: {
    fixture: string;
    generatedAt: string;
    pages: Array<{
      name: string;
      file: string;
      elements: Array<{ name: string; file: string; type: string }>;
    }>;
  } = {
    fixture: scope,
    generatedAt: new Date().toISOString(),
    pages: [],
  };

  for (const canvas of canvases) {
    const pageName = canvas.name ?? "unnamed";
    const pageFilename = sanitizeFilename(pageName);

    console.log(`Page: "${pageName}"`);

    const pageEntry: (typeof manifest.pages)[0] = {
      name: pageName,
      file: `${pageFilename}.svg`,
      elements: [],
    };

    // Render full page
    const pageResult = await renderCanvas(canvas, { width: 1200, height: 800, blobs, symbolMap: nodeMap });
    const pageSvgPath = path.join(outDir, `${pageFilename}.svg`);
    fs.writeFileSync(pageSvgPath, pageResult.svg);
    console.log(`  -> ${pageFilename}.svg (${pageResult.warnings.length} warnings)`);

    // Render individual top-level elements
    const children = canvas.children ?? [];
    for (const child of children) {
      const elemName = child.name ?? "unnamed";
      const elemType = getNodeType(child);
      const size = getNodeSize(child);
      const guid = getNodeGuid(child);
      const guidStr = guid ? `${guid.sessionID}-${guid.localID}` : "unknown";

      const elemFilename = `${pageFilename}--${sanitizeFilename(elemName)}--${guidStr}`;

      // Create a wrapper canvas for single element rendering
      const wrapperCanvas: FigNode = {
        type: "CANVAS",
        name: elemName,
        children: [child],
      };

      const elemResult = await renderCanvas(wrapperCanvas, {
        width: Math.max(size.width, 100),
        height: Math.max(size.height, 100),
        blobs,
        symbolMap: nodeMap,
      });

      const elemSvgPath = path.join(outDir, `${elemFilename}.svg`);
      fs.writeFileSync(elemSvgPath, elemResult.svg);

      pageEntry.elements.push({
        name: elemName,
        file: `${elemFilename}.svg`,
        type: elemType,
      });

      console.log(`    - [${elemType}] "${elemName}" -> ${elemFilename}.svg`);
    }

    manifest.pages.push(pageEntry);
    console.log("");
  }

  // Write manifest
  const manifestPath = path.join(outDir, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Manifest: ${manifestPath}`);

  console.log(`\nDone! Snapshots saved to: ${outDir}`);
}

// Main
const scope = process.argv[2];
if (!scope) {
  console.log("Usage: bun packages/@oxen-renderer/figma/scripts/generate-snapshots.ts [scope]");
  console.log("\nAvailable fixtures:");
  const dirs = fs.readdirSync(FIXTURES_DIR).filter(d =>
    fs.statSync(path.join(FIXTURES_DIR, d)).isDirectory()
  );
  dirs.forEach(d => console.log(`  - ${d}`));
  process.exit(1);
}

generateSnapshots(scope);
