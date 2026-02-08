/**
 * @file verify command - verify PPTX build results against expected values
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { runBuild } from "./build";
import type { BuildSpec } from "@aurochs-builder/pptx/types";
import { runShow } from "./show";
import { success, error, type Result } from "@aurochs-cli/cli-core";
import type {
  ShapeJson,
  BoundsJson,
  GeometryJson,
  FillJson,
  LineJson,
  EffectsJson,
  Shape3dJson,
  GraphicContentJson,
  TableJson,
} from "../serializers/shape-serializer";

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Expected table content for verification
 */
export type ExpectedTable = {
  readonly rows?: number;
  readonly cols?: number;
  readonly cells?: readonly (readonly { text?: string }[])[];
};

/**
 * Expected effects for verification
 */
export type ExpectedEffects = {
  readonly shadow?: { type?: string };
  readonly glow?: { radius?: number };
  readonly softEdge?: { radius?: number };
};

/**
 * Expected 3D properties for verification
 */
export type ExpectedShape3d = {
  readonly bevelTop?: { preset?: string };
  readonly bevelBottom?: { preset?: string };
  readonly material?: string;
  readonly extrusionHeight?: number;
};

/**
 * Expected shape specification for verification
 */
export type ExpectedShape = {
  readonly index: number; // -1 = last added shape
  readonly type?: "sp" | "pic" | "grpSp" | "cxnSp" | "graphicFrame";
  readonly bounds?: { x: number; y: number; width: number; height: number };
  readonly rotation?: number;
  readonly flipH?: boolean;
  readonly flipV?: boolean;
  readonly geometry?: { kind?: "preset" | "custom"; preset?: string };
  readonly fill?: { type?: "solid" | "gradient" | "pattern" | "none"; color?: string };
  readonly line?: { color?: string; width?: number; dashStyle?: string; compound?: string };
  readonly effects?: ExpectedEffects;
  readonly shape3d?: ExpectedShape3d;
  readonly text?: string;
  readonly content?: { type?: "table"; table?: ExpectedTable };
};

/**
 * Expected slide state
 */
export type SlideExpectation = {
  readonly slideNumber: number;
  readonly shapeCount?: number;
  readonly shapes?: readonly ExpectedShape[];
};

/**
 * Test case specification
 */
export type TestCaseSpec = {
  readonly name: string;
  readonly description?: string;
  readonly tags?: readonly string[];
  readonly input: BuildSpec;
  readonly expected: {
    readonly slideCount?: number;
    readonly slides?: readonly SlideExpectation[];
  };
};

/**
 * Individual assertion result
 */
export type Assertion = {
  readonly path: string;
  readonly expected: unknown;
  readonly actual: unknown;
  readonly passed: boolean;
};

/**
 * Test case result
 */
export type TestCaseResult = {
  readonly name: string;
  readonly passed: boolean;
  readonly assertions: readonly Assertion[];
};

/**
 * Verify command output data
 */
export type VerifyData = {
  readonly passed: number;
  readonly failed: number;
  readonly results: readonly TestCaseResult[];
};

// =============================================================================
// Comparison Logic
// =============================================================================

function createAssertion(path: string, expected: unknown, actual: unknown): Assertion {
  return {
    path,
    expected,
    actual,
    passed: JSON.stringify(expected) === JSON.stringify(actual),
  };
}

function matchBounds(
  expected: { x: number; y: number; width: number; height: number },
  actual: BoundsJson | undefined,
  basePath: string,
): Assertion[] {
  const assertions: Assertion[] = [];
  if (!actual) {
    assertions.push(createAssertion(`${basePath}.bounds`, expected, undefined));
    return assertions;
  }
  if (expected.x !== undefined) {
    assertions.push(createAssertion(`${basePath}.bounds.x`, expected.x, actual.x));
  }
  if (expected.y !== undefined) {
    assertions.push(createAssertion(`${basePath}.bounds.y`, expected.y, actual.y));
  }
  if (expected.width !== undefined) {
    assertions.push(createAssertion(`${basePath}.bounds.width`, expected.width, actual.width));
  }
  if (expected.height !== undefined) {
    assertions.push(createAssertion(`${basePath}.bounds.height`, expected.height, actual.height));
  }
  return assertions;
}

function matchGeometry(
  expected: { kind?: "preset" | "custom"; preset?: string },
  actual: GeometryJson | undefined,
  basePath: string,
): Assertion[] {
  const assertions: Assertion[] = [];
  if (!actual) {
    assertions.push(createAssertion(`${basePath}.geometry`, expected, undefined));
    return assertions;
  }
  if (expected.kind !== undefined) {
    assertions.push(createAssertion(`${basePath}.geometry.kind`, expected.kind, actual.kind));
  }
  if (expected.preset !== undefined) {
    assertions.push(createAssertion(`${basePath}.geometry.preset`, expected.preset, actual.preset));
  }
  return assertions;
}

