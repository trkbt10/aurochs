/**
 * @file Message format analyzer
 *
 * Analyzes the structure of fig-kiwi message data
 * to identify encoding differences.
 */

import { unzipSync } from "fflate";
import { decompress, detectCompression } from "../compression";

export type FieldInfo = {
  fieldId: number;
  offset: number;
  rawBytes: number[];
};

export type MessageAnalysis = {
  totalSize: number;
  compression: string;
  decompressedSize: number;
  firstBytes: number[];
  fields: FieldInfo[];
  nodeChangesFieldId: number | null;
  nodeChangesOffset: number | null;
  nodeChangesCount: number | null;
};

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

/**
 * Analyze message data structure
 */
export function analyzeMessageData(compressedData: Uint8Array): MessageAnalysis {
  const compressionType = detectCompression(compressedData);
  const compression = compressionType === "zstd" ? "zstd" : "deflate-raw";
  const data = decompress(compressedData, compressionType);

  const fields: FieldInfo[] = [];
  let offset = 0;
  let nodeChangesFieldId: number | null = null;
  let nodeChangesOffset: number | null = null;
  let nodeChangesCount: number | null = null;

  // Parse field IDs and raw bytes
  while (offset < data.length) {
    const fieldOffset = offset;
    const [fieldId, newOffset] = readVarUint(data, offset);

    if (fieldId === 0) {
      // End marker
      break;
    }

    // Capture raw bytes for this field (up to 16 bytes)
    const rawBytes = Array.from(data.slice(fieldOffset, Math.min(fieldOffset + 16, data.length)));

    fields.push({
      fieldId,
      offset: fieldOffset,
      rawBytes,
    });

    offset = newOffset;

    // Field ID 4 is typically nodeChanges in Message type
    if (fieldId === 4) {
      nodeChangesFieldId = fieldId;
      nodeChangesOffset = offset;
      const [count, _countEnd] = readVarUint(data, offset);
      nodeChangesCount = count;
      // Skip to end of nodeChanges (we can't fully parse without schema)
      break;
    }

    // Skip field value heuristically
    // Look for next byte that could be a valid field ID (1-30)
    let skipped = 0;
    while (offset < data.length && skipped < 1000) {
      const byte = data[offset];
      // Check if this looks like a field ID marker
      if (byte > 0 && byte < 30) {
        // Check if next byte(s) don't have continuation bit for a reasonable value
        const nextByte = data[offset + 1] ?? 0;
        if ((nextByte & 0x80) === 0 || nextByte === 0) {
          break;
        }
      }
      offset++;
      skipped++;
    }

    // Safety limit
    if (fields.length > 20) break;
  }

  return {
    totalSize: compressedData.length,
    compression,
    decompressedSize: data.length,
    firstBytes: Array.from(data.slice(0, 64)),
    fields,
    nodeChangesFieldId,
    nodeChangesOffset,
    nodeChangesCount,
  };
}

/**
 * Extract message data from a .fig file
 */
export function extractMessageFromFig(figData: Uint8Array): Uint8Array {
  let canvasData = figData;

  // Handle ZIP format
  if (figData[0] === 0x50 && figData[1] === 0x4b) {
    const files = unzipSync(figData);
    if (!files["canvas.fig"]) {
      throw new Error("ZIP doesn't contain canvas.fig");
    }
    canvasData = files["canvas.fig"];
  }

  // Parse header
  const view = new DataView(canvasData.buffer, canvasData.byteOffset, canvasData.byteLength);
  const schemaSize = view.getUint32(12, true);

  // Extract message chunk
  const msgStart = 16 + schemaSize;
  const msgSizeView = new DataView(canvasData.buffer, canvasData.byteOffset + msgStart, 4);
  const msgSize = msgSizeView.getUint32(0, true);

  return canvasData.slice(msgStart + 4, msgStart + 4 + msgSize);
}

/**
 * Analyze a .fig file's message format
 */
export function analyzeMessageFormat(figData: Uint8Array): MessageAnalysis {
  const msgData = extractMessageFromFig(figData);
  return analyzeMessageData(msgData);
}

/**
 * Compare message formats of two .fig files
 */
export async function compareMessageFormats(
  workingPath: string,
  generatedPath: string
): Promise<void> {
  const fs = await import("node:fs");

  const workingData = new Uint8Array(fs.readFileSync(workingPath));
  const generatedData = new Uint8Array(fs.readFileSync(generatedPath));

  const working = analyzeMessageFormat(workingData);
  const generated = analyzeMessageFormat(generatedData);

  console.log("\n=== Message Format Analysis ===\n");

  console.log("--- Working File ---");
  console.log(`Compression: ${working.compression}`);
  console.log(`Compressed size: ${working.totalSize} bytes`);
  console.log(`Decompressed size: ${working.decompressedSize} bytes`);
  console.log(`Fields: ${working.fields.map(f => f.fieldId).join(', ')}`);
  console.log(`nodeChanges field ID: ${working.nodeChangesFieldId}`);
  console.log(`nodeChanges count: ${working.nodeChangesCount}`);
  console.log(`First 32 bytes: ${working.firstBytes.slice(0, 32).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);

  console.log("\n--- Generated File ---");
  console.log(`Compression: ${generated.compression}`);
  console.log(`Compressed size: ${generated.totalSize} bytes`);
  console.log(`Decompressed size: ${generated.decompressedSize} bytes`);
  console.log(`Fields: ${generated.fields.map(f => f.fieldId).join(', ')}`);
  console.log(`nodeChanges field ID: ${generated.nodeChangesFieldId}`);
  console.log(`nodeChanges count: ${generated.nodeChangesCount}`);
  console.log(`First 32 bytes: ${generated.firstBytes.slice(0, 32).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);

  console.log("\n--- Comparison ---");

  // Compare field order
  const wFields = working.fields.map(f => f.fieldId);
  const gFields = generated.fields.map(f => f.fieldId);

  if (wFields.join(',') !== gFields.join(',')) {
    console.log(`⚠️ Field order differs:`);
    console.log(`   Working:   [${wFields.join(', ')}]`);
    console.log(`   Generated: [${gFields.join(', ')}]`);
  } else {
    console.log(`✓ Field order matches`);
  }

  // Compare first bytes
  let byteDiffs = 0;
  for (let i = 0; i < Math.min(working.firstBytes.length, generated.firstBytes.length); i++) {
    if (working.firstBytes[i] !== generated.firstBytes[i]) {
      byteDiffs++;
    }
  }
  console.log(`Byte differences in first 64: ${byteDiffs}`);
}
