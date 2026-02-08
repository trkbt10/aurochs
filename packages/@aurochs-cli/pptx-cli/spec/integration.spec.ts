/**
 * @file PPTX CLI Integration Tests
 *
 * Tests that generate PPTX files using the CLI core session
 * and validate completeness via LibreOffice CLI image export.
 */

import { mkdir, rm, access, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { createPresentationSession } from "../src/core/presentation-session";

const execAsync = promisify(exec);

// LibreOffice path (macOS Homebrew)
const LIBREOFFICE_PATH = "/opt/homebrew/bin/soffice";

// Template path
const TEMPLATE_PATH = join(import.meta.dirname, "verify-cases/templates/blank.pptx");

// Test output directory
const TEST_OUTPUT_DIR = join(tmpdir(), "pptx-cli-integration-tests");

/**
 * Check if LibreOffice is available.
 */
async function isLibreOfficeAvailable(): Promise<boolean> {
  try {
    await access(LIBREOFFICE_PATH);
    return true;
  } catch (_err: unknown) {
    void _err; // Expected: file may not exist
    return false;
  }
}

/**
 * Convert PPTX to PNG using LibreOffice CLI.
 * Returns true if conversion succeeds.
 */
async function convertPptxToPng(
  pptxPath: string,
  outputDir: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const { stdout, stderr } = await execAsync(
      `"${LIBREOFFICE_PATH}" --headless --convert-to png --outdir "${outputDir}" "${pptxPath}"`,
      { timeout: 60_000 },
    );
    return {
      success: true,
      message: stdout || stderr || "Conversion completed",
    };
  } catch (error) {
    const err = error as Error & { stderr?: string };
    return {
      success: false,
      message: err.message || err.stderr || "Unknown error",
    };
  }
}

// State container to avoid let in describe scope
const testState = { libreOfficeAvailable: false };

