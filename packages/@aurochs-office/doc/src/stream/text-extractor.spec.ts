/** @file Text extractor tests */
import { extractText, splitIntoParagraphs } from "./text-extractor";
import type { PieceDescriptor } from "./piece-table";

describe("extractText", () => {
  it("extracts compressed (cp1252) text", () => {
    // "Hello" encoded as ASCII/cp1252 bytes
    const hello = new TextEncoder().encode("Hello");
    const stream = new Uint8Array(256);
    stream.set(hello, 50);

    const pieces: PieceDescriptor[] = [
      { cpStart: 0, cpEnd: 5, fc: 0x40000000 | 100, compressed: true, fileOffset: 50 },
    ];

    const text = extractText(stream, pieces, 5);
    expect(text).toBe("Hello");
  });

  it("extracts Unicode (UTF-16LE) text", () => {
    // Build UTF-16LE manually for "Hi"
    const utf16 = new Uint8Array([0x48, 0x00, 0x69, 0x00]); // H=0x0048, i=0x0069
    const stream = new Uint8Array(256);
    stream.set(utf16, 100);

    const pieces: PieceDescriptor[] = [
      { cpStart: 0, cpEnd: 2, fc: 100, compressed: false, fileOffset: 100 },
    ];

    const text = extractText(stream, pieces, 2);
    expect(text).toBe("Hi");
  });

  it("limits extraction to ccpText characters", () => {
    const hello = new TextEncoder().encode("Hello World");
    const stream = new Uint8Array(256);
    stream.set(hello, 0);

    const pieces: PieceDescriptor[] = [
      { cpStart: 0, cpEnd: 11, fc: 0x40000000 | 0, compressed: true, fileOffset: 0 },
    ];

    const text = extractText(stream, pieces, 5);
    expect(text).toBe("Hello");
  });

  it("concatenates multiple pieces", () => {
    const stream = new Uint8Array(256);
    // "AB" at offset 0 (compressed)
    stream[0] = 0x41;
    stream[1] = 0x42;
    // "CD" at offset 100 (UTF-16LE)
    stream[100] = 0x43;
    stream[101] = 0x00;
    stream[102] = 0x44;
    stream[103] = 0x00;

    const pieces: PieceDescriptor[] = [
      { cpStart: 0, cpEnd: 2, fc: 0x40000000 | 0, compressed: true, fileOffset: 0 },
      { cpStart: 2, cpEnd: 4, fc: 100, compressed: false, fileOffset: 100 },
    ];

    const text = extractText(stream, pieces, 4);
    expect(text).toBe("ABCD");
  });
});

describe("splitIntoParagraphs", () => {
  it("splits on carriage return", () => {
    const result = splitIntoParagraphs("Hello\rWorld\r");
    expect(result).toEqual(["Hello", "World"]);
  });

  it("strips trailing empty paragraph", () => {
    const result = splitIntoParagraphs("One\r");
    expect(result).toEqual(["One"]);
  });

  it("removes cell marks and page breaks", () => {
    const result = splitIntoParagraphs("A\x07B\x0cC\r");
    expect(result).toEqual(["ABC"]);
  });

  it("converts line breaks to newlines", () => {
    const result = splitIntoParagraphs("Line1\x0bLine2\r");
    expect(result).toEqual(["Line1\nLine2"]);
  });

  it("handles empty input", () => {
    const result = splitIntoParagraphs("");
    expect(result).toEqual([]);
  });
});
