/**
 * @file Tests for PDF content stream tokenizer
 */

import { tokenizeContentStream } from "./tokenizer";

describe("tokenizeContentStream", () => {
  describe("number tokenization", () => {
    it("tokenizes positive integer", () => {
      const tokens = tokenizeContentStream("123");
      expect(tokens).toEqual([
        { type: "number", value: 123, raw: "123" },
      ]);
    });

    it("tokenizes negative integer", () => {
      const tokens = tokenizeContentStream("-45");
      expect(tokens).toEqual([
        { type: "number", value: -45, raw: "-45" },
      ]);
    });

    it("tokenizes decimal number", () => {
      const tokens = tokenizeContentStream("3.14");
      expect(tokens).toEqual([
        { type: "number", value: 3.14, raw: "3.14" },
      ]);
    });

    it("tokenizes leading decimal", () => {
      const tokens = tokenizeContentStream(".5");
      expect(tokens).toEqual([
        { type: "number", value: 0.5, raw: ".5" },
      ]);
    });

    it("tokenizes multiple numbers", () => {
      const tokens = tokenizeContentStream("100 200 300");
      expect(tokens).toHaveLength(3);
      expect(tokens[0].value).toBe(100);
      expect(tokens[1].value).toBe(200);
      expect(tokens[2].value).toBe(300);
    });
  });

  describe("operator tokenization", () => {
    it("tokenizes single character operator", () => {
      const tokens = tokenizeContentStream("m");
      expect(tokens).toEqual([
        { type: "operator", value: "m", raw: "m" },
      ]);
    });

    it("tokenizes multi-character operator", () => {
      const tokens = tokenizeContentStream("BT");
      expect(tokens).toEqual([
        { type: "operator", value: "BT", raw: "BT" },
      ]);
    });

    it("tokenizes operator with asterisk", () => {
      const tokens = tokenizeContentStream("f*");
      expect(tokens).toEqual([
        { type: "operator", value: "f*", raw: "f*" },
      ]);
    });

    it("tokenizes quote operator", () => {
      const tokens = tokenizeContentStream("'");
      expect(tokens).toEqual([
        { type: "operator", value: "'", raw: "'" },
      ]);
    });

    it("tokenizes Type3 operators with digits", () => {
      const tokens = tokenizeContentStream("d0 d1");
      expect(tokens).toEqual([
        { type: "operator", value: "d0", raw: "d0" },
        { type: "operator", value: "d1", raw: "d1" },
      ]);
    });
  });

  describe("string tokenization", () => {
    it("tokenizes parenthesized string", () => {
      const tokens = tokenizeContentStream("(Hello)");
      expect(tokens).toEqual([
        { type: "string", value: "Hello", raw: "(Hello)" },
      ]);
    });

    it("tokenizes string with escape sequences", () => {
      const tokens = tokenizeContentStream("(Line1\\nLine2)");
      expect(tokens[0].value).toBe("Line1\nLine2");
    });

    it("tokenizes nested parentheses", () => {
      const tokens = tokenizeContentStream("(a(b)c)");
      expect(tokens[0].value).toBe("a(b)c");
    });

    it("tokenizes hex string", () => {
      const tokens = tokenizeContentStream("<48656C6C6F>");
      expect(tokens[0].value).toBe("Hello");
    });

    it("tokenizes hex string with whitespace", () => {
      const tokens = tokenizeContentStream("<48 65 6C 6C 6F>");
      expect(tokens[0].value).toBe("Hello");
    });
  });

  describe("name tokenization", () => {
    it("tokenizes name", () => {
      const tokens = tokenizeContentStream("/Name");
      expect(tokens).toEqual([
        { type: "name", value: "Name", raw: "/Name" },
      ]);
    });

    it("tokenizes name with hex escape", () => {
      const tokens = tokenizeContentStream("/Test#20Name");
      expect(tokens[0].value).toBe("Test Name");
    });
  });

  describe("array tokenization", () => {
    it("tokenizes array markers", () => {
      const tokens = tokenizeContentStream("[1 2 3]");
      expect(tokens[0].type).toBe("array_start");
      expect(tokens[tokens.length - 1].type).toBe("array_end");
    });

    it("tokenizes array with numbers", () => {
      const tokens = tokenizeContentStream("[10 20]");
      expect(tokens).toHaveLength(4);
      expect(tokens[1].value).toBe(10);
      expect(tokens[2].value).toBe(20);
    });
  });

  describe("dictionary tokenization", () => {
    it("tokenizes dictionary markers", () => {
      const tokens = tokenizeContentStream("<<>>");
      expect(tokens).toEqual([
        { type: "dict_start", value: "<<", raw: "<<" },
        { type: "dict_end", value: ">>", raw: ">>" },
      ]);
    });
  });

  describe("comment handling", () => {
    it("skips comments", () => {
      const tokens = tokenizeContentStream("100 % this is a comment\n200");
      expect(tokens).toHaveLength(2);
      expect(tokens[0].value).toBe(100);
      expect(tokens[1].value).toBe(200);
    });
  });

  describe("path content stream", () => {
    it("tokenizes simple path", () => {
      const content = "100 100 m 200 200 l S";
      const tokens = tokenizeContentStream(content);

      expect(tokens).toHaveLength(7);
      expect(tokens[0].value).toBe(100);
      expect(tokens[1].value).toBe(100);
      expect(tokens[2].value).toBe("m");
      expect(tokens[3].value).toBe(200);
      expect(tokens[4].value).toBe(200);
      expect(tokens[5].value).toBe("l");
      expect(tokens[6].value).toBe("S");
    });

    it("tokenizes rectangle", () => {
      const content = "10 20 100 50 re f";
      const tokens = tokenizeContentStream(content);

      expect(tokens).toHaveLength(6);
      expect(tokens[4].value).toBe("re");
      expect(tokens[5].value).toBe("f");
    });

    it("tokenizes bezier curve", () => {
      const content = "100 100 m 150 50 200 50 250 100 c S";
      const tokens = tokenizeContentStream(content);

      expect(tokens).toHaveLength(11);
      expect(tokens[9].value).toBe("c");
      expect(tokens[10].value).toBe("S");
    });
  });

  describe("graphics state content stream", () => {
    it("tokenizes graphics state save/restore", () => {
      const content = "q 1 0 0 1 10 20 cm Q";
      const tokens = tokenizeContentStream(content);

      expect(tokens[0].value).toBe("q");
      expect(tokens[tokens.length - 1].value).toBe("Q");
    });

    it("tokenizes color operators", () => {
      const content = "1 0 0 rg 0 0 1 RG";
      const tokens = tokenizeContentStream(content);

      expect(tokens).toHaveLength(8);
      expect(tokens[3].value).toBe("rg");
      expect(tokens[7].value).toBe("RG");
    });

    it("tokenizes line style", () => {
      const content = "2 w 1 J 2 j";
      const tokens = tokenizeContentStream(content);

      expect(tokens[1].value).toBe("w");
      expect(tokens[3].value).toBe("J");
      expect(tokens[5].value).toBe("j");
    });
  });

  describe("text content stream", () => {
    it("tokenizes text object", () => {
      const content = "BT /F1 12 Tf (Hello) Tj ET";
      const tokens = tokenizeContentStream(content);

      expect(tokens[0].value).toBe("BT");
      expect(tokens[1].value).toBe("F1");
      expect(tokens[2].value).toBe(12);
      expect(tokens[3].value).toBe("Tf");
      expect(tokens[4].value).toBe("Hello");
      expect(tokens[5].value).toBe("Tj");
      expect(tokens[6].value).toBe("ET");
    });

    it("tokenizes text with positioning", () => {
      const content = "BT 100 700 Td (Text) Tj ET";
      const tokens = tokenizeContentStream(content);

      expect(tokens[1].value).toBe(100);
      expect(tokens[2].value).toBe(700);
      expect(tokens[3].value).toBe("Td");
    });

    it("tokenizes TJ array", () => {
      const content = "BT [(H) 50 (ello)] TJ ET";
      const tokens = tokenizeContentStream(content);

      // Should have BT, [, (H), 50, (ello), ], TJ, ET
      expect(tokens[1].type).toBe("array_start");
      expect(tokens[2].value).toBe("H");
      expect(tokens[3].value).toBe(50);
      expect(tokens[4].value).toBe("ello");
      expect(tokens[5].type).toBe("array_end");
      expect(tokens[6].value).toBe("TJ");
    });
  });
});