function matchFill(
  expected: { type?: "solid" | "gradient" | "pattern" | "none"; color?: string },
  actual: FillJson | undefined,
  basePath: string,
): Assertion[] {
  const assertions: Assertion[] = [];
  if (!actual) {
    if (expected.type === "none") {
      return assertions; // no fill is expected, undefined is ok
    }
    assertions.push(createAssertion(`${basePath}.fill`, expected, undefined));
    return assertions;
  }
  if (expected.type !== undefined) {
    assertions.push(createAssertion(`${basePath}.fill.type`, expected.type, actual.type));
  }
  if (expected.color !== undefined) {
    assertions.push(createAssertion(`${basePath}.fill.color`, expected.color, actual.color));
  }
  return assertions;
}

function matchLine(
  expected: { color?: string; width?: number; dashStyle?: string; compound?: string },
  actual: LineJson | undefined,
  basePath: string,
): Assertion[] {
  const assertions: Assertion[] = [];
  if (!actual) {
    assertions.push(createAssertion(`${basePath}.line`, expected, undefined));
    return assertions;
  }
  if (expected.color !== undefined) {
    assertions.push(createAssertion(`${basePath}.line.color`, expected.color, actual.color));
  }
  if (expected.width !== undefined) {
    assertions.push(createAssertion(`${basePath}.line.width`, expected.width, actual.width));
  }
  if (expected.dashStyle !== undefined) {
    assertions.push(createAssertion(`${basePath}.line.dashStyle`, expected.dashStyle, actual.dashStyle));
  }
  if (expected.compound !== undefined) {
    assertions.push(createAssertion(`${basePath}.line.compound`, expected.compound, actual.compound));
  }
  return assertions;
}

function matchEffects(expected: ExpectedEffects, actual: EffectsJson | undefined, basePath: string): Assertion[] {
  const assertions: Assertion[] = [];
  if (!actual) {
    assertions.push(createAssertion(`${basePath}.effects`, expected, undefined));
    return assertions;
  }
  if (expected.shadow !== undefined) {
    if (!actual.shadow) {
      assertions.push(createAssertion(`${basePath}.effects.shadow`, expected.shadow, undefined));
    } else if (expected.shadow.type !== undefined) {
      assertions.push(createAssertion(`${basePath}.effects.shadow.type`, expected.shadow.type, actual.shadow.type));
    }
  }
  if (expected.glow !== undefined) {
    if (!actual.glow) {
      assertions.push(createAssertion(`${basePath}.effects.glow`, expected.glow, undefined));
    } else if (expected.glow.radius !== undefined) {
      assertions.push(createAssertion(`${basePath}.effects.glow.radius`, expected.glow.radius, actual.glow.radius));
    }
  }
  if (expected.softEdge !== undefined) {
    if (!actual.softEdge) {
      assertions.push(createAssertion(`${basePath}.effects.softEdge`, expected.softEdge, undefined));
    } else if (expected.softEdge.radius !== undefined) {
      assertions.push(
        createAssertion(`${basePath}.effects.softEdge.radius`, expected.softEdge.radius, actual.softEdge.radius),
      );
    }
  }
  return assertions;
}

function matchShape3d(expected: ExpectedShape3d, actual: Shape3dJson | undefined, basePath: string): Assertion[] {
  const assertions: Assertion[] = [];
  if (!actual) {
    assertions.push(createAssertion(`${basePath}.shape3d`, expected, undefined));
    return assertions;
  }
  if (expected.bevelTop !== undefined) {
    if (!actual.bevelTop) {
      assertions.push(createAssertion(`${basePath}.shape3d.bevelTop`, expected.bevelTop, undefined));
    } else if (expected.bevelTop.preset !== undefined) {
      assertions.push(
        createAssertion(`${basePath}.shape3d.bevelTop.preset`, expected.bevelTop.preset, actual.bevelTop.preset),
      );
    }
  }
  if (expected.bevelBottom !== undefined) {
    if (!actual.bevelBottom) {
      assertions.push(createAssertion(`${basePath}.shape3d.bevelBottom`, expected.bevelBottom, undefined));
    } else if (expected.bevelBottom.preset !== undefined) {
      assertions.push(
        createAssertion(
          `${basePath}.shape3d.bevelBottom.preset`,
          expected.bevelBottom.preset,
          actual.bevelBottom.preset,
        ),
      );
    }
  }
  if (expected.material !== undefined) {
    assertions.push(createAssertion(`${basePath}.shape3d.material`, expected.material, actual.material));
  }
  if (expected.extrusionHeight !== undefined) {
    assertions.push(
      createAssertion(`${basePath}.shape3d.extrusionHeight`, expected.extrusionHeight, actual.extrusionHeight),
    );
  }
  return assertions;
}

