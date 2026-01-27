/**
 * @file XML Parser
 * Parses XML string into AST using lexer tokens.
 *
 * Design: Recursive descent parser that consumes tokens from lexer
 * and builds XmlDocument AST.
 */

import { XmlLexer, TokenType, type Token } from "./lexer";
import type { XmlNode, XmlElement, XmlText, XmlDocument } from "./ast";

/**
 * Parse XML string into AST document.
 *
 * @param input - XML string to parse
 * @returns Parsed XML document
 *
 * @example
 * ```typescript
 * const doc = parseXml('<root><child>text</child></root>');
 * // doc.children[0] = { type: 'element', name: 'root', ... }
 * ```
 */
export function parseXml(input: string): XmlDocument {
  const parser = new XmlParser(input);
  return parser.parse();
}

/**
 * Internal XML parser class.
 */
class XmlParser {
  private readonly lexer: XmlLexer;
  private currentToken: Token;

  constructor(input: string) {
    this.lexer = new XmlLexer(input);
    this.currentToken = this.lexer.nextToken();
  }

  /**
   * Parse the entire document.
   */
  parse(): XmlDocument {
    const children = this.parseChildren(null);
    return { children };
  }

  /**
   * Advance to next token and return it.
   * Returns the new token to help TypeScript understand type changes.
   */
  private advance(): Token {
    this.currentToken = this.lexer.nextToken();
    return this.currentToken;
  }

  /**
   * Check if current token is at element end (close tag, self-close, or EOF).
   * Separate method to avoid TypeScript narrowing issues in loops.
   */
  private isAtElementEnd(): boolean {
    return (
      this.currentToken.type === TokenType.TAG_CLOSE ||
      this.currentToken.type === TokenType.TAG_SELF_CLOSE ||
      this.currentToken.type === TokenType.EOF
    );
  }

  /**
   * Parse children until end tag or EOF.
   * @param parentTagName - Name of parent tag to match end tag, or null for document level
   */
  private parseChildren(parentTagName: string | null): XmlNode[] {
    const children: XmlNode[] = [];

    while (this.currentToken.type !== TokenType.EOF) {
      // Check for end tag
      if (this.currentToken.type === TokenType.TAG_OPEN_END) {
        // Peek at tag name
        const nextToken = this.advance();
        if (nextToken.type === TokenType.TAG_NAME) {
          const tagName = nextToken.value;
          const afterName = this.advance(); // consume tag name
          if (afterName.type === TokenType.TAG_CLOSE) {
            this.advance(); // consume >
          }
          // If this matches parent, return
          if (tagName === parentTagName) {
            return children;
          }
          // Otherwise mismatched end tag, ignore and continue
          continue;
        }
        continue;
      }

      // Skip declarations, comments, doctypes
      if (
        this.currentToken.type === TokenType.DECLARATION ||
        this.currentToken.type === TokenType.COMMENT ||
        this.currentToken.type === TokenType.DOCTYPE
      ) {
        this.advance();
        continue;
      }

      // Parse element
      if (this.currentToken.type === TokenType.TAG_OPEN) {
        const element = this.parseElement();
        if (element) {
          children.push(element);
        }
        continue;
      }

      // Parse text
      if (this.currentToken.type === TokenType.TEXT) {
        const textNode = this.parseText();
        if (textNode) {
          children.push(textNode);
        }
        continue;
      }

      // Parse CDATA as text
      if (this.currentToken.type === TokenType.CDATA) {
        const textNode: XmlText = {
          type: "text",
          value: this.currentToken.value,
        };
        children.push(textNode);
        this.advance();
        continue;
      }

      // Skip unknown tokens
      this.advance();
    }

    return children;
  }

  /**
   * Parse a single element.
   */
  private parseElement(): XmlElement | null {
    // Current token is TAG_OPEN
    const tagNameToken = this.advance();

    // Expect tag name
    if (tagNameToken.type !== TokenType.TAG_NAME) {
      return null;
    }

    const name = tagNameToken.value;
    this.advance();

    // Parse attributes - use getter to avoid TypeScript narrowing issues
    const attrs: Record<string, string> = {};
    while (!this.isAtElementEnd()) {
      if (this.currentToken.type === TokenType.ATTR_NAME) {
        const attrName = this.currentToken.value;
        let valueToken = this.advance();

        // Expect =
        if (valueToken.type === TokenType.ATTR_EQ) {
          valueToken = this.advance();
        }

        // Expect value
        if (valueToken.type === TokenType.ATTR_VALUE) {
          attrs[attrName] = valueToken.value;
          this.advance();
        } else {
          attrs[attrName] = "";
        }
      } else {
        this.advance();
      }
    }

    // Check for self-closing
    if (this.currentToken.type === TokenType.TAG_SELF_CLOSE) {
      this.advance();
      return {
        type: "element",
        name,
        attrs,
        children: [],
      };
    }

    // Consume >
    if (this.currentToken.type === TokenType.TAG_CLOSE) {
      this.advance();
    }

    // Parse children
    const children = this.parseChildren(name);

    return {
      type: "element",
      name,
      attrs,
      children,
    };
  }

  /**
   * Parse text node.
   */
  private parseText(): XmlText | null {
    const value = this.currentToken.value;
    this.advance();

    // Skip whitespace-only text at document level
    if (value.trim().length === 0) {
      return null;
    }

    return {
      type: "text",
      value,
    };
  }
}
