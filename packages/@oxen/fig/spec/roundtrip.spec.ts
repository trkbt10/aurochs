/**
 * @file Roundtrip test for fig files
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { inflateRaw } from "pako";
import { loadZipPackage } from "@oxen/zip";
import {
  isFigFile,
  parseFigHeader,
  getPayload,
  decompressDeflateRaw,
  decompressZstd,
} from "../src/parser";
import { detectCompression } from "../src/compression";
import { buildFigHeader } from "../src/builder";
import {
  decodeFigSchema,
  decodeFigMessage,
  splitFigChunks,
} from "../src/kiwi/decoder";
import { StreamingFigEncoder } from "../src/kiwi/stream";
import {
  createTestSchema,
  createTestNode,
  buildTestFigFile,
  createSampleFigFile,
} from "../src/kiwi/test-helpers";

describe("fig file parsing (generated data)", () => {
  it("validates header", () => {
    const { file } = createSampleFigFile();

    expect(isFigFile(file)).toBe(true);

    const header = parseFigHeader(file);
    expect(header.magic).toBe("fig-kiwi");
    expect(header.version).toBe("0");
    expect(header.payloadSize).toBeGreaterThan(0);
  });

  it("rebuilds header correctly", () => {
    const { file } = createSampleFigFile();
    const header = parseFigHeader(file);

    const rebuiltHeader = buildFigHeader(header.payloadSize, header.version);
    expect(rebuiltHeader).toEqual(file.slice(0, 16));
  });

  it("decompresses payload with inflateRaw", () => {
    const { file } = createSampleFigFile();
    const header = parseFigHeader(file);
    const payload = getPayload(file);

    const chunks = splitFigChunks(payload, header.payloadSize);
    const decompressedSchema = decompressDeflateRaw(chunks.schema);
    const decompressedData = decompressDeflateRaw(chunks.data);

    expect(decompressedSchema.length).toBeGreaterThan(0);
    expect(decompressedData.length).toBeGreaterThan(0);
  });

  it("decodes schema from decompressed data", () => {
    const { file, schema: expectedSchema } = createSampleFigFile();
    const header = parseFigHeader(file);
    const payload = getPayload(file);
    const chunks = splitFigChunks(payload, header.payloadSize);
    const decompressed = decompressDeflateRaw(chunks.schema);

    const schema = decodeFigSchema(decompressed);

    expect(schema.definitions.length).toBe(expectedSchema.definitions.length);

    // Check some known definitions
    const messageType = schema.definitions[0];
    expect(messageType.name).toBe("MessageType");
    expect(messageType.kind).toBe("ENUM");

    const nodeType = schema.definitions.find((d) => d.name === "NodeType");
    expect(nodeType).toBeDefined();
    expect(nodeType?.kind).toBe("ENUM");
    expect(nodeType?.fields.some((f) => f.name === "DOCUMENT")).toBe(true);
    expect(nodeType?.fields.some((f) => f.name === "CANVAS")).toBe(true);
    expect(nodeType?.fields.some((f) => f.name === "FRAME")).toBe(true);

    const color = schema.definitions.find((d) => d.name === "Color");
    expect(color).toBeDefined();
    expect(color?.kind).toBe("STRUCT");
    expect(color?.fields.map((f) => f.name)).toEqual(["r", "g", "b", "a"]);
  });
});

describe("fig message decoding (generated data)", () => {
  it("decodes message data with correct structure", () => {
    const { file, expectedNodes } = createSampleFigFile();
    const header = parseFigHeader(file);
    const payload = getPayload(file);

    // Split into schema and data chunks
    const chunks = splitFigChunks(payload, header.payloadSize);
    expect(chunks.schema.length).toBe(header.payloadSize);
    expect(chunks.data.length).toBeGreaterThan(0);

    // Decompress both chunks
    const schemaData = decompressDeflateRaw(chunks.schema);
    const msgData = decompressDeflateRaw(chunks.data);

    // Decode schema
    const schema = decodeFigSchema(schemaData);

    // Decode message
    const message = decodeFigMessage(schema, msgData, "Message") as Record<
      string,
      unknown
    >;

    // Check message type
    expect(message.type).toBeDefined();
    const msgType = message.type as { value: number; name: string };
    expect(msgType.name).toBe("NODE_CHANGES");

    // Check node changes
    expect(message.nodeChanges).toBeDefined();
    const nodeChanges = message.nodeChanges as Record<string, unknown>[];
    expect(nodeChanges.length).toBe(expectedNodes.length);

    // Check nodes match expected
    for (const [i, expected] of expectedNodes.entries()) {
      const node = nodeChanges[i];
      expect(node.name).toBe(expected.name);
      const nodeType = node.type as { name: string };
      expect(nodeType.name).toBe(expected.type);
    }
  });
});

describe("fig file structure (generated data)", () => {
  it("reports file statistics", () => {
    const { file, schema: expectedSchema } = createSampleFigFile();

    const header = parseFigHeader(file);
    const payload = getPayload(file);
    const chunks = splitFigChunks(payload, header.payloadSize);
    const decompressedSchema = decompressDeflateRaw(chunks.schema);
    const decompressedData = decompressDeflateRaw(chunks.data);
    const schema = decodeFigSchema(decompressedSchema);

    console.log("=== Generated File Statistics ===");
    console.log(`File size: ${file.length} bytes`);
    console.log(`Header: ${header.magic} v${header.version}`);
    console.log(`Schema chunk (compressed): ${chunks.schema.length} bytes`);
    console.log(`Schema chunk (decompressed): ${decompressedSchema.length} bytes`);
    console.log(`Data chunk (compressed): ${chunks.data.length} bytes`);
    console.log(`Data chunk (decompressed): ${decompressedData.length} bytes`);
    console.log(`Schema definitions: ${schema.definitions.length}`);

    // Count by kind
    const counts = { ENUM: 0, STRUCT: 0, MESSAGE: 0 };
    for (const def of schema.definitions) {
      if (def.kind in counts) {
        counts[def.kind as keyof typeof counts]++;
      }
    }
    console.log(`  ENUM: ${counts.ENUM}`);
    console.log(`  STRUCT: ${counts.STRUCT}`);
    console.log(`  MESSAGE: ${counts.MESSAGE}`);

    // Verify structure
    expect(schema.definitions.length).toBe(expectedSchema.definitions.length);
  });
});

describe("fig roundtrip (encode -> build -> parse -> decode)", () => {
  it("preserves data through full roundtrip", () => {
    const schema = createTestSchema();

    // Create test nodes
    const originalNodes = [
      createTestNode({ localID: 0, type: 1, name: "Test Document" }),
      createTestNode({ localID: 1, type: 2, name: "Test Page", visible: true }),
      createTestNode({ localID: 2, type: 6, name: "Hello", opacity: 0.8 }),
    ];

    // Encode
    const encoder = new StreamingFigEncoder({ schema });
    encoder.writeHeader({ type: { value: 1 }, sessionID: 123, ackID: 0 });
    for (const node of originalNodes) {
      encoder.writeNodeChange(node);
    }
    const messageData = encoder.finalize();

    // Build fig file
    const figFile = buildTestFigFile(schema, messageData);

    // Verify it's a valid fig file
    expect(isFigFile(figFile)).toBe(true);

    // Parse back
    const header = parseFigHeader(figFile);
    const payload = getPayload(figFile);
    const chunks = splitFigChunks(payload, header.payloadSize);

    const parsedSchemaData = inflateRaw(chunks.schema);
    const parsedMsgData = inflateRaw(chunks.data);

    const parsedSchema = decodeFigSchema(parsedSchemaData);
    const parsedMessage = decodeFigMessage(parsedSchema, parsedMsgData, "Message") as Record<string, unknown>;

    // Verify message
    const msgType = parsedMessage.type as { name: string };
    expect(msgType.name).toBe("NODE_CHANGES");

    // Verify nodes
    const nodeChanges = parsedMessage.nodeChanges as Record<string, unknown>[];
    expect(nodeChanges.length).toBe(3);

    expect(nodeChanges[0].name).toBe("Test Document");
    expect(nodeChanges[1].name).toBe("Test Page");
    expect(nodeChanges[2].name).toBe("Hello");

    // Verify numeric values preserved
    expect(nodeChanges[2].opacity).toBeCloseTo(0.8);
  });
});

// Test with samples/sample-file.fig (ZIP containing canvas.fig)
describe("fig file parsing (sample-file.fig)", () => {
  const figPath = path.join(__dirname, "../samples/sample-file.fig");

  it("parses canvas.fig from sample-file.fig archive", async () => {
    const zipData = fs.readFileSync(figPath);
    const zip = await loadZipPackage(zipData);

    const canvasBinary = zip.readBinary("canvas.fig");
    expect(canvasBinary).not.toBeNull();

    const data = new Uint8Array(canvasBinary!);
    expect(isFigFile(data)).toBe(true);

    const header = parseFigHeader(data);
    expect(header.magic).toBe("fig-kiwi");
    expect(header.version).toBeDefined();
    expect(header.payloadSize).toBeGreaterThan(0);

    const payload = getPayload(data);
    expect(payload.length).toBeGreaterThan(header.payloadSize);

    const chunks = splitFigChunks(payload, header.payloadSize);
    expect(chunks.schema.length).toBe(header.payloadSize);
    expect(chunks.data.length).toBeGreaterThan(0);

    // Schema uses raw deflate, data may use ZSTD or raw deflate
    const schemaData = decompressDeflateRaw(chunks.schema);
    const dataCompression = detectCompression(chunks.data);
    const decompressChunkData = (data: Uint8Array, compression: string): Uint8Array =>
      compression === "zstd" ? decompressZstd(data) : decompressDeflateRaw(data);
    const msgData = decompressChunkData(chunks.data, dataCompression);

    expect(schemaData.length).toBeGreaterThan(0);
    expect(msgData.length).toBeGreaterThan(0);

    const schema = decodeFigSchema(schemaData);
    expect(schema.definitions.length).toBeGreaterThan(0);

    const message = decodeFigMessage(schema, msgData, "Message") as Record<
      string,
      unknown
    >;
    expect(message).toBeDefined();
    expect(message.type).toBeDefined();

    const nodeChanges = message.nodeChanges as Record<string, unknown>[];
    expect(nodeChanges).toBeDefined();
    expect(nodeChanges.length).toBeGreaterThan(0);

    console.log("=== sample-file.fig/canvas.fig Statistics ===");
    console.log(`Archive size: ${zipData.length} bytes`);
    console.log(`canvas.fig size: ${data.length} bytes`);
    console.log(`Header: ${header.magic} v${header.version}`);
    console.log(`Schema chunk (compressed): ${chunks.schema.length} bytes`);
    console.log(`Schema chunk (decompressed): ${schemaData.length} bytes`);
    console.log(`Data chunk (compressed): ${chunks.data.length} bytes`);
    console.log(`Data chunk (decompressed): ${msgData.length} bytes`);
    console.log(`Schema definitions: ${schema.definitions.length}`);
    console.log(`Node changes: ${nodeChanges.length}`);

    // Count definition kinds
    const counts = { ENUM: 0, STRUCT: 0, MESSAGE: 0 };
    for (const def of schema.definitions) {
      if (def.kind in counts) {
        counts[def.kind as keyof typeof counts]++;
      }
    }
    console.log(`  ENUM: ${counts.ENUM}`);
    console.log(`  STRUCT: ${counts.STRUCT}`);
    console.log(`  MESSAGE: ${counts.MESSAGE}`);
  });
});
