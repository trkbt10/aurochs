/**
 * @file VBA compression tests
 */

import { readFileSync } from "node:fs";
import { loadZipPackage } from "@aurochs/zip";
import { compressVba } from "./compression";
import { decompressVba } from "../parser/compression";
import { parseVbaProject } from "../parser/vba-project";

const FIXTURE_DIR = "packages/@aurochs-office/vba/fixtures";
const XLSM_FIXTURE = `${FIXTURE_DIR}/SimpleMacro.xlsm`;

async function loadVbaProject(fixturePath: string, vbaPath: string): Promise<Uint8Array> {
  const bytes = readFileSync(fixturePath);
  const pkg = await loadZipPackage(bytes);
  const binary = pkg.readBinary(vbaPath);
  if (!binary) {
    throw new Error(`${vbaPath} not found in ${fixturePath}`);
  }
  return new Uint8Array(binary);
}

describe("compressVba", () => {
  it("compresses empty data", () => {
    const data = new Uint8Array(0);
    const compressed = compressVba(data);

    // Should have signature byte
    expect(compressed.length).toBe(1);
    expect(compressed[0]).toBe(0x01);

    // Should round-trip
    const decompressed = decompressVba(compressed);
    expect(decompressed).toEqual(data);
  });

  it("round-trips simple string", () => {
    const original = new TextEncoder().encode("Hello, VBA!");
    const compressed = compressVba(original);
    const decompressed = decompressVba(compressed);

    expect(decompressed).toEqual(original);
  });

  it("round-trips repeating pattern", () => {
    // Highly compressible data
    const original = new TextEncoder().encode("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
    const compressed = compressVba(original);
    const decompressed = decompressVba(compressed);

    expect(decompressed).toEqual(original);
    // Should actually compress
    expect(compressed.length).toBeLessThan(original.length + 10);
  });

  it("round-trips various sizes", () => {
    const sizes = [1, 10, 100, 1000, 4095, 4096, 4097, 8192, 10000];

    for (const size of sizes) {
      const original = new Uint8Array(size);
      for (let i = 0; i < size; i++) {
        original[i] = i % 256;
      }

      const compressed = compressVba(original);
      const decompressed = decompressVba(compressed);

      expect(decompressed).toEqual(original);
    }
  });

  it("round-trips VBA source code", () => {
    const sourceCode = `
Attribute VB_Name = "Module1"
Public Sub HelloWorld()
    MsgBox "Hello, World!"
End Sub

Public Function Add(a As Integer, b As Integer) As Integer
    Add = a + b
End Function
`;
    const original = new TextEncoder().encode(sourceCode);
    const compressed = compressVba(original);
    const decompressed = decompressVba(compressed);

    expect(decompressed).toEqual(original);
  });

  it("round-trips data with repeated patterns", () => {
    // VBA source often has repeated keywords
    const sourceCode = `
Sub Test1(): End Sub
Sub Test2(): End Sub
Sub Test3(): End Sub
Sub Test4(): End Sub
Sub Test5(): End Sub
`;
    const original = new TextEncoder().encode(sourceCode);
    const compressed = compressVba(original);
    const decompressed = decompressVba(compressed);

    expect(decompressed).toEqual(original);

    // Should compress due to repeated "Sub Test" and ": End Sub"
    expect(compressed.length).toBeLessThan(original.length);
  });

  it("round-trips random data", () => {
    const original = new Uint8Array(500);
    for (let i = 0; i < original.length; i++) {
      original[i] = Math.floor(Math.random() * 256);
    }

    const compressed = compressVba(original);
    const decompressed = decompressVba(compressed);

    expect(decompressed).toEqual(original);
  });

  it("round-trips chunk boundary exactly", () => {
    // Test exactly 4096 bytes (one chunk)
    const original = new Uint8Array(4096);
    for (let i = 0; i < original.length; i++) {
      original[i] = i % 256;
    }

    const compressed = compressVba(original);
    const decompressed = decompressVba(compressed);

    expect(decompressed).toEqual(original);
  });

  it("round-trips multiple chunks", () => {
    // Test 3 full chunks + partial
    const original = new Uint8Array(4096 * 3 + 1234);
    for (let i = 0; i < original.length; i++) {
      original[i] = i % 256;
    }

    const compressed = compressVba(original);
    const decompressed = decompressVba(compressed);

    expect(decompressed).toEqual(original);
  });

  it("handles all byte values", () => {
    const original = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      original[i] = i;
    }

    const compressed = compressVba(original);
    const decompressed = decompressVba(compressed);

    expect(decompressed).toEqual(original);
  });

  it("produces valid compressed format", () => {
    const original = new TextEncoder().encode("Test data");
    const compressed = compressVba(original);

    // First byte should be signature
    expect(compressed[0]).toBe(0x01);

    // Following bytes should be chunk header
    if (compressed.length > 1) {
      const header = compressed[1] | (compressed[2] << 8);
      const signature = (header >> 12) & 0x07;
      expect(signature).toBe(0x03); // Valid signature
    }
  });

  it("round-trips real VBA source from fixture", async () => {
    const vbaBytes = await loadVbaProject(XLSM_FIXTURE, "xl/vbaProject.bin");
    const result = parseVbaProject(vbaBytes);

    expect(result.ok).toBe(true);
    if (!result.ok) {return;}

    // Test each module's source code
    for (const module of result.program.modules) {
      const sourceBytes = new TextEncoder().encode(module.sourceCode);
      const compressed = compressVba(sourceBytes);
      const decompressed = decompressVba(compressed);

      expect(decompressed).toEqual(sourceBytes);
    }
  });
});
