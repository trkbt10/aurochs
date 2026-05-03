/** @file Tests for shared boolean path operation SoT. */

import { createBooleanOperationEnum, evaluateBooleanPathResult, evaluateBooleanPaths, resolveBooleanOperationType } from "./boolean-operation";

const squareA = "M0 0 L100 0 L100 100 L0 100 Z";
const squareB = "M50 0 L150 0 L150 100 L50 100 Z";

describe("boolean-operation", () => {
  it("creates and resolves Figma boolean operation enum values", () => {
    expect(createBooleanOperationEnum("INTERSECT")).toEqual({ value: 2, name: "INTERSECT" });
    expect(resolveBooleanOperationType({ value: 3, name: "EXCLUDE" })).toBe("EXCLUDE");
    expect(resolveBooleanOperationType({ value: 99, name: "SUBTRACT" })).toBe("SUBTRACT");
    expect(resolveBooleanOperationType(undefined)).toBe("UNION");
  });

  it("evaluates all supported operations through one path-bool adapter", () => {
    const inputs = [
      { d: squareA, windingRule: "nonzero" as const },
      { d: squareB, windingRule: "nonzero" as const },
    ];

    expect(evaluateBooleanPaths(inputs, "UNION")?.[0]).toContain("M");
    expect(evaluateBooleanPaths(inputs, "SUBTRACT")?.[0]).toContain("M");
    expect(evaluateBooleanPaths(inputs, "INTERSECT")?.[0]).toContain("M");
    expect(evaluateBooleanPaths(inputs, "EXCLUDE")?.[0]).toContain("M");
  });

  it("returns structured errors instead of hiding unevaluable input", () => {
    expect(evaluateBooleanPathResult([], "UNION")).toEqual({ ok: false, error: { reason: "NO_INPUT_PATHS" } });
    const malformed = evaluateBooleanPathResult([
      { d: "this is not a path", windingRule: "nonzero" },
      { d: squareB, windingRule: "nonzero" },
    ], "UNION");

    expect(malformed.ok).toBe(false);
    expect(malformed.ok ? undefined : malformed.error.reason).toBe("PATH_EVALUATION_FAILED");
    expect(() => evaluateBooleanPaths([], "UNION")).toThrow("NO_INPUT_PATHS");
  });
});
