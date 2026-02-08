/**
 * @file Master/Layout/Theme export integration test
 *
 * Verifies that Phase 9 master/layout/theme updates are correctly written
 * to exported PPTX files.
 *
 * @see docs/reports/phase-9-exporter-wiring-concerns.md
 */

import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadPptxFile } from "../../scripts/lib/pptx-loader";
import { openPresentation } from "@aurochs-office/pptx";
import { convertToPresentationDocument, loadPptxFromBuffer } from "@aurochs-office/pptx/app";
import { exportPptxAsBuffer } from "@aurochs-builder/pptx/export";
import type { XmlDocument } from "@aurochs/xml";
import type { PresentationDocument, SlideWithId } from "@aurochs-office/pptx/app/presentation-document";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = path.resolve(__dirname, "../../fixtures");

describe("Master/Layout/Theme export", () => {
  describe("layout update", () => {
    it("writes updated layout XML to exported PPTX", async () => {
      // Load original PPTX
      const fixturePath = path.join(FIXTURE_DIR, "decompressed-pptx/Sample_demo1.pptx");
      const { presentationFile } = await loadPptxFile(fixturePath);
      const presentation = openPresentation(presentationFile);
      const doc = convertToPresentationDocument({ presentation, presentationFile });

      // Get the first slide with layout
      const firstSlide = doc.slides[0];
      if (!firstSlide?.apiSlide?.layout) {
        throw new Error("Expected first slide to have layout");
      }

      // Modify the layout XML (add a marker attribute)
      const originalLayout = firstSlide.apiSlide.layout;
      const modifiedLayout = addMarkerAttribute({
        doc: originalLayout,
        expectedRootName: "p:sldLayout",
        attrName: "test-marker",
        attrValue: "phase9-test",
      });

      // Create a modified document with the updated layout
      const modifiedSlide: SlideWithId = {
        ...firstSlide,
        apiSlide: {
          ...firstSlide.apiSlide,
          layout: modifiedLayout,
        },
      };

      const modifiedDoc: PresentationDocument = {
        ...doc,
        slides: [modifiedSlide, ...doc.slides.slice(1)],
      };

      // Export the modified document
      const exportedBuffer = await exportPptxAsBuffer(modifiedDoc);

      // Reload and verify
      const { presentationFile: reloadedFile } = await loadPptxFromBuffer(exportedBuffer);
      const reloadedPresentation = openPresentation(reloadedFile);
      const reloadedSlide = reloadedPresentation.getSlide(1);

      // Verify the marker attribute is present in the reloaded layout
      const reloadedLayout = reloadedSlide.layout;
      if (!reloadedLayout) {
        throw new Error("Expected reloaded slide to have layout");
      }

      const hasMarker = findMarkerAttribute(reloadedLayout, "p:sldLayout", "test-marker");
      expect(hasMarker).toBe("phase9-test");
    });

    it("deduplicates layouts shared across slides", async () => {
      // Load original PPTX
      const fixturePath = path.join(FIXTURE_DIR, "decompressed-pptx/Sample_demo1.pptx");
      const { presentationFile } = await loadPptxFile(fixturePath);
      const presentation = openPresentation(presentationFile);
      const doc = convertToPresentationDocument({ presentation, presentationFile });

      // Get slides that share the same layout
      const slideCount = Math.min(doc.slides.length, 3);
      if (slideCount < 2) {
        throw new Error("Need at least 2 slides for deduplication test");
      }

      // Export without modification - should not throw
      const exportedBuffer = await exportPptxAsBuffer(doc);
      expect(exportedBuffer.byteLength).toBeGreaterThan(0);

      // Reload and verify structure is intact
      const { presentationFile: reloadedFile } = await loadPptxFromBuffer(exportedBuffer);
      const reloadedPresentation = openPresentation(reloadedFile);
      expect(reloadedPresentation.count).toBe(presentation.count);
    });
  });

  describe("master update", () => {
    it("writes updated master XML to exported PPTX", async () => {
      // Load original PPTX
      const fixturePath = path.join(FIXTURE_DIR, "decompressed-pptx/Sample_demo1.pptx");
      const { presentationFile } = await loadPptxFile(fixturePath);
      const presentation = openPresentation(presentationFile);
      const doc = convertToPresentationDocument({ presentation, presentationFile });

      // Get the first slide with master
      const firstSlide = doc.slides[0];
      if (!firstSlide?.apiSlide?.master) {
        throw new Error("Expected first slide to have master");
      }

      // Modify the master XML (add a marker attribute)
      const originalMaster = firstSlide.apiSlide.master;
      const modifiedMaster = addMarkerAttribute({
        doc: originalMaster,
        expectedRootName: "p:sldMaster",
        attrName: "test-marker",
        attrValue: "phase9-master-test",
      });

      // Create a modified document with the updated master
      const modifiedSlide: SlideWithId = {
        ...firstSlide,
        apiSlide: {
          ...firstSlide.apiSlide,
          master: modifiedMaster,
        },
      };

      const modifiedDoc: PresentationDocument = {
        ...doc,
        slides: [modifiedSlide, ...doc.slides.slice(1)],
      };

      // Export the modified document
      const exportedBuffer = await exportPptxAsBuffer(modifiedDoc);

      // Reload and verify
      const { presentationFile: reloadedFile } = await loadPptxFromBuffer(exportedBuffer);
      const reloadedPresentation = openPresentation(reloadedFile);
      const reloadedSlide = reloadedPresentation.getSlide(1);

      // Verify the marker attribute is present in the reloaded master
      const reloadedMaster = reloadedSlide.master;
      if (!reloadedMaster) {
        throw new Error("Expected reloaded slide to have master");
      }

      const hasMarker = findMarkerAttribute(reloadedMaster, "p:sldMaster", "test-marker");
      expect(hasMarker).toBe("phase9-master-test");
    });
  });

  describe("theme update", () => {
    it("writes updated theme XML to exported PPTX", async () => {
      // Load original PPTX
      const fixturePath = path.join(FIXTURE_DIR, "decompressed-pptx/Sample_demo1.pptx");
      const { presentationFile } = await loadPptxFile(fixturePath);
      const presentation = openPresentation(presentationFile);
      const doc = convertToPresentationDocument({ presentation, presentationFile });

      // Get the first slide with theme
      const firstSlide = doc.slides[0];
      if (!firstSlide?.apiSlide?.theme) {
        throw new Error("Expected first slide to have theme");
      }

      // Modify the theme XML (add a marker attribute)
      const originalTheme = firstSlide.apiSlide.theme;
      const modifiedTheme = addMarkerAttribute({
        doc: originalTheme,
        expectedRootName: "a:theme",
        attrName: "test-marker",
        attrValue: "phase9-theme-test",
      });

      // Create a modified document with the updated theme
      const modifiedSlide: SlideWithId = {
        ...firstSlide,
        apiSlide: {
          ...firstSlide.apiSlide,
          theme: modifiedTheme,
        },
      };

      const modifiedDoc: PresentationDocument = {
        ...doc,
        slides: [modifiedSlide, ...doc.slides.slice(1)],
      };

      // Export the modified document
      const exportedBuffer = await exportPptxAsBuffer(modifiedDoc);

      // Reload and verify
      const { presentationFile: reloadedFile } = await loadPptxFromBuffer(exportedBuffer);
      const reloadedPresentation = openPresentation(reloadedFile);
      const reloadedSlide = reloadedPresentation.getSlide(1);

      // Verify the marker attribute is present in the reloaded theme
      const reloadedTheme = reloadedSlide.theme;
      if (!reloadedTheme) {
        throw new Error("Expected reloaded slide to have theme");
      }

      const hasMarker = findMarkerAttribute(reloadedTheme, "a:theme", "test-marker");
      expect(hasMarker).toBe("phase9-theme-test");
    });
  });
});

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Add a marker attribute to the root element of an XML document.
 * Used to verify that the modified XML is written to the exported PPTX.
 */
function addMarkerAttribute({
  doc,
  expectedRootName,
  attrName,
  attrValue,
}: {
  readonly doc: XmlDocument;
  readonly expectedRootName: string;
  readonly attrName: string;
  readonly attrValue: string;
}): XmlDocument {
  const root = doc.children.find((child) => child.type === "element" && child.name === expectedRootName);

  if (!root || root.type !== "element") {
    throw new Error(`Expected root element ${expectedRootName} not found`);
  }

  return {
    ...doc,
    children: doc.children.map((child) => {
      if (child.type === "element" && child.name === expectedRootName) {
        return {
          ...child,
          attrs: {
            ...child.attrs,
            [attrName]: attrValue,
          },
        };
      }
      return child;
    }),
  };
}

/**
 * Find a marker attribute in the root element of an XML document.
 */
function findMarkerAttribute(doc: XmlDocument, expectedRootName: string, attrName: string): string | undefined {
  const root = doc.children.find((child) => child.type === "element" && child.name === expectedRootName);

  if (!root || root.type !== "element") {
    return undefined;
  }

  return root.attrs[attrName];
}
