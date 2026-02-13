/**
 * @file Macro preservation test utilities
 *
 * Utilities for verifying macro-related parts survive roundtrip processing.
 *
 * @see docs/plans/macro-runtime/04-test-cases.md
 */

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { parseXml } from "@aurochs/xml";
import { loadZipPackage, type ZipPackage } from "@aurochs/zip";
import {
  parseContentTypes,
  listRelationships,
  type ParsedContentTypes,
  type RelationshipInfo,
} from "@aurochs-office/opc";

// =============================================================================
// Fixture Loading
// =============================================================================

/**
 * Load fixture file as ZipPackage.
 */
export async function loadFixture(path: string): Promise<ZipPackage> {
  const bytes = readFileSync(path);
  return loadZipPackage(bytes);
}

/**
 * Load fixture file as raw bytes.
 */
export function loadFixtureBytes(path: string): Uint8Array {
  return readFileSync(path);
}

// =============================================================================
// Content Types
// =============================================================================

/**
 * Extract and parse [Content_Types].xml from package.
 */
export function extractContentTypes(pkg: ZipPackage): ParsedContentTypes {
  const xml = pkg.readText("[Content_Types].xml");
  if (!xml) {
    throw new Error("[Content_Types].xml not found in package");
  }
  return parseContentTypes(parseXml(xml));
}

/**
 * Get main part content type from package.
 *
 * @param pkg - ZIP package
 * @param mainPartPath - Path to main part (e.g., "/xl/workbook.xml")
 */
export function getMainContentType(pkg: ZipPackage, mainPartPath: string): string | undefined {
  const contentTypes = extractContentTypes(pkg);
  return contentTypes.overrides.get(mainPartPath);
}

// =============================================================================
// Relationships
// =============================================================================

/**
 * Extract and parse relationships from .rels file.
 *
 * @param pkg - ZIP package
 * @param relsPath - Path to .rels file (e.g., "xl/_rels/workbook.xml.rels")
 */
export function extractRelationships(pkg: ZipPackage, relsPath: string): RelationshipInfo[] {
  const xml = pkg.readText(relsPath);
  if (!xml) {
    return [];
  }
  return listRelationships(parseXml(xml));
}

/**
 * Find relationship by type.
 */
export function findRelationshipByType(
  rels: RelationshipInfo[],
  relType: string
): RelationshipInfo | undefined {
  return rels.find((r) => r.type === relType);
}

/**
 * Find all relationships matching a type.
 */
export function findRelationshipsByType(rels: RelationshipInfo[], relType: string): RelationshipInfo[] {
  return rels.filter((r) => r.type === relType);
}

// =============================================================================
// Binary Hash
// =============================================================================

/**
 * Compute SHA256 hash of binary data.
 */
export function hashBinary(data: ArrayBuffer | Uint8Array): string {
  const buffer = data instanceof ArrayBuffer ? Buffer.from(data) : Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  return createHash("sha256").update(buffer).digest("hex");
}

/**
 * Extract vbaProject.bin and compute hash.
 *
 * @param pkg - ZIP package
 * @param vbaProjectPath - Path to vbaProject.bin (e.g., "xl/vbaProject.bin")
 * @returns SHA256 hash or null if not found
 */
export function hashVbaProject(pkg: ZipPackage, vbaProjectPath: string): string | null {
  const binary = pkg.readBinary(vbaProjectPath);
  if (!binary) {
    return null;
  }
  return hashBinary(binary);
}

// =============================================================================
// Part Listing
// =============================================================================

/**
 * List all parts matching a prefix.
 *
 * @param pkg - ZIP package
 * @param prefix - Path prefix (e.g., "xl/macrosheets/")
 */
export function listPartsWithPrefix(pkg: ZipPackage, prefix: string): string[] {
  return pkg.listFiles().filter((f) => f.startsWith(prefix));
}

/**
 * Count parts matching a prefix.
 */
export function countPartsWithPrefix(pkg: ZipPackage, prefix: string): number {
  return listPartsWithPrefix(pkg, prefix).length;
}

// =============================================================================
// Macro Preservation Assertions
// =============================================================================

/**
 * Macro preservation verification result.
 */
export type MacroVerificationResult = {
  /** Main content type matches expected macro-enabled type */
  mainContentTypePreserved: boolean;
  /** vbaProject.bin exists and hash matches */
  vbaProjectPreserved: boolean;
  /** vbaProject relationship exists */
  vbaRelationshipPreserved: boolean;
  /** Additional parts (macrosheets, embeddings, ctrlProps) counts match */
  additionalPartsPreserved: boolean;
  /** Detailed comparison */
  details: {
    originalMainContentType: string | undefined;
    exportedMainContentType: string | undefined;
    originalVbaHash: string | null;
    exportedVbaHash: string | null;
    originalVbaRelExists: boolean;
    exportedVbaRelExists: boolean;
    partCounts: Record<string, { original: number; exported: number }>;
  };
};

/**
 * Format-specific configuration for macro verification.
 */
