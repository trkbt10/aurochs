/**
 * @file Binary-level comparison of .fig files
 *
 * Compares two .fig files at the byte level to identify
 * exact differences that may cause Figma import failures.
 */

import { inflateRaw } from "pako";
import { decompress as zstdDecompress } from "fzstd";
import { unzipSync } from "fflate";

export type ChunkComparison = {
  name: string;
  workingSize: number;
  generatedSize: number;
  sizeDiff: number;
  compressionWorking: string;
  compressionGenerated: string;
  firstDiffOffset: number | null;
  diffCount: number;
  sampleDiffs: Array<{
    offset: number;
    working: number;
    generated: number;
  }>;
};

export type ComparisonResult = {
  compatible: boolean;
  issues: string[];
  warnings: string[];
  header: {
    magicMatch: boolean;
    versionMatch: boolean;
    workingVersion: string;
    generatedVersion: string;
  };
  schema: ChunkComparison;
  message: ChunkComparison;
  messageFields: {
    working: number[];
    generated: number[];
    orderMatch: boolean;
  };
};

/** ZIP magic bytes (PK) */
const ZIP_MAGIC = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);

/** Zstandard magic bytes */
const ZSTD_MAGIC = new Uint8Array([0x28, 0xb5, 0x2f, 0xfd]);

function isZipFile(data: Uint8Array): boolean {
  return data.length >= 4 &&
    data[0] === ZIP_MAGIC[0] &&
    data[1] === ZIP_MAGIC[1] &&
    data[2] === ZIP_MAGIC[2] &&
    data[3] === ZIP_MAGIC[3];
}

function isZstd(data: Uint8Array): boolean {
  return data.length >= 4 &&
    data[0] === ZSTD_MAGIC[0] &&
    data[1] === ZSTD_MAGIC[1] &&
    data[2] === ZSTD_MAGIC[2] &&
    data[3] === ZSTD_MAGIC[3];
}

function extractCanvasData(data: Uint8Array): Uint8Array {
  if (isZipFile(data)) {
    const files = unzipSync(data);
    if (files["canvas.fig"]) {
      return files["canvas.fig"];
    }
    throw new Error("ZIP doesn't contain canvas.fig");
  }
  return data;
}

function decompressChunk(data: Uint8Array): Uint8Array {
  if (isZstd(data)) {
    return zstdDecompress(data);
  }
  return inflateRaw(data);
}

function getCompressionType(data: Uint8Array): string {
  if (isZstd(data)) return "zstd";
  return "deflate-raw";
}

function readVarUint(data: Uint8Array, offset: number): [number, number] {
  let value = 0;
  let shift = 0;
  let pos = offset;

  while (pos < data.length) {
    const byte = data[pos];
    value |= (byte & 0x7f) << shift;
    pos++;
    if ((byte & 0x80) === 0) break;
    shift += 7;
  }

  return [value, pos];
}

function extractMessageFieldOrder(data: Uint8Array): number[] {
  const fields: number[] = [];
  let offset = 0;

  // Read field IDs until we hit 0 or run out of data
  for (let i = 0; i < 50 && offset < data.length; i++) {
    const [fieldId, newOffset] = readVarUint(data, offset);
    if (fieldId === 0) break;
    fields.push(fieldId);
    offset = newOffset;

    // Skip field value (we don't know the exact type, but we can skip bytes)
    // This is a heuristic - we look for the next valid field ID pattern
    while (offset < data.length) {
      const nextByte = data[offset];
      // If this looks like a small field ID (1-20), it might be the next field
      if (nextByte > 0 && nextByte < 30 && (data[offset + 1] ?? 0) < 0x80) {
        break;
      }
      offset++;
    }
  }

  return fields;
}

function compareBytes(
  working: Uint8Array,
  generated: Uint8Array,
  maxSamples: number = 10
): { firstDiff: number | null; count: number; samples: Array<{ offset: number; working: number; generated: number }> } {
  let firstDiff: number | null = null;
  let count = 0;
  const samples: Array<{ offset: number; working: number; generated: number }> = [];

  const minLen = Math.min(working.length, generated.length);

  for (let i = 0; i < minLen; i++) {
    if (working[i] !== generated[i]) {
      if (firstDiff === null) firstDiff = i;
      count++;
      if (samples.length < maxSamples) {
        samples.push({ offset: i, working: working[i], generated: generated[i] });
      }
    }
  }

  // Count extra bytes in longer array as differences
  count += Math.abs(working.length - generated.length);

  return { firstDiff, count, samples };
}

