/**
 * @file Header parsing unit tests
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { isFigFile, parseFigHeader, getPayload } from "./header";
import { buildFigHeader, buildFigFile } from "../builder/header";

describe("isFigFile", () => {
  it("returns true for valid fig file", () => {
    const data = new Uint8Array(16);
    const encoder = new TextEncoder();
    data.set(encoder.encode("fig-kiwi"), 0);
    expect(isFigFile(data)).toBe(true);
  });

  it("returns false for invalid magic", () => {
    const data = new Uint8Array(16);
    const encoder = new TextEncoder();
    data.set(encoder.encode("invalid!"), 0);
    expect(isFigFile(data)).toBe(false);
  });

  it("returns false for short data", () => {
    const data = new Uint8Array(8);
    expect(isFigFile(data)).toBe(false);
  });
});

describe("parseFigHeader", () => {
  it("parses valid header", () => {
    const data = new Uint8Array(16);
    const encoder = new TextEncoder();
    data.set(encoder.encode("fig-kiwi"), 0);
    data[8] = "0".charCodeAt(0);
    const view = new DataView(data.buffer);
    view.setUint32(12, 12345, true);

    const header = parseFigHeader(data);
    expect(header.magic).toBe("fig-kiwi");
    expect(header.version).toBe("0");
    expect(header.payloadSize).toBe(12345);
  });

  it("throws on short data", () => {
    const data = new Uint8Array(8);
    expect(() => parseFigHeader(data)).toThrow("File too small");
  });

  it("throws on invalid magic", () => {
    const data = new Uint8Array(16);
    const encoder = new TextEncoder();
    data.set(encoder.encode("invalid!"), 0);
    expect(() => parseFigHeader(data)).toThrow("Invalid magic header");
  });
});

describe("getPayload", () => {
  it("returns data after header", () => {
    const data = new Uint8Array(20);
    data[16] = 0xde;
    data[17] = 0xad;
    data[18] = 0xbe;
    data[19] = 0xef;

    const payload = getPayload(data);
    expect(payload).toEqual(new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
  });
});

describe("buildFigHeader", () => {
  it("builds valid header", () => {
    const header = buildFigHeader(12345, "0");
    expect(header.length).toBe(16);

    const parsed = parseFigHeader(header);
    expect(parsed.magic).toBe("fig-kiwi");
    expect(parsed.version).toBe("0");
    expect(parsed.payloadSize).toBe(12345);
  });
});

describe("buildFigFile", () => {
  it("builds complete file", () => {
    const payload = new Uint8Array([1, 2, 3, 4, 5]);
    const file = buildFigFile(payload, "0");

    expect(file.length).toBe(16 + 5);
    expect(isFigFile(file)).toBe(true);

    const header = parseFigHeader(file);
    expect(header.payloadSize).toBe(5);

    const extractedPayload = getPayload(file);
    expect(extractedPayload).toEqual(payload);
  });
});

describe("real file", () => {
  it("parses example.canvas.fig header", () => {
    const filePath = path.join(__dirname, "../../example.canvas.fig");
    if (!fs.existsSync(filePath)) {
      return; // Skip if file doesn't exist
    }

    const data = new Uint8Array(fs.readFileSync(filePath));
    expect(isFigFile(data)).toBe(true);

    const header = parseFigHeader(data);
    expect(header.magic).toBe("fig-kiwi");
    expect(header.version).toBe("0");
    expect(header.payloadSize).toBeGreaterThan(0);
  });
});
