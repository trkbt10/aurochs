/**
 * @file XML AST type definitions
 * Defines the Abstract Syntax Tree structure for parsed XML documents.
 *
 * Design principles:
 * - Array-based children (natural ordering, no `order` attribute hack)
 * - Explicit node types via discriminated union
 * - No `simplify` transformation - parser directly produces this structure
 */

/**
 * XML element node representing a tag with attributes and children.
 *
 * @example
 * ```xml
 * <p:sp id="1"><a:t>Hello</a:t></p:sp>
 * ```
 * Produces:
 * ```typescript
 * {
 *   type: 'element',
 *   name: 'p:sp',
 *   attrs: { id: '1' },
 *   children: [
 *     { type: 'element', name: 'a:t', attrs: {}, children: [
 *       { type: 'text', value: 'Hello' }
 *     ]}
 *   ]
 * }
 * ```
 */
export type XmlElement = {
  readonly type: "element";
  readonly name: string;
  readonly attrs: Readonly<Record<string, string>>;
  readonly children: readonly XmlNode[];
};

/**
 * XML text node representing text content within an element.
 */
export type XmlText = {
  readonly type: "text";
  readonly value: string;
};

/**
 * Union type for all XML AST node types.
 */
export type XmlNode = XmlElement | XmlText;

/**
 * Parsed XML document result.
 */
export type XmlDocument = {
  readonly children: readonly XmlNode[];
};

/**
 * Type guard for XmlElement nodes.
 * Accepts unknown to allow narrowing from any type.
 */
export function isXmlElement(node: unknown): node is XmlElement {
  if (typeof node !== "object") {
    return false;
  }
  if (node === null) {
    return false;
  }
  if (!("type" in node)) {
    return false;
  }
  return (node as { type: unknown }).type === "element";
}

/**
 * Type guard for XmlDocument.
 */
export function isXmlDocument(value: unknown): value is XmlDocument {
  if (typeof value !== "object") {
    return false;
  }
  if (value === null) {
    return false;
  }
  if (!("children" in value)) {
    return false;
  }
  return Array.isArray((value as XmlDocument).children);
}

/**
 * Type guard for XmlText nodes.
 * Accepts unknown to allow use with untyped values.
 */
export function isXmlText(node: unknown): node is XmlText {
  if (typeof node !== "object") {
    return false;
  }
  if (node === null) {
    return false;
  }
  if (!("type" in node)) {
    return false;
  }
  return (node as XmlText).type === "text";
}

/**
 * Get first child element by name.
 * Returns undefined if not found.
 */
export function getChild(parent: XmlElement, name: string): XmlElement | undefined {
  const match = createElementNameMatcher(name);
  for (const child of parent.children) {
    if (isXmlElement(child) && match(child.name)) {
      return child;
    }
  }
  return undefined;
}

/**
 * Get all child elements by name.
 * Returns empty array if none found.
 */
export function getChildren(parent: XmlElement, name: string): readonly XmlElement[] {
  const match = createElementNameMatcher(name);
  const result: XmlElement[] = [];
  for (const child of parent.children) {
    if (isXmlElement(child) && match(child.name)) {
      result.push(child);
    }
  }
  return result;
}

function createElementNameMatcher(name: string): (childName: string) => boolean {
  if (name.includes(":")) {
    return (childName) => childName === name;
  }
  return (childName) => childName === name || childName.endsWith(`:${name}`);
}

/**
 * Get text content of an element.
 * Concatenates all text children.
 */
export function getTextContent(element: XmlElement): string {
  let result = "";
  for (const child of element.children) {
    if (isXmlText(child)) {
      result += child.value;
    }
  }
  return result;
}

/**
 * Get attribute value or undefined.
 */
export function getAttr(element: XmlElement, name: string): string | undefined {
  return element.attrs[name];
}

/**
 * Check if element has a specific attribute.
 */
export function hasAttr(element: XmlElement, name: string): boolean {
  return name in element.attrs;
}

// =============================================================================
// Path-based Traversal (replaces traverse.ts functions)
// =============================================================================

/**
 * Traverse XML element by path and return the element at that path.
 * Path is an array of element names to traverse.
 *
 * @example
 * ```typescript
 * // Old: getTextByPathList(node, ["p:sp", "p:txBody", "a:p"])
 * // New: getByPath(root, ["p:sp", "p:txBody", "a:p"])
 * ```
 */
