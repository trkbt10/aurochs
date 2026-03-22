/**
 * @file Decode blob data from .fig files
 *
 * Figma stores path commands and other data as binary blobs.
 * This module decodes these blobs into usable formats.
 */

// =============================================================================
// Path Command Constants
// =============================================================================

/** MoveTo command (M x y) */
const CMD_MOVE_TO = 0x01;

/** LineTo command (L x y) */
const CMD_LINE_TO = 0x02;

/** Smooth cubic bezier command (S cp2x cp2y x y) - cp1 is reflected from previous */
const CMD_SMOOTH_CUBIC = 0x03;

/** Full cubic bezier command (C cp1x cp1y cp2x cp2y x y) */
const CMD_CUBIC_TO = 0x04;

/** Quadratic bezier command (Q cpx cpy x y) */
const CMD_QUAD_TO = 0x05;

/** Close path command (Z) */
const CMD_CLOSE = 0x06;

// =============================================================================
// Types
// =============================================================================

/**
 * Blob data as stored in the parsed .fig file
 */
export type FigBlob = {
  readonly bytes: readonly number[];
};

/**
 * Decoded path command
 */
export type PathCommand =
  | { readonly type: "M"; readonly x: number; readonly y: number }
  | { readonly type: "L"; readonly x: number; readonly y: number }
  | { readonly type: "C"; readonly cp1x: number; readonly cp1y: number; readonly cp2x: number; readonly cp2y: number; readonly x: number; readonly y: number }
  | { readonly type: "Q"; readonly cpx: number; readonly cpy: number; readonly x: number; readonly y: number }
  | { readonly type: "Z" };

// =============================================================================
// Path Commands Decoder
// =============================================================================

/** Known command byte values for skip recovery */
const KNOWN_COMMANDS = new Set([CMD_MOVE_TO, CMD_LINE_TO, CMD_SMOOTH_CUBIC, CMD_CUBIC_TO, CMD_QUAD_TO, CMD_CLOSE, 0x13]);

/**
 * Find the next known command byte within 30 bytes, returns -1 if not found
 */
function findNextKnownCommand(bytes: readonly number[], startOffset: number): number {
  const end = Math.min(startOffset + 30, bytes.length);
  for (const i of Array.from({ length: end - startOffset }, (_, k) => k + startOffset)) {
    if (KNOWN_COMMANDS.has(bytes[i])) {
      return i;
    }
  }
  return -1;
}

/**
 * Resolve cp1 for a smooth cubic bezier from the previous command
 */
function resolveSmoothCp1(
  prevCmd: PathCommand | undefined,
  fallbackX: number,
  fallbackY: number,
): { x: number; y: number } {
  if (prevCmd && prevCmd.type === "C") {
    return { x: 2 * prevCmd.x - prevCmd.cp2x, y: 2 * prevCmd.y - prevCmd.cp2y };
  }
  if (prevCmd && (prevCmd.type === "M" || prevCmd.type === "L")) {
    return { x: prevCmd.x, y: prevCmd.y };
  }
  return { x: fallbackX, y: fallbackY };
}

/**
 * Decode a commands blob to an array of path commands
 */
