/** @file element-id tests */
import { createElementId, parseElementId } from "./element-id";
import type { PdfElementId } from "./element-id";

describe("element-id", () => {
  describe("createElementId", () => {
    it("creates a formatted element ID", () => {
      expect(createElementId(0, 0)).toBe("0:0");
      expect(createElementId(2, 5)).toBe("2:5");
    });

    it("returns a string matching PdfElementId template literal", () => {
      const id: PdfElementId = createElementId(1, 3);
      expect(id).toBe("1:3");
    });
  });

  describe("parseElementId", () => {
    it("parses an element ID to page and element indices", () => {
      const { pageIndex, elementIndex } = parseElementId("0:0" as PdfElementId);
      expect(pageIndex).toBe(0);
      expect(elementIndex).toBe(0);
    });

    it("parses multi-digit indices", () => {
      const { pageIndex, elementIndex } = parseElementId("12:34" as PdfElementId);
      expect(pageIndex).toBe(12);
      expect(elementIndex).toBe(34);
    });
  });

  describe("roundtrip", () => {
    it("create → parse preserves indices", () => {
      const id = createElementId(7, 13);
      const { pageIndex, elementIndex } = parseElementId(id);
      expect(pageIndex).toBe(7);
      expect(elementIndex).toBe(13);
    });
  });
});
