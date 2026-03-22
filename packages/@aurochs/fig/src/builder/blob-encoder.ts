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
 * Blob builder state
 */
type BlobBuilderState = {
  readonly data: number[];
};

/**
 * Write a float32 value in little-endian format to the data array
 */
function writeFloat32(state: BlobBuilderState, value: number): void {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setFloat32(0, value, true); // little-endian
  const bytes = new Uint8Array(buffer);
  for (const byte of bytes) {
    state.data.push(byte);
  }
}

/**
 * Builder for creating geometry blobs
 */
export function createBlobBuilder(): {
  moveTo: (x: number, y: number) => ReturnType<typeof createBlobBuilder>;
  lineTo: (x: number, y: number) => ReturnType<typeof createBlobBuilder>;
  cubicTo: (params: { cp1x: number; cp1y: number; cp2x: number; cp2y: number; x: number; y: number }) => ReturnType<typeof createBlobBuilder>;
  close: () => ReturnType<typeof createBlobBuilder>;
  build: () => FigBlob;
} {
  const state: BlobBuilderState = { data: [] };

  const builder = {
    /** Move to absolute position */
    moveTo(x: number, y: number) {
      state.data.push(CMD_MOVE_TO);
      writeFloat32(state, x);
      writeFloat32(state, y);
      return builder;
    },

    /** Line to absolute position */
    lineTo(x: number, y: number) {
      state.data.push(CMD_LINE_TO);
      writeFloat32(state, x);
      writeFloat32(state, y);
      return builder;
    },

    /** Cubic bezier curve */
    cubicTo({ cp1x, cp1y, cp2x, cp2y, x, y }: { cp1x: number; cp1y: number; cp2x: number; cp2y: number; x: number; y: number }) {
      state.data.push(CMD_CUBIC_TO);
      writeFloat32(state, cp1x);
      writeFloat32(state, cp1y);
      writeFloat32(state, cp2x);
      writeFloat32(state, cp2y);
      writeFloat32(state, x);
      writeFloat32(state, y);
      return builder;
    },

    /** Close path */
    close() {
      state.data.push(CMD_CLOSE);
      return builder;
    },

    /** Build the blob */
    build(): FigBlob {
      const result = [...state.data, 0x00];
      return { bytes: result };
    },
  };

  return builder;
}

/**
 * Create a rectangle path blob
 * Note: Uses lineTo back to origin instead of close command to match Figma's format
 */
export function createRectBlob(width: number, height: number): FigBlob {
  return createBlobBuilder()
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

  const builder = createBlobBuilder();

  // Start at top-left, after corner
  builder.moveTo(r, 0);

  // Top edge
  builder.lineTo(width - r, 0);

  // Top-right corner
  builder.cubicTo({ cp1x: width - r + c, cp1y: 0, cp2x: width, cp2y: r - c, x: width, y: r });

  // Right edge
  builder.lineTo(width, height - r);

  // Bottom-right corner
  builder.cubicTo({ cp1x: width, cp1y: height - r + c, cp2x: width - r + c, cp2y: height, x: width - r, y: height });

  // Bottom edge
  builder.lineTo(r, height);

  // Bottom-left corner
  builder.cubicTo({ cp1x: r - c, cp1y: height, cp2x: 0, cp2y: height - r + c, x: 0, y: height - r });

  // Left edge
  builder.lineTo(0, r);

  // Top-left corner
  builder.cubicTo({ cp1x: 0, cp1y: r - c, cp2x: r - c, cp2y: 0, x: r, y: 0 });

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

  const builder = createBlobBuilder();

  // Start at right-center
  builder.moveTo(width, ry);

  // Bottom-right quadrant
  builder.cubicTo({ cp1x: width, cp1y: ry + cy, cp2x: rx + cx, cp2y: height, x: rx, y: height });

  // Bottom-left quadrant
  builder.cubicTo({ cp1x: rx - cx, cp1y: height, cp2x: 0, cp2y: ry + cy, x: 0, y: ry });

  // Top-left quadrant
  builder.cubicTo({ cp1x: 0, cp1y: ry - cy, cp2x: rx - cx, cp2y: 0, x: rx, y: 0 });

  // Top-right quadrant (returns to start point)
  builder.cubicTo({ cp1x: rx + cx, cp1y: 0, cp2x: width, cp2y: ry - cy, x: width, y: ry });

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