export function getByPath(
  element: XmlElement | XmlDocument | null | undefined,
  path: readonly string[],
): XmlElement | undefined {
  if (element === null || element === undefined) {
    return undefined;
  }

  let current: XmlElement | undefined;

  // Handle XmlDocument (has children but no type property)
  if ("children" in element && !("type" in element)) {
    // XmlDocument - find first matching child
    const doc = element as XmlDocument;
    if (path.length === 0) {
      return undefined;
    }
    const firstChild = doc.children.find((c): c is XmlElement => {
      if (!isXmlElement(c)) {
        return false;
      }
      return c.name === path[0];
    });
    if (!firstChild) {
      return undefined;
    }
    current = firstChild;
    path = path.slice(1);
  } else if (isXmlElement(element as XmlNode)) {
    current = element as XmlElement;
  } else {
    return undefined;
  }

  for (const name of path) {
    if (!current) {
      return undefined;
    }
    current = getChild(current, name);
  }

  return current;
}

/**
 * Get attribute value at a path.
 *
 * @example
 * ```typescript
 * // Old: getAttrs(node, ["p:sp", "p:nvSpPr", "p:cNvPr"])?.id
 * // New: getAttrByPath(root, ["p:sp", "p:nvSpPr", "p:cNvPr"], "id")
 * ```
 */
export function getAttrByPath(
  element: XmlElement | XmlDocument | null | undefined,
  path: readonly string[],
  attrName: string,
): string | undefined {
  const target = getByPath(element, path);
  if (!target) {
    return undefined;
  }
  return target.attrs[attrName];
}

/**
 * Get text content at a path.
 *
 * @example
 * ```typescript
 * // Old: getTextByPathList(node, ["a:t", "_text"])
 * // New: getTextByPath(root, ["a:t"])
 * ```
 */
export function getTextByPath(
  element: XmlElement | XmlDocument | null | undefined,
  path: readonly string[],
): string | undefined {
  const target = getByPath(element, path);
  if (!target) {
    return undefined;
  }
  return getTextContent(target);
}

/**
 * Get all children at a path.
 *
 * @example
 * ```typescript
 * // Old: asArray(node["p:sp"]["p:txBody"]["a:p"])
 * // New: getChildrenByPath(root, ["p:sp", "p:txBody"], "a:p")
 * ```
 */
export function getChildrenByPath(
  element: XmlElement | XmlDocument | null | undefined,
  path: readonly string[],
  childName: string,
): readonly XmlElement[] {
  const target = getByPath(element, path);
  if (!target) {
    return [];
  }
  return getChildren(target, childName);
}

/**
 * Iterate over children and apply a function to each.
 * Handles both single element and arrays uniformly.
 *
 * @example
 * ```typescript
 * // Old: eachElement(paragraphs, (p, i) => processParagraph(p, i))
 * // New: mapChildren(element, "a:p", (p, i) => processParagraph(p, i))
 * ```
 */
export function mapChildren<T>(
  element: XmlElement | null | undefined,
  childName: string,
  fn: (child: XmlElement, index: number) => T,
): T[] {
  if (!element) {
    return [];
  }
  const children = getChildren(element, childName);
  return children.map((child, index) => fn(child, index));
}

/**
 * Find first element matching a predicate in children.
 */
export function findChild(
  element: XmlElement | null | undefined,
  predicate: (child: XmlElement) => boolean,
): XmlElement | undefined {
  if (!element) {
    return undefined;
  }
  for (const child of element.children) {
    if (isXmlElement(child) && predicate(child)) {
      return child;
    }
  }
  return undefined;
}

/**
 * Check if element has a child with the given name.
 */
export function hasChild(element: XmlElement | null | undefined, name: string): boolean {
  return getChild(element ?? ({ type: "element", name: "", attrs: {}, children: [] }), name) !== undefined;
}

// =============================================================================
// Element Construction
// =============================================================================

/**
 * Create a new XmlElement.
 *
 * @param name - Element tag name
 * @param attrs - Element attributes (default: empty)
 * @param children - Child nodes (default: empty)
 * @returns New XmlElement
 *
 * @example
 * ```typescript
 * createElement("font", { val: "Calibri" })
 * // => { type: "element", name: "font", attrs: { val: "Calibri" }, children: [] }
 *
 * createElement("row", { r: "1" }, [
 *   createElement("c", { r: "A1" })
 * ])
 * ```
 */
export function createElement(
  name: string,
  attrs: Record<string, string> = {},
  children: readonly XmlNode[] = [],
): XmlElement {
  return {
    type: "element",
    name,
    attrs,
    children,
  };
}

/**
 * Create a new XmlText node.
 *
 * @param value - Text content
 * @returns New XmlText
 */
export function createText(value: string): XmlText {
  return {
    type: "text",
    value,
  };
}
