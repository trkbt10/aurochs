/**
 * @file XML transformation utilities
 * Functions for filtering, stringifying, and extracting content from XML
 */

import type { XmlNode, XmlElement } from "./ast";
import { isXmlElement, isXmlText } from "./ast";
import { escapeAttr, escapeContent } from "./escape";

/**
 * Filter elements by predicate function.
 * Recursively searches through the node tree.
 */
export function filterNodes(
  nodes: readonly XmlNode[],
  predicate: (node: XmlElement) => boolean,
): XmlElement[] {
  const result: XmlElement[] = [];

  for (const node of nodes) {
    if (isXmlElement(node)) {
      if (predicate(node)) {
        result.push(node);
      }
      const childResults = filterNodes(node.children, predicate);
      result.push(...childResults);
    }
  }

  return result;
}

/**
 * Build attribute string for an element.
 * Properly escapes attribute values.
 */
function buildAttributeString(attrs: Readonly<Record<string, string>>): string {
  const parts: string[] = [];

  for (const attrName in attrs) {
    const attrValue = attrs[attrName];
    parts.push(` ${attrName}='${escapeAttr(attrValue.trim())}'`);
  }

  return parts.join("");
}

/**
 * Convert a single element to string.
 */
function elementToString(element: XmlElement): string {
  const attrStr = buildAttributeString(element.attrs);
  const childrenStr = nodesToString(element.children);

  return `<${element.name}${attrStr}>${childrenStr}</${element.name}>`;
}

/**
 * Convert nodes array to string.
 */
function nodesToString(nodes: readonly XmlNode[]): string {
  const parts: string[] = [];

  for (const node of nodes) {
    if (isXmlText(node)) {
      parts.push(escapeContent(node.value.trim()));
    } else if (isXmlElement(node)) {
      parts.push(elementToString(node));
    }
  }

  return parts.join("");
}

/**
 * Convert parsed XML back to string.
 * Serializes XmlNode tree to XML string with proper escaping.
 */
export function stringify(nodes: readonly XmlNode[]): string {
  return nodesToString(nodes);
}

/**
 * Get text content from a single node.
 * Extracts only the text content, ignoring tags.
 */
function nodeToContentString(node: XmlNode): string {
  if (isXmlText(node)) {
    return node.value;
  }

  if (isXmlElement(node)) {
    return toContentString(node.children);
  }

  return "";
}

/**
 * Type guard to check if value is an array of nodes.
 */
function isNodeArray(nodes: readonly XmlNode[] | XmlNode): nodes is readonly XmlNode[] {
  return Array.isArray(nodes);
}

/**
 * Get text content from nodes.
 * Extracts only the text content, ignoring tags.
 */
export function toContentString(nodes: readonly XmlNode[] | XmlNode): string {
  if (isNodeArray(nodes)) {
    const parts: string[] = [];
    for (const node of nodes) {
      const content = nodeToContentString(node).trim();
      if (content) {
        parts.push(content);
      }
    }
    return parts.join(" ");
  }

  // Single node case - TypeScript now knows this is XmlNode
  return nodeToContentString(nodes);
}
