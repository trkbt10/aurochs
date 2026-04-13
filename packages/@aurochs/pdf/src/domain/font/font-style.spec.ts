/**
 * @file font-style.spec.ts
 */

import { isSymbolFont } from "./font-style";

describe("isSymbolFont", () => {
  it("returns false for undefined", () => {
    expect(isSymbolFont(undefined)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isSymbolFont("")).toBe(false);
  });

  it("detects Symbol (PDF Standard 14)", () => {
    expect(isSymbolFont("Symbol")).toBe(true);
    expect(isSymbolFont("/Symbol")).toBe(true);
  });

  it("detects ZapfDingbats (PDF Standard 14)", () => {
    expect(isSymbolFont("ZapfDingbats")).toBe(true);
    expect(isSymbolFont("/ZapfDingbats")).toBe(true);
  });

  it("detects Wingdings with subset prefix and style suffix", () => {
    expect(isSymbolFont("/CPNHAK+Wingdings-Regular")).toBe(true);
  });

  it("detects Wingdings variants", () => {
    expect(isSymbolFont("Wingdings")).toBe(true);
    expect(isSymbolFont("Wingdings2")).toBe(true);
    expect(isSymbolFont("Wingdings3")).toBe(true);
  });

  it("detects Webdings", () => {
    expect(isSymbolFont("Webdings")).toBe(true);
    expect(isSymbolFont("/ABCDEF+Webdings-Bold")).toBe(true);
  });

  it("returns false for regular text fonts", () => {
    expect(isSymbolFont("Helvetica")).toBe(false);
    expect(isSymbolFont("/ABCDEF+Arial-Bold")).toBe(false);
    expect(isSymbolFont("Times-Roman")).toBe(false);
    expect(isSymbolFont("Courier")).toBe(false);
  });

  it("returns false for CJK fonts (which have Symbolic flag but are not symbol fonts)", () => {
    expect(isSymbolFont("/ZRDQJE+Hiragino-Sans")).toBe(false);
    expect(isSymbolFont("/EIATWD+PingFang-SC")).toBe(false);
  });
});