export function decodePathCommands(blob: FigBlob): readonly PathCommand[] {
  const bytes = blob.bytes;
  const buffer = new Uint8Array(bytes);
  const view = new DataView(buffer.buffer);
  const commands: PathCommand[] = [];
  const pos = { value: 0 };

  function readFloat32(): number {
    const val = view.getFloat32(pos.value, true);
    pos.value += 4;
    return val;
  }

  function readCommand(): number {
    const cmd = buffer[pos.value];
    pos.value += 1;
    return cmd;
  }

  const MAX_ITERATIONS = 100000;
  const iter = { value: 0 };

  while (pos.value < bytes.length && iter.value < MAX_ITERATIONS) {
    iter.value++;
    const cmd = readCommand();

    switch (cmd) {
      case CMD_MOVE_TO: {
        const x = readFloat32();
        const y = readFloat32();
        commands.push({ type: "M", x, y });
        break;
      }
      case CMD_LINE_TO: {
        const x = readFloat32();
        const y = readFloat32();
        commands.push({ type: "L", x, y });
        break;
      }
      case CMD_SMOOTH_CUBIC: {
        // Smooth cubic bezier (S command) - 4 coordinates
        // cp1 is reflected from the previous command's cp2 (or equals start point)
        const cp2x = readFloat32();
        const cp2y = readFloat32();
        const x = readFloat32();
        const y = readFloat32();
        // To convert to full cubic, we need the previous end point and cp2
        // For simplicity, we'll make cp1 equal to start of this segment
        // This creates a smooth curve when chained
        const prevCmd = commands[commands.length - 1];
        const cp1 = resolveSmoothCp1(prevCmd, cp2x, cp2y);
        commands.push({ type: "C", cp1x: cp1.x, cp1y: cp1.y, cp2x, cp2y, x, y });
        break;
      }
      case CMD_CUBIC_TO:
      case 0x13: {
        // Full cubic bezier (C command) - 6 coordinates
        const cp1x = readFloat32();
        const cp1y = readFloat32();
        const cp2x = readFloat32();
        const cp2y = readFloat32();
        const x = readFloat32();
        const y = readFloat32();
        commands.push({ type: "C", cp1x, cp1y, cp2x, cp2y, x, y });
        break;
      }
      case CMD_QUAD_TO: {
        const cpx = readFloat32();
        const cpy = readFloat32();
        const x = readFloat32();
        const y = readFloat32();
        commands.push({ type: "Q", cpx, cpy, x, y });
        break;
      }
      case CMD_CLOSE: {
        commands.push({ type: "Z" });
        break;
      }
      case 0x00: {
        // End marker or padding - check if rest is zeros
        if (pos.value >= bytes.length - 1) {
          pos.value = bytes.length;
          break;
        }
        const isAllZeros = bytes.slice(pos.value).every(b => b === 0);
        if (isAllZeros) {
          pos.value = bytes.length;
        }
        break;
      }
      default: {
        // Unknown command - try to skip to next known command
        const nextKnown = findNextKnownCommand(bytes, pos.value);
        if (nextKnown >= 0) {
          pos.value = nextKnown;
        } else {
          pos.value = bytes.length;
        }
        break;
      }
    }
  }

  return commands;
}

/**
 * Convert path commands to SVG path string
 */
export function pathCommandsToSvgPath(commands: readonly PathCommand[], precision = 2): string {
  const parts: string[] = [];

  for (const cmd of commands) {
    switch (cmd.type) {
      case "M":
        parts.push(`M ${cmd.x.toFixed(precision)} ${cmd.y.toFixed(precision)}`);
        break;
      case "L":
        parts.push(`L ${cmd.x.toFixed(precision)} ${cmd.y.toFixed(precision)}`);
        break;
      case "C":
        parts.push(`C ${cmd.cp1x.toFixed(precision)} ${cmd.cp1y.toFixed(precision)} ${cmd.cp2x.toFixed(precision)} ${cmd.cp2y.toFixed(precision)} ${cmd.x.toFixed(precision)} ${cmd.y.toFixed(precision)}`);
        break;
      case "Q":
        parts.push(`Q ${cmd.cpx.toFixed(precision)} ${cmd.cpy.toFixed(precision)} ${cmd.x.toFixed(precision)} ${cmd.y.toFixed(precision)}`);
        break;
      case "Z":
        parts.push("Z");
        break;
    }
  }

  return parts.join(" ");
}

/**
 * Decode a commands blob directly to SVG path string
 */
export function decodeBlobToSvgPath(blob: FigBlob, precision = 2): string {
  const commands = decodePathCommands(blob);
  return pathCommandsToSvgPath(commands, precision);
}
