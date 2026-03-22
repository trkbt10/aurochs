/**
 * @file XML Parser
 * Parses XML string into AST using lexer tokens.
 *
 * Design: Recursive descent parser that consumes tokens from lexer
 * and builds XmlDocument AST.
 */

import { createXmlLexer, TokenType, type Token } from "./lexer";
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
  const lexer = createXmlLexer(input);
  const currentToken = { value: lexer.nextToken() };

  /**
   * Advance to next token and return it.
   */
  function advance(): Token {
    currentToken.value = lexer.nextToken();
    return currentToken.value;
  }

  /**
   * Check if current token is at element end (close tag, self-close, or EOF).
   */
  function isAtElementEnd(): boolean {
    return (
      currentToken.value.type === TokenType.TAG_CLOSE ||
      currentToken.value.type === TokenType.TAG_SELF_CLOSE ||
      currentToken.value.type === TokenType.EOF
    );
  }

  /**
   * Parse text node.
   */
  function parseText(): XmlText | null {
    const value = currentToken.value.value;
    advance();

    // Skip whitespace-only text at document level
    if (value.trim().length === 0) {
      return null;
    }

    return {
      type: "text",
      value,
    };
  }

  /**
   * Parse a single element.
   */
  function parseElement(): XmlElement | null {
    // Current token is TAG_OPEN
    const tagNameToken = advance();

    // Expect tag name
    if (tagNameToken.type !== TokenType.TAG_NAME) {
      return null;
    }

    const name = tagNameToken.value;
    advance();

    // Parse attributes
    const attrs: Record<string, string> = {};
    while (!isAtElementEnd()) {
      if (currentToken.value.type === TokenType.ATTR_NAME) {
        const attrName = currentToken.value.value;
        const tokenAfterName = advance();

        // Skip = if present
        const valueToken = tokenAfterName.type === TokenType.ATTR_EQ ? advance() : tokenAfterName;

        // Expect value
        if (valueToken.type === TokenType.ATTR_VALUE) {
          attrs[attrName] = valueToken.value;
          advance();
        } else {
          attrs[attrName] = "";
        }
      } else {
        advance();
      }
    }

    // Check for self-closing
    if (currentToken.value.type === TokenType.TAG_SELF_CLOSE) {
      advance();
      return {
        type: "element",
        name,
        attrs,
        children: [],
      };
    }

    // Consume >
    if (currentToken.value.type === TokenType.TAG_CLOSE) {
      advance();
    }

    // Parse children
    const children = parseChildren(name);

    return {
      type: "element",
      name,
      attrs,
      children,
    };
  }

  /**
   * Parse children until end tag or EOF.
   * @param parentTagName - Name of parent tag to match end tag, or null for document level
   */
  function parseChildren(parentTagName: string | null): XmlNode[] {
    const children: XmlNode[] = [];

    while (currentToken.value.type !== TokenType.EOF) {
      // Check for end tag
      if (currentToken.value.type === TokenType.TAG_OPEN_END) {
        // Peek at tag name
        const nextToken = advance();
        if (nextToken.type === TokenType.TAG_NAME) {
          const tagName = nextToken.value;
          const afterName = advance(); // consume tag name
          if (afterName.type === TokenType.TAG_CLOSE) {
            advance(); // consume >
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
        currentToken.value.type === TokenType.DECLARATION ||
        currentToken.value.type === TokenType.COMMENT ||
        currentToken.value.type === TokenType.DOCTYPE
      ) {
        advance();
        continue;
      }

      // Parse element
      if (currentToken.value.type === TokenType.TAG_OPEN) {
        const element = parseElement();
        if (element) {
          children.push(element);
        }
        continue;
      }

      // Parse text
      if (currentToken.value.type === TokenType.TEXT) {
        const textNode = parseText();
        if (textNode) {
          children.push(textNode);
        }
        continue;
      }

      // Parse CDATA as text
      if (currentToken.value.type === TokenType.CDATA) {
        const textNode: XmlText = {
          type: "text",
          value: currentToken.value.value,
        };
        children.push(textNode);
        advance();
        continue;
      }

      // Skip unknown tokens
      advance();
    }

    return children;
  }

  const children = parseChildren(null);
  return { children };
}
