import { renderDiagramAscii } from "./diagram-renderer";
import { BOX_CHARS } from "@aurochs-renderer/drawing-ml/ascii";

describe("diagram-renderer", () => {
  describe("renderDiagramAscii", () => {
    it("renders a single shape with text", () => {
      const result = renderDiagramAscii({
        shapes: [{ id: "1", bounds: { x: 0, y: 0, width: 400, height: 200 }, text: "Process" }],
        width: 400,
        height: 200,
        terminalWidth: 40,
      });
      expect(result).toContain(BOX_CHARS.topLeft);
      expect(result).toContain("Process");
    });

    it("renders multiple shapes", () => {
      const result = renderDiagramAscii({
        shapes: [
          { id: "1", bounds: { x: 0, y: 0, width: 200, height: 100 }, text: "Start" },
          { id: "2", bounds: { x: 200, y: 0, width: 200, height: 100 }, text: "End" },
        ],
        width: 400,
        height: 100,
        terminalWidth: 40,
      });
      expect(result).toContain("Start");
      expect(result).toContain("End");
    });

    it("draws border when showBorder is true", () => {
      const result = renderDiagramAscii({
        shapes: [],
        width: 400,
        height: 200,
        terminalWidth: 40,
        showBorder: true,
      });
      expect(result).toContain(BOX_CHARS.topLeft);
      expect(result).toContain(BOX_CHARS.bottomRight);
    });

    it("returns empty string for no shapes without border", () => {
      const result = renderDiagramAscii({
        shapes: [],
        width: 400,
        height: 200,
        terminalWidth: 40,
      });
      expect(result).toBe("");
    });

    it("handles shapes without text", () => {
      const result = renderDiagramAscii({
        shapes: [{ id: "1", bounds: { x: 0, y: 0, width: 400, height: 200 } }],
        width: 400,
        height: 200,
        terminalWidth: 40,
      });
      expect(result).toContain(BOX_CHARS.topLeft);
    });
  });
});
