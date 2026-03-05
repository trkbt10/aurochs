/**
 * @file Object Serializer Tests
 */

import {
  serializePdfNull,
  serializePdfBool,
  serializePdfNumber,
  serializePdfName,
  serializePdfString,
  serializePdfHexString,
  serializePdfRef,
  serializePdfArray,
  serializePdfDict,
  serializePdfObject,
  serializeIndirectObject,
} from "./object-serializer";
import type { PdfObject } from "../native/core/types";

const decoder = new TextDecoder();
const toText = (bytes: Uint8Array) => decoder.decode(bytes);

describe("serializePdfNull", () => {
  it("serializes to 'null'", () => {
    expect(toText(serializePdfNull())).toBe("null");
  });
});

describe("serializePdfBool", () => {
  it("serializes true", () => {
    expect(toText(serializePdfBool(true))).toBe("true");
  });

  it("serializes false", () => {
    expect(toText(serializePdfBool(false))).toBe("false");
  });
});

describe("serializePdfNumber", () => {
  it("serializes integer", () => {
    expect(toText(serializePdfNumber(42))).toBe("42");
  });

  it("serializes negative integer", () => {
    expect(toText(serializePdfNumber(-10))).toBe("-10");
  });

  it("serializes zero", () => {
    expect(toText(serializePdfNumber(0))).toBe("0");
  });

  it("serializes float without trailing zeros", () => {
    expect(toText(serializePdfNumber(3.14))).toBe("3.14");
  });

  it("serializes float with many decimals", () => {
    expect(toText(serializePdfNumber(1.123456789))).toBe("1.123457");
  });

  it("serializes small float", () => {
    expect(toText(serializePdfNumber(0.5))).toBe("0.5");
  });
});

describe("serializePdfName", () => {
  it("serializes simple name", () => {
    expect(toText(serializePdfName("Type"))).toBe("/Type");
  });

  it("serializes name with space (escaped)", () => {
    expect(toText(serializePdfName("A B"))).toBe("/A#20B");
  });

  it("serializes name with # (escaped)", () => {
    expect(toText(serializePdfName("A#B"))).toBe("/A#23B");
  });

  it("serializes name with parentheses (escaped)", () => {
    expect(toText(serializePdfName("A(B)"))).toBe("/A#28B#29");
  });

  it("serializes name with slash (escaped)", () => {
    expect(toText(serializePdfName("A/B"))).toBe("/A#2FB");
  });

  it("serializes empty name", () => {
    expect(toText(serializePdfName(""))).toBe("/");
  });
});

describe("serializePdfString", () => {
  it("serializes simple string", () => {
    expect(toText(serializePdfString("Hello"))).toBe("(Hello)");
  });

  it("escapes backslash", () => {
    expect(toText(serializePdfString("A\\B"))).toBe("(A\\\\B)");
  });

  it("escapes parentheses", () => {
    expect(toText(serializePdfString("(test)"))).toBe("(\\(test\\))");
  });

  it("escapes newline", () => {
    expect(toText(serializePdfString("A\nB"))).toBe("(A\\nB)");
  });

  it("escapes carriage return", () => {
    expect(toText(serializePdfString("A\rB"))).toBe("(A\\rB)");
  });

  it("escapes tab", () => {
    expect(toText(serializePdfString("A\tB"))).toBe("(A\\tB)");
  });
});

describe("serializePdfHexString", () => {
  it("serializes empty bytes", () => {
    expect(toText(serializePdfHexString(new Uint8Array([])))).toBe("<>");
  });

  it("serializes bytes as hex", () => {
    expect(toText(serializePdfHexString(new Uint8Array([0x48, 0x69])))).toBe(
      "<4869>"
    );
  });

  it("pads single digit hex", () => {
    expect(toText(serializePdfHexString(new Uint8Array([0x0a, 0xff])))).toBe(
      "<0AFF>"
    );
  });
});

describe("serializePdfRef", () => {
  it("serializes reference", () => {
    expect(toText(serializePdfRef(1, 0))).toBe("1 0 R");
  });

  it("serializes reference with generation", () => {
    expect(toText(serializePdfRef(10, 2))).toBe("10 2 R");
  });
});

