/**
 * @file dir stream parser tests
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { loadZipPackage } from "@aurochs/zip";
import { openCfb } from "@aurochs-office/cfb";
import { decompressVba } from "./compression";
import { parseDirStream } from "./dir-stream";

const XLSM_FIXTURE = "fixtures/poi-test-data/test-data/spreadsheet/SimpleMacro.xlsm";

async function loadVbaProject(fixturePath: string, vbaPath: string): Promise<Uint8Array> {
  const bytes = readFileSync(fixturePath);
  const pkg = await loadZipPackage(bytes);
  const binary = pkg.readBinary(vbaPath);
  if (!binary) {
    throw new Error(`${vbaPath} not found in ${fixturePath}`);
  }
  return new Uint8Array(binary);
}

describe("parseDirStream", () => {
  it("decompresses and parses dir stream", async () => {
    const vbaBytes = await loadVbaProject(XLSM_FIXTURE, "xl/vbaProject.bin");
    const cfb = openCfb(vbaBytes);

    const dirBytes = cfb.readStream(["VBA", "dir"]);
    const decompressed = decompressVba(dirBytes);

    expect(decompressed.length).toBeGreaterThan(0);

    const dirInfo = parseDirStream(decompressed);

    expect(dirInfo.projectName).toBe("VBAProject");
    expect(dirInfo.codePage).toBe(1252);
  });

  it("lists VBA storage entries", async () => {
    const vbaBytes = await loadVbaProject(XLSM_FIXTURE, "xl/vbaProject.bin");
    const cfb = openCfb(vbaBytes);

    const vbaEntries = cfb.list(["VBA"]);

    // There should be module streams
    const streamNames = vbaEntries.filter(e => e.type === "stream").map(e => e.name);
    expect(streamNames).toContain("Module1");
    expect(streamNames).toContain("dir");
    expect(streamNames).toContain("_VBA_PROJECT");
  });
});
