/**
 * @file Markup Compatibility processing (ECMA-376 Part 3)
 * Applies mc:Ignorable, mc:ProcessContent, and mc:MustUnderstand.
 */

import type { XmlDocument, XmlNode, XmlElement } from "./ast";
import { getAttr, isXmlElement } from "./ast";

export type MarkupCompatibilityOptions = {
  readonly supportedPrefixes: readonly string[];
};

type MceScope = {
  readonly ignorablePrefixes: ReadonlySet<string>;
  readonly processContentElements: ReadonlySet<string>;
};

const EMPTY_SCOPE: MceScope = {
  ignorablePrefixes: new Set<string>(),
  processContentElements: new Set<string>(),
};

function parseSpaceSeparatedList(value: string | undefined): string[] {
  if (!value) {
    return [];
  }
  return value.split(/\s+/).filter((item) => item.length > 0);
}

function parseElementPrefix(name: string): string | undefined {
  const idx = name.indexOf(":");
  if (idx === -1) {
    return undefined;
  }
  return name.slice(0, idx);
}

function extendScope(element: XmlElement, scope: MceScope): MceScope {
  const ignorable = new Set(scope.ignorablePrefixes);
  const processContent = new Set(scope.processContentElements);

  for (const prefix of parseSpaceSeparatedList(getAttr(element, "mc:Ignorable"))) {
    ignorable.add(prefix);
  }

  for (const name of parseSpaceSeparatedList(getAttr(element, "mc:ProcessContent"))) {
    processContent.add(name);
  }

  return { ignorablePrefixes: ignorable, processContentElements: processContent };
}

function assertMustUnderstand(
  element: XmlElement,
  supportedPrefixes: ReadonlySet<string>,
): void {
  const requiredPrefixes = parseSpaceSeparatedList(getAttr(element, "mc:MustUnderstand"));
  if (requiredPrefixes.length === 0) {
    return;
  }

  const unsupported = requiredPrefixes.filter((prefix) => !supportedPrefixes.has(prefix));
  if (unsupported.length === 0) {
    return;
  }

  throw new Error(
    `Unsupported mc:MustUnderstand prefixes: ${unsupported.join(", ")} (element: ${element.name})`,
  );
}

function processNodes(
  nodes: readonly XmlNode[],
  scope: MceScope,
  supportedPrefixes: ReadonlySet<string>,
): XmlNode[] {
  const result: XmlNode[] = [];

  for (const node of nodes) {
    if (!isXmlElement(node)) {
      result.push(node);
      continue;
    }
    const processed = processElement(node, scope, supportedPrefixes);
    result.push(...processed);
  }

  return result;
}

function processElement(
  element: XmlElement,
  scope: MceScope,
  supportedPrefixes: ReadonlySet<string>,
): XmlNode[] {
  const nextScope = extendScope(element, scope);
  assertMustUnderstand(element, supportedPrefixes);

  const prefix = parseElementPrefix(element.name);
  const isIgnorable = prefix === undefined ? false : nextScope.ignorablePrefixes.has(prefix);
  const shouldProcessContent = nextScope.processContentElements.has(element.name);
  const children = processNodes(element.children, nextScope, supportedPrefixes);

  if (isIgnorable) {
    return shouldProcessContent ? children : [];
  }

  return [
    {
      ...element,
      children,
    },
  ];
}

/**
 * Apply Markup Compatibility processing to XML document.
 *
 * @throws Error when mc:MustUnderstand includes unsupported prefixes.
 */
export function applyMarkupCompatibility(
  document: XmlDocument,
  options: MarkupCompatibilityOptions,
): XmlDocument {
  if (!options?.supportedPrefixes) {
    throw new Error("MarkupCompatibilityOptions.supportedPrefixes is required.");
  }

  const supportedPrefixes = new Set(options.supportedPrefixes);
  const children = processNodes(document.children, EMPTY_SCOPE, supportedPrefixes);

  return { children };
}
