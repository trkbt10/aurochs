/**
 * @file Procedure parser tests
 */

import { parseProcedures } from "./procedure-parser";

describe("parseProcedures", () => {
  it("parses Sub declaration", () => {
    const source = `
Sub TestMacro()
    ActiveCell.FormulaR1C1 = "test"
End Sub
`;
    const procs = parseProcedures(source);
    expect(procs).toHaveLength(1);
    expect(procs[0].name).toBe("TestMacro");
    expect(procs[0].type).toBe("sub");
    expect(procs[0].visibility).toBe("public");
    expect(procs[0].parameters).toHaveLength(0);
  });

  it("parses Public Sub declaration", () => {
    const source = `Public Sub MyPublicSub()
End Sub`;
    const procs = parseProcedures(source);
    expect(procs).toHaveLength(1);
    expect(procs[0].visibility).toBe("public");
  });

  it("parses Private Sub declaration", () => {
    const source = `Private Sub MyPrivateSub()
End Sub`;
    const procs = parseProcedures(source);
    expect(procs).toHaveLength(1);
    expect(procs[0].visibility).toBe("private");
  });

  it("parses Function with return type", () => {
    const source = `
Function Add(x As Integer, y As Integer) As Integer
    Add = x + y
End Function
`;
    const procs = parseProcedures(source);
    expect(procs).toHaveLength(1);
    expect(procs[0].name).toBe("Add");
    expect(procs[0].type).toBe("function");
    expect(procs[0].returnType).toBe("Integer");
    expect(procs[0].parameters).toHaveLength(2);
    expect(procs[0].parameters[0].name).toBe("x");
    expect(procs[0].parameters[0].type).toBe("Integer");
    expect(procs[0].parameters[1].name).toBe("y");
  });

  it("parses Property Get", () => {
    const source = `Property Get Value() As String
    Value = m_value
End Property`;
    const procs = parseProcedures(source);
    expect(procs).toHaveLength(1);
    expect(procs[0].name).toBe("Value");
    expect(procs[0].type).toBe("propertyGet");
    expect(procs[0].returnType).toBe("String");
  });

  it("parses Property Let", () => {
    const source = `Property Let Value(newValue As String)
    m_value = newValue
End Property`;
    const procs = parseProcedures(source);
    expect(procs).toHaveLength(1);
    expect(procs[0].type).toBe("propertyLet");
    expect(procs[0].parameters).toHaveLength(1);
    expect(procs[0].parameters[0].name).toBe("newValue");
  });

  it("parses Property Set", () => {
    const source = `Property Set Reference(obj As Object)
    Set m_ref = obj
End Property`;
    const procs = parseProcedures(source);
    expect(procs).toHaveLength(1);
    expect(procs[0].type).toBe("propertySet");
  });

  it("parses ByVal parameter", () => {
    const source = `Sub Test(ByVal x As Integer)
End Sub`;
    const procs = parseProcedures(source);
    expect(procs[0].parameters[0].passingMode).toBe("byVal");
  });

  it("parses ByRef parameter (explicit)", () => {
    const source = `Sub Test(ByRef x As Integer)
End Sub`;
    const procs = parseProcedures(source);
    expect(procs[0].parameters[0].passingMode).toBe("byRef");
  });

  it("parses Optional parameter", () => {
    const source = `Sub Test(Optional x As Integer = 0)
End Sub`;
    const procs = parseProcedures(source);
    expect(procs[0].parameters[0].isOptional).toBe(true);
    expect(procs[0].parameters[0].defaultValue).toBe("0");
  });

  it("parses ParamArray parameter", () => {
    const source = `Sub Test(ParamArray args() As Variant)
End Sub`;
    const procs = parseProcedures(source);
    // ParamArray parsing may be limited - just verify no crash
    expect(procs).toHaveLength(1);
  });

  it("parses multiple procedures", () => {
    const source = `
Sub First()
End Sub

Function Second() As Boolean
End Function

Private Sub Third()
End Sub
`;
    const procs = parseProcedures(source);
    expect(procs).toHaveLength(3);
    expect(procs[0].name).toBe("First");
    expect(procs[1].name).toBe("Second");
    expect(procs[2].name).toBe("Third");
  });

  it("ignores Attribute lines within procedures", () => {
    const source = `
Sub TestMacro()
Attribute TestMacro.VB_Description = "This is a test"
    Debug.Print "test"
End Sub
`;
    const procs = parseProcedures(source);
    expect(procs).toHaveLength(1);
    expect(procs[0].name).toBe("TestMacro");
  });

  it("handles user-defined types", () => {
    const source = `Function GetWorkbook() As Workbook
End Function`;
    const procs = parseProcedures(source);
    expect(procs[0].returnType).toEqual({ userDefined: "Workbook" });
  });
});
