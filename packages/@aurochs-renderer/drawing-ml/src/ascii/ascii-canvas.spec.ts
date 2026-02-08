import { describe, it, expect } from "bun:test";
import { createCanvas, setCell, drawBox, drawText, renderCanvas, BOX_CHARS, TABLE_CHARS, truncateText } from "./ascii-canvas";

describe("ascii-canvas", () => {
  describe("createCanvas", () => {
    it("creates a canvas filled with spaces", () => {
      const canvas = createCanvas(4, 3);
      expect(canvas.width).toBe(4);
      expect(canvas.height).toBe(3);
      expect(canvas.cells.length).toBe(3);
      expect(canvas.cells[0]![0]!.char).toBe(" ");
    });
  });

  describe("setCell", () => {
    it("sets a character at the specified position", () => {
      const canvas = createCanvas(3, 3);
      setCell({ canvas, col: 1, row: 1, char: "X", z: 1 });
      expect(canvas.cells[1]![1]!.char).toBe("X");
    });

    it("overwrites when new z >= existing z", () => {
      const canvas = createCanvas(3, 3);
      setCell({ canvas, col: 1, row: 1, char: "A", z: 1 });
      setCell({ canvas, col: 1, row: 1, char: "B", z: 1 });
      expect(canvas.cells[1]![1]!.char).toBe("B");
    });

    it("does not overwrite when new z < existing z", () => {
      const canvas = createCanvas(3, 3);
      setCell({ canvas, col: 1, row: 1, char: "A", z: 2 });
      setCell({ canvas, col: 1, row: 1, char: "B", z: 1 });
      expect(canvas.cells[1]![1]!.char).toBe("A");
    });

    it("silently ignores out-of-bounds", () => {
      const canvas = createCanvas(3, 3);
      setCell({ canvas, col: -1, row: 0, char: "X", z: 1 });
      setCell({ canvas, col: 3, row: 0, char: "X", z: 1 });
      expect(renderCanvas(canvas)).toBe("");
    });
  });

  describe("drawBox", () => {
    it("draws a 4x3 box with corners and edges", () => {
      const canvas = createCanvas(6, 5);
      drawBox({ canvas, col: 1, row: 1, w: 4, h: 3, z: 1 });
      const result = renderCanvas(canvas);
      expect(result).toContain(`${BOX_CHARS.topLeft}${BOX_CHARS.horizontal}${BOX_CHARS.horizontal}${BOX_CHARS.topRight}`);
      expect(result).toContain(`${BOX_CHARS.vertical}  ${BOX_CHARS.vertical}`);
      expect(result).toContain(`${BOX_CHARS.bottomLeft}${BOX_CHARS.horizontal}${BOX_CHARS.horizontal}${BOX_CHARS.bottomRight}`);
    });

    it("draws a 2x2 box with only corners", () => {
      const canvas = createCanvas(4, 4);
      drawBox({ canvas, col: 1, row: 1, w: 2, h: 2, z: 1 });
      const result = renderCanvas(canvas);
      expect(result).toContain(`${BOX_CHARS.topLeft}${BOX_CHARS.topRight}`);
      expect(result).toContain(`${BOX_CHARS.bottomLeft}${BOX_CHARS.bottomRight}`);
    });

    it("draws + for 1x1", () => {
      const canvas = createCanvas(3, 3);
      drawBox({ canvas, col: 1, row: 1, w: 1, h: 1, z: 1 });
      expect(canvas.cells[1]![1]!.char).toBe("+");
    });

    it("skips box when width or height is 0", () => {
      const canvas = createCanvas(3, 3);
      drawBox({ canvas, col: 1, row: 1, w: 0, h: 3, z: 1 });
      expect(renderCanvas(canvas)).toBe("");
    });
  });

  describe("drawText", () => {
    it("draws text at the specified position", () => {
      const canvas = createCanvas(10, 1);
      drawText({ canvas, col: 0, row: 0, text: "Hello", maxLen: 10, z: 1 });
      expect(renderCanvas(canvas)).toBe("Hello");
    });

    it("truncates with ellipsis when text exceeds maxLen", () => {
      const canvas = createCanvas(10, 1);
      drawText({ canvas, col: 0, row: 0, text: "Hello World!", maxLen: 8, z: 1 });
      expect(renderCanvas(canvas)).toBe("Hello...");
    });

    it("truncates without ellipsis when maxLen <= 3", () => {
      const canvas = createCanvas(5, 1);
      drawText({ canvas, col: 0, row: 0, text: "Hello", maxLen: 3, z: 1 });
      expect(renderCanvas(canvas)).toBe("Hel");
    });

    it("draws nothing when maxLen is 0", () => {
      const canvas = createCanvas(5, 1);
      drawText({ canvas, col: 0, row: 0, text: "Hello", maxLen: 0, z: 1 });
      expect(renderCanvas(canvas)).toBe("");
    });
  });

  describe("truncateText", () => {
    it("returns text unchanged when within limit", () => {
      expect(truncateText("Hi", 5)).toBe("Hi");
    });

    it("truncates with ellipsis", () => {
      expect(truncateText("Hello World", 8)).toBe("Hello...");
    });

    it("truncates without ellipsis for very short maxLen", () => {
      expect(truncateText("Hello", 2)).toBe("He");
    });
  });

  describe("renderCanvas", () => {
    it("trims trailing spaces and empty lines", () => {
      const canvas = createCanvas(5, 3);
      setCell({ canvas, col: 0, row: 0, char: "A", z: 1 });
      expect(renderCanvas(canvas)).toBe("A");
    });

    it("returns empty string for blank canvas", () => {
      expect(renderCanvas(createCanvas(5, 3))).toBe("");
    });
  });

  describe("TABLE_CHARS", () => {
    it("includes all box-drawing characters", () => {
      expect(TABLE_CHARS.topTee).toBe("\u252C");
      expect(TABLE_CHARS.bottomTee).toBe("\u2534");
      expect(TABLE_CHARS.leftTee).toBe("\u251C");
      expect(TABLE_CHARS.rightTee).toBe("\u2524");
      expect(TABLE_CHARS.cross).toBe("\u253C");
    });
  });
});
