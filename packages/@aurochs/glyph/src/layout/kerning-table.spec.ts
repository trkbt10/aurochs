/**
 * @file Tests for kerning-table.ts
 *
 * Tests font kerning table storage and retrieval.
 */
import {
  setKerningTable,
  getKerningAdjustment,
  hasKerningTable,
  clearKerningTables,
} from "./kerning-table";
import type { KerningTable } from "../types";

describe("kerning-table", () => {
  beforeEach(() => {
    clearKerningTables();
  });

  describe("setKerningTable / getKerningAdjustment", () => {
    it("should return 0 for missing kerning table", () => {
      expect(getKerningAdjustment("Arial", "A", "V")).toBe(0);
    });

    it("should return 0 for missing kerning pair", () => {
      const table: KerningTable = {
        pairs: new Map([["AV", -0.5]]),
      };
      setKerningTable("Arial", table);

      expect(getKerningAdjustment("Arial", "T", "o")).toBe(0);
    });

    it("should return kerning adjustment for known pair", () => {
      const table: KerningTable = {
        pairs: new Map([
          ["AV", -0.5],
          ["To", -0.3],
          ["WA", -0.4],
        ]),
      };
      setKerningTable("Arial", table);

      expect(getKerningAdjustment("Arial", "A", "V")).toBe(-0.5);
      expect(getKerningAdjustment("Arial", "T", "o")).toBe(-0.3);
      expect(getKerningAdjustment("Arial", "W", "A")).toBe(-0.4);
    });
  });

  describe("hasKerningTable", () => {
    it("should return false when no kerning table exists", () => {
      expect(hasKerningTable("Arial")).toBe(false);
    });

    it("should return true when kerning table exists", () => {
      const table: KerningTable = {
        pairs: new Map([["AV", -0.5]]),
      };
      setKerningTable("Arial", table);

      expect(hasKerningTable("Arial")).toBe(true);
    });
  });

  describe("clearKerningTables", () => {
    it("should clear all kerning tables", () => {
      const table: KerningTable = {
        pairs: new Map([["AV", -0.5]]),
      };
      setKerningTable("Arial", table);
      setKerningTable("Times", table);

      clearKerningTables();

      expect(hasKerningTable("Arial")).toBe(false);
      expect(hasKerningTable("Times")).toBe(false);
    });
  });
});
