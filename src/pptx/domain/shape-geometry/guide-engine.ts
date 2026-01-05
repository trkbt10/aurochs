/**
 * @file Shape Guide Formula Engine
 *
 * Evaluates DrawingML shape guide formulas for custom geometry calculations.
 * Implements all 17 formula types defined in ECMA-376.
 *
 * @see ECMA-376 Part 1, Section 20.1.9.11 (gd - Shape Guide)
 * @see https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.drawing.shapeguide.formula
 */

import type { AdjustValue, GeometryGuide } from "../shape";

// =============================================================================
// Types
// =============================================================================

/**
 * Context for guide evaluation containing built-in variables and calculated guides.
 *
 * Built-in variables per ECMA-376 Part 1, Section 20.1.10.56 (ST_ShapeType):
 * - w: Shape width
 * - h: Shape height
 * - ss: Shortest side (min of w, h)
 * - ls: Longest side (max of w, h)
 * - hc: Horizontal center (w / 2)
 * - vc: Vertical center (h / 2)
 * - hd2: Half of height (h / 2)
 * - hd3: Third of height (h / 3)
 * - hd4: Quarter of height (h / 4)
 * - hd5: Fifth of height (h / 5)
 * - hd6: Sixth of height (h / 6)
 * - hd8: Eighth of height (h / 8)
 * - hd10: Tenth of height (h / 10)
 * - wd2: Half width (w / 2)
 * - wd3: Third width (w / 3)
 * - wd4: Quarter width (w / 4)
 * - wd5: Fifth width (w / 5)
 * - wd6: Sixth width (w / 6)
 * - wd8: Eighth width (w / 8)
 * - wd10: Tenth width (w / 10)
 * - wd12: Twelfth width (w / 12)
 * - wd32: Thirty-second width (w / 32)
 * - ssd2: Half shortest side (ss / 2)
 * - ssd4: Quarter shortest side (ss / 4)
 * - ssd6: Sixth shortest side (ss / 6)
 * - ssd8: Eighth shortest side (ss / 8)
 * - ssd16: Sixteenth shortest side (ss / 16)
 * - ssd32: Thirty-second shortest side (ss / 32)
 * - cd2: Half circle (10800000 = 180 degrees in 60000ths)
 * - cd4: Quarter circle (5400000 = 90 degrees)
 * - cd8: Eighth circle (2700000 = 45 degrees)
 * - 3cd4: Three-quarter circle (16200000 = 270 degrees)
 * - 3cd8: Three-eighth circle (8100000 = 135 degrees)
 * - 5cd8: Five-eighth circle (13500000 = 225 degrees)
 * - 7cd8: Seven-eighth circle (18900000 = 315 degrees)
 *
 * @see ECMA-376 Part 1, Section 20.1.9.11
 */
export type GuideContext = Map<string, number>;

/**
 * Parsed formula with operation and arguments
 */
type ParsedFormula = {
  readonly operation: string;
  readonly args: readonly string[];
};

// =============================================================================
// Constants
// =============================================================================

/**
 * ECMA-376 preset shape guide operations.
 *
 * Derived from the ECMA-376 preset shape definitions (OfficeOpenXML-DrawingMLGeometries.zip).
 */
const GUIDE_OPERATIONS = new Set([
  "*/",
  "+-",
  "+/",
  "?:",
  "abs",
  "at2",
  "cat2",
  "cos",
  "max",
  "min",
  "mod",
  "pin",
  "sat2",
  "sin",
  "sqrt",
  "tan",
  "val",
]);

/**
 * Angle conversion constants.
 * ECMA-376 angles are in 60000ths of a degree.
 *
 * @see ECMA-376 Part 1, Section 20.1.10.3 (ST_Angle)
 */
const ANGLE_TO_RADIANS = Math.PI / (180 * 60000);
const RADIANS_TO_ANGLE = (180 * 60000) / Math.PI;

