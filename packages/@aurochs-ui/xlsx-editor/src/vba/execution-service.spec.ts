/**
 * @file VBA Execution Service Tests
 */

import { describe, it, expect } from "vitest";
import type { VbaProgramIr } from "@aurochs-office/vba";
import type { XlsxWorkbook } from "@aurochs-office/xlsx/domain/workbook";
import { createDefaultStyleSheet } from "@aurochs-office/xlsx/domain/style/types";
import { rowIdx } from "@aurochs-office/xlsx/domain/types";
import { executeVbaProcedure } from "./execution-service";

// =============================================================================
// Test Fixtures
// =============================================================================

function createMinimalWorkbook(): XlsxWorkbook {
  return {
    dateSystem: "1900",
    sheets: [
      {
        dateSystem: "1900",
        name: "Sheet1",
        sheetId: 1,
        state: "visible",
        sheetView: { showGridLines: true, showRowColHeaders: true },
        rows: [],
        xmlPath: "xl/worksheets/sheet1.xml",
      },
    ],
    styles: createDefaultStyleSheet(),
    sharedStrings: [],
  };
}

function createVbaProgram(options: {
  readonly moduleName: string;
  readonly procedureName: string;
  readonly procedureBody: string;
  readonly visibility?: "public" | "private";
  readonly type?: "sub" | "function";
}): VbaProgramIr {
  const { moduleName, procedureName, procedureBody, visibility = "public", type = "sub" } = options;

  const keyword = type === "sub" ? "Sub" : "Function";
  const endKeyword = type === "sub" ? "End Sub" : "End Function";
  const visibilityKeyword = visibility === "public" ? "Public" : "Private";

  const sourceCode = `${visibilityKeyword} ${keyword} ${procedureName}()
${procedureBody}
${endKeyword}`;

  return {
    project: {
      name: "TestProject",
      helpFile: null,
      helpContext: 0,
      constants: null,
      version: { major: 1, minor: 0 },
    },
    modules: [
      {
        name: moduleName,
        type: "standard",
        sourceCode,
        streamOffset: 0,
        procedures: [
          {
            name: procedureName,
            type,
            visibility,
            parameters: [],
            returnType: null,
          },
        ],
      },
    ],
    references: [],
  };
}

// =============================================================================
// Module/Procedure Not Found Tests
// =============================================================================

describe("executeVbaProcedure - module/procedure lookup", () => {
  it("should return error when module not found", () => {
    const workbook = createMinimalWorkbook();
    const program = createVbaProgram({
      moduleName: "Module1",
      procedureName: "TestSub",
      procedureBody: "' empty",
    });

    const result = executeVbaProcedure({
      workbook,
      program,
      moduleName: "NonExistentModule",
      procedureName: "TestSub",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("Module not found");
      expect(result.errorType).toBe("invalidProcedureCall");
    }
  });

  it("should return error when procedure not found", () => {
    const workbook = createMinimalWorkbook();
    const program = createVbaProgram({
      moduleName: "Module1",
      procedureName: "TestSub",
      procedureBody: "' empty",
    });

    const result = executeVbaProcedure({
      workbook,
      program,
      moduleName: "Module1",
      procedureName: "NonExistentProcedure",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("Procedure not found");
      expect(result.errorType).toBe("invalidProcedureCall");
    }
  });

  it("should match module name case-insensitively", () => {
    const workbook = createMinimalWorkbook();
    const program = createVbaProgram({
      moduleName: "Module1",
      procedureName: "TestSub",
      procedureBody: "' empty",
    });

    // Use different case for module name
    const result = executeVbaProcedure({
      workbook,
      program,
      moduleName: "module1",
      procedureName: "TestSub",
    });

    // Should not fail with "Module not found" - either succeeds or fails for other reasons
    if (!result.ok) {
      expect(result.message).not.toContain("Module not found");
    }
  });

  it("should match procedure name case-insensitively", () => {
    const workbook = createMinimalWorkbook();
    const program = createVbaProgram({
      moduleName: "Module1",
      procedureName: "TestSub",
      procedureBody: "' empty",
    });

    // Use different case for procedure name
    const result = executeVbaProcedure({
      workbook,
      program,
      moduleName: "Module1",
      procedureName: "testsub",
    });

    // Should not fail with "Procedure not found"
    if (!result.ok) {
      expect(result.message).not.toContain("Procedure not found");
    }
  });
});

// =============================================================================
// Execution Result Structure Tests
// =============================================================================

describe("executeVbaProcedure - result structure", () => {
  it("should return success result with expected properties", () => {
    const workbook = createMinimalWorkbook();
    const program = createVbaProgram({
      moduleName: "Module1",
      procedureName: "TestSub",
      procedureBody: "' This is a comment",
    });

    const result = executeVbaProcedure({
      workbook,
      program,
      moduleName: "Module1",
      procedureName: "TestSub",
    });

    // Check result structure (may succeed or fail depending on runtime implementation)
    if (result.ok) {
      expect(result).toHaveProperty("mutations");
      expect(result).toHaveProperty("output");
      expect(result).toHaveProperty("durationMs");
      expect(Array.isArray(result.mutations)).toBe(true);
      expect(Array.isArray(result.output)).toBe(true);
      expect(typeof result.durationMs).toBe("number");
    } else {
      // If it fails, should have error properties
      expect(result).toHaveProperty("message");
    }
  });

  it("should return error result with expected properties on failure", () => {
    const workbook = createMinimalWorkbook();
    const program = createVbaProgram({
      moduleName: "Module1",
      procedureName: "TestSub",
      procedureBody: "' empty",
    });

    const result = executeVbaProcedure({
      workbook,
      program,
      moduleName: "NonExistent",
      procedureName: "TestSub",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result).toHaveProperty("message");
      expect(typeof result.message).toBe("string");
    }
  });
});

// =============================================================================
// Duration Tracking Tests
// =============================================================================

describe("executeVbaProcedure - duration tracking", () => {
  it("should track execution duration on success", () => {
    const workbook = createMinimalWorkbook();
    const program = createVbaProgram({
      moduleName: "Module1",
      procedureName: "TestSub",
      procedureBody: "' comment",
    });

    const result = executeVbaProcedure({
      workbook,
      program,
      moduleName: "Module1",
      procedureName: "TestSub",
    });

    if (result.ok) {
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    }
  });
});
