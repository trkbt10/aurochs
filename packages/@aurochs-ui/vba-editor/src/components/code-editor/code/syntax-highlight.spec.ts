/**
 * @file Syntax highlighting tests
 */

import { tokenizeLine, getTokenColor, type Token } from "./syntax-highlight";

// =============================================================================
// Helper
// =============================================================================

function getTokenTypes(tokens: readonly Token[]): readonly string[] {
  return tokens.map((t) => t.type);
}

// =============================================================================
// Tests
// =============================================================================

describe("tokenizeLine", () => {
  describe("keywords", () => {
    it("recognizes VBA keywords", () => {
      const tokens = tokenizeLine("Sub Test()");

      expect(getTokenTypes(tokens)).toEqual([
        "keyword",
        "whitespace",
        "identifier",
        "punctuation",
        "punctuation",
      ]);
      expect(tokens[0].text).toBe("Sub");
    });

    it("recognizes control flow keywords", () => {
      const tokens = tokenizeLine("If x Then y Else z");
      const keywords = tokens.filter((t) => t.type === "keyword");

      expect(keywords.map((k) => k.text)).toEqual(["If", "Then", "Else"]);
    });

    it("recognizes loop keywords", () => {
      const tokens = tokenizeLine("For i = 1 To 10 Step 2");
      const keywords = tokens.filter((t) => t.type === "keyword");

      expect(keywords.map((k) => k.text)).toEqual(["For", "To", "Step"]);
    });

    it("recognizes logical operators as keywords", () => {
      const tokens = tokenizeLine("If a And b Or Not c Then");
      const keywords = tokens.filter((t) => t.type === "keyword");

      expect(keywords.map((k) => k.text)).toEqual(["If", "And", "Or", "Not", "Then"]);
    });
  });

  describe("types", () => {
    it("recognizes VBA types", () => {
      const tokens = tokenizeLine("Dim x As Integer");
      const types = tokens.filter((t) => t.type === "type");

      expect(types.map((t) => t.text)).toEqual(["Integer"]);
    });

    it("recognizes multiple types", () => {
      const tokens = tokenizeLine("Function Test(a As String, b As Boolean) As Long");
      const types = tokens.filter((t) => t.type === "type");

      expect(types.map((t) => t.text)).toEqual(["String", "Boolean", "Long"]);
    });
  });

  describe("builtins", () => {
    it("recognizes built-in functions", () => {
      const tokens = tokenizeLine("MsgBox Len(str)");
      const builtins = tokens.filter((t) => t.type === "builtin");

      expect(builtins.map((t) => t.text)).toEqual(["MsgBox", "Len"]);
    });

    it("recognizes type conversion functions", () => {
      const tokens = tokenizeLine("CInt(x) + CDbl(y)");
      const builtins = tokens.filter((t) => t.type === "builtin");

      expect(builtins.map((t) => t.text)).toEqual(["CInt", "CDbl"]);
    });
  });

  describe("strings", () => {
    it("tokenizes string literals", () => {
      const tokens = tokenizeLine('x = "Hello World"');
      const strings = tokens.filter((t) => t.type === "string");

      expect(strings).toHaveLength(1);
      expect(strings[0].text).toBe('"Hello World"');
    });

    it("handles escaped quotes", () => {
      const tokens = tokenizeLine('x = "Say ""Hello"""');
      const strings = tokens.filter((t) => t.type === "string");

      expect(strings[0].text).toBe('"Say ""Hello"""');
    });

    it("handles empty string", () => {
      const tokens = tokenizeLine('x = ""');
      const strings = tokens.filter((t) => t.type === "string");

      expect(strings[0].text).toBe('""');
    });
  });

  describe("comments", () => {
    it("tokenizes single-quote comments", () => {
      const tokens = tokenizeLine("x = 1 ' This is a comment");
      const comments = tokens.filter((t) => t.type === "comment");

      expect(comments).toHaveLength(1);
      expect(comments[0].text).toBe("' This is a comment");
    });

    it("tokenizes Rem comments", () => {
      const tokens = tokenizeLine("Rem This is a comment");
      const comments = tokens.filter((t) => t.type === "comment");

      expect(comments).toHaveLength(1);
      expect(comments[0].text).toBe("Rem This is a comment");
    });

    it("treats entire line after comment as comment", () => {
      const tokens = tokenizeLine("' Sub Test() End Sub");

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe("comment");
    });
  });

  describe("numbers", () => {
    it("tokenizes integer literals", () => {
      const tokens = tokenizeLine("x = 42");
      const numbers = tokens.filter((t) => t.type === "number");

      expect(numbers[0].text).toBe("42");
    });

    it("tokenizes decimal literals", () => {
      const tokens = tokenizeLine("x = 3.14");
      const numbers = tokens.filter((t) => t.type === "number");

      expect(numbers[0].text).toBe("3.14");
    });

    it("tokenizes hex literals", () => {
      const tokens = tokenizeLine("x = &HFF");
      const numbers = tokens.filter((t) => t.type === "number");

      expect(numbers[0].text).toBe("&HFF");
    });
  });

  describe("operators", () => {
    it("tokenizes arithmetic operators", () => {
      const tokens = tokenizeLine("x = a + b - c * d / e");
      const operators = tokens.filter((t) => t.type === "operator");

      expect(operators.map((o) => o.text)).toContain("+");
      expect(operators.map((o) => o.text)).toContain("-");
      expect(operators.map((o) => o.text)).toContain("*");
      expect(operators.map((o) => o.text)).toContain("/");
    });

    it("tokenizes comparison operators", () => {
      const tokens = tokenizeLine("If x < 10 And y >= 5 Then");
      const operators = tokens.filter((t) => t.type === "operator");

      expect(operators.map((o) => o.text)).toContain("<");
      expect(operators.map((o) => o.text)).toContain(">=");
    });

    it("tokenizes not-equal operator", () => {
      const tokens = tokenizeLine("If x <> y Then");
      const operators = tokens.filter((t) => t.type === "operator");

      expect(operators.map((o) => o.text)).toContain("<>");
    });
  });

  describe("identifiers", () => {
    it("tokenizes identifiers", () => {
      const tokens = tokenizeLine("myVariable = anotherVar");
      const identifiers = tokens.filter((t) => t.type === "identifier");

      expect(identifiers.map((i) => i.text)).toEqual(["myVariable", "anotherVar"]);
    });

    it("handles underscore in identifiers", () => {
      const tokens = tokenizeLine("my_var = other_var");
      const identifiers = tokens.filter((t) => t.type === "identifier");

      expect(identifiers.map((i) => i.text)).toEqual(["my_var", "other_var"]);
    });
  });

  describe("complex lines", () => {
    it("tokenizes complete Sub declaration", () => {
      const tokens = tokenizeLine("Public Sub MyProcedure(ByVal x As Integer)");

      expect(getTokenTypes(tokens).filter((t) => t !== "whitespace")).toEqual([
        "keyword", // Public
        "keyword", // Sub
        "identifier", // MyProcedure
        "punctuation", // (
        "keyword", // ByVal
        "identifier", // x
        "keyword", // As
        "type", // Integer
        "punctuation", // )
      ]);
    });

    it("tokenizes function call with arguments", () => {
      const tokens = tokenizeLine('MsgBox "Value: " & CStr(value), vbOKOnly');

      const builtins = tokens.filter((t) => t.type === "builtin");
      expect(builtins.map((b) => b.text)).toEqual(["MsgBox", "CStr"]);

      const strings = tokens.filter((t) => t.type === "string");
      expect(strings[0].text).toBe('"Value: "');
    });
  });
});

describe("getTokenColor", () => {
  it("returns color for keyword", () => {
    expect(getTokenColor("keyword")).toMatch(/var\(--vba-keyword-color/);
  });

  it("returns color for string", () => {
    expect(getTokenColor("string")).toMatch(/var\(--vba-string-color/);
  });

  it("returns color for comment", () => {
    expect(getTokenColor("comment")).toMatch(/var\(--vba-comment-color/);
  });

  it("returns transparent for whitespace", () => {
    expect(getTokenColor("whitespace")).toBe("transparent");
  });
});