/**
 * Full circle in ECMA-376 angle units (360 degrees * 60000)
 */
const FULL_CIRCLE = 21600000;

// =============================================================================
// Formula Parsing
// =============================================================================

/**
 * Parse a formula string into operation and arguments.
 *
 * Formula format: "operation arg1 arg2 ..." or "operation arg1"
 *
 * @param formula - Raw formula string from gd element
 * @returns Parsed formula with operation and arguments
 *
 * @see ECMA-376 Part 1, Section 20.1.9.11
 */
function parseFormula(formula: string): ParsedFormula {
  const parts = formula.trim().split(/\s+/);
  const operation = parts[0] ?? "";
  const args = parts.slice(1);
  if (!GUIDE_OPERATIONS.has(operation)) {
    throw new Error(`Non-ECMA guide operation: ${operation}`);
  }
  return { operation, args };
}

/**
 * Resolve an argument to a numeric value.
 * Arguments can be:
 * - Numeric literals (e.g., "100000")
 * - Variable references (e.g., "w", "h", "adj1")
 *
 * @param arg - Argument string
 * @param context - Guide context with variable values
 * @returns Numeric value
 */
function resolveArg(arg: string, context: GuideContext): number {
  // Check if it's a numeric literal
  const num = parseFloat(arg);
  if (!isNaN(num)) {
    return num;
  }

  // Look up in context
  const value = context.get(arg);
  if (value !== undefined) {
    return value;
  }

  throw new Error(`Non-ECMA guide variable: ${arg}`);
}

// =============================================================================
// Formula Operations
// =============================================================================

/**
 * Evaluate a single formula operation.
 *
 * All 17 formula types per ECMA-376 Part 1, Section 20.1.9.11:
 * - Multiply Divide, Add Subtract, Add Divide
 * - If Else (?:), Absolute Value (abs)
 * - Trigonometric: sin, cos, tan, at2, cat2, sat2
 * - Math: sqrt, mod (Euclidean norm), max, min
 * - Range: pin (clamp to range)
 * - Literal: val
 *
 * @param parsed - Parsed formula
 * @param context - Guide context
 * @returns Calculated value
 *
 * @see ECMA-376 Part 1, Section 20.1.9.11
 */