function matchTableContent(expected: ExpectedTable, actual: TableJson | undefined, basePath: string): Assertion[] {
  const assertions: Assertion[] = [];
  if (!actual) {
    assertions.push(createAssertion(`${basePath}.table`, expected, undefined));
    return assertions;
  }
  if (expected.rows !== undefined) {
    assertions.push(createAssertion(`${basePath}.table.rows`, expected.rows, actual.rows));
  }
  if (expected.cols !== undefined) {
    assertions.push(createAssertion(`${basePath}.table.cols`, expected.cols, actual.cols));
  }
  if (expected.cells !== undefined) {
    for (const [rowIdx, expectedRow] of expected.cells.entries()) {
      for (const [colIdx, expectedCell] of expectedRow.entries()) {
        const actualCell = actual.data[rowIdx]?.cells[colIdx];
        if (expectedCell.text !== undefined) {
          assertions.push(
            createAssertion(`${basePath}.table.cells[${rowIdx}][${colIdx}].text`, expectedCell.text, actualCell?.text),
          );
        }
      }
    }
  }
  return assertions;
}

function matchContent(
  expected: ExpectedShape["content"],
  actual: GraphicContentJson | undefined,
  basePath: string,
): Assertion[] {
  const assertions: Assertion[] = [];
  if (!expected) {
    return assertions;
  }
  if (!actual) {
    assertions.push(createAssertion(`${basePath}.content`, expected, undefined));
    return assertions;
  }
  if (expected.type !== undefined) {
    assertions.push(createAssertion(`${basePath}.content.type`, expected.type, actual.type));
  }
  if (expected.table !== undefined && actual.type === "table") {
    assertions.push(...matchTableContent(expected.table, actual.table, basePath));
  }
  return assertions;
}

function matchShape(expected: ExpectedShape, actual: ShapeJson, basePath: string): Assertion[] {
  const assertions: Assertion[] = [];

  if (expected.type !== undefined) {
    assertions.push(createAssertion(`${basePath}.type`, expected.type, actual.type));
  }
  if (expected.bounds !== undefined) {
    assertions.push(...matchBounds(expected.bounds, actual.bounds, basePath));
  }
  if (expected.rotation !== undefined) {
    assertions.push(createAssertion(`${basePath}.rotation`, expected.rotation, actual.rotation));
  }
  if (expected.flipH !== undefined) {
    assertions.push(createAssertion(`${basePath}.flipH`, expected.flipH, actual.flipH));
  }
  if (expected.flipV !== undefined) {
    assertions.push(createAssertion(`${basePath}.flipV`, expected.flipV, actual.flipV));
  }
  if (expected.geometry !== undefined) {
    assertions.push(...matchGeometry(expected.geometry, actual.geometry, basePath));
  }
  if (expected.fill !== undefined) {
    assertions.push(...matchFill(expected.fill, actual.fill, basePath));
  }
  if (expected.line !== undefined) {
    assertions.push(...matchLine(expected.line, actual.line, basePath));
  }
  if (expected.effects !== undefined) {
    assertions.push(...matchEffects(expected.effects, actual.effects, basePath));
  }
  if (expected.shape3d !== undefined) {
    assertions.push(...matchShape3d(expected.shape3d, actual.shape3d, basePath));
  }
  if (expected.text !== undefined) {
    assertions.push(createAssertion(`${basePath}.text`, expected.text, actual.text));
  }
  if (expected.content !== undefined) {
    assertions.push(...matchContent(expected.content, actual.content, basePath));
  }

  return assertions;
}

function resolveShapeIndex(index: number, shapes: readonly ShapeJson[]): number {
  if (index < 0) {
    return shapes.length + index;
  }
  return index;
}

