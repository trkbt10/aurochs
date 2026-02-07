/** @file Sub-document extractor tests */
import {
  textRangeToParagraphs,
  parsePlcfHdd,
  extractHeadersFooters,
  parseBookmarkNames,
  extractBookmarks,
  extractNotes,
  extractComments,
  detectNoteReferenceMarks,
  type SubdocParagraphBuilder,
} from "./subdoc-extractor";

describe("textRangeToParagraphs", () => {
  it("extracts paragraphs from text range", () => {
    const text = "Hello\rWorld\rEnd";
    const paras = textRangeToParagraphs(text, 0, 11);
    expect(paras).toHaveLength(2);
    expect(paras[0].runs[0].text).toBe("Hello");
    expect(paras[1].runs[0].text).toBe("World");
  });

  it("returns empty for empty range", () => {
    expect(textRangeToParagraphs("text", 5, 5)).toEqual([]);
  });
});

describe("parsePlcfHdd", () => {
  it("returns empty for lcb=0", () => {
    expect(parsePlcfHdd(new Uint8Array(10), 0, 0)).toEqual([]);
  });

  it("parses CP array", () => {
    const data = new Uint8Array(16);
    const view = new DataView(data.buffer);
    view.setInt32(0, 0, true);
    view.setInt32(4, 10, true);
    view.setInt32(8, 20, true);
    view.setInt32(12, 30, true);

    const cps = parsePlcfHdd(data, 0, 16);
    expect(cps).toEqual([0, 10, 20, 30]);
  });
});

describe("extractHeadersFooters", () => {
  it("extracts odd header from section 1", () => {
    // 6 separator stories + 6 section stories
    // Create CPs for 12 entries + 1 boundary = 13 CPs
    const hddCps = [
      0, 0, 0, 0, 0, 0, // separators (skip)
      0, 0, 10, 10, 10, 10, 10, // section: even-hdr(0-0), odd-hdr(0-10), even-ftr(10-10), ...
    ];
    const fullText = "OddHeader\r";
    const hdrTextStart = 0;

    const { headers, footers } = extractHeadersFooters(hddCps, fullText, hdrTextStart);
    expect(headers).toHaveLength(1);
    expect(headers[0].type).toBe("odd");
    expect(headers[0].content[0].runs[0].text).toBe("OddHeader");
    expect(footers).toHaveLength(0);
  });

  it("inherits header from previous section when empty", () => {
    // Section 1: odd header has content at CP range [0, 10)
    // Section 2: odd header is empty (CP[0] == CP[1])
    // Section 2 should inherit section 1's odd header
    const fullText = "OddHeader\r" + "Sec2Body\r";
    const hddCps = [
      0, 0, 0, 0, 0, 0, // separators (skip)
      // Section 1: even-hdr(empty), odd-hdr(0-10), even-ftr, odd-ftr, first-hdr, first-ftr
      0, 0, 10, 10, 10, 10,
      // Section 2: even-hdr(empty), odd-hdr(empty=10,10), even-ftr, odd-ftr, first-hdr, first-ftr
      10, 10, 10, 10, 10, 10, 10,
    ];

    const { headers } = extractHeadersFooters(hddCps, fullText, 0);
    // Both sections should have the odd header (section 2 inherits)
    expect(headers).toHaveLength(2);
    expect(headers[0].type).toBe("odd");
    expect(headers[0].content[0].runs[0].text).toBe("OddHeader");
    expect(headers[1].type).toBe("odd");
    expect(headers[1].content[0].runs[0].text).toBe("OddHeader");
  });

  it("does not inherit when later section has its own content", () => {
    const fullText = "HeaderSec1\rHeaderSec2\r";
    const hddCps = [
      0, 0, 0, 0, 0, 0, // separators
      // Section 1: odd header at [0, 11)
      0, 0, 11, 11, 11, 11,
      // Section 2: odd header at [11, 22)
      11, 11, 22, 22, 22, 22, 22,
    ];

    const { headers } = extractHeadersFooters(hddCps, fullText, 0);
    expect(headers).toHaveLength(2);
    expect(headers[0].content[0].runs[0].text).toBe("HeaderSec1");
    expect(headers[1].content[0].runs[0].text).toBe("HeaderSec2");
  });
});

