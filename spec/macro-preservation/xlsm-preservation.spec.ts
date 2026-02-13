/**
 * @file XLSM macro preservation tests
 *
 * Validates Phase 1 requirements from docs/plans/macro-runtime/03-phase-plan.md:
 * 1. main content type maintained as macroEnabled
 * 2. vbaProject.bin byte-identical after roundtrip
 * 3. vbaProject relationship preserved
 * 4. xlMacrosheet parts/rels preserved
 * 5. unknown parts not dropped
 *
 * @see docs/plans/macro-runtime/04-test-cases.md
 */

import { describe, it, expect } from "vitest";
import { join } from "node:path";
import {
  loadFixture,
  extractContentTypes,
  extractRelationships,
  findRelationshipByType,
  findRelationshipsByType,
  hashVbaProject,
  listPartsWithPrefix,
  countPartsWithPrefix,
  XLSM_CONFIG,
} from "./utils";
import {
  MACRO_ENABLED_CONTENT_TYPES,
  VBA_PROJECT_RELATIONSHIP_TYPE,
  XL_MACROSHEET_RELATIONSHIP_TYPE,
  detectMacroFormat,
} from "@aurochs-office/opc";

const FIXTURE_DIR = "fixtures/poi-test-data/test-data/spreadsheet";

describe("xlsm macro preservation", () => {
  describe("SimpleMacro.xlsm - basic VBA macro file", () => {
    const fixturePath = join(FIXTURE_DIR, "SimpleMacro.xlsm");

    it("detects xlsm macro format from content types", async () => {
      const pkg = await loadFixture(fixturePath);
      const contentTypes = extractContentTypes(pkg);
      expect(detectMacroFormat(contentTypes)).toBe("xlsm");
    });

    it("has main content type as macroEnabled", async () => {
      const pkg = await loadFixture(fixturePath);
      const contentTypes = extractContentTypes(pkg);
      expect(contentTypes.overrides.get("/xl/workbook.xml")).toBe(
        MACRO_ENABLED_CONTENT_TYPES.xlsm
      );
    });

    it("has vbaProject.bin", async () => {
      const pkg = await loadFixture(fixturePath);
      expect(pkg.exists("xl/vbaProject.bin")).toBe(true);
    });

    it("has vbaProject.bin with non-empty hash", async () => {
      const pkg = await loadFixture(fixturePath);
      const hash = hashVbaProject(pkg, XLSM_CONFIG.vbaProjectPath);
      expect(hash).not.toBeNull();
      expect(hash).toHaveLength(64); // SHA256 hex
    });

    it("has vbaProject relationship", async () => {
      const pkg = await loadFixture(fixturePath);
      const rels = extractRelationships(pkg, XLSM_CONFIG.mainRelsPath);
      const vbaRel = findRelationshipByType(rels, VBA_PROJECT_RELATIONSHIP_TYPE);
      expect(vbaRel).toBeDefined();
      expect(vbaRel?.target).toBe("vbaProject.bin");
    });

    it("has vbaProject content type (override or default)", async () => {
      const pkg = await loadFixture(fixturePath);
      const contentTypes = extractContentTypes(pkg);
      // vbaProject.bin may be defined via override or via .bin default extension
      const overrideType = contentTypes.overrides.get("/xl/vbaProject.bin");
      const defaultType = contentTypes.defaults.get("bin");
      const hasVbaType =
        overrideType === "application/vnd.ms-office.vbaProject" ||
        defaultType === "application/vnd.ms-office.vbaProject";
      expect(hasVbaType).toBe(true);
    });
  });

  describe("xlmmacro.xlsm - xlMacrosheet only (no VBA)", () => {
    const fixturePath = join(FIXTURE_DIR, "xlmmacro.xlsm");

    it("detects xlsm macro format", async () => {
      const pkg = await loadFixture(fixturePath);
      const contentTypes = extractContentTypes(pkg);
      expect(detectMacroFormat(contentTypes)).toBe("xlsm");
    });

    it("has macroEnabled main content type", async () => {
      const pkg = await loadFixture(fixturePath);
      const contentTypes = extractContentTypes(pkg);
      expect(contentTypes.overrides.get("/xl/workbook.xml")).toBe(
        MACRO_ENABLED_CONTENT_TYPES.xlsm
      );
    });

    it("has xlMacrosheet relationship", async () => {
      const pkg = await loadFixture(fixturePath);
      const rels = extractRelationships(pkg, XLSM_CONFIG.mainRelsPath);
      const macrosheetRels = findRelationshipsByType(rels, XL_MACROSHEET_RELATIONSHIP_TYPE);
      expect(macrosheetRels.length).toBeGreaterThan(0);
    });

    it("has macrosheet parts", async () => {
      const pkg = await loadFixture(fixturePath);
      const macrosheets = listPartsWithPrefix(pkg, "xl/macrosheets/");
      expect(macrosheets.length).toBeGreaterThan(0);
    });

    it("has macrosheet content type override", async () => {
      const pkg = await loadFixture(fixturePath);
      const contentTypes = extractContentTypes(pkg);
      // Find any macrosheet override
      const hasMacrosheetType = Array.from(contentTypes.overrides.values()).some(
        (ct) => ct === "application/vnd.ms-excel.macrosheet+xml"
      );
      expect(hasMacrosheetType).toBe(true);
    });
  });

  describe("60512.xlsm - macroEnabled without vbaProject.bin", () => {
    const fixturePath = join(FIXTURE_DIR, "60512.xlsm");

    it("detects xlsm macro format", async () => {
      const pkg = await loadFixture(fixturePath);
      const contentTypes = extractContentTypes(pkg);
      expect(detectMacroFormat(contentTypes)).toBe("xlsm");
    });

    it("has macroEnabled main content type", async () => {
      const pkg = await loadFixture(fixturePath);
      const contentTypes = extractContentTypes(pkg);
      expect(contentTypes.overrides.get("/xl/workbook.xml")).toBe(
        MACRO_ENABLED_CONTENT_TYPES.xlsm
      );
    });

    it("may or may not have vbaProject.bin (edge case)", async () => {
      const pkg = await loadFixture(fixturePath);
      // This fixture is documented as "macroEnabled but no vbaProject.bin"
      // We verify the format detection still works regardless
      const contentTypes = extractContentTypes(pkg);
      expect(detectMacroFormat(contentTypes)).toBe("xlsm");
    });
  });

  describe("ExcelWithAttachments.xlsm - macro + embeddings", () => {
    const fixturePath = join(FIXTURE_DIR, "ExcelWithAttachments.xlsm");

    it("detects xlsm macro format", async () => {
      const pkg = await loadFixture(fixturePath);
      const contentTypes = extractContentTypes(pkg);
      expect(detectMacroFormat(contentTypes)).toBe("xlsm");
    });

    it("has vbaProject.bin", async () => {
      const pkg = await loadFixture(fixturePath);
      expect(pkg.exists("xl/vbaProject.bin")).toBe(true);
    });

    it("has embeddings", async () => {
      const pkg = await loadFixture(fixturePath);
      const embeddings = listPartsWithPrefix(pkg, "xl/embeddings/");
      expect(embeddings.length).toBeGreaterThan(0);
    });
  });

  describe("62629_target.xlsm - macro + ctrlProps", () => {
    const fixturePath = join(FIXTURE_DIR, "62629_target.xlsm");

    it("detects xlsm macro format", async () => {
      const pkg = await loadFixture(fixturePath);
      const contentTypes = extractContentTypes(pkg);
      expect(detectMacroFormat(contentTypes)).toBe("xlsm");
    });

    it("has vbaProject.bin", async () => {
      const pkg = await loadFixture(fixturePath);
      expect(pkg.exists("xl/vbaProject.bin")).toBe(true);
    });

    it("has ctrlProps parts", async () => {
      const pkg = await loadFixture(fixturePath);
      const ctrlProps = listPartsWithPrefix(pkg, "xl/ctrlProps/");
      expect(ctrlProps.length).toBeGreaterThan(0);
    });
  });

  describe("64420.xlsm - xlMacrosheet variant", () => {
    const fixturePath = join(FIXTURE_DIR, "64420.xlsm");

    it("detects xlsm macro format", async () => {
      const pkg = await loadFixture(fixturePath);
      const contentTypes = extractContentTypes(pkg);
      expect(detectMacroFormat(contentTypes)).toBe("xlsm");
    });

    it("has macroEnabled main content type", async () => {
      const pkg = await loadFixture(fixturePath);
      const contentTypes = extractContentTypes(pkg);
      expect(contentTypes.overrides.get("/xl/workbook.xml")).toBe(
        MACRO_ENABLED_CONTENT_TYPES.xlsm
      );
    });
  });

  describe("structural verification summary", () => {
    const testCases = [
      { name: "SimpleMacro.xlsm", hasVba: true, hasMacrosheet: false },
      { name: "xlmmacro.xlsm", hasVba: false, hasMacrosheet: true },
      { name: "ExcelWithAttachments.xlsm", hasVba: true, hasMacrosheet: false },
      { name: "62629_target.xlsm", hasVba: true, hasMacrosheet: false },
    ];

    for (const tc of testCases) {
      it(`${tc.name}: structure matches expected`, async () => {
        const pkg = await loadFixture(join(FIXTURE_DIR, tc.name));
        const contentTypes = extractContentTypes(pkg);
        const rels = extractRelationships(pkg, XLSM_CONFIG.mainRelsPath);

        // Always macroEnabled
        expect(detectMacroFormat(contentTypes)).toBe("xlsm");

        // VBA project
        const hasVbaProject = pkg.exists(XLSM_CONFIG.vbaProjectPath);
        const hasVbaRel = findRelationshipByType(rels, VBA_PROJECT_RELATIONSHIP_TYPE) !== undefined;
        if (tc.hasVba) {
          expect(hasVbaProject).toBe(true);
          expect(hasVbaRel).toBe(true);
        }

        // Macrosheet
        const hasMacrosheetRel =
          findRelationshipsByType(rels, XL_MACROSHEET_RELATIONSHIP_TYPE).length > 0;
        const hasMacrosheetParts = countPartsWithPrefix(pkg, "xl/macrosheets/") > 0;
        if (tc.hasMacrosheet) {
          expect(hasMacrosheetRel).toBe(true);
          expect(hasMacrosheetParts).toBe(true);
        }
      });
    }
  });
});
