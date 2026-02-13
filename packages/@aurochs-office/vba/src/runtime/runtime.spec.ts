/**
 * @file VBA Runtime tests
 */

import type { VbaDimStmt } from "../ir/statement";
import { parseVbaSource, parseVbaExpression } from "../parser/source-parser";
import { createVbaExecutionContext } from "./scope";
import { evaluateExpression } from "./evaluator";
import { executeStatements } from "./executor";
import { toNumber, toString, toBoolean } from "./value";
import { getBuiltinFunction, getVbaConstant } from "./builtins";

describe("VBA Runtime", () => {
  describe("Value utilities", () => {
    it("converts to number", () => {
      expect(toNumber(42)).toBe(42);
      expect(toNumber("3.14")).toBe(3.14);
      expect(toNumber(true)).toBe(-1);
      expect(toNumber(false)).toBe(0);
      expect(toNumber(undefined)).toBe(0); // Empty
    });

    it("converts to string", () => {
      expect(toString(42)).toBe("42");
      expect(toString(true)).toBe("True");
      expect(toString(false)).toBe("False");
      expect(toString(undefined)).toBe("");
    });

    it("converts to boolean", () => {
      expect(toBoolean(1)).toBe(true);
      expect(toBoolean(0)).toBe(false);
      expect(toBoolean("true")).toBe(true);
      expect(toBoolean("")).toBe(false);
    });
  });

  describe("Built-in functions", () => {
    it("Abs", () => {
      const abs = getBuiltinFunction("Abs");
      expect(abs).toBeDefined();
      expect(abs!([-5])).toBe(5);
      expect(abs!([3.14])).toBe(3.14);
    });

    it("Len", () => {
      const len = getBuiltinFunction("Len");
      expect(len).toBeDefined();
      expect(len!(["hello"])).toBe(5);
      expect(len!([""])).toBe(0);
    });

    it("Left", () => {
      const left = getBuiltinFunction("Left");
      expect(left).toBeDefined();
      expect(left!(["hello", 3])).toBe("hel");
    });

    it("Mid", () => {
      const mid = getBuiltinFunction("Mid");
      expect(mid).toBeDefined();
      expect(mid!(["hello", 2, 3])).toBe("ell");
      expect(mid!(["hello", 2])).toBe("ello");
    });

    it("UCase/LCase", () => {
      const ucase = getBuiltinFunction("UCase");
      const lcase = getBuiltinFunction("LCase");
      expect(ucase!(["hello"])).toBe("HELLO");
      expect(lcase!(["HELLO"])).toBe("hello");
    });

    it("Trim", () => {
      const trim = getBuiltinFunction("Trim");
      expect(trim!([" hello "])).toBe("hello");
    });

    it("IIf", () => {
      const iif = getBuiltinFunction("IIf");
      expect(iif!([true, "yes", "no"])).toBe("yes");
      expect(iif!([false, "yes", "no"])).toBe("no");
    });
  });

  describe("VBA constants", () => {
    it("returns True/False", () => {
      expect(getVbaConstant("True")).toBe(true);
      expect(getVbaConstant("False")).toBe(false);
    });

    it("returns vbCrLf", () => {
      expect(getVbaConstant("vbCrLf")).toBe("\r\n");
    });

    it("returns Nothing", () => {
      expect(getVbaConstant("Nothing")).toBe(null);
    });
  });

  describe("Expression evaluation", () => {
    const ctx = createVbaExecutionContext();

    it("evaluates number literals", () => {
      const expr = parseVbaExpression("42");
      expect(evaluateExpression(expr, ctx)).toBe(42);
    });

    it("evaluates string literals", () => {
      const expr = parseVbaExpression('"hello"');
      expect(evaluateExpression(expr, ctx)).toBe("hello");
    });

    it("evaluates boolean literals", () => {
      expect(evaluateExpression(parseVbaExpression("True"), ctx)).toBe(true);
      expect(evaluateExpression(parseVbaExpression("False"), ctx)).toBe(false);
    });

    it("evaluates arithmetic expressions", () => {
      expect(evaluateExpression(parseVbaExpression("2 + 3"), ctx)).toBe(5);
      expect(evaluateExpression(parseVbaExpression("10 - 4"), ctx)).toBe(6);
      expect(evaluateExpression(parseVbaExpression("3 * 4"), ctx)).toBe(12);
      expect(evaluateExpression(parseVbaExpression("10 / 4"), ctx)).toBe(2.5);
      expect(evaluateExpression(parseVbaExpression("10 \\ 3"), ctx)).toBe(3);
      expect(evaluateExpression(parseVbaExpression("10 Mod 3"), ctx)).toBe(1);
      expect(evaluateExpression(parseVbaExpression("2 ^ 3"), ctx)).toBe(8);
    });

    it("evaluates string concatenation", () => {
      expect(evaluateExpression(parseVbaExpression('"hello" & " " & "world"'), ctx)).toBe("hello world");
    });

    it("evaluates comparison expressions", () => {
      expect(evaluateExpression(parseVbaExpression("5 > 3"), ctx)).toBe(true);
      expect(evaluateExpression(parseVbaExpression("5 < 3"), ctx)).toBe(false);
      expect(evaluateExpression(parseVbaExpression("5 = 5"), ctx)).toBe(true);
      expect(evaluateExpression(parseVbaExpression("5 <> 3"), ctx)).toBe(true);
    });

    it("evaluates logical expressions", () => {
      expect(evaluateExpression(parseVbaExpression("True And True"), ctx)).toBe(true);
      expect(evaluateExpression(parseVbaExpression("True And False"), ctx)).toBe(false);
      expect(evaluateExpression(parseVbaExpression("True Or False"), ctx)).toBe(true);
      expect(evaluateExpression(parseVbaExpression("Not True"), ctx)).toBe(false);
    });

    it("evaluates unary negation", () => {
      expect(evaluateExpression(parseVbaExpression("-5"), ctx)).toBe(-5);
      expect(evaluateExpression(parseVbaExpression("-(3 + 2)"), ctx)).toBe(-5);
    });
  });

  describe("Statement execution", () => {
    it("executes assignment statements", () => {
      const ctx = createVbaExecutionContext();
      ctx.initModule({ name: "Module1", type: "standard", sourceCode: "", streamOffset: 0, procedures: [] });
      ctx.enterProcedure("Module1", "Test");

      const statements = parseVbaSource("x = 10");
      executeStatements(statements, ctx);

      expect(ctx.getCurrentScope().get("x")).toBe(10);
    });

    it("executes If statements", () => {
      const ctx = createVbaExecutionContext();
      ctx.initModule({ name: "Module1", type: "standard", sourceCode: "", streamOffset: 0, procedures: [] });
      ctx.enterProcedure("Module1", "Test");

      const statements = parseVbaSource(`
        x = 5
        If x > 3 Then
          y = 1
        Else
          y = 2
        End If
      `);
      executeStatements(statements, ctx);

      expect(ctx.getCurrentScope().get("y")).toBe(1);
    });

    it("executes For loops", () => {
      const ctx = createVbaExecutionContext();
      ctx.initModule({ name: "Module1", type: "standard", sourceCode: "", streamOffset: 0, procedures: [] });
      ctx.enterProcedure("Module1", "Test");

      const statements = parseVbaSource(`
        sum = 0
        For i = 1 To 5
          sum = sum + i
        Next
      `);
      executeStatements(statements, ctx);

      expect(ctx.getCurrentScope().get("sum")).toBe(15); // 1+2+3+4+5
    });

    it("executes While loops", () => {
      const ctx = createVbaExecutionContext();
      ctx.initModule({ name: "Module1", type: "standard", sourceCode: "", streamOffset: 0, procedures: [] });
      ctx.enterProcedure("Module1", "Test");

      const statements = parseVbaSource(`
        x = 0
        While x < 5
          x = x + 1
        Wend
      `);
      executeStatements(statements, ctx);

      expect(ctx.getCurrentScope().get("x")).toBe(5);
    });

    it("executes Do While loops", () => {
      const ctx = createVbaExecutionContext();
      ctx.initModule({ name: "Module1", type: "standard", sourceCode: "", streamOffset: 0, procedures: [] });
      ctx.enterProcedure("Module1", "Test");

      const statements = parseVbaSource(`
        x = 0
        Do While x < 3
          x = x + 1
        Loop
      `);
      executeStatements(statements, ctx);

      expect(ctx.getCurrentScope().get("x")).toBe(3);
    });

    it("executes Select Case", () => {
      const ctx = createVbaExecutionContext();
      ctx.initModule({ name: "Module1", type: "standard", sourceCode: "", streamOffset: 0, procedures: [] });
      ctx.enterProcedure("Module1", "Test");

      const statements = parseVbaSource(`
        x = 2
        Select Case x
          Case 1
            result = "one"
          Case 2
            result = "two"
          Case Else
            result = "other"
        End Select
      `);
      executeStatements(statements, ctx);

      expect(ctx.getCurrentScope().get("result")).toBe("two");
    });

    it("executes Exit For", () => {
      const ctx = createVbaExecutionContext();
      ctx.initModule({ name: "Module1", type: "standard", sourceCode: "", streamOffset: 0, procedures: [] });
      ctx.enterProcedure("Module1", "Test");

      const statements = parseVbaSource(`
        count = 0
        For i = 1 To 10
          count = count + 1
          If i = 3 Then Exit For
        Next
      `);
      executeStatements(statements, ctx);

      expect(ctx.getCurrentScope().get("count")).toBe(3);
    });
  });

  describe("Source parser", () => {
    it("parses Dim statements", () => {
      const statements = parseVbaSource("Dim x As Integer");
      expect(statements.length).toBe(1);
      expect(statements[0].type).toBe("dim");
    });

    it("parses array declarations", () => {
      const statements = parseVbaSource("Dim arr(10) As String");
      expect(statements.length).toBe(1);
      expect(statements[0].type).toBe("dim");
      const dim = statements[0] as VbaDimStmt;
      expect(dim.declarations[0].isArray).toBe(true);
    });

    it("parses nested If statements", () => {
      const statements = parseVbaSource(`
        If x > 0 Then
          If y > 0 Then
            z = 1
          End If
        End If
      `);
      expect(statements.length).toBe(1);
      expect(statements[0].type).toBe("if");
    });

    it("parses single-line If", () => {
      const statements = parseVbaSource("If x > 0 Then y = 1");
      expect(statements.length).toBe(1);
      expect(statements[0].type).toBe("if");
    });

    it("parses For Each", () => {
      const statements = parseVbaSource(`
        For Each item In collection
          DoSomething item
        Next
      `);
      expect(statements.length).toBe(1);
      expect(statements[0].type).toBe("forEach");
    });

    it("parses With statement", () => {
      const statements = parseVbaSource(`
        With obj
          .Property = 1
        End With
      `);
      expect(statements.length).toBe(1);
      expect(statements[0].type).toBe("with");
    });
  });
});
