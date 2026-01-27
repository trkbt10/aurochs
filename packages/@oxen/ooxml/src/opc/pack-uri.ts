/**
 * @file OPC pack URI utilities
 *
 * Implements ECMA-376 Part 2, Sections 6.3 and 6.4.2.
 */

import { arePartNamesEquivalent, assertValidPartName } from "./part-name";

export type PackResource =
  | { type: "package"; packageIri: string }
  | { type: "part"; packageIri: string; partName: string };

const PACK_SCHEME = "pack";

function isAbsoluteIri(value: string): boolean {
  return /^[A-Za-z][A-Za-z0-9+.-]*:/.test(value);
}

function decodePercentEncodedAscii(value: string): string {
  return value.replace(/%[0-9a-fA-F]{2}/g, (match) => {
    const code = parseInt(match.slice(1), 16);
    if (code <= 0x7f) {
      return String.fromCharCode(code);
    }
    return match.toUpperCase();
  });
}

function decodeAuthorityComponent(authority: string): string {
  const replaced = authority.replace(/,/g, "/");
  return decodePercentEncodedAscii(replaced);
}

function normalizeForPackAuthority(packageIri: string): string {
  const withoutFragment = packageIri.split("#")[0] ?? "";
  const encoded = withoutFragment
    .replace(/%/g, "%25")
    .replace(/\?/g, "%3F")
    .replace(/@/g, "%40")
    .replace(/:/g, "%3A")
    .replace(/,/g, "%2C");
  return encoded.replace(/\//g, ",");
}

function normalizePackageIriForComparison(packageIri: string): string | null {
  try {
    const url = new URL(packageIri);
    const scheme = url.protocol.toLowerCase();
    const hostname = url.hostname.toLowerCase();
    const username = url.username;
    const password = url.password;
    let port = url.port;
    if ((scheme === "http:" && port === "80") || (scheme === "https:" && port === "443")) {
      port = "";
    }
    const auth = username ? `${username}${password ? `:${password}` : ""}@` : "";
    const portPart = port ? `:${port}` : "";
    return `${scheme}//${auth}${hostname}${portPart}${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

/**
 * Resolve a pack IRI to a package IRI and optional part name.
 *
 * @see ECMA-376 Part 2, Section 6.3.3
 */
export function parsePackIri(packIri: string): PackResource {
  if (!packIri.startsWith("pack://")) {
    throw new Error(`Invalid pack IRI scheme: ${packIri}`);
  }

  const remainder = packIri.slice("pack://".length);
  const slashIndex = remainder.indexOf("/");
  const authority = slashIndex >= 0 ? remainder.slice(0, slashIndex) : remainder;
  const path = slashIndex >= 0 ? remainder.slice(slashIndex) : "";

  if (authority.length === 0) {
    throw new Error(`Invalid pack IRI authority: ${packIri}`);
  }

  const packageIri = decodeAuthorityComponent(authority);
  if (!isAbsoluteIri(packageIri)) {
    throw new Error(`Invalid package IRI in pack IRI: ${packIri}`);
  }

  if (path === "" || path === "/") {
    return { type: "package", packageIri };
  }

  assertValidPartName(path);
  return { type: "part", packageIri, partName: path };
}

/**
 * Compose a pack IRI from a package IRI and part name.
 *
 * @see ECMA-376 Part 2, Section 6.3.4
 */
export function composePackIri(packageIri: string, partName?: string): string {
  if (!isAbsoluteIri(packageIri)) {
    throw new Error(`Package IRI must be absolute: ${packageIri}`);
  }

  if (partName !== undefined) {
    assertValidPartName(partName);
  }

  const authority = normalizeForPackAuthority(packageIri);
  const base = `pack://${authority}/`;
  if (!partName) {
    return base;
  }

  return new URL(partName, base).toString();
}

/**
 * Build a base IRI for resolving relative references within a part.
 *
 * @see ECMA-376 Part 2, Section 6.4.2
 */
export function createPartBaseIri(packageIri: string, partName: string): string {
  return composePackIri(packageIri, partName);
}

/**
 * Determine equivalence between two pack IRIs.
 *
 * @see ECMA-376 Part 2, Section 6.3.5
 */
export function arePackIrisEquivalent(left: string, right: string): boolean {
  const leftResolved = parsePackIri(left);
  const rightResolved = parsePackIri(right);

  const leftPackage = normalizePackageIriForComparison(leftResolved.packageIri) ?? leftResolved.packageIri;
  const rightPackage = normalizePackageIriForComparison(rightResolved.packageIri) ?? rightResolved.packageIri;
  if (leftPackage !== rightPackage) {
    return false;
  }

  if (leftResolved.type === "package" && rightResolved.type === "package") {
    return true;
  }
  if (leftResolved.type !== rightResolved.type) {
    return false;
  }

  if (leftResolved.type === "part" && rightResolved.type === "part") {
    return arePartNamesEquivalent(leftResolved.partName, rightResolved.partName);
  }
  return false;
}

/**
 * Extract the pack scheme from a pack IRI.
 */
export function getPackScheme(): string {
  return PACK_SCHEME;
}