describe("parseBookmarkNames", () => {
  it("returns empty for lcb=0", () => {
    expect(parseBookmarkNames(new Uint8Array(10), 0, 0)).toEqual([]);
  });

  it("parses bookmark names from STTB", () => {
    // STTB: fExtend=0xFFFF, cData=2, cbExtra=0, entries
    const name1 = "Bookmark1";
    const name2 = "BM2";

    const headerSize = 6;
    const entry1Size = 2 + name1.length * 2;
    const entry2Size = 2 + name2.length * 2;
    const totalSize = headerSize + entry1Size + entry2Size;

    const data = new Uint8Array(totalSize);
    const view = new DataView(data.buffer);

    view.setUint16(0, 0xffff, true);
    view.setUint16(2, 2, true);
    view.setUint16(4, 0, true);

    // Entry 1
    let offset = 6;
    view.setUint16(offset, name1.length, true);
    offset += 2;
    for (let i = 0; i < name1.length; i++) {
      view.setUint16(offset + i * 2, name1.charCodeAt(i), true);
    }
    offset += name1.length * 2;

    // Entry 2
    view.setUint16(offset, name2.length, true);
    offset += 2;
    for (let i = 0; i < name2.length; i++) {
      view.setUint16(offset + i * 2, name2.charCodeAt(i), true);
    }

    const names = parseBookmarkNames(data, 0, totalSize);
    expect(names).toEqual(["Bookmark1", "BM2"]);
  });
});

describe("extractBookmarks", () => {
  it("combines names, starts, and ends", () => {
    const names = ["BM1", "BM2"];
    const starts = [
      { cp: 10, ibkl: 0 },
      { cp: 50, ibkl: 1 },
    ];
    const endCps = [20, 60];

    const bookmarks = extractBookmarks(names, starts, endCps);
    expect(bookmarks).toHaveLength(2);
    expect(bookmarks[0]).toEqual({ name: "BM1", cpStart: 10, cpEnd: 20 });
    expect(bookmarks[1]).toEqual({ name: "BM2", cpStart: 50, cpEnd: 60 });
  });
});

describe("extractNotes", () => {
  it("extracts notes from CP ranges", () => {
    const refCps = [5, 15]; // 1 note, reference at cp 5
    const textCps = [0, 10]; // Note text at offset 0..10
    const fullText = "NoteText\r ";
    const notes = extractNotes(refCps, textCps, fullText, 0);

    expect(notes).toHaveLength(1);
    expect(notes[0].cpRef).toBe(5);
    expect(notes[0].content[0].runs[0].text).toBe("NoteText");
  });

  it("uses buildParagraphs when provided", () => {
    const refCps = [5, 15];
    const textCps = [0, 10];
    const fullText = "NoteText\r ";
    const builder: SubdocParagraphBuilder = (cpStart, cpEnd) => [
      { runs: [{ text: `formatted[${cpStart}-${cpEnd}]`, bold: true }] },
    ];

    const notes = extractNotes(refCps, textCps, fullText, 100, builder);
    expect(notes).toHaveLength(1);
    expect(notes[0].content[0].runs[0].text).toBe("formatted[100-110]");
    expect(notes[0].content[0].runs[0].bold).toBe(true);
  });
});

describe("extractHeadersFooters with builder", () => {
  it("uses buildParagraphs callback for formatted content", () => {
    const hddCps = [
      0, 0, 0, 0, 0, 0, // separators
      0, 0, 10, 10, 10, 10, 10, // section: odd-hdr at [0,10)
    ];
    const fullText = "OddHeader\r";

    const calls: Array<{ cpStart: number; cpEnd: number }> = [];
    const builder: SubdocParagraphBuilder = (cpStart, cpEnd) => {
      calls.push({ cpStart, cpEnd });
      return [{ runs: [{ text: "FormattedHeader", bold: true }] }];
    };

    const { headers } = extractHeadersFooters(hddCps, fullText, 50, builder);
    expect(headers).toHaveLength(1);
    expect(headers[0].content[0].runs[0].text).toBe("FormattedHeader");
    expect(headers[0].content[0].runs[0].bold).toBe(true);
    // Builder receives global CPs (hdrTextStart + cpStart)
    expect(calls[0].cpStart).toBe(50);
    expect(calls[0].cpEnd).toBe(60);
  });
});

