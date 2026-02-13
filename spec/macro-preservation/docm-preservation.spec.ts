/**
 * @file DOCM macro preservation tests
 *
 * @see docs/plans/macro-runtime/04-test-cases.md
 */

import { join } from "node:path";
import {
  loadFixture,
  extractContentTypes,
  extractRelationships,
  findRelationshipByType,
  hashVbaProject,
  DOCM_CONFIG,
} from "./utils";
import {
  MACRO_ENABLED_CONTENT_TYPES,
  VBA_PROJECT_RELATIONSHIP_TYPE,
  detectMacroFormat,
} from "@aurochs-office/opc";

const FIXTURE_DIR = "spec/macro-preservation/fixtures/document";

describe("docm macro preservation", () => {
  describe("SimpleMacro.docm - basic VBA macro file", () => {
    const fixturePath = join(FIXTURE_DIR, "SimpleMacro.docm");

    it("detects docm macro format from content types", async () => {
      const pkg = await loadFixture(fixturePath);
      const contentTypes = extractContentTypes(pkg);
      expect(detectMacroFormat(contentTypes)).toBe("docm");
    });

    it("has main content type as macroEnabled", async () => {
      const pkg = await loadFixture(fixturePath);
      const contentTypes = extractContentTypes(pkg);
      expect(contentTypes.overrides.get("/word/document.xml")).toBe(
        MACRO_ENABLED_CONTENT_TYPES.docm
      );
    });

    it("has vbaProject.bin", async () => {
      const pkg = await loadFixture(fixturePath);
      expect(pkg.exists("word/vbaProject.bin")).toBe(true);
    });

    it("has vbaProject.bin with non-empty hash", async () => {
      const pkg = await loadFixture(fixturePath);
      const hash = hashVbaProject(pkg, DOCM_CONFIG.vbaProjectPath);
      expect(hash).not.toBeNull();
      expect(hash).toHaveLength(64); // SHA256 hex
    });

    it("has vbaProject relationship", async () => {
      const pkg = await loadFixture(fixturePath);
      const rels = extractRelationships(pkg, DOCM_CONFIG.mainRelsPath);
      const vbaRel = findRelationshipByType(rels, VBA_PROJECT_RELATIONSHIP_TYPE);
      expect(vbaRel).toBeDefined();
      expect(vbaRel?.target).toBe("vbaProject.bin");
    });

    it("has vbaProject content type (override or default)", async () => {
      const pkg = await loadFixture(fixturePath);
      const contentTypes = extractContentTypes(pkg);
      const overrideType = contentTypes.overrides.get("/word/vbaProject.bin");
      const defaultType = contentTypes.defaults.get("bin");
      const hasVbaType =
        overrideType === "application/vnd.ms-office.vbaProject" ||
        defaultType === "application/vnd.ms-office.vbaProject";
      expect(hasVbaType).toBe(true);
    });
  });

  describe("45690.docm - additional docm file", () => {
    const fixturePath = join(FIXTURE_DIR, "45690.docm");

    it("detects docm macro format", async () => {
      const pkg = await loadFixture(fixturePath);
      const contentTypes = extractContentTypes(pkg);
      expect(detectMacroFormat(contentTypes)).toBe("docm");
    });

    it("has macroEnabled main content type", async () => {
      const pkg = await loadFixture(fixturePath);
      const contentTypes = extractContentTypes(pkg);
      expect(contentTypes.overrides.get("/word/document.xml")).toBe(
        MACRO_ENABLED_CONTENT_TYPES.docm
      );
    });
  });

  describe("60158.docm - additional docm file", () => {
    const fixturePath = join(FIXTURE_DIR, "60158.docm");

    it("detects docm macro format", async () => {
      const pkg = await loadFixture(fixturePath);
      const contentTypes = extractContentTypes(pkg);
      expect(detectMacroFormat(contentTypes)).toBe("docm");
    });
  });

  // Note: cpansearch...docm is excluded per 04-test-cases.md (CFB, not OOXML)
});
