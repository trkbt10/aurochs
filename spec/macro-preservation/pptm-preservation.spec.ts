/**
 * @file PPTM macro preservation tests
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
  hashVbaProject,
  listPartsWithPrefix,
  PPTM_CONFIG,
} from "./utils";
import {
  MACRO_ENABLED_CONTENT_TYPES,
  VBA_PROJECT_RELATIONSHIP_TYPE,
  detectMacroFormat,
} from "@aurochs-office/opc";

const FIXTURE_DIR = "fixtures/poi-test-data/test-data/slideshow";

describe("pptm macro preservation", () => {
  describe("SimpleMacro.pptm - basic VBA macro file", () => {
    const fixturePath = join(FIXTURE_DIR, "SimpleMacro.pptm");

    it("detects pptm macro format from content types", async () => {
      const pkg = await loadFixture(fixturePath);
      const contentTypes = extractContentTypes(pkg);
      expect(detectMacroFormat(contentTypes)).toBe("pptm");
    });

    it("has main content type as macroEnabled", async () => {
      const pkg = await loadFixture(fixturePath);
      const contentTypes = extractContentTypes(pkg);
      expect(contentTypes.overrides.get("/ppt/presentation.xml")).toBe(
        MACRO_ENABLED_CONTENT_TYPES.pptm
      );
    });

    it("has vbaProject.bin", async () => {
      const pkg = await loadFixture(fixturePath);
      expect(pkg.exists("ppt/vbaProject.bin")).toBe(true);
    });

    it("has vbaProject.bin with non-empty hash", async () => {
      const pkg = await loadFixture(fixturePath);
      const hash = hashVbaProject(pkg, PPTM_CONFIG.vbaProjectPath);
      expect(hash).not.toBeNull();
      expect(hash).toHaveLength(64); // SHA256 hex
    });

    it("has vbaProject relationship", async () => {
      const pkg = await loadFixture(fixturePath);
      const rels = extractRelationships(pkg, PPTM_CONFIG.mainRelsPath);
      const vbaRel = findRelationshipByType(rels, VBA_PROJECT_RELATIONSHIP_TYPE);
      expect(vbaRel).toBeDefined();
      expect(vbaRel?.target).toBe("vbaProject.bin");
    });

    it("has vbaProject content type (override or default)", async () => {
      const pkg = await loadFixture(fixturePath);
      const contentTypes = extractContentTypes(pkg);
      const overrideType = contentTypes.overrides.get("/ppt/vbaProject.bin");
      const defaultType = contentTypes.defaults.get("bin");
      const hasVbaType =
        overrideType === "application/vnd.ms-office.vbaProject" ||
        defaultType === "application/vnd.ms-office.vbaProject";
      expect(hasVbaType).toBe(true);
    });
  });

  describe("PPTWithAttachments.pptm - macro + embeddings", () => {
    const fixturePath = join(FIXTURE_DIR, "PPTWithAttachments.pptm");

    it("detects pptm macro format", async () => {
      const pkg = await loadFixture(fixturePath);
      const contentTypes = extractContentTypes(pkg);
      expect(detectMacroFormat(contentTypes)).toBe("pptm");
    });

    it("has vbaProject.bin", async () => {
      const pkg = await loadFixture(fixturePath);
      expect(pkg.exists("ppt/vbaProject.bin")).toBe(true);
    });

    it("has embeddings", async () => {
      const pkg = await loadFixture(fixturePath);
      const embeddings = listPartsWithPrefix(pkg, "ppt/embeddings/");
      expect(embeddings.length).toBeGreaterThan(0);
    });
  });

  describe("testPPT.pptm - macroEnabled (may not have VBA)", () => {
    const fixturePath = join(FIXTURE_DIR, "testPPT.pptm");

    it("detects pptm macro format", async () => {
      const pkg = await loadFixture(fixturePath);
      const contentTypes = extractContentTypes(pkg);
      expect(detectMacroFormat(contentTypes)).toBe("pptm");
    });

    it("has macroEnabled main content type", async () => {
      const pkg = await loadFixture(fixturePath);
      const contentTypes = extractContentTypes(pkg);
      expect(contentTypes.overrides.get("/ppt/presentation.xml")).toBe(
        MACRO_ENABLED_CONTENT_TYPES.pptm
      );
    });
  });
});
