/**
 * @file Fig file validator
 *
 * Validates generated .fig files against known working files
 * to ensure structural compatibility with Figma.
 */

import { parseFigFile } from "../parser";
import type { FigNode } from "../types";

export type ValidationError = {
  path: string;
  expected: unknown;
  actual: unknown;
  message: string;
};

export type ValidationResult = {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
};

/**
 * Validate a generated .fig file against a reference working file
 */
export async function validateFigFile(
  generatedData: Uint8Array,
  referenceData: Uint8Array
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  try {
    const generated = await parseFigFile(generatedData);
    const reference = await parseFigFile(referenceData);

    // 1. Validate schema
    if (generated.schema.definitions.length !== reference.schema.definitions.length) {
      errors.push({
        path: "schema.definitions.length",
        expected: reference.schema.definitions.length,
        actual: generated.schema.definitions.length,
        message: `Schema definitions count mismatch`,
      });
    }

    // 3. Validate DOCUMENT node exists and has required fields
    const genDoc = generated.nodeChanges.find(n => getTypeName(n) === "DOCUMENT");
    const refDoc = reference.nodeChanges.find(n => getTypeName(n) === "DOCUMENT");

    if (!genDoc) {
      errors.push({
        path: "nodes.DOCUMENT",
        expected: "exists",
        actual: "missing",
        message: "DOCUMENT node is missing",
      });
    } else if (refDoc) {
      validateNodeFields({ nodeType: "DOCUMENT", generated: genDoc, reference: refDoc, errors });
    }

    // 4. Validate CANVAS node exists and has required fields
    const genCanvas = generated.nodeChanges.find(n => getTypeName(n) === "CANVAS");
    const refCanvas = reference.nodeChanges.filter(n => getTypeName(n) === "CANVAS")
      .find(n => n.name !== "Internal Only Canvas");

    if (!genCanvas) {
      errors.push({
        path: "nodes.CANVAS",
        expected: "exists",
        actual: "missing",
        message: "CANVAS node is missing",
      });
    } else if (refCanvas) {
      validateNodeFields({ nodeType: "CANVAS", generated: genCanvas, reference: refCanvas, errors });
    }

    // 5. Validate FRAME nodes have required fields
    const genFrame = generated.nodeChanges.find(n => getTypeName(n) === "FRAME");
    const refFrame = reference.nodeChanges.find(n => getTypeName(n) === "FRAME");

    if (genFrame && refFrame) {
      validateNodeFields({ nodeType: "FRAME", generated: genFrame, reference: refFrame, errors });
    }

    // 6. Check for blobs (warning only - might not be required)
    if (reference.blobs.length > 0 && generated.blobs.length === 0) {
      warnings.push(`Reference file has ${reference.blobs.length} blobs, generated has none`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  } catch (e) {
    errors.push({
      path: "parse",
      expected: "success",
      actual: "error",
      message: `Parse error: ${e}`,
    });
    return { valid: false, errors, warnings };
  }
}

function getTypeName(node: FigNode): string {
  const type = node.type as { name?: string } | undefined;
  return type?.name ?? "UNKNOWN";
}

const REQUIRED_FIELDS: Record<string, string[]> = {
  DOCUMENT: [
    "guid",
    "phase",
    "type",
    "name",
    "visible",
    "opacity",
    "transform",
    "strokeWeight",
    "strokeAlign",
    "strokeJoin",
    "documentColorProfile",
  ],
  CANVAS: [
    "guid",
    "phase",
    "parentIndex",
    "type",
    "name",
    "visible",
    "opacity",
    "transform",
    "backgroundOpacity",
    "strokeWeight",
    "strokeAlign",
    "strokeJoin",
    "backgroundColor",
    "backgroundEnabled",
  ],
  FRAME: [
    "guid",
    "phase",
    "parentIndex",
    "type",
    "name",
    "visible",
    "opacity",
    "size",
    "transform",
    "strokeWeight",
    "strokeAlign",
    "strokeJoin",
    "fillPaints",
    "frameMaskDisabled",
  ],
};

type ValidateNodeFieldsOptions = {
  readonly nodeType: string;
  readonly generated: FigNode;
  readonly reference: FigNode;
  readonly errors: ValidationError[];
};

function validateNodeFields(options: ValidateNodeFieldsOptions): void {
  const { nodeType, generated, reference, errors } = options;
  const genData = generated as Record<string, unknown>;
  const refData = reference as Record<string, unknown>;

  // Check required fields exist
  const requiredFields = REQUIRED_FIELDS[nodeType] ?? [];
  for (const field of requiredFields) {
    if (!(field in genData) && field in refData) {
      errors.push({
        path: `nodes.${nodeType}.${field}`,
        expected: "exists",
        actual: "missing",
        message: `${nodeType} node missing required field: ${field}`,
      });
    }
  }

  // Check guid structure
  if (genData.guid && refData.guid) {
    const genGuid = genData.guid as Record<string, unknown>;
    const _refGuid = refData.guid as Record<string, unknown>;

    if (!("sessionID" in genGuid) || !("localID" in genGuid)) {
      errors.push({
        path: `nodes.${nodeType}.guid`,
        expected: { sessionID: "number", localID: "number" },
        actual: genGuid,
        message: `${nodeType} guid structure invalid`,
      });
    }
  }

  // Check parentIndex structure (for non-DOCUMENT nodes)
  if (nodeType !== "DOCUMENT" && genData.parentIndex && refData.parentIndex) {
    const genPI = genData.parentIndex as Record<string, unknown>;
    const _refPI = refData.parentIndex as Record<string, unknown>;

    if (!genPI.guid || !genPI.position) {
      errors.push({
        path: `nodes.${nodeType}.parentIndex`,
        expected: { guid: "object", position: "string" },
        actual: genPI,
        message: `${nodeType} parentIndex structure invalid`,
      });
    }
  }

  // Check type structure
  if (genData.type && refData.type) {
    const genType = genData.type as Record<string, unknown>;
    const refType = refData.type as Record<string, unknown>;

    if (genType.value !== refType.value) {
      errors.push({
        path: `nodes.${nodeType}.type.value`,
        expected: refType.value,
        actual: genType.value,
        message: `${nodeType} type value mismatch`,
      });
    }
  }

  // Check enum field structures (strokeAlign, strokeJoin, etc.)
  const enumFields = ["strokeAlign", "strokeJoin", "phase", "documentColorProfile"];
  for (const field of enumFields) {
    if (field in genData && field in refData) {
      const genVal = genData[field] as Record<string, unknown> | undefined;
      const refVal = refData[field] as Record<string, unknown> | undefined;

      if (genVal && refVal && typeof genVal === "object" && typeof refVal === "object") {
        if (!("value" in genVal) || !("name" in genVal)) {
          errors.push({
            path: `nodes.${nodeType}.${field}`,
            expected: { value: "number", name: "string" },
            actual: genVal,
            message: `${nodeType} ${field} should be enum {value, name}`,
          });
        }
      }
    }
  }
}

/**
 * Run validation and print results
 */
export async function runValidation(
  generatedPath: string,
  referencePath: string
): Promise<boolean> {
  const fs = await import("node:fs");

  const generatedData = new Uint8Array(fs.readFileSync(generatedPath));
  const referenceData = new Uint8Array(fs.readFileSync(referencePath));

  const result = await validateFigFile(generatedData, referenceData);

  console.log("\n=== Fig File Validation ===\n");
  console.log(`Generated: ${generatedPath}`);
  console.log(`Reference: ${referencePath}`);
  console.log(`\nResult: ${result.valid ? "✓ VALID" : "✗ INVALID"}`);

  if (result.errors.length > 0) {
    console.log(`\nErrors (${result.errors.length}):`);
    for (const err of result.errors) {
      console.log(`  ✗ ${err.path}: ${err.message}`);
      console.log(`    expected: ${JSON.stringify(err.expected)}`);
      console.log(`    actual:   ${JSON.stringify(err.actual)}`);
    }
  }

  if (result.warnings.length > 0) {
    console.log(`\nWarnings (${result.warnings.length}):`);
    for (const warn of result.warnings) {
      console.log(`  ⚠ ${warn}`);
    }
  }

  return result.valid;
}