describe("serializePdfArray", () => {
  it("serializes empty array", () => {
    expect(toText(serializePdfArray([]))).toBe("[ ]");
  });

  it("serializes array with numbers", () => {
    const items: PdfObject[] = [
      { type: "number", value: 1 },
      { type: "number", value: 2 },
      { type: "number", value: 3 },
    ];
    expect(toText(serializePdfArray(items))).toBe("[1 2 3]");
  });

  it("serializes array with mixed types", () => {
    const items: PdfObject[] = [
      { type: "name", value: "Type" },
      { type: "number", value: 100 },
      { type: "bool", value: true },
    ];
    expect(toText(serializePdfArray(items))).toBe("[/Type 100 true]");
  });

  it("serializes nested array", () => {
    const items: PdfObject[] = [
      { type: "number", value: 0 },
      {
        type: "array",
        items: [
          { type: "number", value: 1 },
          { type: "number", value: 2 },
        ],
      },
    ];
    expect(toText(serializePdfArray(items))).toBe("[0 [1 2]]");
  });
});

describe("serializePdfDict", () => {
  it("serializes empty dict", () => {
    expect(toText(serializePdfDict(new Map()))).toBe("<< >>");
  });

  it("serializes dict with entries", () => {
    const dict = new Map<string, PdfObject>([
      ["Type", { type: "name", value: "Page" }],
      ["Count", { type: "number", value: 1 }],
    ]);
    const result = toText(serializePdfDict(dict));
    expect(result).toContain("/Type /Page");
    expect(result).toContain("/Count 1");
    expect(result.startsWith("<<")).toBe(true);
    expect(result.endsWith(">>")).toBe(true);
  });

  it("serializes dict with reference", () => {
    const dict = new Map<string, PdfObject>([
      ["Parent", { type: "ref", obj: 2, gen: 0 }],
    ]);
    expect(toText(serializePdfDict(dict))).toBe("<< /Parent 2 0 R >>");
  });
});

describe("serializePdfObject", () => {
  it("dispatches to null", () => {
    expect(toText(serializePdfObject({ type: "null" }))).toBe("null");
  });

  it("dispatches to bool", () => {
    expect(toText(serializePdfObject({ type: "bool", value: true }))).toBe(
      "true"
    );
  });

  it("dispatches to number", () => {
    expect(toText(serializePdfObject({ type: "number", value: 42 }))).toBe(
      "42"
    );
  });

  it("dispatches to name", () => {
    expect(toText(serializePdfObject({ type: "name", value: "Test" }))).toBe(
      "/Test"
    );
  });

  it("dispatches to string (as hex)", () => {
    const bytes = new Uint8Array([0x48, 0x69]);
    expect(
      toText(serializePdfObject({ type: "string", bytes, text: "Hi" }))
    ).toBe("<4869>");
  });

  it("dispatches to ref", () => {
    expect(toText(serializePdfObject({ type: "ref", obj: 5, gen: 0 }))).toBe(
      "5 0 R"
    );
  });

  it("dispatches to array", () => {
    expect(
      toText(serializePdfObject({ type: "array", items: [] }))
    ).toBe("[ ]");
  });

  it("dispatches to dict", () => {
    expect(
      toText(serializePdfObject({ type: "dict", map: new Map() }))
    ).toBe("<< >>");
  });

  it("throws for stream (use stream-encoder instead)", () => {
    const stream: PdfObject = {
      type: "stream",
      dict: { type: "dict", map: new Map() },
      data: new Uint8Array([]),
    };
    expect(() => serializePdfObject(stream)).toThrow(
      /Use serializePdfStream/
    );
  });
});

describe("serializeIndirectObject", () => {
  it("wraps content in obj/endobj", () => {
    const content = new TextEncoder().encode("<< /Type /Page >>");
    const result = toText(serializeIndirectObject(1, 0, content));
    expect(result).toBe("1 0 obj\n<< /Type /Page >>\nendobj\n");
  });

  it("uses correct object and generation numbers", () => {
    const content = new TextEncoder().encode("null");
    const result = toText(serializeIndirectObject(10, 2, content));
    expect(result).toBe("10 2 obj\nnull\nendobj\n");
  });
});
