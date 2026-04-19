/**
 * @file Fig file validator
 *
 * Validates generated .fig files against known working files
 * to ensure structural compatibility with Figma.
 */

import { readFileSync } from "node:fs";
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
  return node.type?.name ?? "UNKNOWN";
}

/**
 * Required-field sets per node type. Keys are `keyof FigNode` so the
 * TypeScript compiler rejects typos and dropped fields at edit time —
 * this is the SSoT for which FigNode fields Figma requires per node
 * role. Fields are listed even when they are already non-optional on
 * FigNode, because runtime .fig data coming from parsing can still be
 * incomplete when a malformed file is supplied.
 */
const REQUIRED_FIELDS = {
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
} as const satisfies Record<string, readonly (keyof FigNode)[]>;

type ValidateNodeFieldsOptions = {
  readonly nodeType: string;
  readonly generated: FigNode;
  readonly reference: FigNode;
  readonly errors: ValidationError[];
};

function isKnownNodeType(nodeType: string): nodeType is keyof typeof REQUIRED_FIELDS {
  return nodeType in REQUIRED_FIELDS;
}

function validateNodeFields(options: ValidateNodeFieldsOptions): void {
  const { nodeType, generated, reference, errors } = options;

  // Check required fields exist. `in` on a FigNode narrows nothing
  // extra here — we only need presence, which is correctly expressed
  // by the `<field> in <node>` operator over the typed record.
  const requiredFields: readonly (keyof FigNode)[] = isKnownNodeType(nodeType)
    ? REQUIRED_FIELDS[nodeType]
    : [];
  for (const field of requiredFields) {
    if (!(field in generated) && field in reference) {
      errors.push({
        path: `nodes.${nodeType}.${field}`,
        expected: "exists",
        actual: "missing",
        message: `${nodeType} node missing required field: ${field}`,
      });
    }
  }

  // Check guid structure — FigNode.guid is FigGuid { sessionID, localID }
  // already, so the TS shape is guaranteed. The runtime check covers
  // malformed parsed files; we still use the FigGuid field access for
  // the reference read.
  if (generated.guid && reference.guid) {
    const genGuid = generated.guid;
    if (genGuid.sessionID === undefined || genGuid.localID === undefined) {
      errors.push({
        path: `nodes.${nodeType}.guid`,
        expected: { sessionID: "number", localID: "number" },
        actual: genGuid,
        message: `${nodeType} guid structure invalid`,
      });
    }
  }

  // Check parentIndex structure (for non-DOCUMENT nodes)
  if (nodeType !== "DOCUMENT" && generated.parentIndex && reference.parentIndex) {
    const genPI = generated.parentIndex;
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
  if (generated.type && reference.type) {
    if (generated.type.value !== reference.type.value) {
      errors.push({
        path: `nodes.${nodeType}.type.value`,
        expected: reference.type.value,
        actual: generated.type.value,
        message: `${nodeType} type value mismatch`,
      });
    }
  }

  // Check enum field structures. These are KiwiEnumValue-shaped on
  // FigNode (strokeAlign/strokeJoin are domain strings now, phase and
  // documentColorProfile remain KiwiEnumValue). We validate only the
  // kiwi-shaped ones here — strokeAlign/strokeJoin are strings and
  // therefore correct by construction.
  validateEnumValue({ node: generated, field: "phase", nodeType, errors });
  validateEnumValue({ node: generated, field: "documentColorProfile", nodeType, errors });
}

type EnumFieldOptions = {
  readonly node: FigNode;
  readonly field: "phase" | "documentColorProfile";
  readonly nodeType: string;
  readonly errors: ValidationError[];
};

function validateEnumValue(options: EnumFieldOptions): void {
  const { node, field, nodeType, errors } = options;
  const value = node[field];
  if (value === undefined) return;
  if (value.value === undefined || value.name === undefined) {
    errors.push({
      path: `nodes.${nodeType}.${field}`,
      expected: { value: "number", name: "string" },
      actual: value,
      message: `${nodeType} ${field} should be enum {value, name}`,
    });
  }
}

/**
 * Run validation and print results
 */
export async function runValidation(
  generatedPath: string,
  referencePath: string
): Promise<boolean> {
  const generatedData = new Uint8Array(readFileSync(generatedPath));
  const referenceData = new Uint8Array(readFileSync(referencePath));

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
