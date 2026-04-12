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

/** Smooth cubic bezier command (S x2 y2 x y) - x1/y1 is reflected from previous */
const CMD_SMOOTH_CUBIC = 0x03;

/** Full cubic bezier command (C x1 y1 x2 y2 x y) */
const CMD_CUBIC_TO = 0x04;

/** Quadratic bezier command (Q x1 y1 x y) */
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
 *
 * Property names follow SVG path data specification:
 * - C command: x1 y1 x2 y2 x y (two control points + endpoint)
 * - Q command: x1 y1 x y (one control point + endpoint)
 */
export type PathCommand =
  | { readonly type: "M"; readonly x: number; readonly y: number }
  | { readonly type: "L"; readonly x: number; readonly y: number }
  | { readonly type: "C"; readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number; readonly x: number; readonly y: number }
  | { readonly type: "Q"; readonly x1: number; readonly y1: number; readonly x: number; readonly y: number }
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
    return { x: 2 * prevCmd.x - prevCmd.x2, y: 2 * prevCmd.y - prevCmd.y2 };
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
        const x2 = readFloat32();
        const y2 = readFloat32();
        const x = readFloat32();
        const y = readFloat32();
        const prevCmd = commands[commands.length - 1];
        const cp1 = resolveSmoothCp1(prevCmd, x2, y2);
        commands.push({ type: "C", x1: cp1.x, y1: cp1.y, x2, y2, x, y });
        break;
      }
      case CMD_CUBIC_TO:
      case 0x13: {
        // Full cubic bezier (C command) - 6 coordinates
        const x1 = readFloat32();
        const y1 = readFloat32();
        const x2 = readFloat32();
        const y2 = readFloat32();
        const x = readFloat32();
        const y = readFloat32();
        commands.push({ type: "C", x1, y1, x2, y2, x, y });
        break;
      }
      case CMD_QUAD_TO: {
        const x1 = readFloat32();
        const y1 = readFloat32();
        const x = readFloat32();
        const y = readFloat32();
        commands.push({ type: "Q", x1, y1, x, y });
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
 * Options for SVG path serialization
 */
export type SvgPathOptions = {
  /** Decimal precision (default: 2) */
  readonly precision?: number;
  /**
   * Separator between command letter and coordinates.
   * - " " (default): "M 0.00 0.00 L 10.00 0.00"
   * - "" (compact): "M0 0L10 0"
   */
  readonly separator?: string;
};

/**
 * Convert path commands to SVG path string
 */
export function pathCommandsToSvgPath(
  commands: readonly PathCommand[],
  options: SvgPathOptions | number = {},
): string {
  // backwards compatibility: accept bare precision number
  const opts: SvgPathOptions = typeof options === "number" ? { precision: options } : options;
  const precision = opts.precision ?? 2;
  const sep = opts.separator ?? " ";

  const factor = Math.pow(10, precision);
  const r = (n: number) => Math.round(n * factor) / factor;

  const parts: string[] = [];

  for (const cmd of commands) {
    switch (cmd.type) {
      case "M":
        parts.push(`M${sep}${r(cmd.x)}${sep}${r(cmd.y)}`);
        break;
      case "L":
        parts.push(`L${sep}${r(cmd.x)}${sep}${r(cmd.y)}`);
        break;
      case "C":
        parts.push(`C${sep}${r(cmd.x1)}${sep}${r(cmd.y1)}${sep}${r(cmd.x2)}${sep}${r(cmd.y2)}${sep}${r(cmd.x)}${sep}${r(cmd.y)}`);
        break;
      case "Q":
        parts.push(`Q${sep}${r(cmd.x1)}${sep}${r(cmd.y1)}${sep}${r(cmd.x)}${sep}${r(cmd.y)}`);
        break;
      case "Z":
        parts.push("Z");
        break;
    }
  }

  return sep ? parts.join(" ") : parts.join("");
}

/**
 * Decode a commands blob directly to SVG path string
 */
export function decodeBlobToSvgPath(blob: FigBlob, precision = 2): string {
  const commands = decodePathCommands(blob);
  return pathCommandsToSvgPath(commands, precision);
}
