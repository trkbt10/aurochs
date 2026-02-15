/**
 * @file Parameter Hints Tests
 *
 * Tests for signature help / parameter hint detection.
 */

import { describe, expect, it } from "vitest";
import { detectParameterContext } from "./parameter-hints";
import type { VbaProcedure } from "@aurochs-office/vba";

// =============================================================================
// Test Helpers
// =============================================================================

const testProcedures: VbaProcedure[] = [
  {
    name: "MyFunction",
    type: "function",
    visibility: "public",
    parameters: [
      { name: "x", type: "Integer", isOptional: false, passingMode: "byRef", defaultValue: null, isParamArray: false },
      { name: "y", type: "String", isOptional: true, passingMode: "byVal", defaultValue: null, isParamArray: false },
    ],
    returnType: "Long",
  },
  {
    name: "MySub",
    type: "sub",
    visibility: "public",
    parameters: [
      { name: "msg", type: "String", isOptional: false, passingMode: "byVal", defaultValue: null, isParamArray: false },
    ],
    returnType: null,
  },
];

// =============================================================================
// Tests
// =============================================================================

describe("detectParameterContext", () => {
  describe("builtin functions", () => {
    it("detects MsgBox with first parameter", () => {
      const source = 'MsgBox("Hello"';
      const hint = detectParameterContext(source, source.length, []);
      expect(hint).toBeDefined();
      expect(hint?.functionName).toBe("MsgBox");
      expect(hint?.activeParameter).toBe(0);
    });

    it("detects MsgBox with second parameter", () => {
      const source = 'MsgBox("Hello", vbOKCancel';
      const hint = detectParameterContext(source, source.length, []);
      expect(hint).toBeDefined();
      expect(hint?.functionName).toBe("MsgBox");
      expect(hint?.activeParameter).toBe(1);
    });

    it("detects MsgBox with third parameter", () => {
      const source = 'MsgBox("Hello", vbOKCancel, "Title"';
      const hint = detectParameterContext(source, source.length, []);
      expect(hint).toBeDefined();
      expect(hint?.functionName).toBe("MsgBox");
      expect(hint?.activeParameter).toBe(2);
    });

    it("detects Left function", () => {
      const source = 'Left(str, ';
      const hint = detectParameterContext(source, source.length, []);
      expect(hint).toBeDefined();
      expect(hint?.functionName).toBe("Left");
      expect(hint?.activeParameter).toBe(1);
    });

    it("detects Mid function", () => {
      const source = 'Mid(str, 1, ';
      const hint = detectParameterContext(source, source.length, []);
      expect(hint).toBeDefined();
      expect(hint?.functionName).toBe("Mid");
      expect(hint?.activeParameter).toBe(2);
    });

    it("detects InStr function", () => {
      const source = 'InStr(str, "find"';
      const hint = detectParameterContext(source, source.length, []);
      expect(hint).toBeDefined();
      expect(hint?.functionName).toBe("InStr");
      expect(hint?.activeParameter).toBe(1);
    });

    it("detects Replace function", () => {
      const source = 'Replace(str, "old", "new"';
      const hint = detectParameterContext(source, source.length, []);
      expect(hint).toBeDefined();
      expect(hint?.functionName).toBe("Replace");
      expect(hint?.activeParameter).toBe(2);
    });
  });

  describe("user-defined procedures", () => {
    it("detects user function with first parameter", () => {
      const source = "MyFunction(10";
      const hint = detectParameterContext(source, source.length, testProcedures);
      expect(hint).toBeDefined();
      expect(hint?.functionName).toBe("MyFunction");
      expect(hint?.activeParameter).toBe(0);
    });

    it("detects user function with second parameter", () => {
      const source = 'MyFunction(10, "test"';
      const hint = detectParameterContext(source, source.length, testProcedures);
      expect(hint).toBeDefined();
      expect(hint?.functionName).toBe("MyFunction");
      expect(hint?.activeParameter).toBe(1);
    });

    it("detects user sub", () => {
      const source = 'MySub("Hello"';
      const hint = detectParameterContext(source, source.length, testProcedures);
      expect(hint).toBeDefined();
      expect(hint?.functionName).toBe("MySub");
      expect(hint?.activeParameter).toBe(0);
    });

    it("includes parameter info in hint", () => {
      const source = "MyFunction(";
      const hint = detectParameterContext(source, source.length, testProcedures);
      expect(hint).toBeDefined();
      expect(hint?.parameters).toHaveLength(2);
      expect(hint?.parameters[0].name).toBe("x");
      expect(hint?.parameters[0].isOptional).toBe(false);
      expect(hint?.parameters[1].name).toBe("y");
      expect(hint?.parameters[1].isOptional).toBe(true);
    });

    it("includes return type for function", () => {
      const source = "MyFunction(";
      const hint = detectParameterContext(source, source.length, testProcedures);
      expect(hint?.returnType).toBe("Long");
    });
  });

  describe("nested function calls", () => {
    it("detects inner function", () => {
      const source = 'MsgBox(Left("Hello", ';
      const hint = detectParameterContext(source, source.length, []);
      expect(hint).toBeDefined();
      expect(hint?.functionName).toBe("Left");
      expect(hint?.activeParameter).toBe(1);
    });

    it("handles completed inner call", () => {
      const source = 'MsgBox(Left("Hello", 3), ';
      const hint = detectParameterContext(source, source.length, []);
      expect(hint).toBeDefined();
      expect(hint?.functionName).toBe("MsgBox");
      expect(hint?.activeParameter).toBe(1);
    });

    it("handles deeply nested calls", () => {
      const source = 'MsgBox(Left(Right("Test", 2), ';
      const hint = detectParameterContext(source, source.length, []);
      expect(hint).toBeDefined();
      expect(hint?.functionName).toBe("Left");
      expect(hint?.activeParameter).toBe(1);
    });
  });

  describe("string handling", () => {
    it("ignores commas inside strings", () => {
      const source = 'MsgBox("Hello, World", ';
      const hint = detectParameterContext(source, source.length, []);
      expect(hint).toBeDefined();
      expect(hint?.functionName).toBe("MsgBox");
      expect(hint?.activeParameter).toBe(1); // Second param, not third
    });

    it("handles escaped quotes in strings", () => {
      const source = 'MsgBox("Say ""Hello""", ';
      const hint = detectParameterContext(source, source.length, []);
      expect(hint).toBeDefined();
      expect(hint?.functionName).toBe("MsgBox");
      expect(hint?.activeParameter).toBe(1);
    });
  });

  describe("edge cases", () => {
    it("returns undefined outside function call", () => {
      const source = "Dim x As Integer";
      const hint = detectParameterContext(source, source.length, []);
      expect(hint).toBeUndefined();
    });

    it("returns undefined for unknown function", () => {
      const source = "UnknownFunc(";
      const hint = detectParameterContext(source, source.length, []);
      expect(hint).toBeUndefined();
    });

    it("returns undefined after closing paren", () => {
      const source = 'MsgBox("Done")';
      const hint = detectParameterContext(source, source.length, []);
      expect(hint).toBeUndefined();
    });

    it("handles whitespace before function name", () => {
      const source = '    MsgBox("Test"';
      const hint = detectParameterContext(source, source.length, []);
      expect(hint).toBeDefined();
      expect(hint?.functionName).toBe("MsgBox");
    });

    it("handles newlines in source", () => {
      const source = 'result = MsgBox(\n    "Test",\n    ';
      const hint = detectParameterContext(source, source.length, []);
      expect(hint).toBeDefined();
      expect(hint?.functionName).toBe("MsgBox");
      expect(hint?.activeParameter).toBe(1);
    });
  });

  describe("signature formatting", () => {
    it("formats builtin signature correctly", () => {
      const source = 'MsgBox("';
      const hint = detectParameterContext(source, source.length, []);
      expect(hint?.signature).toContain("MsgBox");
      expect(hint?.signature).toContain("Prompt");
      expect(hint?.signature).toContain("Buttons");
    });

    it("formats user procedure signature", () => {
      const source = "MyFunction(";
      const hint = detectParameterContext(source, source.length, testProcedures);
      expect(hint?.signature).toContain("Function");
      expect(hint?.signature).toContain("MyFunction");
      expect(hint?.signature).toContain("Long"); // Return type
    });
  });
});
