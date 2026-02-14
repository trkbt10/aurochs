/**
 * @file dir stream parser tests
 */

import { readFileSync } from "node:fs";
import { loadZipPackage } from "@aurochs/zip";
import { openCfb } from "@aurochs-office/cfb";
import { decompressVba } from "./compression";
import { parseDirStream, decodeText, CODE_PAGE_TO_ENCODING } from "./dir-stream";

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

describe("decodeText", () => {
  it("decodes Shift_JIS (code page 932) correctly", () => {
    // "日付" in Shift_JIS encoding
    const bytes = new Uint8Array([0x93, 0xfa, 0x95, 0x74]);
    const result = decodeText(bytes, 932);
    expect(result).toBe("日付");
  });

  it("decodes GBK (code page 936) correctly", () => {
    // "中文" in GBK encoding
    const bytes = new Uint8Array([0xd6, 0xd0, 0xce, 0xc4]);
    const result = decodeText(bytes, 936);
    expect(result).toBe("中文");
  });

  it("decodes Windows-1252 (code page 1252) correctly", () => {
    // "café" with é = 0xe9 in Windows-1252
    const bytes = new Uint8Array([0x63, 0x61, 0x66, 0xe9]);
    const result = decodeText(bytes, 1252);
    expect(result).toBe("café");
  });

  it("decodes UTF-8 (code page 65001) correctly", () => {
    // "日付" in UTF-8 encoding
    const bytes = new Uint8Array([0xe6, 0x97, 0xa5, 0xe4, 0xbb, 0x98]);
    const result = decodeText(bytes, 65001);
    expect(result).toBe("日付");
  });

  it("falls back to Windows-1252 for unknown code page", () => {
    // ASCII is same in Windows-1252
    const bytes = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"
    const result = decodeText(bytes, 99999);
    expect(result).toBe("Hello");
  });

  it("CODE_PAGE_TO_ENCODING contains Shift_JIS mapping", () => {
    expect(CODE_PAGE_TO_ENCODING[932]).toBe("shift_jis");
  });
});

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
