/**
 * @file Japanese encoding (Shift_JIS / code page 932) tests for VBA parsing
 *
 * Tests that VBA source code containing Japanese characters is correctly
 * decoded when the VBA project uses code page 932 (Shift_JIS).
 *
 * @see MS-OVBA 2.3.4.2.1.4 PROJECTCODEPAGE Record
 */

import { existsSync, readFileSync } from "node:fs";
import { loadZipPackage } from "@aurochs/zip";
import { parseVbaProject } from "./vba-project";

// Fixture path relative to project root
// This fixture should contain Japanese VBA source code with code page 932
const JAPANESE_XLSM_FIXTURE = "packages/@aurochs-office/vba/src/parser/fixtures/JapaneseMacro.xlsm";

describe("Japanese VBA encoding (Shift_JIS)", () => {
  const fixtureExists = existsSync(JAPANESE_XLSM_FIXTURE);

  // Skip tests if fixture doesn't exist
  const testOrSkip = fixtureExists ? it : it.skip;

  testOrSkip("parses VBA project with code page 932", async () => {
    const bytes = readFileSync(JAPANESE_XLSM_FIXTURE);
    const pkg = await loadZipPackage(bytes);
    const vbaBytes = pkg.readBinary("xl/vbaProject.bin");

    if (!vbaBytes) {
      throw new Error("vbaProject.bin not found");
    }

    const result = parseVbaProject(new Uint8Array(vbaBytes));
    expect(result.ok).toBe(true);

    if (!result.ok) return;

    // Project should be parsed successfully
    expect(result.program.modules.length).toBeGreaterThan(0);
  });

  testOrSkip("decodes Japanese comments correctly", async () => {
    const bytes = readFileSync(JAPANESE_XLSM_FIXTURE);
    const pkg = await loadZipPackage(bytes);
    const vbaBytes = pkg.readBinary("xl/vbaProject.bin");

    if (!vbaBytes) {
      throw new Error("vbaProject.bin not found");
    }

    const result = parseVbaProject(new Uint8Array(vbaBytes));
    expect(result.ok).toBe(true);

    if (!result.ok) return;

    // Find a module with Japanese content
    const moduleWithJapanese = result.program.modules.find(
      (m) => m.sourceCode.includes("日本語") || m.sourceCode.includes("コメント")
    );

    expect(moduleWithJapanese).toBeDefined();
    expect(moduleWithJapanese?.sourceCode).not.toContain("�"); // No replacement characters
  });

  testOrSkip("decodes Japanese variable names correctly", async () => {
    const bytes = readFileSync(JAPANESE_XLSM_FIXTURE);
    const pkg = await loadZipPackage(bytes);
    const vbaBytes = pkg.readBinary("xl/vbaProject.bin");

    if (!vbaBytes) {
      throw new Error("vbaProject.bin not found");
    }

    const result = parseVbaProject(new Uint8Array(vbaBytes));
    expect(result.ok).toBe(true);

    if (!result.ok) return;

    // Find a module with Japanese variable names
    const moduleWithJapanese = result.program.modules.find(
      (m) => m.sourceCode.includes("日付") || m.sourceCode.includes("変数")
    );

    expect(moduleWithJapanese).toBeDefined();
  });

  // Always run this test - it uses inline Shift_JIS data
  it("decodeText handles Shift_JIS bytes correctly", async () => {
    // This test verifies the core decoding logic works for Japanese text
    // "日付" in Shift_JIS = 0x93FA 0x9574
    const { decodeText } = await import("./dir-stream");

    const shiftJisBytes = new Uint8Array([0x93, 0xfa, 0x95, 0x74]);
    const result = decodeText(shiftJisBytes, 932);

    expect(result).toBe("日付");
  });

  it("UTF-8 decoding of Shift_JIS bytes produces garbled text", async () => {
    // This test documents the bug that was fixed
    // When Shift_JIS bytes are incorrectly decoded as UTF-8, they produce replacement characters
    const shiftJisBytes = new Uint8Array([0x93, 0xfa, 0x95, 0x74]);
    const wrongDecoder = new TextDecoder("utf-8");
    const wrongResult = wrongDecoder.decode(shiftJisBytes);

    // The incorrect decoding produces replacement characters
    expect(wrongResult).toContain("�");
    expect(wrongResult).not.toBe("日付");
  });
});
