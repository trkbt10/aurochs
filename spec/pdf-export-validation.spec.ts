/**
 * @file PDF Export Validation Tests
 *
 * Tests to validate that PDF-imported presentations can be exported
 * as valid PPTX files that can be opened by PowerPoint.
 *
 * These tests focus on:
 * - ZIP file structure validity
 * - PPTX required files presence
 * - XML document validity
 * - Media embedding correctness
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { importPdf } from "@oxen-office/pdf-to-pptx/importer/pdf-importer";
import { exportPptx } from "@oxen-office/pptx/exporter";
import { loadPptxFromBuffer } from "@oxen-office/pptx/app/pptx-loader";
import { px } from "@oxen-office/ooxml/domain/units";
import { parseXml } from "@oxen/xml";
import { loadZipPackage } from "@oxen/zip";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, "fixtures", "pdf");
const SAMPLES_DIR = path.join(__dirname, "..", "fixtures", "samples");
const OUTPUT_DIR = path.join(__dirname, "..", "tmp");

const SLIDE_WIDTH = px(960);
const SLIDE_HEIGHT = px(540);

/**
 * OPC (Open Packaging Conventions) required files.
 * These are mandatory for ANY OPC package (ECMA-376 Part 2).
 */
const OPC_REQUIRED_FILES = [
  "_rels/.rels",           // Root relationships - CRITICAL
  "[Content_Types].xml",   // Content types
] as const;

/**
 * PPTX-specific required files.
 * These are mandatory for a valid PowerPoint presentation.
 */
const PPTX_REQUIRED_FILES = [
  "ppt/presentation.xml",
  "ppt/_rels/presentation.xml.rels",
  "ppt/slideMasters/slideMaster1.xml",
  "ppt/slideMasters/_rels/slideMaster1.xml.rels",
  "ppt/slideLayouts/slideLayout1.xml",
  "ppt/slideLayouts/_rels/slideLayout1.xml.rels",
  "ppt/theme/theme1.xml",
] as const;

/**
 * All required files for a valid PPTX (OPC + PPTX specific)
 */
const ALL_REQUIRED_FILES = [...OPC_REQUIRED_FILES, ...PPTX_REQUIRED_FILES] as const;

/**
 * Get required files for a PPTX with N slides
 */
function getRequiredFilesForSlideCount(slideCount: number): readonly string[] {
  const slideFiles: string[] = [];
  for (let i = 1; i <= slideCount; i++) {
    slideFiles.push(`ppt/slides/slide${i}.xml`);
    slideFiles.push(`ppt/slides/_rels/slide${i}.xml.rels`);
  }
  return [...ALL_REQUIRED_FILES, ...slideFiles];
}

function readFixtureOrSkip(filePath: string): Uint8Array | null {
  if (!fs.existsSync(filePath)) {
    console.warn(`SKIPPED: Fixture not found: ${filePath}`);
    return null;
  }
  return fs.readFileSync(filePath);
}

/**
 * Save exported PPTX to output directory for manual inspection
 */
function saveForInspection(buffer: ArrayBuffer, filename: string): string {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  const outputPath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(outputPath, Buffer.from(buffer));
  console.log(`Saved for inspection: ${outputPath}`);
  return outputPath;
}

