/**
 * @file OPC Part name utilities
 *
 * Implements ECMA-376 Part 2, Section 6.2.2.
 */

const RESERVED_RELS_SEGMENT = "_rels";
const RELS_EXTENSION = ".rels";

function isAsciiAlpha(code: number): boolean {
  return (code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a);
}

function isAsciiDigit(code: number): boolean {
  return code >= 0x30 && code <= 0x39;
}

function isUnreservedAscii(code: number): boolean {
  return (
    isAsciiAlpha(code) ||
    isAsciiDigit(code) ||
    code === 0x2d ||
    code === 0x2e ||
    code === 0x5f ||
    code === 0x7e
  );
}

function toAsciiLower(value: string): string {
  let result = "";
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code >= 0x41 && code <= 0x5a) {
      result += String.fromCharCode(code + 0x20);
    } else {
      result += value[i] ?? "";
    }
  }
  return result;
}

function hasInvalidPercentEncoding(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    if (value[i] !== "%") {
      continue;
    }
    if (i + 2 >= value.length) {
      return true;
    }
    const hex = value.slice(i + 1, i + 3);
    if (!/^[0-9a-fA-F]{2}$/.test(hex)) {
      return true;
    }
    i += 2;
  }
  return false;
}

function hasPercentEncodedSlash(segment: string): boolean {
  return /%2f|%2F|%5c|%5C/.test(segment);
}

function hasPercentEncodedUnreserved(segment: string): boolean {
  const matches = segment.match(/%[0-9a-fA-F]{2}/g) ?? [];
  for (const match of matches) {
    const code = parseInt(match.slice(1), 16);
    if (isUnreservedAscii(code)) {
      return true;
    }
  }
  return false;
}

function isReservedRelationshipPartName(partName: string): boolean {
  const lower = toAsciiLower(partName);
  if (lower === "/_rels/.rels") {
    return true;
  }

  const segments = lower.split("/");
  if (segments.length < 3) {
    return false;
  }
  const secondToLast = segments[segments.length - 2] ?? "";
  const last = segments[segments.length - 1] ?? "";
  if (secondToLast !== RESERVED_RELS_SEGMENT) {
    return false;
  }
  return last.endsWith(RELS_EXTENSION);
}

/**
 * Check whether two part names are equivalent using ASCII case-insensitive matching.
 *
 * @see ECMA-376 Part 2, Section 6.2.2.3
 */
export function arePartNamesEquivalent(a: string, b: string): boolean {
  return toAsciiLower(a) === toAsciiLower(b);
}

/**
 * Validate OPC part name constraints.
 *
 * @see ECMA-376 Part 2, Section 6.2.2.2
 */
export function isValidPartName(partName: string): boolean {
  if (!partName.startsWith("/")) {
    return false;
  }
  if (partName === "/") {
    return false;
  }
  if (partName.includes("?") || partName.includes("#")) {
    return false;
  }

  const segments = partName.split("/");
  if (segments[0] !== "") {
    return false;
  }

  for (let i = 1; i < segments.length; i += 1) {
    const segment = segments[i];
    if (!segment) {
      return false;
    }
    if (segment.endsWith(".")) {
      return false;
    }
    if (segment.includes("\\")) {
      return false;
    }
    if (hasInvalidPercentEncoding(segment)) {
      return false;
    }
    if (hasPercentEncodedSlash(segment)) {
      return false;
    }
    if (hasPercentEncodedUnreserved(segment)) {
      return false;
    }
  }

  if (isReservedRelationshipPartName(partName)) {
    return false;
  }

  return true;
}

/**
 * Assert part name validity.
 *
 * @throws Error when the part name is invalid.
 */
export function assertValidPartName(partName: string): void {
  if (!isValidPartName(partName)) {
    throw new Error(`Invalid part name: ${partName}`);
  }
}
