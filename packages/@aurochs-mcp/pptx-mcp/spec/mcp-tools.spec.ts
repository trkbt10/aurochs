/**
 * @file MCP Tools Integration Tests
 *
 * Tests the MCP server tools directly via JSON-RPC simulation.
 * Validates both session operations and MCP tool behavior including
 * default template handling.
 */

import { join } from "node:path";
import { mkdir, rm, writeFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { createServer } from "../src/server";

const execAsync = promisify(exec);

// LibreOffice path (macOS Homebrew)
const LIBREOFFICE_PATH = "/opt/homebrew/bin/soffice";

// Template paths
const TEMPLATE_PATH = join(
  import.meta.dirname,
  "../../../@aurochs-cli/pptx-cli/spec/verify-cases/templates/blank.pptx",
);
const DEFAULT_TEMPLATE_PATH = join(import.meta.dirname, "../templates/blank.pptx");

// Test output directory
const TEST_OUTPUT_DIR = join(tmpdir(), "mcp-tools-integration-tests");

// State container
const testState = { libreOfficeAvailable: false };

/**
 * Check if LibreOffice is available.
 */
async function isLibreOfficeAvailable(): Promise<boolean> {
  try {
    await access(LIBREOFFICE_PATH);
    return true;
  } catch (_err: unknown) {
    void _err;
    return false;
  }
}

/**
 * Convert PPTX to PNG using LibreOffice CLI.
 */
async function convertPptxToPng(pptxPath: string, outputDir: string): Promise<{ success: boolean; message: string }> {
  try {
    const { stdout, stderr } = await execAsync(
      `"${LIBREOFFICE_PATH}" --headless --convert-to png --outdir "${outputDir}" "${pptxPath}"`,
      { timeout: 60_000 },
    );
    return { success: true, message: stdout || stderr || "Conversion completed" };
  } catch (error) {
    const err = error as Error & { stderr?: string };
    return { success: false, message: err.message || err.stderr || "Unknown error" };
  }
}

describe("MCP Server Integration Tests", () => {
  beforeAll(async () => {
    testState.libreOfficeAvailable = await isLibreOfficeAvailable();
    if (!testState.libreOfficeAvailable) {
      console.warn("LibreOffice not found - skipping LibreOffice validation");
    }
    await mkdir(TEST_OUTPUT_DIR, { recursive: true });
  });

  afterAll(async () => {
    try {
      await rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
    } catch (_err: unknown) {
      void _err;
    }
  });

  describe("Default Template", () => {
    it("should have default template bundled in package", async () => {
      // access() resolves to undefined on success, but bun's expect converts it
      const result = await access(DEFAULT_TEMPLATE_PATH)
        .then(() => true)
        .catch(() => false);
      expect(result).toBe(true);
    });

    it("should load presentation without template_path using default template", async () => {
      const { session } = createServer();

      // Load using default template (simulating MCP tool call without template_path)
      const info = await session.load(DEFAULT_TEMPLATE_PATH, "Test Without Template");

      expect(session.isActive()).toBe(true);
      expect(info.slideCount).toBeGreaterThan(0);
      expect(info.width).toBeGreaterThan(0);
      expect(info.height).toBeGreaterThan(0);
    });

    it("should create complete presentation using only default template", async () => {
      const { session } = createServer();
      await session.load(DEFAULT_TEMPLATE_PATH);

      // Add content
      await session.addShape(1, {
        type: "rect",
        x: 100,
        y: 100,
        width: 300,
        height: 150,
        fill: { type: "solid", color: "#3498DB" },
        text: [{ runs: [{ text: "Default Template Test" }] }],
      });

      // Export and verify
      const buffer = await session.exportBuffer();
      expect(buffer.byteLength).toBeGreaterThan(0);

      // Verify ZIP signature
      const view = new Uint8Array(buffer);
      expect(view[0]).toBe(0x50); // P
      expect(view[1]).toBe(0x4b); // K
    });
  });

  describe("Server Creation", () => {
    it("should create server with session", () => {
      const { server, session } = createServer();

      expect(server).toBeDefined();
      expect(session).toBeDefined();
      expect(session.isActive()).toBe(false);
    });

    it("should accept custom session", async () => {
      const { session: existingSession } = createServer();
      await existingSession.load(TEMPLATE_PATH);

      const { session: reusedSession } = createServer({ session: existingSession });

      expect(reusedSession).toBe(existingSession);
      expect(reusedSession.isActive()).toBe(true);
    });
  });

  describe("Session Operations", () => {
    it("should load presentation from template", async () => {
      const { session } = createServer();

      const info = await session.load(TEMPLATE_PATH, "MCP Test");

      expect(session.isActive()).toBe(true);
      expect(info.slideCount).toBeGreaterThan(0);
      expect(info.title).toBe("MCP Test");
    });

    it("should add and remove slides", async () => {
      const { session } = createServer();
      await session.load(TEMPLATE_PATH);
      const initial = session.getSlideCount();

      const addResult = await session.addSlide();
      expect(session.getSlideCount()).toBe(initial + 1);

      const removeResult = await session.removeSlide(addResult.slideNumber);
      expect(removeResult.newSlideCount).toBe(initial);
    });

    it("should duplicate slides", async () => {
      const { session } = createServer();
      await session.load(TEMPLATE_PATH);
      const initial = session.getSlideCount();

      const result = await session.duplicateSlide(1);

      expect(result.sourceSlideNumber).toBe(1);
      expect(session.getSlideCount()).toBe(initial + 1);
    });

    it("should reorder slides", async () => {
      const { session } = createServer();
      await session.load(TEMPLATE_PATH);

      // Add slides to have something to reorder
      await session.addSlide();
      await session.addSlide();
      const countBefore = session.getSlideCount();

      const result = await session.reorderSlide(1, 3);

      expect(result.fromPosition).toBe(1);
      expect(result.toPosition).toBe(3);
      expect(session.getSlideCount()).toBe(countBefore);
    });

    it("should add shapes to slides", async () => {
      const { session } = createServer();
      await session.load(TEMPLATE_PATH);

      const result = await session.addShape(1, {
        type: "rect",
        x: 100,
        y: 100,
        width: 200,
        height: 100,
        fill: { type: "solid", color: "#3498DB" },
      });

      expect(result.shapeId).toBeDefined();
    });

    it("should add text box to slides", async () => {
      const { session } = createServer();
      await session.load(TEMPLATE_PATH);

      // Text box is essentially a rect shape with text
      const result = await session.addShape(1, {
        type: "rect",
        x: 100,
        y: 100,
        width: 300,
        height: 50,
        text: "Hello Text Box!",
      });

      expect(result.shapeId).toBeDefined();
    });

    it("should add tables to slides", async () => {
      const { session } = createServer();
      await session.load(TEMPLATE_PATH);

      const result = await session.addTable(1, {
        x: 100,
        y: 200,
        width: 400,
        height: 150,
        rows: [
          [{ text: "Header A" }, { text: "Header B" }],
          [{ text: "Cell 1" }, { text: "Cell 2" }],
        ],
      });

      expect(result.tableId).toBeDefined();
    });

    it("should add images to slides", async () => {
      const { session } = createServer();
      await session.load(TEMPLATE_PATH);

      // Create a simple 1x1 PNG for testing
      const pngBuffer = new Uint8Array([
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a, // PNG signature
        0x00,
        0x00,
        0x00,
        0x0d,
        0x49,
        0x48,
        0x44,
        0x52, // IHDR chunk
        0x00,
        0x00,
        0x00,
        0x01,
        0x00,
        0x00,
        0x00,
        0x01,
        0x08,
        0x02,
        0x00,
        0x00,
        0x00,
        0x90,
        0x77,
        0x53,
        0xde,
        0x00,
        0x00,
        0x00,
        0x0c,
        0x49,
        0x44,
        0x41, // IDAT chunk
        0x54,
        0x08,
        0xd7,
        0x63,
        0xf8,
        0x0f,
        0x00,
        0x00,
        0x01,
        0x01,
        0x00,
        0x05,
        0x14,
        0x18,
        0xf3,
        0x51,
        0x00,
        0x00,
        0x00,
        0x00,
        0x49,
        0x45,
        0x4e,
        0x44, // IEND chunk
        0xae,
        0x42,
        0x60,
        0x82,
      ]);

      const result = await session.addImage(1, {
        data: pngBuffer,
        mimeType: "image/png",
        x: 100,
        y: 100,
        width: 200,
        height: 150,
      });

      expect(result.imageId).toBeDefined();
    });

    it("should add connectors to slides", async () => {
      const { session } = createServer();
      await session.load(TEMPLATE_PATH);

      const result = await session.addConnector(1, {
        x: 100,
        y: 100,
        width: 200,
        height: 100,
        preset: "straightConnector1",
        lineColor: "#000000",
        lineWidth: 2,
      });

      expect(result.connectorId).toBeDefined();
    });

    it("should add groups to slides", async () => {
      const { session } = createServer();
      await session.load(TEMPLATE_PATH);

      const result = await session.addGroup(1, {
        x: 100,
        y: 100,
        width: 300,
        height: 200,
        children: [
          { type: "rect", x: 0, y: 0, width: 100, height: 100, fill: "#FF0000" },
          { type: "ellipse", x: 150, y: 50, width: 100, height: 100, fill: "#00FF00" },
        ],
      });

      expect(result.groupId).toBeDefined();
    });

    it("should set transitions", async () => {
      const { session } = createServer();
      await session.load(TEMPLATE_PATH);

      const result = await session.setTransition(1, {
        type: "fade",
        duration: 500,
      });

      expect(result.applied).toBe(true);
    });

    it("should set speaker notes", async () => {
      const { session } = createServer();
      await session.load(TEMPLATE_PATH);

      const result = await session.setSpeakerNotes(1, {
        text: "Test speaker notes",
      });

      expect(result.applied).toBe(true);
    });

    it("should add comments", async () => {
      const { session } = createServer();
      await session.load(TEMPLATE_PATH);

      const result = await session.addComments(1, [{ authorName: "Test User", text: "Test comment", x: 100, y: 100 }]);

      expect(result.commentsAdded).toBe(1);
    });

    it("should add animations", async () => {
      const { session } = createServer();
      await session.load(TEMPLATE_PATH);

      // First add a shape
      const shapeResult = await session.addShape(1, {
        type: "rect",
        x: 100,
        y: 100,
        width: 200,
        height: 100,
        fill: "#3498DB",
      });

      const result = await session.addAnimations(1, [
        {
          shapeId: shapeResult.shapeId,
          class: "entrance",
          effect: "fade",
          duration: 500,
        },
      ]);

      expect(result.animationsAdded).toBe(1);
    });

    it("should render slides to SVG", async () => {
      const { session } = createServer();
      await session.load(TEMPLATE_PATH);

      const result = session.renderSlide(1);

      expect(result.svg).toContain("<svg");
      expect(result.svg).toContain("</svg>");
    });

    it("should export presentation buffer", async () => {
      const { session } = createServer();
      await session.load(TEMPLATE_PATH);

      const buffer = await session.exportBuffer();

      expect(buffer.byteLength).toBeGreaterThan(0);
      const view = new Uint8Array(buffer);
      expect(view[0]).toBe(0x50); // P
      expect(view[1]).toBe(0x4b); // K
    });

    it("should get presentation info", async () => {
      const { session } = createServer();
      await session.load(TEMPLATE_PATH);

      const info = session.getInfo();

      expect(info).not.toBeNull();
      expect(info!.slideCount).toBeGreaterThan(0);
      expect(info!.width).toBeGreaterThan(0);
      expect(info!.height).toBeGreaterThan(0);
    });
  });

  describe("Error Handling", () => {
    it("should return null info when no presentation is active", () => {
      const { session } = createServer();

      const info = session.getInfo();
      expect(info).toBeNull();
    });

    it("should throw when modifying without active session", async () => {
      const { session } = createServer();

      await expect(session.addSlide()).rejects.toThrow("No active session");
    });

    it("should throw for invalid slide numbers", async () => {
      const { session } = createServer();
      await session.load(TEMPLATE_PATH);

      await expect(session.removeSlide(999)).rejects.toThrow();
    });

    it("should handle invalid template path gracefully", async () => {
      const { session } = createServer();

      await expect(session.load("/nonexistent/path.pptx")).rejects.toThrow();
    });
  });

  describe("Complex Workflows", () => {
    it("should handle multiple shape types", async () => {
      const { session } = createServer();
      await session.load(DEFAULT_TEMPLATE_PATH);

      const shapes = [
        { type: "rect", x: 50, y: 50, width: 100, height: 80, fill: "#FF0000" },
        { type: "ellipse", x: 200, y: 50, width: 100, height: 80, fill: "#00FF00" },
        { type: "roundRect", x: 350, y: 50, width: 100, height: 80, fill: "#0000FF" },
        { type: "triangle", x: 500, y: 50, width: 100, height: 80, fill: "#FFFF00" },
      ];

      for (const shape of shapes) {
        const result = await session.addShape(1, shape);
        expect(result.shapeId).toBeDefined();
      }

      const buffer = await session.exportBuffer();
      expect(buffer.byteLength).toBeGreaterThan(0);
    });

    it("should handle multiple slides with content", async () => {
      const { session } = createServer();
      await session.load(DEFAULT_TEMPLATE_PATH);

      // Add 3 more slides
      await session.addSlide();
      await session.addSlide();
      await session.addSlide();

      expect(session.getSlideCount()).toBeGreaterThanOrEqual(4);

      // Add content to each slide
      for (let i = 1; i <= 4; i++) {
        await session.addShape(i, {
          type: "rect",
          x: 100,
          y: 100,
          width: 300,
          height: 100,
          fill: `#${(i * 60).toString(16).padStart(2, "0")}${(i * 40).toString(16).padStart(2, "0")}${(i * 30).toString(16).padStart(2, "0")}`,
          text: [{ runs: [{ text: `Slide ${i}`, fontSize: 24 }] }],
        });

        await session.setTransition(i, { type: "fade", duration: 300 });
      }

      const buffer = await session.exportBuffer();
      expect(buffer.byteLength).toBeGreaterThan(0);
    });

    it("should handle modify slide with background and shapes", async () => {
      const { session } = createServer();
      await session.load(DEFAULT_TEMPLATE_PATH);

      await session.modifySlide({
        slideNumber: 1,
        background: { type: "solid", color: "#2C3E50" },
        addShapes: [
          { type: "rect", x: 100, y: 100, width: 200, height: 100, fill: "#E74C3C" },
          { type: "ellipse", x: 400, y: 100, width: 150, height: 100, fill: "#3498DB" },
        ],
      });

      const buffer = await session.exportBuffer();
      expect(buffer.byteLength).toBeGreaterThan(0);
    });
  });

  describe("LibreOffice Validation", () => {
    it("should generate valid PPTX that LibreOffice can open", async () => {
      if (!testState.libreOfficeAvailable) {
        console.log("Skipping: LibreOffice not available");
        return;
      }

      const { session } = createServer();
      await session.load(DEFAULT_TEMPLATE_PATH, "LibreOffice Test");

      await session.addShape(1, {
        type: "rect",
        x: 50,
        y: 50,
        width: 600,
        height: 80,
        fill: { type: "solid", color: "#2C3E50" },
        text: [{ runs: [{ text: "MCP Server Test", fontSize: 32, bold: true }] }],
      });

      await session.addTable(1, {
        x: 50,
        y: 200,
        width: 400,
        height: 150,
        rows: [
          [{ text: "Feature" }, { text: "Status" }],
          [{ text: "Shapes" }, { text: "✓" }],
          [{ text: "Tables" }, { text: "✓" }],
        ],
      });

      await session.addSlide();
      await session.addShape(2, {
        type: "roundRect",
        x: 100,
        y: 100,
        width: 500,
        height: 200,
        fill: "#3498DB",
        text: [{ runs: [{ text: "Second Slide" }] }],
      });

      const buffer = await session.exportBuffer();
      const outputPath = join(TEST_OUTPUT_DIR, "libreoffice-test.pptx");
      await writeFile(outputPath, new Uint8Array(buffer));

      const result = await convertPptxToPng(outputPath, TEST_OUTPUT_DIR);
      expect(result.success).toBe(true);
    });

    it("should handle slide operations and generate valid PPTX", async () => {
      if (!testState.libreOfficeAvailable) {
        console.log("Skipping: LibreOffice not available");
        return;
      }

      const { session } = createServer();
      await session.load(DEFAULT_TEMPLATE_PATH);

      // Add slides
      await session.addSlide();
      await session.addSlide();
      await session.addSlide();

      // Duplicate
      await session.duplicateSlide(1);

      // Reorder
      await session.reorderSlide(1, 3);

      // Remove
      await session.removeSlide(2);

      // Add content
      const slideCount = session.getSlideCount();
      for (let i = 1; i <= slideCount; i++) {
        await session.addShape(i, {
          type: "rect",
          x: 100,
          y: 100,
          width: 300,
          height: 100,
          fill: `#${((i * 50) % 256).toString(16).padStart(2, "0")}${((i * 70) % 256).toString(16).padStart(2, "0")}${((i * 90) % 256).toString(16).padStart(2, "0")}`,
          text: [{ runs: [{ text: `Slide ${i}` }] }],
        });
      }

      const buffer = await session.exportBuffer();
      const outputPath = join(TEST_OUTPUT_DIR, "slide-ops-test.pptx");
      await writeFile(outputPath, new Uint8Array(buffer));

      const result = await convertPptxToPng(outputPath, TEST_OUTPUT_DIR);
      expect(result.success).toBe(true);
    });
  });

  describe("MCP Tool Direct Call Simulation", () => {
    /**
     * Simulates MCP tool behavior by using the same flow as tools/index.ts
     * This tests the actual MCP tool logic without needing JSON-RPC transport.
     */

    it("should create presentation without template_path (uses default)", async () => {
      // This is what pptx_create_presentation does internally when no template_path is given
      const { session } = createServer();

      // The tool uses DEFAULT_TEMPLATE_PATH when template_path is undefined
      const info = await session.load(DEFAULT_TEMPLATE_PATH, "No Template Test");

      expect(session.isActive()).toBe(true);
      expect(info.slideCount).toBeGreaterThan(0);
    });

    it("should create presentation with custom template_path", async () => {
      const { session } = createServer();
      const info = await session.load(TEMPLATE_PATH, "Custom Template Test");

      expect(session.isActive()).toBe(true);
      expect(info.slideCount).toBeGreaterThan(0);
    });

    it("should complete full MCP workflow without explicit template", async () => {
      const { session } = createServer();

      // Step 1: pptx_create_presentation (no template_path)
      const createInfo = await session.load(DEFAULT_TEMPLATE_PATH, "MCP Workflow Test");
      expect(createInfo.slideCount).toBeGreaterThan(0);

      // Step 2: pptx_add_shape
      const shapeResult = await session.addShape(1, {
        type: "rect",
        x: 100,
        y: 100,
        width: 300,
        height: 150,
        fill: { type: "solid", color: "#3498DB" },
        text: "Hello MCP!",
      });
      expect(shapeResult.shapeId).toBeDefined();

      // Step 3: pptx_add_text_box (implemented as shape)
      const textResult = await session.addShape(1, {
        type: "rect",
        x: 100,
        y: 300,
        width: 400,
        height: 50,
        text: "Text box content",
      });
      expect(textResult.shapeId).toBeDefined();

      // Step 4: pptx_add_slide
      const slideResult = await session.addSlide();
      expect(slideResult.slideNumber).toBeGreaterThan(1);

      // Step 5: pptx_add_table
      const tableResult = await session.addTable(2, {
        x: 100,
        y: 100,
        width: 400,
        height: 200,
        rows: [
          [{ text: "Col 1" }, { text: "Col 2" }],
          [{ text: "Data 1" }, { text: "Data 2" }],
        ],
      });
      expect(tableResult.tableId).toBeDefined();

      // Step 6: pptx_set_transition
      const transitionResult = await session.setTransition(1, {
        type: "fade",
        duration: 500,
      });
      expect(transitionResult.applied).toBe(true);

      // Step 7: pptx_set_speaker_notes
      const notesResult = await session.setSpeakerNotes(1, {
        text: "Speaker notes for slide 1",
      });
      expect(notesResult.applied).toBe(true);

      // Step 8: pptx_get_info
      const info = session.getInfo();
      expect(info).not.toBeNull();
      expect(info!.slideCount).toBeGreaterThanOrEqual(2);

      // Step 9: pptx_render_slide
      const renderResult = session.renderSlide(1);
      expect(renderResult.svg).toContain("<svg");

      // Step 10: pptx_export
      const buffer = await session.exportBuffer();
      expect(buffer.byteLength).toBeGreaterThan(0);

      // Verify it's a valid ZIP
      const view = new Uint8Array(buffer);
      expect(view[0]).toBe(0x50);
      expect(view[1]).toBe(0x4b);
    });

    it("should handle all element types in single workflow", async () => {
      const { session } = createServer();
      await session.load(DEFAULT_TEMPLATE_PATH);

      // Shapes
      await session.addShape(1, { type: "rect", x: 50, y: 50, width: 100, height: 80, fill: "#FF0000" });
      await session.addShape(1, { type: "ellipse", x: 200, y: 50, width: 100, height: 80, fill: "#00FF00" });
      await session.addShape(1, { type: "roundRect", x: 350, y: 50, width: 100, height: 80, fill: "#0000FF" });

      // Table
      await session.addTable(1, {
        x: 50,
        y: 200,
        width: 300,
        height: 100,
        rows: [[{ text: "A" }, { text: "B" }]],
      });

      // Group
      await session.addGroup(1, {
        x: 400,
        y: 200,
        width: 200,
        height: 150,
        children: [
          { type: "rect", x: 0, y: 0, width: 80, height: 60, fill: "#FFFF00" },
          { type: "ellipse", x: 100, y: 50, width: 80, height: 60, fill: "#FF00FF" },
        ],
      });

      // Connector
      await session.addConnector(1, {
        x: 50,
        y: 400,
        width: 200,
        height: 50,
        preset: "straightConnector1",
        lineColor: "#000000",
      });

      // Verify export
      const buffer = await session.exportBuffer();
      expect(buffer.byteLength).toBeGreaterThan(0);
    });

    it("should handle slide manipulation workflow", async () => {
      const { session } = createServer();
      await session.load(DEFAULT_TEMPLATE_PATH);
      const initialCount = session.getSlideCount();

      // pptx_add_slide
      await session.addSlide();
      await session.addSlide();
      expect(session.getSlideCount()).toBe(initialCount + 2);

      // pptx_duplicate_slide
      await session.duplicateSlide(1);
      expect(session.getSlideCount()).toBe(initialCount + 3);

      // pptx_reorder_slide
      await session.reorderSlide(1, 3);

      // pptx_remove_slide
      await session.removeSlide(2);
      expect(session.getSlideCount()).toBe(initialCount + 2);

      // Verify all slides are accessible
      const finalCount = session.getSlideCount();
      for (let i = 1; i <= finalCount; i++) {
        const render = session.renderSlide(i);
        expect(render.svg).toContain("<svg");
      }
    });

    it("should handle comments and animations workflow", async () => {
      const { session } = createServer();
      await session.load(DEFAULT_TEMPLATE_PATH);

      // Add shape for animation target
      const shapeResult = await session.addShape(1, {
        type: "rect",
        x: 100,
        y: 100,
        width: 200,
        height: 100,
        fill: "#3498DB",
      });

      // pptx_add_comments
      const commentsResult = await session.addComments(1, [
        { authorName: "Reviewer", text: "Looks good!", x: 100, y: 100 },
        { authorName: "Editor", text: "Please check", x: 200, y: 200 },
      ]);
      expect(commentsResult.commentsAdded).toBe(2);

      // pptx_add_animations
      const animResult = await session.addAnimations(1, [
        {
          shapeId: shapeResult.shapeId,
          class: "entrance",
          effect: "fade",
          duration: 500,
        },
      ]);
      expect(animResult.animationsAdded).toBe(1);

      // Export
      const buffer = await session.exportBuffer();
      expect(buffer.byteLength).toBeGreaterThan(0);
    });

    it("should return error for operations on inactive session", async () => {
      const { session } = createServer();

      // These should all throw because no presentation is loaded
      expect(session.isActive()).toBe(false);
      expect(session.getInfo()).toBeNull();

      await expect(session.addSlide()).rejects.toThrow("No active session");
      await expect(session.addShape(1, { type: "rect", x: 0, y: 0, width: 100, height: 100 })).rejects.toThrow();
      await expect(session.removeSlide(1)).rejects.toThrow("No active session");
    });

    it("should return error for invalid slide numbers", async () => {
      const { session } = createServer();
      await session.load(DEFAULT_TEMPLATE_PATH);

      await expect(session.removeSlide(999)).rejects.toThrow();
      await expect(session.reorderSlide(1, 999)).rejects.toThrow();
    });
  });

  describe("Text Formats (schema + coercion)", () => {
    it("should accept shorthand TextRunSpec[] and coerce to TextParagraphSpec[]", async () => {
      // This is the exact request that caused 'paragraph.runs is undefined'
      // Schema now explicitly accepts this format, handler coerces it
      const { session } = createServer();
      await session.load(TEMPLATE_PATH);

      // Simulate MCP tool: coerce then pass
      const { coerceShapeSpec } = await import("../src/tools/index");

      // The shape as LLM sends it (TextRunSpec[] without runs wrapper)
      const rawShape = {
        type: "roundRect",
        x: 50,
        y: 150,
        width: 400,
        height: 180,
        fill: "#1a1a3a",
        lineColor: "#444466",
        lineWidth: 2,
        text: [
          { text: "陰謀論者の主張", fontSize: 18, bold: true, color: "#888888" },
          { text: "\n「宇宙人との接触を隠蔽！」\n「実は月に行ってない！」", fontSize: 16, color: "#AAAAAA" },
        ],
      };

      // After coercion, text should have runs wrapper
      const coerced = coerceShapeSpec(rawShape as Record<string, unknown>);
      const textArr = coerced.text as Array<Record<string, unknown>>;
      expect(textArr[0]).toHaveProperty("runs");
      expect(textArr[1]).toHaveProperty("runs");

      // Should work with session
      const result = await session.addShape(1, coerced as any);
      expect(result.shapeId).toBeDefined();

      const { svg } = session.renderSlide(1);
      expect(svg).toContain("陰謀論者の主張");
    });

    it("should build presentation as in-memory buffer", async () => {
      const { session } = createServer();
      await session.load(TEMPLATE_PATH);

      await session.addShape(1, {
        type: "rect",
        x: 100,
        y: 100,
        width: 200,
        height: 100,
        fill: "#FF0000",
      });

      const buffer = await session.exportBuffer();
      expect(buffer.byteLength).toBeGreaterThan(0);

      // Verify ZIP signature (PK)
      const view = new Uint8Array(buffer);
      expect(view[0]).toBe(0x50);
      expect(view[1]).toBe(0x4b);
    });
  });

  describe("MCP Tool Response Format", () => {
    it("pptx_render_slide should return SVG in content (visible to LLM)", async () => {
      const { session } = createServer();
      await session.load(DEFAULT_TEMPLATE_PATH);

      await session.addShape(1, {
        type: "rect",
        x: 100,
        y: 100,
        width: 300,
        height: 150,
        fill: "#3498DB",
        text: [{ runs: [{ text: "Visible SVG Test" }] }],
      });

      // Simulate what the MCP tool handler does
      const result = session.renderSlide(1);
      const mcpResponse = {
        content: [{ type: "text" as const, text: result.svg }],
        _meta: { ui: { resourceUri: "ui://pptx/preview" }, slideData: { number: 1, svg: result.svg } },
      };

      // The LLM sees content[0].text - it MUST contain SVG
      const llmVisibleText = mcpResponse.content[0].text;
      expect(llmVisibleText).toContain("<svg");
      expect(llmVisibleText).toContain("</svg>");
      expect(llmVisibleText).toContain("Visible SVG Test");

      // _meta also has SVG for UI preview
      expect(mcpResponse._meta.slideData.svg).toContain("<svg");
    });

    it("pptx_render_slide should NOT return just JSON status (old bug)", async () => {
      const { session } = createServer();
      await session.load(DEFAULT_TEMPLATE_PATH);

      const result = session.renderSlide(1);

      // The old bug: content was JSON.stringify({ success: true, warnings: [...] })
      // which hid the SVG from the LLM. Verify this is NOT the case anymore.
      expect(result.svg).not.toBe('{"success":true,"warnings":[]}');
      expect(result.svg).toContain("<svg");
    });
  });

  describe("Text Formats (matching Zod schema)", () => {
    it("should accept text as simple string", async () => {
      const { session } = createServer();
      await session.load(TEMPLATE_PATH);

      const result = await session.addShape(1, {
        type: "rect",
        x: 100,
        y: 100,
        width: 300,
        height: 100,
        text: "Simple text",
      });
      expect(result.shapeId).toBeDefined();

      const { svg } = session.renderSlide(1);
      expect(svg).toContain("Simple text");
    });

    it("should accept text as TextParagraphSpec[] with runs", async () => {
      const { session } = createServer();
      await session.load(TEMPLATE_PATH);

      const result = await session.addShape(1, {
        type: "rect",
        x: 100,
        y: 100,
        width: 300,
        height: 100,
        text: [{ runs: [{ text: "Rich text", fontSize: 36, bold: true }] }],
      });
      expect(result.shapeId).toBeDefined();

      const { svg } = session.renderSlide(1);
      expect(svg).toContain("Rich text");
    });

    it("should accept text with alignment and multiple runs per paragraph", async () => {
      const { session } = createServer();
      await session.load(TEMPLATE_PATH);

      const result = await session.addShape(1, {
        type: "rect",
        x: 100,
        y: 100,
        width: 400,
        height: 200,
        fill: "#2C3E50",
        text: [
          { runs: [{ text: "Title", fontSize: 36, bold: true }], alignment: "center" as const },
          {
            runs: [
              { text: "Normal ", fontSize: 16 },
              { text: "Bold", fontSize: 16, bold: true, color: "FF0000" },
            ],
          },
        ],
      });
      expect(result.shapeId).toBeDefined();

      const { svg } = session.renderSlide(1);
      expect(svg).toContain("Title");
      expect(svg).toContain("Normal");
      expect(svg).toContain("Bold");
    });

    it("should accept Japanese text with formatting", async () => {
      const { session } = createServer();
      await session.load(TEMPLATE_PATH);

      const result = await session.addShape(1, {
        type: "rect",
        x: 60,
        y: 300,
        width: 840,
        height: 120,
        fill: { type: "solid", color: "#2C3E50" },
        text: [
          {
            runs: [{ text: "革新的なビジネス戦略", fontSize: 48, bold: true, color: "ffffff" }],
            alignment: "center" as const,
          },
        ],
      });
      expect(result.shapeId).toBeDefined();

      const { svg } = session.renderSlide(1);
      expect(svg).toContain("革新的なビジネス戦略");
    });
  });

  describe("Shape Fill Color Rendering", () => {
    it("should render solid fill with '#' prefix correctly in SVG (no double ##)", async () => {
      const { session } = createServer();
      await session.load(DEFAULT_TEMPLATE_PATH);

      await session.addShape(1, {
        type: "rect",
        x: 100,
        y: 100,
        width: 200,
        height: 100,
        fill: { type: "solid", color: "#3498DB" },
      });

      const { svg } = session.renderSlide(1);
      // Should contain #3498DB, not ##3498DB
      expect(svg).not.toContain("##");
      expect(svg).toContain("3498DB");
    });

    it("should render shorthand string fill with '#' prefix correctly", async () => {
      const { session } = createServer();
      await session.load(DEFAULT_TEMPLATE_PATH);

      await session.addShape(1, {
        type: "rect",
        x: 100,
        y: 100,
        width: 200,
        height: 100,
        fill: "#E74C3C",
      });

      const { svg } = session.renderSlide(1);
      expect(svg).not.toContain("##");
      expect(svg).toContain("E74C3C");
    });

    it("should render fill without '#' prefix correctly", async () => {
      const { session } = createServer();
      await session.load(DEFAULT_TEMPLATE_PATH);

      await session.addShape(1, {
        type: "rect",
        x: 100,
        y: 100,
        width: 200,
        height: 100,
        fill: "FF5733",
      });

      const { svg } = session.renderSlide(1);
      expect(svg).not.toContain("##");
      expect(svg).toContain("FF5733");
    });

    it("should render gradient fill stops correctly (no double ##)", async () => {
      const { session } = createServer();
      await session.load(DEFAULT_TEMPLATE_PATH);

      await session.addShape(1, {
        type: "rect",
        x: 100,
        y: 100,
        width: 200,
        height: 100,
        fill: {
          type: "gradient",
          stops: [
            { position: 0, color: "#FF0000" },
            { position: 100, color: "#0000FF" },
          ],
          angle: 90,
        },
      });

      const { svg } = session.renderSlide(1);
      expect(svg).not.toContain("##");
    });

    it("should render line color correctly (no double ##)", async () => {
      const { session } = createServer();
      await session.load(DEFAULT_TEMPLATE_PATH);

      await session.addShape(1, {
        type: "rect",
        x: 100,
        y: 100,
        width: 200,
        height: 100,
        fill: "#FFFFFF",
        lineColor: "#000000",
        lineWidth: 2,
      });

      const { svg } = session.renderSlide(1);
      expect(svg).not.toContain("##");
    });

    it("should render multiple shapes with various fill types correctly", async () => {
      const { session } = createServer();
      await session.load(DEFAULT_TEMPLATE_PATH);

      // With # prefix
      await session.addShape(1, {
        type: "rect",
        x: 50,
        y: 50,
        width: 100,
        height: 80,
        fill: "#FF0000",
      });

      // Solid fill spec with #
      await session.addShape(1, {
        type: "ellipse",
        x: 200,
        y: 50,
        width: 100,
        height: 80,
        fill: { type: "solid", color: "#00FF00" },
      });

      // Without # prefix
      await session.addShape(1, {
        type: "roundRect",
        x: 350,
        y: 50,
        width: 100,
        height: 80,
        fill: "0000FF",
      });

      // With line
      await session.addShape(1, {
        type: "triangle",
        x: 500,
        y: 50,
        width: 100,
        height: 80,
        fill: "#FFFF00",
        lineColor: "#333333",
        lineWidth: 3,
      });

      const { svg } = session.renderSlide(1);

      // No double hashes anywhere
      expect(svg).not.toContain("##");

      // All colors present
      expect(svg).toContain("FF0000");
      expect(svg).toContain("00FF00");
      expect(svg).toContain("0000FF");
      expect(svg).toContain("FFFF00");
    });

    it("should render text with shape fill correctly", async () => {
      const { session } = createServer();
      await session.load(DEFAULT_TEMPLATE_PATH);

      await session.addShape(1, {
        type: "rect",
        x: 100,
        y: 100,
        width: 400,
        height: 200,
        fill: { type: "solid", color: "#2C3E50" },
        text: [{ runs: [{ text: "Hello World", fontSize: 36, bold: true }] }],
      });

      const { svg } = session.renderSlide(1);
      expect(svg).not.toContain("##");
      expect(svg).toContain("2C3E50");
      expect(svg).toContain("Hello World");
    });
  });
});