/**
 * Compare two .fig files at the binary level
 */
export async function compareFigFiles(
  workingData: Uint8Array,
  generatedData: Uint8Array
): Promise<ComparisonResult> {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Extract canvas.fig from ZIP if needed
  const workingCanvas = extractCanvasData(workingData);
  const generatedCanvas = extractCanvasData(generatedData);

  // Parse headers
  const wMagic = new TextDecoder("ascii").decode(workingCanvas.slice(0, 8));
  const gMagic = new TextDecoder("ascii").decode(generatedCanvas.slice(0, 8));
  const magicMatch = wMagic === gMagic && wMagic === "fig-kiwi";

  if (!magicMatch) {
    issues.push(`Magic header mismatch: '${wMagic}' vs '${gMagic}'`);
  }

  const wVersion = String.fromCharCode(workingCanvas[8]);
  const gVersion = String.fromCharCode(generatedCanvas[8]);
  const versionMatch = wVersion === gVersion;

  if (!versionMatch) {
    issues.push(`Version mismatch: '${wVersion}' vs '${gVersion}'`);
  }

  // Get payload sizes from header
  const wView = new DataView(workingCanvas.buffer, workingCanvas.byteOffset, workingCanvas.byteLength);
  const gView = new DataView(generatedCanvas.buffer, generatedCanvas.byteOffset, generatedCanvas.byteLength);
  const wSchemaSize = wView.getUint32(12, true);
  const gSchemaSize = gView.getUint32(12, true);

  // Extract and decompress schema
  const wSchemaCompressed = workingCanvas.slice(16, 16 + wSchemaSize);
  const gSchemaCompressed = generatedCanvas.slice(16, 16 + gSchemaSize);

  let wSchemaDecompressed: Uint8Array;
  let gSchemaDecompressed: Uint8Array;

  try {
    wSchemaDecompressed = decompressChunk(wSchemaCompressed);
    gSchemaDecompressed = decompressChunk(gSchemaCompressed);
  } catch (e) {
    issues.push(`Schema decompression failed: ${e}`);
    wSchemaDecompressed = new Uint8Array(0);
    gSchemaDecompressed = new Uint8Array(0);
  }

  const schemaDiff = compareBytes(wSchemaDecompressed, gSchemaDecompressed);

  const schemaComparison: ChunkComparison = {
    name: "schema",
    workingSize: wSchemaDecompressed.length,
    generatedSize: gSchemaDecompressed.length,
    sizeDiff: gSchemaDecompressed.length - wSchemaDecompressed.length,
    compressionWorking: getCompressionType(wSchemaCompressed),
    compressionGenerated: getCompressionType(gSchemaCompressed),
    firstDiffOffset: schemaDiff.firstDiff,
    diffCount: schemaDiff.count,
    sampleDiffs: schemaDiff.samples,
  };

  if (schemaDiff.count > 0) {
    warnings.push(`Schema has ${schemaDiff.count} byte differences`);
  }

  // Extract and decompress message data
  const wMsgStart = 16 + wSchemaSize;
  const gMsgStart = 16 + gSchemaSize;

  const wMsgSizeView = new DataView(workingCanvas.buffer, workingCanvas.byteOffset + wMsgStart, 4);
  const gMsgSizeView = new DataView(generatedCanvas.buffer, generatedCanvas.byteOffset + gMsgStart, 4);
  const wMsgSize = wMsgSizeView.getUint32(0, true);
  const gMsgSize = gMsgSizeView.getUint32(0, true);

  const wMsgCompressed = workingCanvas.slice(wMsgStart + 4, wMsgStart + 4 + wMsgSize);
  const gMsgCompressed = generatedCanvas.slice(gMsgStart + 4, gMsgStart + 4 + gMsgSize);

  const wMsgCompression = getCompressionType(wMsgCompressed);
  const gMsgCompression = getCompressionType(gMsgCompressed);

  if (wMsgCompression !== gMsgCompression) {
    issues.push(`Message compression mismatch: working='${wMsgCompression}', generated='${gMsgCompression}'`);
  }

  let wMsgDecompressed: Uint8Array;
  let gMsgDecompressed: Uint8Array;

  try {
    wMsgDecompressed = decompressChunk(wMsgCompressed);
    gMsgDecompressed = decompressChunk(gMsgCompressed);
  } catch (e) {
    issues.push(`Message decompression failed: ${e}`);
    wMsgDecompressed = new Uint8Array(0);
    gMsgDecompressed = new Uint8Array(0);
  }

  const messageDiff = compareBytes(wMsgDecompressed, gMsgDecompressed);

  const messageComparison: ChunkComparison = {
    name: "message",
    workingSize: wMsgDecompressed.length,
    generatedSize: gMsgDecompressed.length,
    sizeDiff: gMsgDecompressed.length - wMsgDecompressed.length,
    compressionWorking: wMsgCompression,
    compressionGenerated: gMsgCompression,
    firstDiffOffset: messageDiff.firstDiff,
    diffCount: messageDiff.count,
    sampleDiffs: messageDiff.samples,
  };

  // Extract message field order
  const wFields = extractMessageFieldOrder(wMsgDecompressed);
  const gFields = extractMessageFieldOrder(gMsgDecompressed);

  const orderMatch = wFields.length === gFields.length &&
    wFields.every((f, i) => f === gFields[i]);

  if (!orderMatch) {
    issues.push(`Message field order differs: working=[${wFields.slice(0, 10).join(',')}...], generated=[${gFields.slice(0, 10).join(',')}...]`);
  }

  return {
    compatible: issues.length === 0,
    issues,
    warnings,
    header: {
      magicMatch,
      versionMatch,
      workingVersion: wVersion,
      generatedVersion: gVersion,
    },
    schema: schemaComparison,
    message: messageComparison,
    messageFields: {
      working: wFields,
      generated: gFields,
      orderMatch,
    },
  };
}