export type MacroVerificationConfig = {
  /** Path to main part (e.g., "/xl/workbook.xml") */
  mainPartPath: string;
  /** Path to main part's .rels file (e.g., "xl/_rels/workbook.xml.rels") */
  mainRelsPath: string;
  /** Path to vbaProject.bin (e.g., "xl/vbaProject.bin") */
  vbaProjectPath: string;
  /** Prefixes for additional parts to count */
  additionalPartPrefixes: string[];
};

/** XLSM configuration */
export const XLSM_CONFIG: MacroVerificationConfig = {
  mainPartPath: "/xl/workbook.xml",
  mainRelsPath: "xl/_rels/workbook.xml.rels",
  vbaProjectPath: "xl/vbaProject.bin",
  additionalPartPrefixes: ["xl/macrosheets/", "xl/embeddings/", "xl/ctrlProps/"],
};

/** DOCM configuration */
export const DOCM_CONFIG: MacroVerificationConfig = {
  mainPartPath: "/word/document.xml",
  mainRelsPath: "word/_rels/document.xml.rels",
  vbaProjectPath: "word/vbaProject.bin",
  additionalPartPrefixes: ["word/embeddings/"],
};

/** PPTM/PPSM configuration */
export const PPTM_CONFIG: MacroVerificationConfig = {
  mainPartPath: "/ppt/presentation.xml",
  mainRelsPath: "ppt/_rels/presentation.xml.rels",
  vbaProjectPath: "ppt/vbaProject.bin",
  additionalPartPrefixes: ["ppt/embeddings/"],
};

/** VBA Project relationship type */
const VBA_PROJECT_RELATIONSHIP_TYPE = "http://schemas.microsoft.com/office/2006/relationships/vbaProject";

/**
 * Verify macro preservation between original and exported packages.
 */
export function verifyMacroPreservation(
  original: ZipPackage,
  exported: ZipPackage,
  config: MacroVerificationConfig
): MacroVerificationResult {
  // Content types
  const originalMainContentType = getMainContentType(original, config.mainPartPath);
  const exportedMainContentType = getMainContentType(exported, config.mainPartPath);
  const mainContentTypePreserved = originalMainContentType === exportedMainContentType;

  // VBA project binary
  const originalVbaHash = hashVbaProject(original, config.vbaProjectPath);
  const exportedVbaHash = hashVbaProject(exported, config.vbaProjectPath);
  const vbaProjectPreserved =
    originalVbaHash === exportedVbaHash || (originalVbaHash === null && exportedVbaHash === null);

  // VBA relationship
  const originalRels = extractRelationships(original, config.mainRelsPath);
  const exportedRels = extractRelationships(exported, config.mainRelsPath);
  const originalVbaRelExists = findRelationshipByType(originalRels, VBA_PROJECT_RELATIONSHIP_TYPE) !== undefined;
  const exportedVbaRelExists = findRelationshipByType(exportedRels, VBA_PROJECT_RELATIONSHIP_TYPE) !== undefined;
  const vbaRelationshipPreserved = originalVbaRelExists === exportedVbaRelExists;

  // Additional parts
  const partCounts: Record<string, { original: number; exported: number }> = {};
  let additionalPartsPreserved = true;
  for (const prefix of config.additionalPartPrefixes) {
    const originalCount = countPartsWithPrefix(original, prefix);
    const exportedCount = countPartsWithPrefix(exported, prefix);
    partCounts[prefix] = { original: originalCount, exported: exportedCount };
    if (originalCount !== exportedCount) {
      additionalPartsPreserved = false;
    }
  }

  return {
    mainContentTypePreserved,
    vbaProjectPreserved,
    vbaRelationshipPreserved,
    additionalPartsPreserved,
    details: {
      originalMainContentType,
      exportedMainContentType,
      originalVbaHash,
      exportedVbaHash,
      originalVbaRelExists,
      exportedVbaRelExists,
      partCounts,
    },
  };
}

/**
 * Assert all macro preservation checks pass.
 */
export function assertMacroPreservation(result: MacroVerificationResult): void {
  const errors: string[] = [];

  if (!result.mainContentTypePreserved) {
    errors.push(
      `Main content type changed: ${result.details.originalMainContentType} -> ${result.details.exportedMainContentType}`
    );
  }

  if (!result.vbaProjectPreserved) {
    errors.push(
      `vbaProject.bin hash changed: ${result.details.originalVbaHash} -> ${result.details.exportedVbaHash}`
    );
  }

  if (!result.vbaRelationshipPreserved) {
    errors.push(
      `vbaProject relationship changed: ${result.details.originalVbaRelExists} -> ${result.details.exportedVbaRelExists}`
    );
  }

  if (!result.additionalPartsPreserved) {
    for (const [prefix, counts] of Object.entries(result.details.partCounts)) {
      if (counts.original !== counts.exported) {
        errors.push(`Part count for ${prefix} changed: ${counts.original} -> ${counts.exported}`);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Macro preservation failed:\n${errors.join("\n")}`);
  }
}