describe("extractComments with builder", () => {
  it("uses buildParagraphs callback for formatted content", () => {
    const refs = [{ cpRef: 5, authorIndex: 0 }];
    const textCps = [0, 10];
    const authors = ["Author1"];
    const fullText = "CommentTxt\r";

    const builder: SubdocParagraphBuilder = (cpStart, cpEnd) => [
      { runs: [{ text: `comment[${cpStart}-${cpEnd}]`, italic: true }] },
    ];

    const comments = extractComments(refs, textCps, authors, fullText, 200, builder);
    expect(comments).toHaveLength(1);
    expect(comments[0].content[0].runs[0].text).toBe("comment[200-210]");
    expect(comments[0].content[0].runs[0].italic).toBe(true);
    expect(comments[0].author).toBe("Author1");
  });
});

describe("extractComments with annotation bookmarks", () => {
  it("uses annotation bookmarks for cpStart/cpEnd", () => {
    const refs = [
      { cpRef: 10, authorIndex: 0 },
      { cpRef: 50, authorIndex: 0 },
    ];
    const textCps = [0, 5, 12];
    const authors = ["Alice"];
    const fullText = "Note\rCommentText\r";

    const atnBookmarks = {
      starts: [
        { cp: 5, ibkl: 0 },  // Comment 0: range [5, 15)
        { cp: 40, ibkl: 1 }, // Comment 1: range [40, 55)
      ],
      endCps: [15, 55],
    };

    const comments = extractComments(refs, textCps, authors, fullText, 0, undefined, atnBookmarks);
    expect(comments).toHaveLength(2);
    expect(comments[0].cpStart).toBe(5);
    expect(comments[0].cpEnd).toBe(15);
    expect(comments[1].cpStart).toBe(40);
    expect(comments[1].cpEnd).toBe(55);
  });

  it("falls back to cpRef when no annotation bookmarks", () => {
    const refs = [{ cpRef: 10, authorIndex: 0 }];
    const textCps = [0, 5];
    const authors = ["Bob"];
    const fullText = "Text\r";

    const comments = extractComments(refs, textCps, authors, fullText, 0);
    expect(comments).toHaveLength(1);
    expect(comments[0].cpStart).toBe(10);
    expect(comments[0].cpEnd).toBe(10);
  });

  it("falls back to cpStart when ibkl exceeds endCps", () => {
    const refs = [{ cpRef: 10, authorIndex: 0 }];
    const textCps = [0, 5];
    const authors = ["Carol"];
    const fullText = "Text\r";

    const atnBookmarks = {
      starts: [{ cp: 3, ibkl: 5 }], // ibkl=5 exceeds endCps length
      endCps: [10],
    };

    const comments = extractComments(refs, textCps, authors, fullText, 0, undefined, atnBookmarks);
    expect(comments[0].cpStart).toBe(3);
    expect(comments[0].cpEnd).toBe(3); // Falls back to cpStart
  });
});

describe("detectNoteReferenceMarks", () => {
  it("returns empty for no refCps", () => {
    expect(detectNoteReferenceMarks("Hello\x02World", [])).toEqual([]);
  });

  it("returns empty for single refCp (boundary only)", () => {
    expect(detectNoteReferenceMarks("Hello\x02World", [5])).toEqual([]);
  });

  it("detects footnote reference mark at matching CP", () => {
    // Main text: "Hello" + \x02 + "World\r" = \x02 at CP 5
    const mainText = "Hello\x02World\r";
    const refCps = [5, 12]; // 1 footnote at CP 5, boundary at 12

    const marks = detectNoteReferenceMarks(mainText, refCps);
    expect(marks).toHaveLength(1);
    expect(marks[0].cp).toBe(5);
    expect(marks[0].noteIndex).toBe(0);
  });

  it("detects multiple reference marks", () => {
    // \x02 at CP 3 and CP 10
    const mainText = "abc\x02defghi\x02jkl\r";
    const refCps = [3, 10, 14]; // 2 footnotes + boundary

    const marks = detectNoteReferenceMarks(mainText, refCps);
    expect(marks).toHaveLength(2);
    expect(marks[0]).toEqual({ cp: 3, noteIndex: 0 });
    expect(marks[1]).toEqual({ cp: 10, noteIndex: 1 });
  });

  it("ignores \\x02 that does not match a refCp", () => {
    const mainText = "ab\x02cd\x02ef\r";
    const refCps = [5, 8]; // Only CP 5 is a reference

    const marks = detectNoteReferenceMarks(mainText, refCps);
    expect(marks).toHaveLength(1);
    expect(marks[0].cp).toBe(5);
  });

  it("returns empty when no \\x02 in text", () => {
    const mainText = "Hello World\r";
    const refCps = [3, 8];

    const marks = detectNoteReferenceMarks(mainText, refCps);
    expect(marks).toEqual([]);
  });
});