describe("PPTX CLI Integration Tests", () => {
  beforeAll(async () => {
    testState.libreOfficeAvailable = await isLibreOfficeAvailable();
    if (!testState.libreOfficeAvailable) {
      console.warn("LibreOffice not found at", LIBREOFFICE_PATH, "- skipping LibreOffice validation");
    }

    // Create output directory
    await mkdir(TEST_OUTPUT_DIR, { recursive: true });
  });

  afterAll(async () => {
    // Cleanup output directory
    try {
      await rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
    } catch (_err: unknown) {
      void _err; // Ignore cleanup errors
    }
  });

  describe("Session lifecycle", () => {
    it("should create a session and load template", async () => {
      const session = createPresentationSession();

      expect(session.isActive()).toBe(false);

      const info = await session.load(TEMPLATE_PATH, "Test Presentation");

      expect(session.isActive()).toBe(true);
      expect(info.slideCount).toBeGreaterThan(0);
      expect(info.width).toBeGreaterThan(0);
      expect(info.height).toBeGreaterThan(0);
      expect(info.title).toBe("Test Presentation");
    });

    it("should export valid PPTX buffer", async () => {
      const session = createPresentationSession();
      await session.load(TEMPLATE_PATH);

      const buffer = await session.exportBuffer();

      expect(buffer).toBeInstanceOf(ArrayBuffer);
      expect(buffer.byteLength).toBeGreaterThan(0);

      // Verify ZIP signature (PK..)
      const view = new Uint8Array(buffer);
      expect(view[0]).toBe(0x50); // P
      expect(view[1]).toBe(0x4b); // K
    });
  });

  describe("Slide operations", () => {
    it("should add a new slide", async () => {
      const session = createPresentationSession();
      await session.load(TEMPLATE_PATH);
      const initialCount = session.getSlideCount();

      const result = await session.addSlide();

      expect(result.slideNumber).toBe(initialCount + 1);
      expect(session.getSlideCount()).toBe(initialCount + 1);
    });

    it("should remove a slide", async () => {
      const session = createPresentationSession();
      await session.load(TEMPLATE_PATH);
      await session.addSlide();
      const countAfterAdd = session.getSlideCount();

      const result = await session.removeSlide(countAfterAdd);

      expect(result.removedSlideNumber).toBe(countAfterAdd);
      expect(session.getSlideCount()).toBe(countAfterAdd - 1);
    });

    it("should duplicate a slide", async () => {
      const session = createPresentationSession();
      await session.load(TEMPLATE_PATH);
      const initialCount = session.getSlideCount();

      const result = await session.duplicateSlide(1);

      expect(result.sourceSlideNumber).toBe(1);
      expect(result.newSlideNumber).toBe(initialCount + 1);
      expect(session.getSlideCount()).toBe(initialCount + 1);
    });

    it("should reorder slides", async () => {
      const session = createPresentationSession();
      await session.load(TEMPLATE_PATH);
      await session.addSlide();
      await session.addSlide();

      const result = await session.reorderSlide(1, 2);

      expect(result.fromPosition).toBe(1);
      expect(result.toPosition).toBe(2);
    });
  });

  describe("Shape operations", () => {
    it("should add a rectangle shape", async () => {
      const session = createPresentationSession();
      await session.load(TEMPLATE_PATH);

      const result = await session.addShape(1, {
        type: "rect",
        x: 100,
        y: 100,
        width: 200,
        height: 100,
        fill: { type: "solid", color: "#FF0000" },
      });

      expect(result.shapeId).toBeDefined();
    });

    it("should add a text box", async () => {
      const session = createPresentationSession();
      await session.load(TEMPLATE_PATH);

      const result = await session.addShape(1, {
        type: "rect",
        x: 100,
        y: 100,
        width: 300,
        height: 50,
        text: [{ runs: [{ text: "Hello, World!", fontSize: 24 }] }],
      });

      expect(result.shapeId).toBeDefined();
    });

    it("should add an ellipse shape", async () => {
      const session = createPresentationSession();
      await session.load(TEMPLATE_PATH);

      const result = await session.addShape(1, {
        type: "ellipse",
        x: 100,
        y: 100,
        width: 150,
        height: 150,
        fill: { type: "solid", color: "#00FF00" },
      });

      expect(result.shapeId).toBeDefined();
    });
  });

  describe("Table operations", () => {
    it("should add a simple table", async () => {
      const session = createPresentationSession();
      await session.load(TEMPLATE_PATH);

      const result = await session.addTable(1, {
        x: 100,
        y: 200,
        width: 400,
        height: 200,
        rows: [
          [{ text: "Header 1" }, { text: "Header 2" }],
          [{ text: "Cell 1" }, { text: "Cell 2" }],
        ],
      });

      expect(result.tableId).toBeDefined();
    });
  });

  describe("Transition and animation", () => {
    it("should set slide transition", async () => {
      const session = createPresentationSession();
      await session.load(TEMPLATE_PATH);

      const result = await session.setTransition(1, {
        type: "fade",
        duration: 500,
        advanceOnClick: true,
      });

      expect(result.applied).toBe(true);
    });
  });

  describe("Speaker notes and comments", () => {
    it("should set speaker notes", async () => {
      const session = createPresentationSession();
      await session.load(TEMPLATE_PATH);

      const result = await session.setSpeakerNotes(1, {
        text: "These are speaker notes for slide 1",
      });

      expect(result.applied).toBe(true);
    });

    it("should add comments", async () => {
      const session = createPresentationSession();
      await session.load(TEMPLATE_PATH);

      const result = await session.addComments(1, [
        {
          authorName: "Test Author",
          text: "This is a test comment",
          x: 100,
          y: 100,
        },
      ]);

      expect(result.commentsAdded).toBe(1);
    });
  });

  describe("SVG rendering", () => {
    it("should render slide to SVG", async () => {
      const session = createPresentationSession();
      await session.load(TEMPLATE_PATH);

      const result = session.renderSlide(1);

      expect(result.svg).toBeDefined();
      expect(result.svg).toContain("<svg");
      expect(result.svg).toContain("</svg>");
    });
  });

  describe("LibreOffice validation", () => {
    it("should generate valid PPTX with shapes that LibreOffice can export", async () => {
      if (!testState.libreOfficeAvailable) {
        console.log("Skipping: LibreOffice not available");
        return;
      }

      const session = createPresentationSession();
      await session.load(TEMPLATE_PATH, "Shapes Test");

      // Add various shapes
      await session.addShape(1, {
        type: "rect",
        x: 50,
        y: 50,
        width: 200,
        height: 100,
        fill: { type: "solid", color: "#FF6B6B" },
        text: [{ runs: [{ text: "Rectangle", fontSize: 18, bold: true }] }],
      });

      await session.addShape(1, {
        type: "ellipse",
        x: 300,
        y: 50,
        width: 150,
        height: 150,
        fill: { type: "solid", color: "#4ECDC4" },
      });

      await session.addShape(1, {
        type: "roundRect",
        x: 50,
        y: 200,
        width: 200,
        height: 100,
        fill: { type: "solid", color: "#45B7D1" },
      });

      // Export and validate
      const buffer = await session.exportBuffer();
      const pptxPath = join(TEST_OUTPUT_DIR, "shapes-test.pptx");
      await writeFile(pptxPath, new Uint8Array(buffer));

      const result = await convertPptxToPng(pptxPath, TEST_OUTPUT_DIR);
      expect(result.success).toBe(true);
    });

    it("should generate valid PPTX with table that LibreOffice can export", async () => {
      if (!testState.libreOfficeAvailable) {
        console.log("Skipping: LibreOffice not available");
        return;
      }

      const session = createPresentationSession();
      await session.load(TEMPLATE_PATH, "Table Test");

      await session.addTable(1, {
        x: 100,
        y: 100,
        width: 500,
        height: 300,
        rows: [
          [{ text: "Name" }, { text: "Value" }, { text: "Status" }],
          [{ text: "Item A" }, { text: "100" }, { text: "Active" }],
          [{ text: "Item B" }, { text: "200" }, { text: "Pending" }],
          [{ text: "Item C" }, { text: "300" }, { text: "Completed" }],
        ],
      });

      const buffer = await session.exportBuffer();
      const pptxPath = join(TEST_OUTPUT_DIR, "table-test.pptx");
      await writeFile(pptxPath, new Uint8Array(buffer));

      const result = await convertPptxToPng(pptxPath, TEST_OUTPUT_DIR);
      expect(result.success).toBe(true);
    });

    it("should generate valid PPTX with transitions that LibreOffice can export", async () => {
      if (!testState.libreOfficeAvailable) {
        console.log("Skipping: LibreOffice not available");
        return;
      }

      const session = createPresentationSession();
      await session.load(TEMPLATE_PATH, "Transition Test");

      // Add content to first slide
      await session.addShape(1, {
        type: "rect",
        x: 100,
        y: 100,
        width: 400,
        height: 200,
        fill: { type: "solid", color: "#9B59B6" },
        text: [{ runs: [{ text: "Slide 1 with Fade", fontSize: 24 }] }],
      });

      await session.setTransition(1, {
        type: "fade",
        duration: 1000,
        advanceOnClick: true,
      });

      // Add second slide with different transition
      await session.addSlide();
      await session.addShape(2, {
        type: "rect",
        x: 100,
        y: 100,
        width: 400,
        height: 200,
        fill: { type: "solid", color: "#E74C3C" },
        text: [{ runs: [{ text: "Slide 2 with Wipe", fontSize: 24 }] }],
      });

      await session.setTransition(2, {
        type: "wipe",
        duration: 800,
        direction: "l",
      });

      const buffer = await session.exportBuffer();
      const pptxPath = join(TEST_OUTPUT_DIR, "transition-test.pptx");
      await writeFile(pptxPath, new Uint8Array(buffer));

      const result = await convertPptxToPng(pptxPath, TEST_OUTPUT_DIR);
      expect(result.success).toBe(true);
    });

    it("should generate valid PPTX with speaker notes that LibreOffice can export", async () => {
      if (!testState.libreOfficeAvailable) {
        console.log("Skipping: LibreOffice not available");
        return;
      }

      const session = createPresentationSession();
      await session.load(TEMPLATE_PATH, "Notes Test");

      await session.addShape(1, {
        type: "rect",
        x: 100,
        y: 100,
        width: 500,
        height: 300,
        fill: { type: "solid", color: "#2ECC71" },
        text: [{ runs: [{ text: "Presentation with Notes", fontSize: 32, bold: true }] }],
      });

      await session.setSpeakerNotes(1, {
        text: "Important speaker notes:\n\n1. First point to mention\n2. Second important detail\n3. Remember to ask questions",
      });

      const buffer = await session.exportBuffer();
      const pptxPath = join(TEST_OUTPUT_DIR, "notes-test.pptx");
      await writeFile(pptxPath, new Uint8Array(buffer));

      const result = await convertPptxToPng(pptxPath, TEST_OUTPUT_DIR);
      expect(result.success).toBe(true);
    });

    it("should generate valid PPTX with multiple slides and operations", async () => {
      if (!testState.libreOfficeAvailable) {
        console.log("Skipping: LibreOffice not available");
        return;
      }

      const session = createPresentationSession();
      await session.load(TEMPLATE_PATH, "Full Feature Test");

      // Slide 1: Title slide
      await session.addShape(1, {
        type: "rect",
        x: 50,
        y: 150,
        width: 600,
        height: 100,
        fill: { type: "solid", color: "#3498DB" },
        text: [{ runs: [{ text: "PPTX CLI Integration Test", fontSize: 36, bold: true }] }],
      });

      await session.addShape(1, {
        type: "rect",
        x: 150,
        y: 280,
        width: 400,
        height: 50,
        text: [{ runs: [{ text: "Comprehensive Feature Validation", fontSize: 18 }] }],
      });

      await session.setTransition(1, { type: "fade", duration: 500 });
      await session.setSpeakerNotes(1, { text: "Welcome to the integration test presentation" });

      // Slide 2: Shapes showcase
      await session.addSlide();
      await session.addShape(2, {
        type: "rect",
        x: 50,
        y: 50,
        width: 150,
        height: 80,
        fill: { type: "solid", color: "#E74C3C" },
        text: [{ runs: [{ text: "Rectangle" }] }],
      });

      await session.addShape(2, {
        type: "ellipse",
        x: 230,
        y: 50,
        width: 100,
        height: 100,
        fill: { type: "solid", color: "#2ECC71" },
      });

      await session.addShape(2, {
        type: "roundRect",
        x: 360,
        y: 50,
        width: 150,
        height: 80,
        fill: { type: "solid", color: "#9B59B6" },
      });

      await session.setTransition(2, { type: "push", direction: "r" });

      // Slide 3: Table
      await session.addSlide();
      await session.addShape(3, {
        type: "rect",
        x: 50,
        y: 30,
        width: 300,
        height: 40,
        text: [{ runs: [{ text: "Data Table", fontSize: 24, bold: true }] }],
      });

      await session.addTable(3, {
        x: 50,
        y: 90,
        width: 600,
        height: 250,
        rows: [
          [{ text: "Feature" }, { text: "Status" }, { text: "Priority" }],
          [{ text: "Shapes" }, { text: "✓ Complete" }, { text: "High" }],
          [{ text: "Tables" }, { text: "✓ Complete" }, { text: "High" }],
          [{ text: "Transitions" }, { text: "✓ Complete" }, { text: "Medium" }],
          [{ text: "Notes" }, { text: "✓ Complete" }, { text: "Low" }],
        ],
      });

      await session.setTransition(3, { type: "wipe", direction: "d" });

      // Slide 4: Duplicated and reordered
      await session.duplicateSlide(1);

      // Export and validate
      const buffer = await session.exportBuffer();
      const pptxPath = join(TEST_OUTPUT_DIR, "full-feature-test.pptx");
      await writeFile(pptxPath, new Uint8Array(buffer));

      const result = await convertPptxToPng(pptxPath, TEST_OUTPUT_DIR);
      expect(result.success).toBe(true);
    });
  });

  describe("Error handling", () => {
    it("should throw on invalid slide number for removeSlide", async () => {
      const session = createPresentationSession();
      await session.load(TEMPLATE_PATH);

      await expect(session.removeSlide(999)).rejects.toThrow();
    });

    it("should throw on invalid slide number for setTransition", async () => {
      const session = createPresentationSession();
      await session.load(TEMPLATE_PATH);

      await expect(session.setTransition(999, { type: "fade" })).rejects.toThrow();
    });

    it("should throw when no session is active", async () => {
      const session = createPresentationSession();

      await expect(session.addSlide()).rejects.toThrow("No active session");
    });
  });
});