async function matchSlide(
  expected: SlideExpectation,
  pptxPath: string,
): Promise<{ assertions: Assertion[]; error?: string }> {
  const showResult = await runShow(pptxPath, expected.slideNumber);
  if (!showResult.success) {
    return { assertions: [], error: showResult.error.message };
  }

  const slide = showResult.data;
  const assertions: Assertion[] = [];
  const basePath = `slides[${expected.slideNumber - 1}]`;

  if (expected.shapeCount !== undefined) {
    assertions.push(createAssertion(`${basePath}.shapeCount`, expected.shapeCount, slide.shapes.length));
  }

  if (expected.shapes) {
    for (const expectedShape of expected.shapes) {
      const shapeIndex = resolveShapeIndex(expectedShape.index, slide.shapes);
      const actualShape = slide.shapes[shapeIndex];
      const shapePath = `${basePath}.shapes[${shapeIndex}]`;

      if (!actualShape) {
        assertions.push(createAssertion(shapePath, expectedShape, undefined));
      } else {
        assertions.push(...matchShape(expectedShape, actualShape, shapePath));
      }
    }
  }

  return { assertions };
}

// =============================================================================
// Test Case Execution
// =============================================================================

async function runTestCase(spec: TestCaseSpec, specDir: string): Promise<TestCaseResult> {
  const assertions: Assertion[] = [];

  // Resolve paths relative to spec file directory
  const input = {
    ...spec.input,
    template: path.resolve(specDir, spec.input.template),
    output: path.resolve(specDir, spec.input.output),
  };

  // Ensure output directory exists
  await fs.mkdir(path.dirname(input.output), { recursive: true });

  // Write temporary spec file for build command
  const tempSpecPath = path.join(path.dirname(input.output), `${spec.name}.build.json`);
  await fs.writeFile(tempSpecPath, JSON.stringify(input, null, 2));

  try {
    // Run build
    const buildResult = await runBuild(tempSpecPath);
    if (!buildResult.success) {
      return {
        name: spec.name,
        passed: false,
        assertions: [createAssertion("build", "success", buildResult.error.message)],
      };
    }

    // Verify slide count
    if (spec.expected.slideCount !== undefined) {
      assertions.push(createAssertion("slideCount", spec.expected.slideCount, buildResult.data.slideCount));
    }

    // Verify each slide
    if (spec.expected.slides) {
      for (const expectedSlide of spec.expected.slides) {
        const slideResult = await matchSlide(expectedSlide, input.output);
        if (slideResult.error) {
          assertions.push(createAssertion(`slides[${expectedSlide.slideNumber - 1}]`, "readable", slideResult.error));
        } else {
          assertions.push(...slideResult.assertions);
        }
      }
    }

    const passed = assertions.every((a) => a.passed);
    return { name: spec.name, passed, assertions };
  } finally {
    // Clean up temp file
    await fs.unlink(tempSpecPath).catch(() => {});
  }
}

// =============================================================================
// Directory Scanning
// =============================================================================

async function findTestCaseFiles(targetPath: string): Promise<string[]> {
  const stat = await fs.stat(targetPath);

  if (stat.isFile()) {
    return [targetPath];
  }

  const entries = await fs.readdir(targetPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith(".json") && !entry.name.includes(".build.")) {
      files.push(path.join(targetPath, entry.name));
    } else if (entry.isDirectory() && !entry.name.startsWith("__") && !entry.name.startsWith(".")) {
      const subFiles = await findTestCaseFiles(path.join(targetPath, entry.name));
      files.push(...subFiles);
    }
  }

  return files.sort();
}

async function loadTestCase(filePath: string): Promise<TestCaseSpec> {
  const content = await fs.readFile(filePath, "utf-8");
  return JSON.parse(content) as TestCaseSpec;
}

// =============================================================================
// Main Verify Function
// =============================================================================

export type VerifyOptions = {
  readonly tag?: string;
};

/**
 * Run verification tests from a spec file or directory.
 */
export async function runVerify(specPath: string, options: VerifyOptions = {}): Promise<Result<VerifyData>> {
  try {
    const absolutePath = path.resolve(specPath);
    const files = await findTestCaseFiles(absolutePath);

    if (files.length === 0) {
      return error("NO_TEST_CASES", `No test case files found in: ${specPath}`);
    }

    const results: TestCaseResult[] = [];

    for (const file of files) {
      const spec = await loadTestCase(file);

      // Filter by tag if specified
      if (options.tag && !spec.tags?.includes(options.tag)) {
        continue;
      }

      const specDir = path.dirname(file);
      const result = await runTestCase(spec, specDir);
      results.push(result);
    }

    if (results.length === 0) {
      return error("NO_MATCHING_TESTS", `No test cases matched tag: ${options.tag}`);
    }

    const passed = results.filter((r) => r.passed).length;
    const failed = results.length - passed;

    return success({ passed, failed, results });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `Path not found: ${specPath}`);
    }
    if (err instanceof SyntaxError) {
      return error("INVALID_JSON", `Invalid JSON: ${err.message}`);
    }
    return error("VERIFY_ERROR", `Verification failed: ${(err as Error).message}`);
  }
}
