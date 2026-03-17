/**
 * @file Stream Encoder Tests
 */

import { unzlibSync } from "fflate";
import { serializePdfStream, serializeContentStream } from "./stream-encoder";
import type { PdfObject } from "../native/core/types";

const decoder = new TextDecoder();
const toText = (bytes: Uint8Array) => decoder.decode(bytes);

describe("serializePdfStream", () => {
  it("serializes stream with FlateDecode compression (default)", () => {
    const data = new TextEncoder().encode("Hello, World!");
    const result = serializePdfStream({ data });
    const text = toText(result);

    expect(text).toContain("/Length ");
    expect(text).toContain("/Filter /FlateDecode");
    expect(text).toContain("stream\n");
    expect(text).toContain("\nendstream");
  });

  it("serializes stream without compression", () => {
    const data = new TextEncoder().encode("Hello, World!");
    const result = serializePdfStream({ data, encoding: "none" });
    const text = toText(result);

    expect(text).toContain("/Length 13");
    expect(text).not.toContain("/Filter");
    expect(text).toContain("stream\n");
    expect(text).toContain("Hello, World!");
    expect(text).toContain("\nendstream");
  });

  it("includes custom dict entries", () => {
    const data = new TextEncoder().encode("test");
    const dict = new Map<string, PdfObject>([
      ["Type", { type: "name", value: "XObject" }],
      ["Subtype", { type: "name", value: "Image" }],
    ]);
    const result = serializePdfStream({ data, dict, encoding: "none" });
    const text = toText(result);

    expect(text).toContain("/Type /XObject");
    expect(text).toContain("/Subtype /Image");
    expect(text).toContain("/Length 4");
  });

  it("produces decompressible data with FlateDecode", () => {
    const original = "BT /F1 12 Tf 100 700 Td (Hello) Tj ET";
    const data = new TextEncoder().encode(original);
    const result = serializePdfStream({ data, encoding: "FlateDecode" });

    // Find "stream\n" marker in binary data
    const streamMarker = new TextEncoder().encode("stream\n");
    const endstreamMarker = new TextEncoder().encode("\nendstream");

    // eslint-disable-next-line no-restricted-syntax -- updated in search loop
    let streamStart = -1;
    for (let i = 0; i <= result.length - streamMarker.length; i++) {      // eslint-disable-next-line no-restricted-syntax -- flag updated in inner loop
      let match = true;
      for (let j = 0; j < streamMarker.length; j++) {        if (result[i + j] !== streamMarker[j]) {
          match = false;
          break;
        }
      }
      if (match) {
        streamStart = i + streamMarker.length;
        break;
      }
    }

    // eslint-disable-next-line no-restricted-syntax -- updated in search loop
    let streamEnd = -1;
    for (let i = result.length - endstreamMarker.length; i >= 0; i--) {      // eslint-disable-next-line no-restricted-syntax -- flag updated in inner loop
      let match = true;
      for (let j = 0; j < endstreamMarker.length; j++) {        if (result[i + j] !== endstreamMarker[j]) {
          match = false;
          break;
        }
      }
      if (match) {
        streamEnd = i;
        break;
      }
    }

    expect(streamStart).toBeGreaterThan(0);
    expect(streamEnd).toBeGreaterThan(streamStart);

    const compressedBytes = result.slice(streamStart, streamEnd);

    // Decompress and verify
    const decompressed = unzlibSync(compressedBytes);
    expect(toText(decompressed)).toBe(original);
  });

  it("handles empty stream", () => {
    const data = new Uint8Array([]);
    const result = serializePdfStream({ data, encoding: "none" });
    const text = toText(result);

    expect(text).toContain("/Length 0");
    expect(text).toContain("stream\n\nendstream");
  });

  it("reports correct length for compressed data", () => {
    const data = new Uint8Array(1000).fill(0x41); // 1000 'A's
    const result = serializePdfStream({ data, encoding: "FlateDecode" });
    const text = toText(result);

    // Extract reported length
    const lengthMatch = text.match(/\/Length (\d+)/);
    expect(lengthMatch).not.toBeNull();
    const reportedLength = parseInt(lengthMatch![1], 10);

    // Extract actual compressed data length
    const streamStart = text.indexOf("stream\n") + 7;
    const streamEnd = text.lastIndexOf("\nendstream");
    const actualLength = streamEnd - streamStart;

    expect(reportedLength).toBe(actualLength);
    expect(reportedLength).toBeLessThan(1000); // Should be compressed
  });
});

describe("serializeContentStream", () => {
  it("serializes operators with FlateDecode by default", () => {
    const operators = "BT /F1 12 Tf ET";
    const result = serializeContentStream(operators);
    const text = toText(result);

    expect(text).toContain("/Filter /FlateDecode");
    expect(text).toContain("stream\n");
    expect(text).toContain("\nendstream");
  });

  it("serializes operators without compression", () => {
    const operators = "q 1 0 0 1 0 0 cm Q";
    const result = serializeContentStream(operators, "none");
    const text = toText(result);

    expect(text).not.toContain("/Filter");
    expect(text).toContain(operators);
  });
});
