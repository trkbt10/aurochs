/**
 * @file Procedure Range Tests
 */

import { describe, expect, it } from "bun:test";
import { findProcedureRanges, getProcedureAtLine } from "./procedure-range";

describe("findProcedureRanges", () => {
  it("finds a single Sub", () => {
    const source = `
Sub Main()
  MsgBox "Hello"
End Sub
`.trim();

    const ranges = findProcedureRanges(source);
    expect(ranges).toEqual([
      { name: "Main", type: "sub", startLine: 1, endLine: 3 },
    ]);
  });

  it("finds a single Function", () => {
    const source = `
Function Add(a, b)
  Add = a + b
End Function
`.trim();

    const ranges = findProcedureRanges(source);
    expect(ranges).toEqual([
      { name: "Add", type: "function", startLine: 1, endLine: 3 },
    ]);
  });

  it("finds multiple procedures", () => {
    const source = `
Option Explicit

Public Sub Main()
  Test
End Sub

Private Function Test()
  Test = 42
End Function
`.trim();

    const ranges = findProcedureRanges(source);
    expect(ranges).toEqual([
      { name: "Main", type: "sub", startLine: 3, endLine: 5 },
      { name: "Test", type: "function", startLine: 7, endLine: 9 },
    ]);
  });

  it("handles Private/Public modifiers", () => {
    const source = `
Private Sub PrivateSub()
End Sub

Public Function PublicFunc()
End Function
`.trim();

    const ranges = findProcedureRanges(source);
    expect(ranges).toEqual([
      { name: "PrivateSub", type: "sub", startLine: 1, endLine: 2 },
      { name: "PublicFunc", type: "function", startLine: 4, endLine: 5 },
    ]);
  });
});

describe("getProcedureAtLine", () => {
  const source = `
Option Explicit

Sub Main()
  MsgBox "Hello"
End Sub

Function Test()
  Test = 42
End Function
`.trim();

  it("returns null for lines outside procedures", () => {
    expect(getProcedureAtLine(source, 1)).toBeNull(); // Option Explicit
    expect(getProcedureAtLine(source, 2)).toBeNull(); // Empty line
    expect(getProcedureAtLine(source, 6)).toBeNull(); // Empty line between procedures
  });

  it("returns the procedure for lines inside Sub", () => {
    const proc = getProcedureAtLine(source, 3); // Sub Main()
    expect(proc).toEqual({ name: "Main", type: "sub", startLine: 3, endLine: 5 });

    const proc2 = getProcedureAtLine(source, 4); // MsgBox "Hello"
    expect(proc2).toEqual({ name: "Main", type: "sub", startLine: 3, endLine: 5 });

    const proc3 = getProcedureAtLine(source, 5); // End Sub
    expect(proc3).toEqual({ name: "Main", type: "sub", startLine: 3, endLine: 5 });
  });

  it("returns the procedure for lines inside Function", () => {
    const proc = getProcedureAtLine(source, 7); // Function Test()
    expect(proc).toEqual({ name: "Test", type: "function", startLine: 7, endLine: 9 });
  });
});
