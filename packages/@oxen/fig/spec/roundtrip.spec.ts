/**
 * @file Roundtrip test for fig files
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
  isFigFile,
  parseFigHeader,
  getPayload,
  decompressDeflateRaw,
  buildFigHeader,
  decodeFigSchema,
  decodeFigMessage,
  splitFigChunks,
} from "../src";

describe("fig file parsing", () => {
  const figPath = path.join(__dirname, "../example.canvas.fig");

  it("validates header", () => {
    if (!fs.existsSync(figPath)) {
      console.log("Skipping: example.canvas.fig not found");
      return;
    }

    const data = new Uint8Array(fs.readFileSync(figPath));
    expect(isFigFile(data)).toBe(true);

    const header = parseFigHeader(data);
    expect(header.magic).toBe("fig-kiwi");
    expect(header.version).toBe("0");
    expect(header.payloadSize).toBe(15606);
  });

  it("rebuilds header correctly", () => {
    if (!fs.existsSync(figPath)) {
      return;
    }

    const data = new Uint8Array(fs.readFileSync(figPath));
    const header = parseFigHeader(data);

    const rebuiltHeader = buildFigHeader(header.payloadSize, header.version);
    expect(rebuiltHeader).toEqual(data.slice(0, 16));
  });

  it("decompresses payload with inflateRaw", () => {
    if (!fs.existsSync(figPath)) {
      return;
    }

    const data = new Uint8Array(fs.readFileSync(figPath));
    const payload = getPayload(data);

    expect(payload.length).toBe(17909);

    const decompressed = decompressDeflateRaw(payload);
    expect(decompressed.length).toBe(37018);
  });

  it("decodes schema from decompressed data", () => {
    if (!fs.existsSync(figPath)) {
      return;
    }

    const data = new Uint8Array(fs.readFileSync(figPath));
    const payload = getPayload(data);
    const decompressed = decompressDeflateRaw(payload);

    const schema = decodeFigSchema(decompressed);

    expect(schema.definitions.length).toBe(307);

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

describe("fig message decoding", () => {
  const figPath = path.join(__dirname, "../example.canvas.fig");

  it("decodes message data with correct structure", () => {
    if (!fs.existsSync(figPath)) {
      console.log("Skipping: example.canvas.fig not found");
      return;
    }

    const data = new Uint8Array(fs.readFileSync(figPath));
    const header = parseFigHeader(data);
    const payload = getPayload(data);

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
    expect(nodeChanges.length).toBe(6);

    // Check Document node
    const docNode = nodeChanges[0];
    expect(docNode.name).toBe("Document");
    const docType = docNode.type as { value: number; name: string };
    expect(docType.name).toBe("DOCUMENT");

    // Check Page 1 canvas
    const page1 = nodeChanges[1];
    expect(page1.name).toBe("Page 1");
    const page1Type = page1.type as { value: number; name: string };
    expect(page1Type.name).toBe("CANVAS");

    // Check other nodes exist
    const names = nodeChanges.map((n) => n.name);
    expect(names).toContain("esbuild");
    expect(names).toContain("Vector");
    expect(names).toContain("Ellipse");
  });
});

describe("fig file structure", () => {
  const figPath = path.join(__dirname, "../example.canvas.fig");

  it("reports file statistics", () => {
    if (!fs.existsSync(figPath)) {
      console.log("Skipping: example.canvas.fig not found");
      return;
    }

    const data = new Uint8Array(fs.readFileSync(figPath));
    const header = parseFigHeader(data);
    const payload = getPayload(data);
    const decompressed = decompressDeflateRaw(payload);
    const schema = decodeFigSchema(decompressed);

    console.log("=== File Statistics ===");
    console.log(`File size: ${data.length} bytes`);
    console.log(`Header: ${header.magic} v${header.version}`);
    console.log(`Payload (compressed): ${payload.length} bytes`);
    console.log(`Payload (decompressed): ${decompressed.length} bytes`);
    console.log(`Compression ratio: ${(payload.length / decompressed.length * 100).toFixed(1)}%`);
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
  });
});
