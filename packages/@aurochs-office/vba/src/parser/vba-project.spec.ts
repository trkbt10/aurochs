/**
 * @file VBA Project parser tests
 */

import { readFileSync } from "node:fs";
import { loadZipPackage } from "@aurochs/zip";
import { parseVbaProject } from "./vba-project";

const FIXTURE_DIR = "packages/@aurochs-office/vba/fixtures";
const XLSM_FIXTURE = `${FIXTURE_DIR}/SimpleMacro.xlsm`;
const DOCM_FIXTURE = `${FIXTURE_DIR}/SimpleMacro.docm`;
const PPTM_FIXTURE = `${FIXTURE_DIR}/SimpleMacro.pptm`;

async function loadVbaProject(fixturePath: string, vbaPath: string): Promise<Uint8Array> {
  const bytes = readFileSync(fixturePath);
  const pkg = await loadZipPackage(bytes);
  const binary = pkg.readBinary(vbaPath);
  if (!binary) {
    throw new Error(`${vbaPath} not found in ${fixturePath}`);
  }
  return new Uint8Array(binary);
}

describe("parseVbaProject", () => {
  it("returns error for empty input", () => {
    const result = parseVbaProject(new Uint8Array(0));
    expect(result.ok).toBe(false);
  });

  it("returns error for invalid CFB", () => {
    const result = parseVbaProject(new Uint8Array([0x00, 0x01, 0x02, 0x03]));
    expect(result.ok).toBe(false);
  });

  describe("XLSM - SimpleMacro.xlsm", () => {
    it("parses vbaProject.bin successfully", async () => {
      const vbaBytes = await loadVbaProject(XLSM_FIXTURE, "xl/vbaProject.bin");
      const result = parseVbaProject(vbaBytes);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.program.project).toBeDefined();
        expect(result.program.modules.length).toBeGreaterThan(0);
      }
    });

    it("extracts module names", async () => {
      const vbaBytes = await loadVbaProject(XLSM_FIXTURE, "xl/vbaProject.bin");
      const result = parseVbaProject(vbaBytes);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const moduleNames = result.program.modules.map((m) => m.name);
        expect(moduleNames.length).toBeGreaterThan(0);
      }
    });

    it("extracts module source code", async () => {
      const vbaBytes = await loadVbaProject(XLSM_FIXTURE, "xl/vbaProject.bin");
      const result = parseVbaProject(vbaBytes);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const hasSourceCode = result.program.modules.some((m) => m.sourceCode.length > 0);
        expect(hasSourceCode).toBe(true);
      }
    });

    it("source code contains VBA syntax", async () => {
      const vbaBytes = await loadVbaProject(XLSM_FIXTURE, "xl/vbaProject.bin");
      const result = parseVbaProject(vbaBytes);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const allSource = result.program.modules.map((m) => m.sourceCode).join("\n");
        // VBA source typically contains "Attribute" declarations
        const hasVbaSyntax =
          allSource.includes("Attribute") || allSource.includes("Sub") || allSource.includes("Function");
        expect(hasVbaSyntax).toBe(true);
      }
    });

    it("extracts procedures (entrypoints)", async () => {
      const vbaBytes = await loadVbaProject(XLSM_FIXTURE, "xl/vbaProject.bin");
      const result = parseVbaProject(vbaBytes);

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Find Module1 which should have TestMacro
        const module1 = result.program.modules.find((m) => m.name === "Module1");
        expect(module1).toBeDefined();
        expect(module1!.procedures.length).toBeGreaterThan(0);

        const testMacro = module1!.procedures.find((p) => p.name === "TestMacro");
        expect(testMacro).toBeDefined();
        expect(testMacro!.type).toBe("sub");
        expect(testMacro!.visibility).toBe("public");
      }
    });

    it("extracts references", async () => {
      const vbaBytes = await loadVbaProject(XLSM_FIXTURE, "xl/vbaProject.bin");
      const result = parseVbaProject(vbaBytes);

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Should have stdole and Office references
        expect(result.program.references.length).toBeGreaterThanOrEqual(2);

        const stdole = result.program.references.find((r) => r.name === "stdole");
        expect(stdole).toBeDefined();
        expect(stdole!.type).toBe("registered");

        const office = result.program.references.find((r) => r.name === "Office");
        expect(office).toBeDefined();
        expect(office!.type).toBe("registered");
      }
    });
  });

  describe("DOCM - SimpleMacro.docm", () => {
    it("parses vbaProject.bin successfully", async () => {
      const vbaBytes = await loadVbaProject(DOCM_FIXTURE, "word/vbaProject.bin");
      const result = parseVbaProject(vbaBytes);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.program.modules.length).toBeGreaterThan(0);
      }
    });

    it("extracts procedures (entrypoints)", async () => {
      const vbaBytes = await loadVbaProject(DOCM_FIXTURE, "word/vbaProject.bin");
      const result = parseVbaProject(vbaBytes);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const module1 = result.program.modules.find((m) => m.name === "Module1");
        expect(module1).toBeDefined();
        expect(module1!.procedures.length).toBeGreaterThan(0);
      }
    });
  });

  describe("PPTM - SimpleMacro.pptm", () => {
    it("parses vbaProject.bin successfully", async () => {
      const vbaBytes = await loadVbaProject(PPTM_FIXTURE, "ppt/vbaProject.bin");
      const result = parseVbaProject(vbaBytes);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.program.modules.length).toBeGreaterThan(0);
      }
    });

    it("extracts procedures (entrypoints)", async () => {
      const vbaBytes = await loadVbaProject(PPTM_FIXTURE, "ppt/vbaProject.bin");
      const result = parseVbaProject(vbaBytes);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const module1 = result.program.modules.find((m) => m.name === "Module1");
        expect(module1).toBeDefined();
        expect(module1!.procedures.length).toBeGreaterThan(0);
      }
    });
  });
});
