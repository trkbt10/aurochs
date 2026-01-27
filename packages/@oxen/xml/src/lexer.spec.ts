/**
 * @file Tests for XML Lexer
 */

import { XmlLexer, type Token, TokenType } from "./lexer";

describe("XmlLexer", () => {
  function tokenize(input: string): Token[] {
    const lexer = new XmlLexer(input);
    const tokens: Token[] = [];
    let token: Token;
    while ((token = lexer.nextToken()).type !== TokenType.EOF) {
      tokens.push(token);
    }
    return tokens;
  }

  describe("basic tokenization", () => {
    it("tokenizes empty string", () => {
      const tokens = tokenize("");
      expect(tokens).toEqual([]);
    });

    it("tokenizes self-closing tag", () => {
      const tokens = tokenize("<br/>");
      expect(tokens).toEqual([
        { type: TokenType.TAG_OPEN, value: "<", pos: 0 },
        { type: TokenType.TAG_NAME, value: "br", pos: 1 },
        { type: TokenType.TAG_SELF_CLOSE, value: "/>", pos: 3 },
      ]);
    });

    it("tokenizes open and close tag", () => {
      const tokens = tokenize("<div></div>");
      expect(tokens).toEqual([
        { type: TokenType.TAG_OPEN, value: "<", pos: 0 },
        { type: TokenType.TAG_NAME, value: "div", pos: 1 },
        { type: TokenType.TAG_CLOSE, value: ">", pos: 4 },
        { type: TokenType.TAG_OPEN_END, value: "</", pos: 5 },
        { type: TokenType.TAG_NAME, value: "div", pos: 7 },
        { type: TokenType.TAG_CLOSE, value: ">", pos: 10 },
      ]);
    });

    it("tokenizes tag with text content", () => {
      const tokens = tokenize("<p>Hello</p>");
      expect(tokens).toEqual([
        { type: TokenType.TAG_OPEN, value: "<", pos: 0 },
        { type: TokenType.TAG_NAME, value: "p", pos: 1 },
        { type: TokenType.TAG_CLOSE, value: ">", pos: 2 },
        { type: TokenType.TEXT, value: "Hello", pos: 3 },
        { type: TokenType.TAG_OPEN_END, value: "</", pos: 8 },
        { type: TokenType.TAG_NAME, value: "p", pos: 10 },
        { type: TokenType.TAG_CLOSE, value: ">", pos: 11 },
      ]);
    });
  });

  describe("attribute tokenization", () => {
    it("tokenizes single attribute with double quotes", () => {
      const tokens = tokenize('<div id="test"></div>');
      expect(tokens).toEqual([
        { type: TokenType.TAG_OPEN, value: "<", pos: 0 },
        { type: TokenType.TAG_NAME, value: "div", pos: 1 },
        { type: TokenType.ATTR_NAME, value: "id", pos: 5 },
        { type: TokenType.ATTR_EQ, value: "=", pos: 7 },
        { type: TokenType.ATTR_VALUE, value: "test", pos: 8 },
        { type: TokenType.TAG_CLOSE, value: ">", pos: 14 },
        { type: TokenType.TAG_OPEN_END, value: "</", pos: 15 },
        { type: TokenType.TAG_NAME, value: "div", pos: 17 },
        { type: TokenType.TAG_CLOSE, value: ">", pos: 20 },
      ]);
    });

    it("tokenizes single attribute with single quotes", () => {
      const tokens = tokenize("<div id='test'></div>");
      expect(tokens).toEqual([
        { type: TokenType.TAG_OPEN, value: "<", pos: 0 },
        { type: TokenType.TAG_NAME, value: "div", pos: 1 },
        { type: TokenType.ATTR_NAME, value: "id", pos: 5 },
        { type: TokenType.ATTR_EQ, value: "=", pos: 7 },
        { type: TokenType.ATTR_VALUE, value: "test", pos: 8 },
        { type: TokenType.TAG_CLOSE, value: ">", pos: 14 },
        { type: TokenType.TAG_OPEN_END, value: "</", pos: 15 },
        { type: TokenType.TAG_NAME, value: "div", pos: 17 },
        { type: TokenType.TAG_CLOSE, value: ">", pos: 20 },
      ]);
    });

    it("tokenizes multiple attributes", () => {
      const tokens = tokenize('<input type="text" name="field"/>');
      expect(tokens).toEqual([
        { type: TokenType.TAG_OPEN, value: "<", pos: 0 },
        { type: TokenType.TAG_NAME, value: "input", pos: 1 },
        { type: TokenType.ATTR_NAME, value: "type", pos: 7 },
        { type: TokenType.ATTR_EQ, value: "=", pos: 11 },
        { type: TokenType.ATTR_VALUE, value: "text", pos: 12 },
        { type: TokenType.ATTR_NAME, value: "name", pos: 19 },
        { type: TokenType.ATTR_EQ, value: "=", pos: 23 },
        { type: TokenType.ATTR_VALUE, value: "field", pos: 24 },
        { type: TokenType.TAG_SELF_CLOSE, value: "/>", pos: 31 },
      ]);
    });

    it("tokenizes empty attribute value", () => {
      const tokens = tokenize('<input disabled=""/>');
      expect(tokens).toEqual([
        { type: TokenType.TAG_OPEN, value: "<", pos: 0 },
        { type: TokenType.TAG_NAME, value: "input", pos: 1 },
        { type: TokenType.ATTR_NAME, value: "disabled", pos: 7 },
        { type: TokenType.ATTR_EQ, value: "=", pos: 15 },
        { type: TokenType.ATTR_VALUE, value: "", pos: 16 },
        { type: TokenType.TAG_SELF_CLOSE, value: "/>", pos: 18 },
      ]);
    });
  });

  describe("namespace handling", () => {
    it("tokenizes namespaced tag name", () => {
      const tokens = tokenize("<p:sp></p:sp>");
      expect(tokens).toEqual([
        { type: TokenType.TAG_OPEN, value: "<", pos: 0 },
        { type: TokenType.TAG_NAME, value: "p:sp", pos: 1 },
        { type: TokenType.TAG_CLOSE, value: ">", pos: 5 },
        { type: TokenType.TAG_OPEN_END, value: "</", pos: 6 },
        { type: TokenType.TAG_NAME, value: "p:sp", pos: 8 },
        { type: TokenType.TAG_CLOSE, value: ">", pos: 12 },
      ]);
    });

    it("tokenizes namespaced attribute", () => {
      const tokens = tokenize('<a:t xmlns:a="http://example.com"/>');
      expect(tokens).toEqual([
        { type: TokenType.TAG_OPEN, value: "<", pos: 0 },
        { type: TokenType.TAG_NAME, value: "a:t", pos: 1 },
        { type: TokenType.ATTR_NAME, value: "xmlns:a", pos: 5 },
        { type: TokenType.ATTR_EQ, value: "=", pos: 12 },
        { type: TokenType.ATTR_VALUE, value: "http://example.com", pos: 13 },
        { type: TokenType.TAG_SELF_CLOSE, value: "/>", pos: 33 },
      ]);
    });
  });

  describe("comment handling", () => {
    it("tokenizes XML comment", () => {
      const tokens = tokenize("<!-- comment -->");
      expect(tokens).toEqual([{ type: TokenType.COMMENT, value: " comment ", pos: 0 }]);
    });

    it("tokenizes comment with surrounding elements", () => {
      const tokens = tokenize("<a/><!-- middle --><b/>");
      expect(tokens).toEqual([
        { type: TokenType.TAG_OPEN, value: "<", pos: 0 },
        { type: TokenType.TAG_NAME, value: "a", pos: 1 },
        { type: TokenType.TAG_SELF_CLOSE, value: "/>", pos: 2 },
        { type: TokenType.COMMENT, value: " middle ", pos: 4 },
        { type: TokenType.TAG_OPEN, value: "<", pos: 19 },
        { type: TokenType.TAG_NAME, value: "b", pos: 20 },
        { type: TokenType.TAG_SELF_CLOSE, value: "/>", pos: 21 },
      ]);
    });
  });

  describe("declaration handling", () => {
    it("tokenizes XML declaration", () => {
      const tokens = tokenize('<?xml version="1.0"?>');
      expect(tokens).toEqual([{ type: TokenType.DECLARATION, value: 'xml version="1.0"', pos: 0 }]);
    });

    it("tokenizes DOCTYPE", () => {
      const tokens = tokenize("<!DOCTYPE html>");
      expect(tokens).toEqual([{ type: TokenType.DOCTYPE, value: "DOCTYPE html", pos: 0 }]);
    });
  });

  describe("text content handling", () => {
    it("tokenizes text with whitespace", () => {
      const tokens = tokenize("<p>  hello world  </p>");
      expect(tokens).toContainEqual({ type: TokenType.TEXT, value: "  hello world  ", pos: 3 });
    });

    it("decodes XML entities in text", () => {
      const tokens = tokenize("<p>&lt;tag&gt;</p>");
      expect(tokens).toContainEqual({ type: TokenType.TEXT, value: "<tag>", pos: 3 });
    });

    it("decodes XML entities in attribute values", () => {
      const tokens = tokenize('<div title="a &amp; b"/>');
      expect(tokens).toContainEqual({ type: TokenType.ATTR_VALUE, value: "a & b", pos: 11 });
    });

    it("decodes numeric entities", () => {
      const tokens = tokenize("<p>&#60;&#62;</p>");
      expect(tokens).toContainEqual({ type: TokenType.TEXT, value: "<>", pos: 3 });
    });

    it("decodes hex entities", () => {
      const tokens = tokenize("<p>&#x3C;&#x3E;</p>");
      expect(tokens).toContainEqual({ type: TokenType.TEXT, value: "<>", pos: 3 });
    });
  });

  describe("CDATA handling", () => {
    it("tokenizes CDATA section", () => {
      const tokens = tokenize("<p><![CDATA[<raw content>]]></p>");
      expect(tokens).toContainEqual({ type: TokenType.CDATA, value: "<raw content>", pos: 3 });
    });
  });

  describe("edge cases", () => {
    it("handles whitespace between attributes", () => {
      const tokens = tokenize('<div   id="a"   class="b"   />');
      const attrNames = tokens.filter((t) => t.type === TokenType.ATTR_NAME);
      expect(attrNames).toHaveLength(2);
      expect(attrNames[0].value).toBe("id");
      expect(attrNames[1].value).toBe("class");
    });

    it("handles newlines in content", () => {
      const tokens = tokenize("<p>\n  line1\n  line2\n</p>");
      const textToken = tokens.find((t) => t.type === TokenType.TEXT);
      expect(textToken?.value).toBe("\n  line1\n  line2\n");
    });
  });
});
