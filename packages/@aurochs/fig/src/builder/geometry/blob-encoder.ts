/**
 * @file Encode path command blobs for .fig files
 *
 * Generates the binary blob format that Figma expects for fillGeometry.
 */

// Path command constants (must match blob-decoder.ts)
const CMD_LINE_TO = 0x02;

/**
 * Generate a rectangle path blob
 *
 * The format is:
 * - Byte 0: 0x01 (header/version)
 * - Bytes 1-8: Start position as two float32 (0.0, 0.0)
 * - Then: Sequence of LINE_TO commands (cmd byte + 2 float32)
 * - Ends with padding zeros
 *
 * @param width - Rectangle width
 * @param height - Rectangle height
 * @returns Blob bytes array
 */
export function encodeRectangleBlob(width: number, height: number): number[] {
  const bytes: number[] = [];

  // Header byte
  bytes.push(0x01);

  // Start position (0, 0) - two float32
  pushFloat32(bytes, 0);
  pushFloat32(bytes, 0);

  // LineTo (width, 0) - top right
  bytes.push(CMD_LINE_TO);
  pushFloat32(bytes, width);
  pushFloat32(bytes, 0);

  // LineTo (width, height) - bottom right
  bytes.push(CMD_LINE_TO);
  pushFloat32(bytes, width);
  pushFloat32(bytes, height);

  // LineTo (0, height) - bottom left
  bytes.push(CMD_LINE_TO);
  pushFloat32(bytes, 0);
  pushFloat32(bytes, height);

  // LineTo (0, 0) - back to start
  bytes.push(CMD_LINE_TO);
  pushFloat32(bytes, 0);
  pushFloat32(bytes, 0);

  // Padding zeros (1 byte to reach 46 total)
  bytes.push(0x00);

  return bytes;
}

/**
 * Generate a rounded rectangle path blob
 *
 * Uses cubic bezier curves for the corners.
 *
 * @param width - Rectangle width
 * @param height - Rectangle height
 * @param radius - Corner radius (same for all corners)
 * @returns Blob bytes array
 */
export function encodeRoundedRectangleBlob(
  width: number,
  height: number,
  radius: number
): number[] {
  // If radius is 0 or very small, use simple rectangle
  if (radius < 0.01) {
    return encodeRectangleBlob(width, height);
  }

  // Clamp radius to max possible
  const maxRadius = Math.min(width / 2, height / 2);
  const r = Math.min(radius, maxRadius);

  // Bezier control point offset (magic number for circular corners)
  const k = r * 0.552284749831;

  const bytes: number[] = [];

  // Header byte
  bytes.push(0x01);

  // Start position (r, 0) - start of top edge
  pushFloat32(bytes, r);
  pushFloat32(bytes, 0);

  // Top edge: LineTo (width - r, 0)
  bytes.push(CMD_LINE_TO);
  pushFloat32(bytes, width - r);
  pushFloat32(bytes, 0);

  // Top-right corner: Cubic bezier
  bytes.push(0x04); // CMD_CUBIC_TO
  pushFloat32(bytes, width - r + k); // cp1x
  pushFloat32(bytes, 0); // cp1y
  pushFloat32(bytes, width); // cp2x
  pushFloat32(bytes, r - k); // cp2y
  pushFloat32(bytes, width); // x
  pushFloat32(bytes, r); // y

  // Right edge: LineTo (width, height - r)
  bytes.push(CMD_LINE_TO);
  pushFloat32(bytes, width);
  pushFloat32(bytes, height - r);

  // Bottom-right corner: Cubic bezier
  bytes.push(0x04);
  pushFloat32(bytes, width); // cp1x
  pushFloat32(bytes, height - r + k); // cp1y
  pushFloat32(bytes, width - r + k); // cp2x
  pushFloat32(bytes, height); // cp2y
  pushFloat32(bytes, width - r); // x
  pushFloat32(bytes, height); // y

  // Bottom edge: LineTo (r, height)
  bytes.push(CMD_LINE_TO);
  pushFloat32(bytes, r);
  pushFloat32(bytes, height);

  // Bottom-left corner: Cubic bezier
  bytes.push(0x04);
  pushFloat32(bytes, r - k); // cp1x
  pushFloat32(bytes, height); // cp1y
  pushFloat32(bytes, 0); // cp2x
  pushFloat32(bytes, height - r + k); // cp2y
  pushFloat32(bytes, 0); // x
  pushFloat32(bytes, height - r); // y

  // Left edge: LineTo (0, r)
  bytes.push(CMD_LINE_TO);
  pushFloat32(bytes, 0);
  pushFloat32(bytes, r);

  // Top-left corner: Cubic bezier
  bytes.push(0x04);
  pushFloat32(bytes, 0); // cp1x
  pushFloat32(bytes, r - k); // cp1y
  pushFloat32(bytes, r - k); // cp2x
  pushFloat32(bytes, 0); // cp2y
  pushFloat32(bytes, r); // x
  pushFloat32(bytes, 0); // y

  // Padding zero
  bytes.push(0x00);

  return bytes;
}

/**
 * Generate an ellipse path blob
 *
 * Uses 4 cubic bezier curves to approximate an ellipse.
 *
 * @param width - Ellipse width (horizontal diameter)
 * @param height - Ellipse height (vertical diameter)
 * @returns Blob bytes array
 */
export function encodeEllipseBlob(width: number, height: number): number[] {
  const rx = width / 2;
  const ry = height / 2;

  // Bezier control point offset for ellipse (4/3 * tan(PI/8))
  const kx = rx * 0.552284749831;
  const ky = ry * 0.552284749831;

  const bytes: number[] = [];

  // Header byte
  bytes.push(0x01);

  // Start position (rx, 0) - top center
  pushFloat32(bytes, rx);
  pushFloat32(bytes, 0);

  // Top-right quadrant
  bytes.push(0x04);
  pushFloat32(bytes, rx + kx);
  pushFloat32(bytes, 0);
  pushFloat32(bytes, width);
  pushFloat32(bytes, ry - ky);
  pushFloat32(bytes, width);
  pushFloat32(bytes, ry);

  // Bottom-right quadrant
  bytes.push(0x04);
  pushFloat32(bytes, width);
  pushFloat32(bytes, ry + ky);
  pushFloat32(bytes, rx + kx);
  pushFloat32(bytes, height);
  pushFloat32(bytes, rx);
  pushFloat32(bytes, height);

  // Bottom-left quadrant
  bytes.push(0x04);
  pushFloat32(bytes, rx - kx);
  pushFloat32(bytes, height);
  pushFloat32(bytes, 0);
  pushFloat32(bytes, ry + ky);
  pushFloat32(bytes, 0);
  pushFloat32(bytes, ry);

  // Top-left quadrant
  bytes.push(0x04);
  pushFloat32(bytes, 0);
  pushFloat32(bytes, ry - ky);
  pushFloat32(bytes, rx - kx);
  pushFloat32(bytes, 0);
  pushFloat32(bytes, rx);
  pushFloat32(bytes, 0);

  // Padding zero
  bytes.push(0x00);

  return bytes;
}

/**
 * Push a float32 to the byte array (little-endian)
 */
function pushFloat32(bytes: number[], value: number): void {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setFloat32(0, value, true); // little-endian
  bytes.push(
    view.getUint8(0),
    view.getUint8(1),
    view.getUint8(2),
    view.getUint8(3)
  );
}
