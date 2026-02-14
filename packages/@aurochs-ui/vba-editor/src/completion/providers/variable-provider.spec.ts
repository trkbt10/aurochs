/**
 * @file Variable Provider Tests
 *
 * Tests for variable extraction from VBA source code.
 */

import { describe, expect, it } from "bun:test";
import { variableProvider } from "./variable-provider";
import type { CompletionContext } from "../types";

// =============================================================================
// Test Helpers
// =============================================================================

function createContext(prefix: string, trigger: "typing" | "dot" | "manual" = "typing"): CompletionContext {
  return {
    trigger,
    prefix,
    prefixStartOffset: 0,
    line: 1,
    column: 1,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("variableProvider", () => {
  describe("Dim declarations", () => {
    it("extracts single variable from Dim", () => {
      const source = "Dim x As Integer";
      const items = variableProvider.provideCompletions(createContext(""), source, []);
      expect(items.map((i) => i.label)).toContain("x");
    });

    it("extracts multiple variables from single Dim", () => {
      const source = "Dim x, y, z As String";
      const items = variableProvider.provideCompletions(createContext(""), source, []);
      const labels = items.map((i) => i.label);
      expect(labels).toContain("x");
      expect(labels).toContain("y");
      expect(labels).toContain("z");
    });

    it("extracts array variable", () => {
      const source = "Dim arr(10) As Integer";
      const items = variableProvider.provideCompletions(createContext(""), source, []);
      expect(items.map((i) => i.label)).toContain("arr");
    });

    it("extracts from ReDim", () => {
      const source = "ReDim buffer(100) As Byte";
      const items = variableProvider.provideCompletions(createContext(""), source, []);
      expect(items.map((i) => i.label)).toContain("buffer");
    });

    it("extracts from Const", () => {
      const source = "Const PI = 3.14159";
      const items = variableProvider.provideCompletions(createContext(""), source, []);
      expect(items.map((i) => i.label)).toContain("PI");
    });

    it("extracts from Static", () => {
      const source = "Static counter As Long";
      const items = variableProvider.provideCompletions(createContext(""), source, []);
      expect(items.map((i) => i.label)).toContain("counter");
    });

    it("extracts from Public", () => {
      const source = "Public globalVar As String";
      const items = variableProvider.provideCompletions(createContext(""), source, []);
      expect(items.map((i) => i.label)).toContain("globalVar");
    });

    it("extracts from Private", () => {
      const source = "Private moduleVar As Integer";
      const items = variableProvider.provideCompletions(createContext(""), source, []);
      expect(items.map((i) => i.label)).toContain("moduleVar");
    });
  });

  describe("For loop variables", () => {
    it("extracts For loop counter", () => {
      const source = "For i = 1 To 10\nNext i";
      const items = variableProvider.provideCompletions(createContext(""), source, []);
      expect(items.map((i) => i.label)).toContain("i");
    });

    it("extracts For Each variable", () => {
      const source = "For Each item In collection\nNext item";
      const items = variableProvider.provideCompletions(createContext(""), source, []);
      expect(items.map((i) => i.label)).toContain("item");
    });

    it("marks For variable as loop variable", () => {
      const source = "For idx = 0 To 100\nNext idx";
      const items = variableProvider.provideCompletions(createContext(""), source, []);
      const idx = items.find((i) => i.label === "idx");
      expect(idx?.detail).toBe("Loop variable");
    });
  });

  describe("Procedure parameters", () => {
    it("extracts Sub parameters", () => {
      const source = "Sub Test(x As Integer, y As String)\nEnd Sub";
      const items = variableProvider.provideCompletions(createContext(""), source, []);
      const labels = items.map((i) => i.label);
      expect(labels).toContain("x");
      expect(labels).toContain("y");
    });

    it("extracts Function parameters", () => {
      const source = "Function Calc(a As Double, b As Double) As Double\nEnd Function";
      const items = variableProvider.provideCompletions(createContext(""), source, []);
      const labels = items.map((i) => i.label);
      expect(labels).toContain("a");
      expect(labels).toContain("b");
    });

    it("extracts Property Get parameters", () => {
      const source = "Property Get Value(index As Long) As Variant\nEnd Property";
      const items = variableProvider.provideCompletions(createContext(""), source, []);
      expect(items.map((i) => i.label)).toContain("index");
    });

    it("handles ByVal parameters", () => {
      const source = "Sub Test(ByVal name As String)\nEnd Sub";
      const items = variableProvider.provideCompletions(createContext(""), source, []);
      expect(items.map((i) => i.label)).toContain("name");
    });

    it("handles ByRef parameters", () => {
      const source = "Sub Modify(ByRef value As Integer)\nEnd Sub";
      const items = variableProvider.provideCompletions(createContext(""), source, []);
      expect(items.map((i) => i.label)).toContain("value");
    });

    it("handles Optional parameters", () => {
      const source = "Sub Test(Optional msg As String)\nEnd Sub";
      const items = variableProvider.provideCompletions(createContext(""), source, []);
      expect(items.map((i) => i.label)).toContain("msg");
    });

    it("marks parameters correctly", () => {
      const source = "Sub Test(param As Integer)\nEnd Sub";
      const items = variableProvider.provideCompletions(createContext(""), source, []);
      const param = items.find((i) => i.label === "param");
      expect(param?.detail).toBe("Parameter");
    });
  });

  describe("deduplication", () => {
    it("deduplicates same variable name", () => {
      const source = "Dim x As Integer\nDim x As String";
      const items = variableProvider.provideCompletions(createContext(""), source, []);
      const xCount = items.filter((i) => i.label.toLowerCase() === "x").length;
      expect(xCount).toBe(1);
    });

    it("deduplicates case-insensitively", () => {
      const source = "Dim MyVar As Integer\nDim myvar As String";
      const items = variableProvider.provideCompletions(createContext(""), source, []);
      const count = items.filter((i) => i.label.toLowerCase() === "myvar").length;
      expect(count).toBe(1);
    });
  });

  describe("filtering", () => {
    it("filters by prefix", () => {
      const source = "Dim counter As Integer\nDim count As Integer\nDim name As String";
      const items = variableProvider.provideCompletions(createContext("cou"), source, []);
      const labels = items.map((i) => i.label);
      expect(labels).toContain("counter");
      expect(labels).toContain("count");
      expect(labels).not.toContain("name");
    });

    it("returns empty for dot trigger", () => {
      const source = "Dim x As Integer";
      const items = variableProvider.provideCompletions(createContext("", "dot"), source, []);
      expect(items).toHaveLength(0);
    });
  });

  describe("complex source code", () => {
    it("extracts from realistic VBA module", () => {
      const source = `
Option Explicit
Private mCount As Long

Public Sub ProcessData(ByVal data As Variant)
    Dim i As Integer
    Dim result As String

    For i = LBound(data) To UBound(data)
        result = result & data(i)
    Next i
End Sub

Private Function Calculate(a As Double, b As Double) As Double
    Static callCount As Long
    callCount = callCount + 1
    Calculate = a + b
End Function
`;
      const items = variableProvider.provideCompletions(createContext(""), source, []);
      const labels = items.map((i) => i.label);

      expect(labels).toContain("mCount");
      expect(labels).toContain("data");
      expect(labels).toContain("i");
      expect(labels).toContain("result");
      expect(labels).toContain("a");
      expect(labels).toContain("b");
      expect(labels).toContain("callCount");
    });
  });
});
