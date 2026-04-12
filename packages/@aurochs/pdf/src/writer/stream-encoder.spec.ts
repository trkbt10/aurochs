/**
 * @file Stream Encoder Tests
 */

import { unzlibSync } from "fflate";
import { serializePdfStream, serializeContentStream } from "./stream-encoder";
import type { PdfObject } from "../native/core/types";

const decoder = new TextDecoder();
const toText = (bytes: Uint8Array) => decoder.decode(bytes);

/**
 * Find the first index in `haystack` where `needle` occurs as a contiguous byte subsequence.
 * Returns -1 when not found (same semantics as `String.prototype.indexOf`).
 * Scans forward from the beginning of `haystack`.
 */
function indexOfBytes(haystack: Uint8Array, needle: Uint8Array): number {
  return Array.from(
    { length: haystack.length - needle.length + 1 },
    (_, i) => i,
  ).findIndex((i) => needle.every((b, j) => haystack[i + j] === b));
}

/**
 * Find the *last* index in `haystack` where `needle` occurs as a contiguous byte subsequence.
 * Returns -1 when not found.
 */
function lastIndexOfBytes(haystack: Uint8Array, needle: Uint8Array): number {
  const candidates = Array.from(
    { length: haystack.length - needle.length + 1 },
    (_, i) => i,
  ).filter((i) => needle.every((b, j) => haystack[i + j] === b));
  return candidates.length > 0 ? candidates[candidates.length - 1] : -1;
}

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

    const streamMarkerPos = indexOfBytes(result, streamMarker);
    const streamStart = streamMarkerPos === -1 ? -1 : streamMarkerPos + streamMarker.length;

    const streamEnd = lastIndexOfBytes(result, endstreamMarker);

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
