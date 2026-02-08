/**
 * Use the ACTUAL blob decoder to compare real Figma glyph blobs vs ours
 */
import * as fs from "node:fs";
import { parseFigFile, buildNodeTree, type FigBlob, decodePathCommands } from "@aurochs/fig/parser";

function walkNodes(node: any, found: any[], maxNodes: number) {
  if (found.length >= maxNodes) return;
  const type = node.type?.name || node.type;
  if (type === "TEXT") {
    const dtd = node.derivedTextData;
    if (dtd?.glyphs?.length) {
      const chars = node.textData?.characters || node.characters || "?";
      found.push({ name: node.name, text: chars, glyphs: dtd.glyphs });
    }
  }
  for (const child of node.children || []) {
    walkNodes(child, found, maxNodes);
  }
}

function computeSignedArea(cmds: any[]): number {
  const pts: [number, number][] = [];
  for (const c of cmds) {
    if (c.x !== undefined && c.y !== undefined) {
      pts.push([c.x, c.y]);
    }
  }
  if (pts.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    area += pts[i][0] * pts[j][1];
    area -= pts[j][0] * pts[i][1];
  }
  return area / 2;
}

function splitContours(commands: any[]): any[][] {
  const contours: any[][] = [];
  let current: any[] = [];
  for (const cmd of commands) {
    if (cmd.type === "M" && current.length > 0) {
      contours.push(current);
      current = [];
    }
    current.push(cmd);
    if (cmd.type === "Z") {
      contours.push(current);
      current = [];
    }
  }
  if (current.length > 0) contours.push(current);
  return contours;
}

async function analyzeFile(filepath: string, label: string) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`${label}`);
  console.log("=".repeat(60));

  const data = fs.readFileSync(filepath);
  const parsed = await parseFigFile(new Uint8Array(data));
  const { roots } = buildNodeTree(parsed.nodeChanges);

  const found: any[] = [];
  for (const root of roots) {
    walkNodes(root, found, 3);
  }

  for (const f of found) {
    const chars = f.text as string;
    console.log(`\n  TEXT "${f.name}" = "${chars.slice(0, 40)}" (${f.glyphs.length} glyphs):`);

    const seen = new Set<number>();
    for (let gi = 0; gi < f.glyphs.length; gi++) {
      const glyph = f.glyphs[gi];
      const blobIdx = glyph.commandsBlob;
      if (seen.has(blobIdx)) continue;
      seen.add(blobIdx);
      if (blobIdx >= parsed.blobs.length) continue;

      const charIdx = glyph.firstCharacter;
      const char = charIdx < chars.length ? chars[charIdx] : "?";

      const blob = parsed.blobs[blobIdx];
      const cmds = decodePathCommands(blob);

      if (cmds.length === 0) continue; // Skip empty/whitespace

      const mCount = cmds.filter((c) => c.type === "M").length;
      const zCount = cmds.filter((c) => c.type === "Z").length;

      // Only show multi-contour glyphs (holes) and a few single-contour for comparison
      if (mCount < 2 && seen.size > 3) continue;

      const contours = splitContours(cmds);
      const typeSeq = cmds.map((c) => c.type).join("");

      console.log(
        `\n    char="${char}" blob[${blobIdx}] cmds=${cmds.length} M=${mCount} Z=${zCount} contours=${contours.length}`,
      );
      console.log(`      types: ${typeSeq}`);

      for (let ci = 0; ci < contours.length; ci++) {
        const area = computeSignedArea(contours[ci]);
        const hasZ = contours[ci].some((c: any) => c.type === "Z");
        console.log(`      contour[${ci}]: ${contours[ci].length} cmds, area=${area.toFixed(6)}, hasZ=${hasZ}`);
      }

      if (seen.size >= 8) break;
    }
  }
}

const twitterFig = "packages/@aurochs-renderer/figma/fixtures/twitter-ui/twitter_ui.fig";
if (fs.existsSync(twitterFig)) {
  await analyzeFile(twitterFig, "REAL FIGMA (using decodePathCommands)");
}

await analyzeFile(
  "packages/@aurochs-renderer/figma/fixtures/text-webgl/text-webgl.fig",
  "OUR GENERATED (using decodePathCommands)",
);