function evaluateFormula(parsed: ParsedFormula, context: GuideContext): number {
  const { operation, args } = parsed;

  // Resolve all arguments to numbers
  const resolvedArgs = args.map((arg) => resolveArg(arg, context));

  switch (operation) {
    // Multiply Divide: "*/ x y z" = (x * y) / z
    case "*/": {
      const [x = 0, y = 1, z = 1] = resolvedArgs;
      return z !== 0 ? (x * y) / z : 0;
    }

    // Add Subtract: "+- x y z" = (x + y) - z
    case "+-": {
      const [x = 0, y = 0, z = 0] = resolvedArgs;
      return x + y - z;
    }

    // Add Divide: "+/ x y z" = (x + y) / z
    case "+/": {
      const [x = 0, y = 0, z = 1] = resolvedArgs;
      return z !== 0 ? (x + y) / z : 0;
    }

    // If Else: "?: x y z" = x > 0 ? y : z
    case "?:": {
      const [x = 0, y = 0, z = 0] = resolvedArgs;
      return x > 0 ? y : z;
    }

    // Absolute Value: "abs x" = |x|
    case "abs": {
      const [x = 0] = resolvedArgs;
      return Math.abs(x);
    }

    // ArcTan2: "at2 x y" = atan2(y, x) in angle units
    // Note: Returns value in ECMA-376 angle units (60000ths of degree)
    case "at2": {
      const [x = 0, y = 0] = resolvedArgs;
      return Math.atan2(y, x) * RADIANS_TO_ANGLE;
    }

    // Cosine ArcTan: "cat2 x y z" = x * cos(atan2(z, y))
    case "cat2": {
      const [x = 0, y = 1, z = 0] = resolvedArgs;
      const angle = Math.atan2(z, y);
      return x * Math.cos(angle);
    }

    // Cosine: "cos x y" = x * cos(y)
    // y is in ECMA-376 angle units
    case "cos": {
      const [x = 0, y = 0] = resolvedArgs;
      return x * Math.cos(y * ANGLE_TO_RADIANS);
    }

    // Maximum: "max x y" = max(x, y)
    case "max": {
      const [x = 0, y = 0] = resolvedArgs;
      return Math.max(x, y);
    }

    // Minimum: "min x y" = min(x, y)
    case "min": {
      const [x = 0, y = 0] = resolvedArgs;
      return Math.min(x, y);
    }

    // Modulus (Euclidean Norm): "mod x y z" = sqrt(x² + y² + z²)
    // Note: This is NOT modulo, but Euclidean norm/length
    case "mod": {
      const [x = 0, y = 0, z = 0] = resolvedArgs;
      return Math.sqrt(x * x + y * y + z * z);
    }

    // Pin To Range: "pin x y z" = clamp(y, x, z)
    // Returns y clamped between x and z
    case "pin": {
      const [x = 0, y = 0, z = 0] = resolvedArgs;
      if (y < x) {
        return x;
      }
      if (y > z) {
        return z;
      }
      return y;
    }

    // Sine ArcTan: "sat2 x y z" = x * sin(atan2(z, y))
    case "sat2": {
      const [x = 0, y = 1, z = 0] = resolvedArgs;
      const angle = Math.atan2(z, y);
      return x * Math.sin(angle);
    }

    // Sine: "sin x y" = x * sin(y)
    // y is in ECMA-376 angle units
    case "sin": {
      const [x = 0, y = 0] = resolvedArgs;
      return x * Math.sin(y * ANGLE_TO_RADIANS);
    }

    // Square Root: "sqrt x" = √x
    case "sqrt": {
      const [x = 0] = resolvedArgs;
      return x >= 0 ? Math.sqrt(x) : 0;
    }

    // Tangent: "tan x y" = x * tan(y)
    // y is in ECMA-376 angle units
    case "tan": {
      const [x = 0, y = 0] = resolvedArgs;
      const tanValue = Math.tan(y * ANGLE_TO_RADIANS);
      // Avoid infinity for angles near 90 degrees
      if (!isFinite(tanValue)) {
        return 0;
      }
      return x * tanValue;
    }

    // Literal Value: "val x" = x
    case "val": {
      const [x = 0] = resolvedArgs;
      return x;
    }

    default:
      throw new Error(`Non-ECMA guide operation: ${operation}`);
  }
}

// =============================================================================
// Context Initialization
// =============================================================================

/**
 * Create a guide context with built-in variables.
 *
 * Initializes all ECMA-376 predefined variables based on shape dimensions.
 *
 * @param width - Shape width in target units (pixels)
 * @param height - Shape height in target units (pixels)
 * @param adjustValues - Adjust values from shape definition
 * @returns Initialized guide context
 *
 * @see ECMA-376 Part 1, Section 20.1.9.11
 */