/**
 * Run comparison and print detailed report
 */
export async function runComparison(
  workingPath: string,
  generatedPath: string
): Promise<ComparisonResult> {
  const fs = await import("node:fs");

  const workingData = new Uint8Array(fs.readFileSync(workingPath));
  const generatedData = new Uint8Array(fs.readFileSync(generatedPath));

  const result = await compareFigFiles(workingData, generatedData);

  console.log("\n=== Binary Comparison Report ===\n");
  console.log(`Working: ${workingPath}`);
  console.log(`Generated: ${generatedPath}`);
  console.log(`\nCompatible: ${result.compatible ? "✓ YES" : "✗ NO"}`);

  console.log("\n--- Header ---");
  console.log(`Magic: ${result.header.magicMatch ? "✓" : "✗"}`);
  console.log(`Version: ${result.header.versionMatch ? "✓" : "✗"} (working='${result.header.workingVersion}', generated='${result.header.generatedVersion}')`);

  console.log("\n--- Schema ---");
  console.log(`Working size: ${result.schema.workingSize} bytes`);
  console.log(`Generated size: ${result.schema.generatedSize} bytes`);
  console.log(`Compression: working='${result.schema.compressionWorking}', generated='${result.schema.compressionGenerated}'`);
  console.log(`Byte differences: ${result.schema.diffCount}`);

  console.log("\n--- Message ---");
  console.log(`Working size: ${result.message.workingSize} bytes`);
  console.log(`Generated size: ${result.message.generatedSize} bytes`);
  console.log(`Compression: working='${result.message.compressionWorking}', generated='${result.message.compressionGenerated}'`);
  console.log(`Byte differences: ${result.message.diffCount}`);

  console.log("\n--- Message Field Order ---");
  console.log(`Working: [${result.messageFields.working.slice(0, 15).join(', ')}${result.messageFields.working.length > 15 ? '...' : ''}]`);
  console.log(`Generated: [${result.messageFields.generated.slice(0, 15).join(', ')}${result.messageFields.generated.length > 15 ? '...' : ''}]`);
  console.log(`Order match: ${result.messageFields.orderMatch ? "✓" : "✗"}`);

  if (result.issues.length > 0) {
    console.log("\n--- Issues ---");
    for (const issue of result.issues) {
      console.log(`  ✗ ${issue}`);
    }
  }

  if (result.warnings.length > 0) {
    console.log("\n--- Warnings ---");
    for (const warn of result.warnings) {
      console.log(`  ⚠ ${warn}`);
    }
  }

  return result;
}
