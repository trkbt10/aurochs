/**
 * @file VBA compression tests
 */

import { readFileSync } from "node:fs";
import { loadZipPackage } from "@aurochs/zip";
import { openCfb } from "@aurochs-office/cfb";
import { decompressVba } from "./compression";

const XLSM_FIXTURE = "packages/@aurochs-office/vba/fixtures/SimpleMacro.xlsm";

async function loadVbaProject(fixturePath: string, vbaPath: string): Promise<Uint8Array> {
  const bytes = readFileSync(fixturePath);
  const pkg = await loadZipPackage(bytes);
  const binary = pkg.readBinary(vbaPath);
  if (!binary) {
    throw new Error(`${vbaPath} not found in ${fixturePath}`);
  }
  return new Uint8Array(binary);
}

describe("decompressVba", () => {
  it("throws on invalid signature", () => {
    const invalidData = new Uint8Array([0x00, 0x01, 0x02]);
    expect(() => decompressVba(invalidData)).toThrow("Invalid VBA compression signature");
  });

  it("handles empty input", () => {
    const result = decompressVba(new Uint8Array(0));
    expect(result.length).toBe(0);
  });

  it("decompresses VBA/dir stream from fixture", async () => {
    const vbaBytes = await loadVbaProject(XLSM_FIXTURE, "xl/vbaProject.bin");
    const cfb = openCfb(vbaBytes);

    const dirBytes = cfb.readStream(["VBA", "dir"]);
    expect(dirBytes[0]).toBe(0x01); // Signature byte

    const decompressed = decompressVba(dirBytes);
    expect(decompressed.length).toBeGreaterThan(0);

    // dir stream contains structured binary data
    // First meaningful bytes should be readable
    expect(decompressed.length).toBeGreaterThan(dirBytes.length / 2); // Compression ratio check
  });

  it("decompresses module stream from fixture", async () => {
    const vbaBytes = await loadVbaProject(XLSM_FIXTURE, "xl/vbaProject.bin");
    const cfb = openCfb(vbaBytes);

    // Find a module stream
    const vbaEntries = cfb.list(["VBA"]);
    const moduleEntry = vbaEntries.find(
      (e) => e.type === "stream" && e.name !== "dir" && e.name !== "_VBA_PROJECT"
    );

    if (!moduleEntry) {
      // Skip if no module found
      return;
    }

    const moduleBytes = cfb.readStream(["VBA", moduleEntry.name]);
    if (moduleBytes.length === 0 || moduleBytes[0] !== 0x01) {
      // Not compressed or empty
      return;
    }

    const decompressed = decompressVba(moduleBytes);
    expect(decompressed.length).toBeGreaterThan(0);

    // Module source should contain VBA keywords
    const text = new TextDecoder("utf-8").decode(decompressed);
    // May contain "Attribute" or VBA code
    expect(text.length).toBeGreaterThan(0);
  });
});
