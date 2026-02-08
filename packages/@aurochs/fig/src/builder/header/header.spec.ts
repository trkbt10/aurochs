/**
 * @file Unit tests for header.ts
 */

import { buildFigHeader, buildFigFile } from "./header";
import { FIG_HEADER_SIZE, FIG_MAGIC } from "../../types";

describe("buildFigHeader", () => {
  it("creates header with correct size", () => {
    const header = buildFigHeader(100);
    expect(header.length).toBe(FIG_HEADER_SIZE);
  });

  it("sets magic bytes correctly", () => {
    const header = buildFigHeader(100);
    const magic = new TextDecoder().decode(header.slice(0, 8));
    expect(magic).toBe(FIG_MAGIC);
  });

  it("sets default version to '0'", () => {
    const header = buildFigHeader(100);
    expect(String.fromCharCode(header[8])).toBe("0");
  });

  it("sets custom version", () => {
    const header = buildFigHeader(100, "e");
    expect(String.fromCharCode(header[8])).toBe("e");
  });

  it("sets payload size correctly (little-endian)", () => {
    const header = buildFigHeader(0x12345678);
    const view = new DataView(header.buffer);
    expect(view.getUint32(12, true)).toBe(0x12345678);
  });

  it("sets reserved bytes to zero", () => {
    const header = buildFigHeader(100);
    expect(header[9]).toBe(0);
    expect(header[10]).toBe(0);
    expect(header[11]).toBe(0);
  });
});

describe("buildFigFile", () => {
  it("combines header and payload", () => {
    const payload = new Uint8Array([1, 2, 3, 4, 5]);
    const file = buildFigFile(payload);

    expect(file.length).toBe(FIG_HEADER_SIZE + payload.length);
  });

  it("includes header at start", () => {
    const payload = new Uint8Array([1, 2, 3, 4, 5]);
    const file = buildFigFile(payload);

    const magic = new TextDecoder().decode(file.slice(0, 8));
    expect(magic).toBe(FIG_MAGIC);
  });

  it("includes payload after header", () => {
    const payload = new Uint8Array([1, 2, 3, 4, 5]);
    const file = buildFigFile(payload);

    const payloadPart = file.slice(FIG_HEADER_SIZE);
    expect(Array.from(payloadPart)).toEqual([1, 2, 3, 4, 5]);
  });

  it("sets correct payload size in header", () => {
    const payload = new Uint8Array(256);
    const file = buildFigFile(payload);

    const view = new DataView(file.buffer);
    expect(view.getUint32(12, true)).toBe(256);
  });

  it("uses custom version", () => {
    const payload = new Uint8Array([1, 2, 3]);
    const file = buildFigFile(payload, "e");

    expect(String.fromCharCode(file[8])).toBe("e");
  });
});
