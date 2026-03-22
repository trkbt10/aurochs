/** @file Blob inspection script */
/**
 * Compare glyph blob format: real Figma .fig vs our generated .fig
 * Checks: close commands, contour separation, winding direction
 */
import * as fs from "node:fs";
import { parseFigFile, buildNodeTree, findNodesByType } from "@aurochs/fig/parser";
import type { FigBlob } from "@aurochs/fig/parser";

type PathCmd = { type: string; x?: number; y?: number; x1?: number; y1?: number; x2?: number; y2?: number };

/** Decode blob binary data into path commands */
function decodeBlob(blob: FigBlob): PathCmd[] {
  const bytes = blob.bytes instanceof Uint8Array ? blob.bytes : new Uint8Array(blob.bytes);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const commands: PathCmd[] = [];
  const offsetRef = { value: 0 };

  function readF32(): number {
    const v = view.getFloat32(offsetRef.value, true);
    offsetRef.value += 4;
    return v;
  }

  while (offsetRef.value < bytes.length) {
    const cmd = bytes[offsetRef.value];
    offsetRef.value++;
    if (cmd === 0x00) {break;}
    switch (cmd) {
      case 0x01:
        commands.push({ type: "M", x: readF32(), y: readF32() });
        break;
      case 0x02:
        commands.push({ type: "L", x: readF32(), y: readF32() });
        break;
      case 0x04: {
        commands.push({
          type: "C",
          x1: readF32(), y1: readF32(),
          x2: readF32(), y2: readF32(),
          x: readF32(), y: readF32(),
        });
        break;
      }
      case 0x06:
        commands.push({ type: "Z" });
        break;
      default:
        commands.push({ type: `UNKNOWN(0x${cmd.toString(16)})` });
        break;
    }
  }
  return commands;
}

/** Compute contour area using the Shoelace formula */
function computeContourArea(commands: PathCmd[]): number {
  const points: [number, number][] = [];
  for (const cmd of commands) {
    if (cmd.type === "M" || cmd.type === "L") {
      points.push([cmd.x!, cmd.y!]);
    } else if (cmd.type === "C") {
      points.push([cmd.x!, cmd.y!]);
    }
  }
  if (points.length < 3) {return 0;}
  const areaRef = { value: 0 };
  for (const [i, pt] of points.entries()) {
    const j = (i + 1) % points.length;
    areaRef.value += pt[0] * points[j][1];
    areaRef.value -= points[j][0] * pt[1];
  }
  return areaRef.value / 2;
}

/** Split command array into individual contours */
function splitContours(commands: PathCmd[]): PathCmd[][] {
  const contours: PathCmd[][] = [];
  const currentRef = { value: [] as PathCmd[] };
  for (const cmd of commands) {
    currentRef.value.push(cmd);
    if (cmd.type === "Z") {
      contours.push(currentRef.value);
      currentRef.value = [];
    } else if (cmd.type === "M" && currentRef.value.length > 1) {
      const m = currentRef.value.pop()!;
      contours.push(currentRef.value);
      currentRef.value = [m];
    }
  }
  if (currentRef.value.length > 0) {contours.push(currentRef.value);}
  return contours;
}

/** Analyze a .fig file and print blob details */
async function analyzeFile(filepath: string, label: string) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`${label}: ${filepath}`);
  console.log("=".repeat(60));

  const data = fs.readFileSync(filepath);
  const parsed = await parseFigFile(new Uint8Array(data));
  const { roots } = buildNodeTree(parsed.nodeChanges);

  const canvases = findNodesByType(roots, "CANVAS");
  const textCountRef = { value: 0 };

  for (const canvas of canvases) {
    for (const frame of canvas.children ?? []) {
      for (const child of frame.children ?? []) {
        const nd = child as Record<string, unknown>;
        const nodeType = nd.type as { name?: string } | undefined;
        if (nodeType?.name !== "TEXT") {continue;}
        const dtd = nd.derivedTextData as { glyphs?: Array<{ commandsBlob: number; firstCharacter: number; fontSize: number }> } | undefined;
        if (!dtd?.glyphs?.length) {continue;}

        textCountRef.value++;
        if (textCountRef.value > 2) {continue;}

        const td = nd.textData as { characters?: string } | undefined;
        const chars = td?.characters ?? (nd.characters as string | undefined) ?? "?";
        console.log(`\n  TEXT "${nd.name}" (${chars}):`);
        console.log(`    glyphs: ${dtd.glyphs.length}`);

        for (const glyph of dtd.glyphs.slice(0, 5)) {
          const blobIdx = glyph.commandsBlob;
          if (blobIdx >= parsed.blobs.length) {continue;}
          const blob = parsed.blobs[blobIdx];
          const commands = decodeBlob(blob);

          const moveCount = commands.filter((c) => c.type === "M").length;
          const closeCount = commands.filter((c) => c.type === "Z").length;

          if (moveCount < 2 && closeCount < 2) {continue;}

          console.log(`\n    Glyph blob[${blobIdx}] (char=${glyph.firstCharacter}, fontSize=${glyph.fontSize}):`);
          console.log(`      Total commands: ${commands.length}`);
          console.log(
            `      M count: ${moveCount}, Z count: ${closeCount}, L count: ${commands.filter((c) => c.type === "L").length}, C count: ${commands.filter((c) => c.type === "C").length}`,
          );

          const contours = splitContours(commands);
          for (const [i, contour] of contours.entries()) {
            const area = computeContourArea(contour);
            const cmds = contour.length;
            const hasZ = contour.some((c) => c.type === "Z");
            const first = contour[0];
            console.log(
              `      Contour ${i}: ${cmds} cmds, area=${area.toFixed(6)}, ${area > 0 ? "CCW" : "CW"}, hasZ=${hasZ}, starts=(${first.x?.toFixed(4)},${first.y?.toFixed(4)})`,
            );
          }

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

          break;
        }
      }
    }
  }
}

const twitterFig = "packages/@aurochs-renderer/figma/fixtures/twitter-ui/twitter_ui.fig";
if (fs.existsSync(twitterFig)) {
  await analyzeFile(twitterFig, "REAL FIGMA FILE");
}

await analyzeFile("packages/@aurochs-renderer/figma/fixtures/text-webgl/text-webgl.fig", "OUR GENERATED FILE");