describe("PDF Export Validation", () => {
  /**
   * CRITICAL: OPC/PPTX Required Files Validation
   *
   * These tests ensure all mandatory files per ECMA-376 are present.
   * Failure here means the PPTX will NOT open in PowerPoint.
   */
  describe("OPC/PPTX Required Files (CRITICAL)", () => {
    it("includes all OPC required files", async () => {
      const pdfPath = path.join(FIXTURES_DIR, "simple-rect.pdf");
      const pdfBuffer = readFixtureOrSkip(pdfPath);
      if (!pdfBuffer) {return;}

      const { document } = await importPdf(pdfBuffer, {
        slideSize: { width: SLIDE_WIDTH, height: SLIDE_HEIGHT },
      });

      const { blob } = await exportPptx(document);
      const arrayBuffer = await blob.arrayBuffer();
      const pkg = await loadZipPackage(arrayBuffer);
      const files = pkg.listFiles();

      // Check each OPC required file individually for clear error messages
      for (const requiredFile of OPC_REQUIRED_FILES) {
        expect(files, `Missing OPC required file: ${requiredFile}`).toContain(requiredFile);
      }
    });

    it("includes all PPTX required files", async () => {
      const pdfPath = path.join(FIXTURES_DIR, "simple-rect.pdf");
      const pdfBuffer = readFixtureOrSkip(pdfPath);
      if (!pdfBuffer) {return;}

      const { document } = await importPdf(pdfBuffer, {
        slideSize: { width: SLIDE_WIDTH, height: SLIDE_HEIGHT },
      });

      const { blob } = await exportPptx(document);
      const arrayBuffer = await blob.arrayBuffer();
      const pkg = await loadZipPackage(arrayBuffer);
      const files = pkg.listFiles();

      // Check each PPTX required file individually
      for (const requiredFile of PPTX_REQUIRED_FILES) {
        expect(files, `Missing PPTX required file: ${requiredFile}`).toContain(requiredFile);
      }
    });

    it("includes slide files and their relationships", async () => {
      const pdfPath = path.join(FIXTURES_DIR, "simple-rect.pdf");
      const pdfBuffer = readFixtureOrSkip(pdfPath);
      if (!pdfBuffer) {return;}

      const { document, pageCount } = await importPdf(pdfBuffer, {
        slideSize: { width: SLIDE_WIDTH, height: SLIDE_HEIGHT },
      });

      const { blob } = await exportPptx(document);
      const arrayBuffer = await blob.arrayBuffer();
      const pkg = await loadZipPackage(arrayBuffer);
      const files = pkg.listFiles();

      // Check slide files
      for (let i = 1; i <= pageCount; i++) {
        expect(files, `Missing slide${i}.xml`).toContain(`ppt/slides/slide${i}.xml`);
        expect(files, `Missing slide${i}.xml.rels`).toContain(`ppt/slides/_rels/slide${i}.xml.rels`);
      }
    });

    it("_rels/.rels contains required relationships", async () => {
      const pdfPath = path.join(FIXTURES_DIR, "simple-rect.pdf");
      const pdfBuffer = readFixtureOrSkip(pdfPath);
      if (!pdfBuffer) {return;}

      const { document } = await importPdf(pdfBuffer, {
        slideSize: { width: SLIDE_WIDTH, height: SLIDE_HEIGHT },
      });

      const { blob } = await exportPptx(document);
      const arrayBuffer = await blob.arrayBuffer();
      const pkg = await loadZipPackage(arrayBuffer);

      const rootRels = pkg.readText("_rels/.rels");
      expect(rootRels, "_rels/.rels must exist").not.toBeNull();

      // Must reference the main presentation document
      expect(rootRels).toContain("officeDocument");
      expect(rootRels).toContain("ppt/presentation.xml");
    });

    it("multi-page PDF includes all required files", async () => {
      const pdfPath = path.join(SAMPLES_DIR, "modeling.pdf");
      const pdfBuffer = readFixtureOrSkip(pdfPath);
      if (!pdfBuffer) {return;}

      const { document, pageCount } = await importPdf(pdfBuffer, {
        slideSize: { width: SLIDE_WIDTH, height: SLIDE_HEIGHT },
      });

      const { blob } = await exportPptx(document);
      const arrayBuffer = await blob.arrayBuffer();
      const pkg = await loadZipPackage(arrayBuffer);
      const files = pkg.listFiles();

      // Check ALL required files for this slide count
      const allRequired = getRequiredFilesForSlideCount(pageCount);
      for (const requiredFile of allRequired) {
        expect(files, `Missing required file: ${requiredFile}`).toContain(requiredFile);
      }
    });
  });

  describe("ZIP Structure", () => {
    it("exports a valid ZIP file", async () => {
      const pdfPath = path.join(FIXTURES_DIR, "simple-rect.pdf");
      const pdfBuffer = readFixtureOrSkip(pdfPath);
      if (!pdfBuffer) {return;}

      const { document } = await importPdf(pdfBuffer, {
        slideSize: { width: SLIDE_WIDTH, height: SLIDE_HEIGHT },
      });

      const { blob } = await exportPptx(document);
      const arrayBuffer = await blob.arrayBuffer();

      // Save for manual inspection
      saveForInspection(arrayBuffer, "simple-rect-export.pptx");

      // Verify it's a valid ZIP
      const pkg = await loadZipPackage(arrayBuffer);
      expect(pkg).toBeDefined();

      // List all files in the ZIP
      const files = pkg.listFiles().slice().sort();
      console.log("Files in exported PPTX:", files);

      // Verify required files exist (detailed checks in CRITICAL section above)
      for (const requiredFile of ALL_REQUIRED_FILES) {
        expect(files).toContain(requiredFile);
      }
    });

    it("exports slides correctly", async () => {
      const pdfPath = path.join(FIXTURES_DIR, "simple-rect.pdf");
      const pdfBuffer = readFixtureOrSkip(pdfPath);
      if (!pdfBuffer) {return;}

      const { document, pageCount } = await importPdf(pdfBuffer, {
        slideSize: { width: SLIDE_WIDTH, height: SLIDE_HEIGHT },
      });

      const { blob } = await exportPptx(document);
      const arrayBuffer = await blob.arrayBuffer();
      const pkg = await loadZipPackage(arrayBuffer);

      // Verify slide files exist
      for (let i = 1; i <= pageCount; i++) {
        const slideFile = `ppt/slides/slide${i}.xml`;
        const slideRelsFile = `ppt/slides/_rels/slide${i}.xml.rels`;
        expect(pkg.exists(slideFile)).toBe(true);
        expect(pkg.exists(slideRelsFile)).toBe(true);
      }
    });
  });

  describe("XML Validity", () => {
    it("exports valid Content_Types.xml", async () => {
      const pdfPath = path.join(FIXTURES_DIR, "simple-rect.pdf");
      const pdfBuffer = readFixtureOrSkip(pdfPath);
      if (!pdfBuffer) {return;}

      const { document } = await importPdf(pdfBuffer, {
        slideSize: { width: SLIDE_WIDTH, height: SLIDE_HEIGHT },
      });

      const { blob } = await exportPptx(document);
      const arrayBuffer = await blob.arrayBuffer();
      const pkg = await loadZipPackage(arrayBuffer);

      const contentTypesText = pkg.readText("[Content_Types].xml");
      expect(contentTypesText).not.toBeNull();
      console.log("Content_Types.xml:", contentTypesText);

      // Verify it's valid XML
      const contentTypesXml = parseXml(contentTypesText!);
      expect(contentTypesXml).toBeDefined();
    });

    it("exports valid presentation.xml", async () => {
      const pdfPath = path.join(FIXTURES_DIR, "simple-rect.pdf");
      const pdfBuffer = readFixtureOrSkip(pdfPath);
      if (!pdfBuffer) {return;}

      const { document } = await importPdf(pdfBuffer, {
        slideSize: { width: SLIDE_WIDTH, height: SLIDE_HEIGHT },
      });

      const { blob } = await exportPptx(document);
      const arrayBuffer = await blob.arrayBuffer();
      const pkg = await loadZipPackage(arrayBuffer);

      const presentationText = pkg.readText("ppt/presentation.xml");
      expect(presentationText).not.toBeNull();
      console.log("presentation.xml:", presentationText);

      // Verify it's valid XML
      const presentationXml = parseXml(presentationText!);
      expect(presentationXml).toBeDefined();
    });

    it("exports valid slide XML with shapes", async () => {
      const pdfPath = path.join(FIXTURES_DIR, "simple-rect.pdf");
      const pdfBuffer = readFixtureOrSkip(pdfPath);
      if (!pdfBuffer) {return;}

      const { document } = await importPdf(pdfBuffer, {
        slideSize: { width: SLIDE_WIDTH, height: SLIDE_HEIGHT },
      });

      const { blob } = await exportPptx(document);
      const arrayBuffer = await blob.arrayBuffer();
      const pkg = await loadZipPackage(arrayBuffer);

      const slideText = pkg.readText("ppt/slides/slide1.xml");
      expect(slideText).not.toBeNull();
      console.log("slide1.xml (first 2000 chars):", slideText!.substring(0, 2000));

      // Verify it's valid XML
      const slideXml = parseXml(slideText!);
      expect(slideXml).toBeDefined();

      // Verify slide contains shapes (should have sp elements for PDF shapes)
      expect(slideText).toContain("<p:sp");
    });
  });

  describe("Relationships", () => {
    it("exports valid presentation relationships", async () => {
      const pdfPath = path.join(FIXTURES_DIR, "simple-rect.pdf");
      const pdfBuffer = readFixtureOrSkip(pdfPath);
      if (!pdfBuffer) {return;}

      const { document } = await importPdf(pdfBuffer, {
        slideSize: { width: SLIDE_WIDTH, height: SLIDE_HEIGHT },
      });

      const { blob } = await exportPptx(document);
      const arrayBuffer = await blob.arrayBuffer();
      const pkg = await loadZipPackage(arrayBuffer);

      const relsText = pkg.readText("ppt/_rels/presentation.xml.rels");
      expect(relsText).not.toBeNull();
      console.log("presentation.xml.rels:", relsText);

      // Verify it's valid XML
      const relsXml = parseXml(relsText!);
      expect(relsXml).toBeDefined();

      // Should have relationship to slide master
      expect(relsText).toContain("slideMaster");
    });

    it("exports valid slide relationships", async () => {
      const pdfPath = path.join(FIXTURES_DIR, "simple-rect.pdf");
      const pdfBuffer = readFixtureOrSkip(pdfPath);
      if (!pdfBuffer) {return;}

      const { document } = await importPdf(pdfBuffer, {
        slideSize: { width: SLIDE_WIDTH, height: SLIDE_HEIGHT },
      });

      const { blob } = await exportPptx(document);
      const arrayBuffer = await blob.arrayBuffer();
      const pkg = await loadZipPackage(arrayBuffer);

      const slideRelsText = pkg.readText("ppt/slides/_rels/slide1.xml.rels");
      expect(slideRelsText).not.toBeNull();
      console.log("slide1.xml.rels:", slideRelsText);

      // Verify it's valid XML
      const slideRelsXml = parseXml(slideRelsText!);
      expect(slideRelsXml).toBeDefined();

      // Should have relationship to slide layout
      expect(slideRelsText).toContain("slideLayout");
    });
  });

  describe("Complex PDF with images", () => {
    it("exports PDF with images correctly", async () => {
      const pdfPath = path.join(SAMPLES_DIR, "modeling.pdf");
      const pdfBuffer = readFixtureOrSkip(pdfPath);
      if (!pdfBuffer) {return;}

      const { document } = await importPdf(pdfBuffer, {
        slideSize: { width: SLIDE_WIDTH, height: SLIDE_HEIGHT },
      });

      const { blob } = await exportPptx(document);
      const arrayBuffer = await blob.arrayBuffer();

      // Save for manual inspection
      saveForInspection(arrayBuffer, "modeling-export.pptx");

      // Verify it's a valid ZIP
      const pkg = await loadZipPackage(arrayBuffer);
      expect(pkg).toBeDefined();

      const files = pkg.listFiles().slice().sort();
      console.log("Files in complex PDF export:", files);

      // Check if there are media files (images from PDF)
      const mediaFiles = files.filter((f) => f.startsWith("ppt/media/"));
      console.log("Media files:", mediaFiles);

      // Verify slide XML
      const slideText = pkg.readText("ppt/slides/slide1.xml");
      expect(slideText).not.toBeNull();

      // Check for picture shapes if media exists
      if (mediaFiles.length > 0) {
        // If we have media, we should have pic elements in slide
        const slideRelsText = pkg.readText("ppt/slides/_rels/slide1.xml.rels");
        console.log("slide1.xml.rels with media:", slideRelsText);
      }
    });
  });

  describe("Multi-page PDF", () => {
    it("exports multi-page PDF correctly", async () => {
      const pdfPath = path.join(FIXTURES_DIR, "multi-page.pdf");
      const pdfBuffer = readFixtureOrSkip(pdfPath);
      if (!pdfBuffer) {return;}

      const { document, pageCount } = await importPdf(pdfBuffer, {
        slideSize: { width: SLIDE_WIDTH, height: SLIDE_HEIGHT },
      });

      expect(pageCount).toBeGreaterThan(1);

      const { blob } = await exportPptx(document);
      const arrayBuffer = await blob.arrayBuffer();

      // Save for manual inspection
      saveForInspection(arrayBuffer, "multi-page-export.pptx");

      const pkg = await loadZipPackage(arrayBuffer);

      // Verify all slides exist
      for (let i = 1; i <= pageCount; i++) {
        const slideFile = `ppt/slides/slide${i}.xml`;
        expect(pkg.exists(slideFile)).toBe(true);

        const slideText = pkg.readText(slideFile);
        expect(slideText).not.toBeNull();

        // Verify each slide is valid XML
        const slideXml = parseXml(slideText!);
        expect(slideXml).toBeDefined();
      }

      // Verify presentation.xml.rels references all slides
      const relsText = pkg.readText("ppt/_rels/presentation.xml.rels");
      expect(relsText).not.toBeNull();

      for (let i = 1; i <= pageCount; i++) {
        expect(relsText).toContain(`slides/slide${i}.xml`);
      }
    });
  });

  describe("Reload Validation (Critical)", () => {
    it("exported PPTX can be reloaded with loadPptxFromBuffer", async () => {
      const pdfPath = path.join(FIXTURES_DIR, "simple-rect.pdf");
      const pdfBuffer = readFixtureOrSkip(pdfPath);
      if (!pdfBuffer) {return;}

      // Import PDF
      const { document } = await importPdf(pdfBuffer, {
        slideSize: { width: SLIDE_WIDTH, height: SLIDE_HEIGHT },
      });

      // Export to PPTX
      const { blob } = await exportPptx(document);
      const arrayBuffer = await blob.arrayBuffer();

      // Critical: Can we reload it?
      const { presentation } = await loadPptxFromBuffer(arrayBuffer);
      expect(presentation).toBeDefined();
      expect(presentation.count).toBe(1);
    });

    it("complex PDF export can be reloaded", async () => {
      const pdfPath = path.join(SAMPLES_DIR, "modeling.pdf");
      const pdfBuffer = readFixtureOrSkip(pdfPath);
      if (!pdfBuffer) {return;}

      const { document, pageCount } = await importPdf(pdfBuffer, {
        slideSize: { width: SLIDE_WIDTH, height: SLIDE_HEIGHT },
      });

      const { blob } = await exportPptx(document);
      const arrayBuffer = await blob.arrayBuffer();

      // Critical: Can we reload it?
      const { presentation } = await loadPptxFromBuffer(arrayBuffer);
      expect(presentation).toBeDefined();
      expect(presentation.count).toBe(pageCount);
    });
  });
});
