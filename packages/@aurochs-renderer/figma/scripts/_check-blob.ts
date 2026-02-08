/**
 * Compare glyph blob format: real Figma .fig vs our generated .fig
 * Checks: close commands, contour separation, winding direction
 */
import * as fs from "node:fs";
import { parseFigFile, buildNodeTree, findNodesByType, type FigBlob } from "@aurochs/fig/parser";

// Decode blob commands
function decodeBlob(
  blob: FigBlob,
): { type: string; x?: number; y?: number; x1?: number; y1?: number; x2?: number; y2?: number }[] {
  const bytes = blob.bytes instanceof Uint8Array ? blob.bytes : new Uint8Array(blob.bytes);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const commands: any[] = [];
  let offset = 0;

  function readF32(): number {
    const v = view.getFloat32(offset, true);
    offset += 4;
    return v;
  }

  while (offset < bytes.length) {
    const cmd = bytes[offset];
    offset++;
    if (cmd === 0x00) break; // end marker
    switch (cmd) {
      case 0x01: // MOVE_TO
        commands.push({ type: "M", x: readF32(), y: readF32() });
        break;
      case 0x02: // LINE_TO
        commands.push({ type: "L", x: readF32(), y: readF32() });
        break;
      case 0x04: // CUBIC_TO
        commands.push({
          type: "C",
          x1: readF32(),
          y1: readF32(),
          x2: readF32(),
          y2: readF32(),
          x: readF32(),
          y: readF32(),
        });
        break;
      case 0x06: // CLOSE
        commands.push({ type: "Z" });
        break;
      default:
        commands.push({ type: `UNKNOWN(0x${cmd.toString(16)})` });
        break;
    }
  }
  return commands;
}

function computeContourArea(commands: { type: string; x?: number; y?: number }[]): number {
  // Shoelace formula on the linearized points
  const points: [number, number][] = [];
  for (const cmd of commands) {
    if (cmd.type === "M" || cmd.type === "L") {
      points.push([cmd.x!, cmd.y!]);
    } else if (cmd.type === "C") {
      points.push([cmd.x!, cmd.y!]); // Use endpoint only for rough area
    }
  }
  if (points.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i][0] * points[j][1];
    area -= points[j][0] * points[i][1];
  }
  return area / 2;
}

function splitContours(commands: any[]): any[][] {
  const contours: any[][] = [];
  let current: any[] = [];
  for (const cmd of commands) {
    current.push(cmd);
    if (cmd.type === "Z") {
      contours.push(current);
      current = [];
    } else if (cmd.type === "M" && current.length > 1) {
      // M starts new contour if previous didn't have Z
      const m = current.pop()!;
      contours.push(current);
      current = [m];
    }
  }
  if (current.length > 0) contours.push(current);
  return contours;
}

async function analyzeFile(filepath: string, label: string) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`${label}: ${filepath}`);
  console.log("=".repeat(60));

  const data = fs.readFileSync(filepath);
  const parsed = await parseFigFile(new Uint8Array(data));
  const { roots } = buildNodeTree(parsed.nodeChanges);

  // Find TEXT nodes
  const canvases = findNodesByType(roots, "CANVAS");
  let textNodesFound = 0;

  for (const canvas of canvases) {
    for (const frame of (canvas as any).children || []) {
      for (const child of (frame as any).children || []) {
        const nd = child as any;
        if (nd.type?.name !== "TEXT") continue;
        const dtd = nd.derivedTextData;
        if (!dtd?.glyphs?.length) continue;

        textNodesFound++;
        if (textNodesFound > 2) continue; // Only first 2 text nodes

        console.log(`\n  TEXT "${nd.name}" (${nd.textData?.characters || nd.characters || "?"}):`);
        console.log(`    glyphs: ${dtd.glyphs.length}`);

        // Analyze first glyph with a multi-contour blob
        for (const glyph of dtd.glyphs.slice(0, 5)) {
          const blobIdx = glyph.commandsBlob;
          if (blobIdx >= parsed.blobs.length) continue;
          const blob = parsed.blobs[blobIdx];
          const commands = decodeBlob(blob);

          const moveCount = commands.filter((c) => c.type === "M").length;
          const closeCount = commands.filter((c) => c.type === "Z").length;

          if (moveCount < 2 && closeCount < 2) continue; // Skip single-contour glyphs

          console.log(`\n    Glyph blob[${blobIdx}] (char=${glyph.firstCharacter}, fontSize=${glyph.fontSize}):`);
          console.log(`      Total commands: ${commands.length}`);
          console.log(
            `      M count: ${moveCount}, Z count: ${closeCount}, L count: ${commands.filter((c) => c.type === "L").length}, C count: ${commands.filter((c) => c.type === "C").length}`,
          );

          // Split and analyze contours
          const contours = splitContours(commands);
          for (let i = 0; i < contours.length; i++) {
            const area = computeContourArea(contours[i]);
            const cmds = contours[i].length;
            const hasZ = contours[i].some((c: any) => c.type === "Z");
            const first = contours[i][0];
            console.log(
              `      Contour ${i}: ${cmds} cmds, area=${area.toFixed(6)}, ${area > 0 ? "CCW" : "CW"}, hasZ=${hasZ}, starts=(${first.x?.toFixed(4)},${first.y?.toFixed(4)})`,
            );
          }

          // Show first few raw commands
          console.log(
            `      First 5 commands: ${commands
              .slice(0, 5)
              .map((c) => `${c.type}(${c.x?.toFixed(3) ?? ""},${c.y?.toFixed(3) ?? ""})`)
              .join(" ")}`,
          );
          console.log(
            `      Last 5 commands: ${commands
              .slice(-5)
              .map((c) => `${c.type}(${c.x?.toFixed(3) ?? ""},${c.y?.toFixed(3) ?? ""})`)
              .join(" ")}`,
          );

          break; // Only first multi-contour glyph
        }
      }
    }
  }
}

// Analyze real Figma file
const twitterFig = "packages/@aurochs-renderer/figma/fixtures/twitter-ui/twitter_ui.fig";
if (fs.existsSync(twitterFig)) {
  await analyzeFile(twitterFig, "REAL FIGMA FILE");
}

// Analyze our generated file
await analyzeFile("packages/@aurochs-renderer/figma/fixtures/text-webgl/text-webgl.fig", "OUR GENERATED FILE");
