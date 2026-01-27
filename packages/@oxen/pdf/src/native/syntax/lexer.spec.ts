/**
 * @file src/pdf/native/lexer.spec.ts
 */

import { createLexer, nextToken } from "./lexer";

describe("PDF lexer (hex strings)", () => {
  it("decodes hex string bytes", () => {
    const bytes = new TextEncoder().encode("<48656c6c6f>");
    const { token } = nextToken(createLexer(bytes, 0));
    expect(token.type).toBe("hexstring");
    if (token.type === "hexstring") {
      expect(new TextDecoder("latin1").decode(token.bytes)).toBe("Hello");
    }
  });

  it("ignores whitespace inside hex strings", () => {
    const bytes = new TextEncoder().encode("<48 65\n6c\t6c 6f>");
    const { token } = nextToken(createLexer(bytes, 0));
    expect(token.type).toBe("hexstring");
    if (token.type === "hexstring") {
      expect(new TextDecoder("latin1").decode(token.bytes)).toBe("Hello");
    }
  });

  it("pads odd nibble count with a trailing 0", () => {
    const bytes = new TextEncoder().encode("<F>");
    const { token } = nextToken(createLexer(bytes, 0));
    expect(token.type).toBe("hexstring");
    if (token.type === "hexstring") {
      expect(token.bytes).toEqual(new Uint8Array([0xf0]));
    }
  });

  it("rejects non-hex garbage inside hex strings", () => {
    const bytes = new TextEncoder().encode("<4G>");
    expect(() => nextToken(createLexer(bytes, 0))).toThrow(/invalid hex digit/i);
  });
});
