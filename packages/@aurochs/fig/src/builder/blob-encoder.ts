/**
 * @file Encode geometry blobs for .fig files
 *
 * Creates binary blobs for fillGeometry and strokeGeometry
 */

// Path command constants (must match blob-decoder.ts)
const CMD_MOVE_TO = 0x01;
const CMD_LINE_TO = 0x02;
const CMD_CUBIC_TO = 0x04;
const CMD_CLOSE = 0x06;

/**
 * Blob type for encoding
 */
export type FigBlob = {
  bytes: number[];
};

/**
 * Builder for creating geometry blobs
 */
export class BlobBuilder {
  private data: number[] = [];

  private writeFloat32(value: number): void {
    const buffer = new ArrayBuffer(4);
    const view = new DataView(buffer);
    view.setFloat32(0, value, true); // little-endian
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < 4; i++) {
      this.data.push(bytes[i]);
    }
  }

  /**
   * Move to absolute position
   */
  moveTo(x: number, y: number): this {
    this.data.push(CMD_MOVE_TO);
    this.writeFloat32(x);
    this.writeFloat32(y);
    return this;
  }

  /**
   * Line to absolute position
   */
  lineTo(x: number, y: number): this {
    this.data.push(CMD_LINE_TO);
    this.writeFloat32(x);
    this.writeFloat32(y);
    return this;
  }

  /**
   * Cubic bezier curve
   */
  cubicTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): this {
    this.data.push(CMD_CUBIC_TO);
    this.writeFloat32(cp1x);
    this.writeFloat32(cp1y);
    this.writeFloat32(cp2x);
    this.writeFloat32(cp2y);
    this.writeFloat32(x);
    this.writeFloat32(y);
    return this;
  }

  /**
   * Close path
   */
  close(): this {
    this.data.push(CMD_CLOSE);
    return this;
  }

  /**
   * Build the blob
   */
  build(): FigBlob {
    // Add end marker (zero byte)
    const result = [...this.data, 0x00];
    return { bytes: result };
  }
}

/**
 * Create a rectangle path blob
 * Note: Uses lineTo back to origin instead of close command to match Figma's format
 */
export function createRectBlob(width: number, height: number): FigBlob {
  return new BlobBuilder()
    .moveTo(0, 0)
    .lineTo(width, 0)
    .lineTo(width, height)
    .lineTo(0, height)
    .lineTo(0, 0) // Explicit return to origin (Figma style)
    .build();
}

/**
 * Create a rounded rectangle path blob
 */
export function createRoundedRectBlob(
  width: number,
  height: number,
  radius: number
): FigBlob {
  // Clamp radius to half of smallest dimension
  const r = Math.min(radius, width / 2, height / 2);

  // Magic number for cubic bezier approximation of quarter circle
  const k = 0.5522847498; // 4/3 * (sqrt(2) - 1)
  const c = r * k;

  const builder = new BlobBuilder();

  // Start at top-left, after corner
  builder.moveTo(r, 0);

  // Top edge
  builder.lineTo(width - r, 0);

  // Top-right corner
  builder.cubicTo(width - r + c, 0, width, r - c, width, r);

  // Right edge
  builder.lineTo(width, height - r);

  // Bottom-right corner
  builder.cubicTo(width, height - r + c, width - r + c, height, width - r, height);

  // Bottom edge
  builder.lineTo(r, height);

  // Bottom-left corner
  builder.cubicTo(r - c, height, 0, height - r + c, 0, height - r);

  // Left edge
  builder.lineTo(0, r);

  // Top-left corner
  builder.cubicTo(0, r - c, r - c, 0, r, 0);

  builder.close();

  return builder.build();
}

/**
 * Create an ellipse path blob using cubic bezier approximation
 */
export function createEllipseBlob(width: number, height: number): FigBlob {
  const rx = width / 2;
  const ry = height / 2;

  // Magic number for cubic bezier approximation of quarter circle
  const k = 0.5522847498;
  const cx = rx * k;
  const cy = ry * k;

  const builder = new BlobBuilder();

  // Start at right-center
  builder.moveTo(width, ry);

  // Bottom-right quadrant
  builder.cubicTo(width, ry + cy, rx + cx, height, rx, height);

  // Bottom-left quadrant
  builder.cubicTo(rx - cx, height, 0, ry + cy, 0, ry);

  // Top-left quadrant
  builder.cubicTo(0, ry - cy, rx - cx, 0, rx, 0);

  // Top-right quadrant (returns to start point)
  builder.cubicTo(rx + cx, 0, width, ry - cy, width, ry);

  // Note: No close command - Figma paths don't use explicit close
  return builder.build();
}

/**
 * Create fillGeometry entry
 */
export function createFillGeometry(blobIndex: number): {
  windingRule: { value: number; name: string };
  commandsBlob: number;
  styleID: number;
} {
  return {
    windingRule: { value: 0, name: "NONZERO" },
    commandsBlob: blobIndex,
    styleID: 0,
  };
}