export function createGuideContext(
  width: number,
  height: number,
  adjustValues: readonly AdjustValue[] = [],
): GuideContext {
  const context: GuideContext = new Map();

  // Shape dimensions (ECMA-376 Part 1, Section 20.1.10.56 predefined guides)
  context.set("w", width);
  context.set("h", height);

  // Shortest and longest sides
  const ss = Math.min(width, height);
  const ls = Math.max(width, height);
  context.set("ss", ss);
  context.set("ls", ls);

  // Centers
  context.set("hc", width / 2);
  context.set("vc", height / 2);

  // Fractions of height
  context.set("hd2", height / 2);
  context.set("hd3", height / 3);
  context.set("hd4", height / 4);
  context.set("hd5", height / 5);
  context.set("hd6", height / 6);
  context.set("hd8", height / 8);
  context.set("hd10", height / 10);

  // Fractions of width
  context.set("wd2", width / 2);
  context.set("wd3", width / 3);
  context.set("wd4", width / 4);
  context.set("wd5", width / 5);
  context.set("wd6", width / 6);
  context.set("wd8", width / 8);
  context.set("wd10", width / 10);
  context.set("wd12", width / 12);
  context.set("wd32", width / 32);

  // Fractions of shortest side
  context.set("ssd2", ss / 2);
  context.set("ssd4", ss / 4);
  context.set("ssd6", ss / 6);
  context.set("ssd8", ss / 8);
  context.set("ssd16", ss / 16);
  context.set("ssd32", ss / 32);

  // Circle angle constants (in ECMA-376 angle units: 60000ths of degree)
  context.set("cd2", 10800000);  // 180 degrees
  context.set("cd4", 5400000);   // 90 degrees
  context.set("cd8", 2700000);   // 45 degrees
  context.set("3cd4", 16200000); // 270 degrees
  context.set("3cd8", 8100000);  // 135 degrees
  context.set("5cd8", 13500000); // 225 degrees
  context.set("7cd8", 18900000); // 315 degrees

  // Left, top, right, bottom for convenience
  context.set("l", 0);
  context.set("t", 0);
  context.set("r", width);
  context.set("b", height);

  // Add adjust values
  for (const av of adjustValues) {
    context.set(av.name, av.value);
  }

  return context;
}

// =============================================================================
// Guide Evaluation
// =============================================================================

/**
 * Evaluate all guides in order and update context.
 *
 * Guides must be evaluated in the order they are defined, as later guides
 * may reference earlier ones.
 *
 * @param guides - Array of geometry guides from custom geometry
 * @param context - Guide context to update
 * @returns Updated context with all guide values
 *
 * @see ECMA-376 Part 1, Section 20.1.9.11
 */
export function evaluateGuides(
  guides: readonly GeometryGuide[],
  context: GuideContext,
): GuideContext {
  for (const guide of guides) {
    const parsed = parseFormula(guide.formula);
    const value = evaluateFormula(parsed, context);
    context.set(guide.name, value);
  }
  return context;
}

/**
 * Evaluate a single guide formula expression.
 *
 * Useful for evaluating path point coordinates that may contain formula references.
 *
 * @param expression - Formula expression or numeric literal
 * @param context - Guide context
 * @returns Evaluated numeric value
 */
export function evaluateExpression(
  expression: string,
  context: GuideContext,
): number {
  // If it looks like a formula (starts with operation), parse and evaluate
  const trimmed = expression.trim();

  // Check if it's just a reference or literal
  if (!trimmed.includes(" ")) {
    return resolveArg(trimmed, context);
  }

  // It's a formula - parse and evaluate
  const parsed = parseFormula(trimmed);
  return evaluateFormula(parsed, context);
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Convert ECMA-376 angle units to degrees.
 *
 * @param angleUnits - Angle in 60000ths of a degree
 * @returns Angle in degrees
 *
 * @see ECMA-376 Part 1, Section 20.1.10.3 (ST_Angle)
 */
export function angleUnitsToDegrees(angleUnits: number): number {
  return angleUnits / 60000;
}

/**
 * Convert degrees to ECMA-376 angle units.
 *
 * @param degrees - Angle in degrees
 * @returns Angle in 60000ths of a degree
 *
 * @see ECMA-376 Part 1, Section 20.1.10.3 (ST_Angle)
 */
export function degreesToAngleUnits(degrees: number): number {
  return degrees * 60000;
}

/**
 * Normalize angle to 0-360 degree range.
 *
 * @param angleUnits - Angle in ECMA-376 units
 * @returns Normalized angle in ECMA-376 units
 */
export function normalizeAngle(angleUnits: number): number {
  const normalized = angleUnits % FULL_CIRCLE;
  return normalized < 0 ? normalized + FULL_CIRCLE : normalized;
}
