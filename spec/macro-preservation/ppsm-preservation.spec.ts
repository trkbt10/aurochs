/**
 * @file PPSM macro preservation tests
 *
 * PPSM is PowerPoint slideshow with macros (auto-play mode).
 * Uses same package structure as PPTM but different main content type.
 *
 * @see docs/plans/macro-runtime/04-test-cases.md
 */

import { join } from "node:path";
import {
  loadFixture,
  extractContentTypes,
} from "./utils";
import {
  MACRO_ENABLED_CONTENT_TYPES,
  detectMacroFormat,
} from "@aurochs-office/opc";

const FIXTURE_DIR = "spec/macro-preservation/fixtures/slideshow";

describe("ppsm macro preservation", () => {
  describe("testPPT.ppsm - macroEnabled slideshow", () => {
    const fixturePath = join(FIXTURE_DIR, "testPPT.ppsm");

    it("detects ppsm macro format from content types", async () => {
      const pkg = await loadFixture(fixturePath);
      const contentTypes = extractContentTypes(pkg);
      expect(detectMacroFormat(contentTypes)).toBe("ppsm");
    });

    it("has main content type as slideshow macroEnabled", async () => {
      const pkg = await loadFixture(fixturePath);
      const contentTypes = extractContentTypes(pkg);
      expect(contentTypes.overrides.get("/ppt/presentation.xml")).toBe(
        MACRO_ENABLED_CONTENT_TYPES.ppsm
      );
    });

    it("differs from pptm content type", async () => {
      const pkg = await loadFixture(fixturePath);
      const contentTypes = extractContentTypes(pkg);
      const mainType = contentTypes.overrides.get("/ppt/presentation.xml");
      expect(mainType).not.toBe(MACRO_ENABLED_CONTENT_TYPES.pptm);
      expect(mainType).toBe(MACRO_ENABLED_CONTENT_TYPES.ppsm);
    });

    it("may or may not have vbaProject.bin (edge case)", async () => {
      const pkg = await loadFixture(fixturePath);
      // This fixture is documented as "macroEnabled but may not have vbaProject.bin"
      // The format detection should work regardless
      const contentTypes = extractContentTypes(pkg);
      expect(detectMacroFormat(contentTypes)).toBe("ppsm");
    });
  });

  describe("pptm vs ppsm content type distinction", () => {
    it("pptm and ppsm have different content types for same main part path", async () => {
      const pptmPkg = await loadFixture(join(FIXTURE_DIR, "testPPT.pptm"));
      const ppsmPkg = await loadFixture(join(FIXTURE_DIR, "testPPT.ppsm"));

      const pptmTypes = extractContentTypes(pptmPkg);
      const ppsmTypes = extractContentTypes(ppsmPkg);

      const pptmMain = pptmTypes.overrides.get("/ppt/presentation.xml");
      const ppsmMain = ppsmTypes.overrides.get("/ppt/presentation.xml");

      expect(pptmMain).toBe(MACRO_ENABLED_CONTENT_TYPES.pptm);
      expect(ppsmMain).toBe(MACRO_ENABLED_CONTENT_TYPES.ppsm);
      expect(pptmMain).not.toBe(ppsmMain);
    });

    it("detectMacroFormat correctly distinguishes pptm from ppsm", async () => {
      const pptmPkg = await loadFixture(join(FIXTURE_DIR, "testPPT.pptm"));
      const ppsmPkg = await loadFixture(join(FIXTURE_DIR, "testPPT.ppsm"));

      expect(detectMacroFormat(extractContentTypes(pptmPkg))).toBe("pptm");
      expect(detectMacroFormat(extractContentTypes(ppsmPkg))).toBe("ppsm");
    });
  });
});
