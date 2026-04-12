/** @file Deep blob structure inspection script */
/**
 * Use the ACTUAL blob decoder to compare real Figma glyph blobs vs ours
 */
import * as fs from "node:fs";
import { parseFigFile, buildNodeTree, decodePathCommands } from "@aurochs/fig/parser";
import type { FigNode } from "@aurochs/fig/types";

type PathCmd = { type: string; x?: number; y?: number };
type GlyphInfo = { name: string; text: string; glyphs: Array<{ commandsBlob: number; firstCharacter: number }> };

/** Walk nodes to find TEXT nodes with glyph data */
function walkNodes(node: FigNode, found: GlyphInfo[], maxNodes: number) {
  if (found.length >= maxNodes) {return;}
  const type = node.type?.name;
  if (type === "TEXT") {
    const dtd = (node as Record<string, unknown>).derivedTextData as { glyphs?: Array<{ commandsBlob: number; firstCharacter: number }> } | undefined;
    if (dtd?.glyphs?.length) {
      const td = (node as Record<string, unknown>).textData as { characters?: string } | undefined;
      const chars = td?.characters ?? "?";
      found.push({ name: node.name ?? "?", text: chars, glyphs: dtd.glyphs });
    }
  }
  for (const child of node.children ?? []) {
    walkNodes(child, found, maxNodes);
  }
}

/** Compute the signed area of a set of path commands */
function computeSignedArea(cmds: PathCmd[]): number {
  const pts: [number, number][] = [];
  for (const c of cmds) {
    if (c.x !== undefined && c.y !== undefined) {
      pts.push([c.x, c.y]);
    }
  }
  if (pts.length < 3) {return 0;}
  const areaRef = { value: 0 };
  for (const [i, pt] of pts.entries()) {
    const j = (i + 1) % pts.length;
    areaRef.value += pt[0] * pts[j][1];
    areaRef.value -= pts[j][0] * pt[1];
  }
  return areaRef.value / 2;
}

/** Split a command array into contours at M/Z boundaries */
function splitContours(commands: PathCmd[]): PathCmd[][] {
  const contours: PathCmd[][] = [];
  const currentRef = { value: [] as PathCmd[] };
  for (const cmd of commands) {
    if (cmd.type === "M" && currentRef.value.length > 0) {
      contours.push(currentRef.value);
      currentRef.value = [];
    }
    currentRef.value.push(cmd);
    if (cmd.type === "Z") {
      contours.push(currentRef.value);
      currentRef.value = [];
    }
  }
  if (currentRef.value.length > 0) {contours.push(currentRef.value);}
  return contours;
}

/** Analyze a .fig file and print glyph blob details */
async function analyzeFile(filepath: string, label: string) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`${label}`);
  console.log("=".repeat(60));

  const data = fs.readFileSync(filepath);
  const parsed = await parseFigFile(new Uint8Array(data));
  const { roots } = buildNodeTree(parsed.nodeChanges);

  const found: GlyphInfo[] = [];
  for (const root of roots) {
    walkNodes(root, found, 3);
  }

  for (const f of found) {
    const chars = f.text;
    console.log(`\n  TEXT "${f.name}" = "${chars.slice(0, 40)}" (${f.glyphs.length} glyphs):`);

    const seen = new Set<number>();
    for (const glyph of f.glyphs) {
      const blobIdx = glyph.commandsBlob;
      if (seen.has(blobIdx)) {continue;}
      seen.add(blobIdx);
      if (blobIdx >= parsed.blobs.length) {continue;}

      const charIdx = glyph.firstCharacter;
      const char = charIdx < chars.length ? chars[charIdx] : "?";

      const blob = parsed.blobs[blobIdx];
      const cmds = decodePathCommands(blob) as PathCmd[];

      if (cmds.length === 0) {continue;}

      const mCount = cmds.filter((c) => c.type === "M").length;
      const zCount = cmds.filter((c) => c.type === "Z").length;

      if (mCount < 2 && seen.size > 3) {continue;}

      const contours = splitContours(cmds);
      const typeSeq = cmds.map((c) => c.type).join("");

      console.log(
        `\n    char="${char}" blob[${blobIdx}] cmds=${cmds.length} M=${mCount} Z=${zCount} contours=${contours.length}`,
      );
      console.log(`      types: ${typeSeq}`);

      for (const [ci, contour] of contours.entries()) {
        const area = computeSignedArea(contour);
        const hasZ = contour.some((c) => c.type === "Z");
        console.log(`      contour[${ci}]: ${contour.length} cmds, area=${area.toFixed(6)}, hasZ=${hasZ}`);
      }

      if (seen.size >= 8) {break;}
    }
  }
}

const twitterFig = "packages/@aurochs-renderer/fig/fixtures/twitter-ui/twitter_ui.fig";
if (fs.existsSync(twitterFig)) {
  await analyzeFile(twitterFig, "REAL FIGMA (using decodePathCommands)");
}

await analyzeFile(
  "packages/@aurochs-renderer/fig/fixtures/text-webgl/text-webgl.fig",
  "OUR GENERATED (using decodePathCommands)",
);
