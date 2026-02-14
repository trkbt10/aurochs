/**
 * @file Builtin Function Completion Provider
 *
 * Provides VBA built-in functions for completion.
 */

import type { CompletionProvider, CompletionItem, CompletionContext } from "../types";
import { VBA_BUILTINS_ARRAY } from "../../components/code-editor/code/syntax-highlight";

// =============================================================================
// Function Documentation
// =============================================================================

/**
 * Built-in function documentation.
 */
const BUILTIN_DOCS: Record<string, { detail: string; documentation?: string }> = {
  // Type conversion
  CBool: { detail: "Boolean", documentation: "Converts an expression to Boolean." },
  CByte: { detail: "Byte", documentation: "Converts an expression to Byte." },
  CCur: { detail: "Currency", documentation: "Converts an expression to Currency." },
  CDate: { detail: "Date", documentation: "Converts an expression to Date." },
  CDbl: { detail: "Double", documentation: "Converts an expression to Double." },
  CDec: { detail: "Decimal", documentation: "Converts an expression to Decimal." },
  CInt: { detail: "Integer", documentation: "Converts an expression to Integer." },
  CLng: { detail: "Long", documentation: "Converts an expression to Long." },
  CLngLng: { detail: "LongLong", documentation: "Converts an expression to LongLong (64-bit)." },
  CLngPtr: { detail: "LongPtr", documentation: "Converts an expression to LongPtr (platform-specific)." },
  CSng: { detail: "Single", documentation: "Converts an expression to Single." },
  CStr: { detail: "String", documentation: "Converts an expression to String." },
  CVar: { detail: "Variant", documentation: "Converts an expression to Variant." },

  // String functions
  Len: { detail: "Long", documentation: "Returns the number of characters in a string." },
  Left: { detail: "String", documentation: "Returns a specified number of characters from the left side of a string." },
  Right: { detail: "String", documentation: "Returns a specified number of characters from the right side of a string." },
  Mid: { detail: "String", documentation: "Returns a specified number of characters from a string." },
  Trim: { detail: "String", documentation: "Returns a string without leading or trailing spaces." },
  LTrim: { detail: "String", documentation: "Returns a string without leading spaces." },
  RTrim: { detail: "String", documentation: "Returns a string without trailing spaces." },
  UCase: { detail: "String", documentation: "Converts a string to uppercase." },
  LCase: { detail: "String", documentation: "Converts a string to lowercase." },
  InStr: { detail: "Long", documentation: "Returns the position of a substring within a string." },
  InStrRev: { detail: "Long", documentation: "Returns the position of a substring from the end of a string." },
  Replace: { detail: "String", documentation: "Replaces occurrences of a substring within a string." },
  Split: { detail: "String()", documentation: "Returns a zero-based array containing substrings." },
  Join: { detail: "String", documentation: "Joins array elements into a single string." },
  StrComp: { detail: "Integer", documentation: "Compares two strings." },
  Space: { detail: "String", documentation: "Returns a string consisting of spaces." },
  String: { detail: "String", documentation: "Returns a repeating character string." },
  Asc: { detail: "Integer", documentation: "Returns the ASCII code of the first character." },
  Chr: { detail: "String", documentation: "Returns the character for an ASCII code." },
  Format: { detail: "String", documentation: "Formats a value according to a format expression." },
  Val: { detail: "Double", documentation: "Returns the numeric value of a string." },

  // Math functions
  Abs: { detail: "Number", documentation: "Returns the absolute value of a number." },
  Sgn: { detail: "Integer", documentation: "Returns the sign of a number (-1, 0, or 1)." },
  Int: { detail: "Number", documentation: "Returns the integer portion of a number." },
  Fix: { detail: "Number", documentation: "Returns the integer portion of a number (truncates toward zero)." },
  Round: { detail: "Number", documentation: "Rounds a number to a specified number of decimal places." },
  Sqr: { detail: "Double", documentation: "Returns the square root of a number." },
  Exp: { detail: "Double", documentation: "Returns e raised to a power." },
  Log: { detail: "Double", documentation: "Returns the natural logarithm of a number." },
  Sin: { detail: "Double", documentation: "Returns the sine of an angle." },
  Cos: { detail: "Double", documentation: "Returns the cosine of an angle." },
  Tan: { detail: "Double", documentation: "Returns the tangent of an angle." },
  Atn: { detail: "Double", documentation: "Returns the arctangent of a number." },
  Rnd: { detail: "Single", documentation: "Returns a random number between 0 and 1." },

  // Date functions
  Now: { detail: "Date", documentation: "Returns the current date and time." },
  Date: { detail: "Date", documentation: "Returns the current system date." },
  Time: { detail: "Date", documentation: "Returns the current system time." },
  Year: { detail: "Integer", documentation: "Returns the year component of a date." },
  Month: { detail: "Integer", documentation: "Returns the month component of a date." },
  Day: { detail: "Integer", documentation: "Returns the day component of a date." },
  Hour: { detail: "Integer", documentation: "Returns the hour component of a time." },
  Minute: { detail: "Integer", documentation: "Returns the minute component of a time." },
  Second: { detail: "Integer", documentation: "Returns the second component of a time." },
  Weekday: { detail: "Integer", documentation: "Returns the day of the week." },
  DateAdd: { detail: "Date", documentation: "Adds a time interval to a date." },
  DateDiff: { detail: "Long", documentation: "Returns the difference between two dates." },
  DatePart: { detail: "Integer", documentation: "Returns a specified part of a date." },
  DateSerial: { detail: "Date", documentation: "Returns a date for specified year, month, and day." },
  DateValue: { detail: "Date", documentation: "Converts a string to a date." },
  TimeSerial: { detail: "Date", documentation: "Returns a time for specified hour, minute, and second." },
  TimeValue: { detail: "Date", documentation: "Converts a string to a time." },

  // Array functions
  Array: { detail: "Variant()", documentation: "Creates an array from a list of values." },
  LBound: { detail: "Long", documentation: "Returns the lower bound of an array dimension." },
  UBound: { detail: "Long", documentation: "Returns the upper bound of an array dimension." },
  IsArray: { detail: "Boolean", documentation: "Returns True if a variable is an array." },

  // Type checking
  IsEmpty: { detail: "Boolean", documentation: "Returns True if a variable is Empty." },
  IsNull: { detail: "Boolean", documentation: "Returns True if an expression is Null." },
  IsNumeric: { detail: "Boolean", documentation: "Returns True if an expression is numeric." },
  IsDate: { detail: "Boolean", documentation: "Returns True if an expression is a date." },
  IsObject: { detail: "Boolean", documentation: "Returns True if an expression is an object." },
  IsMissing: { detail: "Boolean", documentation: "Returns True if an optional argument was not passed." },
  TypeName: { detail: "String", documentation: "Returns the data type name of a variable." },
  VarType: { detail: "Integer", documentation: "Returns an integer indicating the subtype of a variable." },

  // Other
  MsgBox: { detail: "Integer", documentation: "Displays a message in a dialog box." },
  InputBox: { detail: "String", documentation: "Displays a prompt for user input." },
  Debug: { detail: "Object", documentation: "Debug object for output to Immediate window." },
  Print: { detail: "Sub", documentation: "Outputs text to the Immediate window." },
};

// =============================================================================
// Builtin Items
// =============================================================================

const BUILTIN_ITEMS: readonly CompletionItem[] = VBA_BUILTINS_ARRAY.map(
  (name): CompletionItem => {
    const doc = BUILTIN_DOCS[name];
    return {
      label: name,
      kind: "builtin",
      detail: doc?.detail ?? "Function",
      documentation: doc?.documentation,
      insertText: name,
    };
  },
);

// =============================================================================
// VBA Constants
// =============================================================================

const VBA_CONSTANTS: readonly CompletionItem[] = [
  { label: "vbCrLf", kind: "constant", detail: "String", documentation: "Carriage return and line feed characters." },
  { label: "vbCr", kind: "constant", detail: "String", documentation: "Carriage return character." },
  { label: "vbLf", kind: "constant", detail: "String", documentation: "Line feed character." },
  { label: "vbTab", kind: "constant", detail: "String", documentation: "Tab character." },
  { label: "vbNullChar", kind: "constant", detail: "String", documentation: "Null character." },
  { label: "vbNullString", kind: "constant", detail: "String", documentation: "Null string." },
  { label: "vbNewLine", kind: "constant", detail: "String", documentation: "Platform-specific newline character." },
  { label: "vbOK", kind: "constant", detail: "Integer = 1", documentation: "MsgBox return value: OK button." },
  { label: "vbCancel", kind: "constant", detail: "Integer = 2", documentation: "MsgBox return value: Cancel button." },
  { label: "vbYes", kind: "constant", detail: "Integer = 6", documentation: "MsgBox return value: Yes button." },
  { label: "vbNo", kind: "constant", detail: "Integer = 7", documentation: "MsgBox return value: No button." },
  { label: "vbOKOnly", kind: "constant", detail: "Integer = 0", documentation: "MsgBox button: OK only." },
  { label: "vbOKCancel", kind: "constant", detail: "Integer = 1", documentation: "MsgBox buttons: OK and Cancel." },
  { label: "vbYesNo", kind: "constant", detail: "Integer = 4", documentation: "MsgBox buttons: Yes and No." },
  { label: "vbYesNoCancel", kind: "constant", detail: "Integer = 3", documentation: "MsgBox buttons: Yes, No, and Cancel." },
  { label: "vbInformation", kind: "constant", detail: "Integer = 64", documentation: "MsgBox icon: Information." },
  { label: "vbQuestion", kind: "constant", detail: "Integer = 32", documentation: "MsgBox icon: Question." },
  { label: "vbExclamation", kind: "constant", detail: "Integer = 48", documentation: "MsgBox icon: Exclamation." },
  { label: "vbCritical", kind: "constant", detail: "Integer = 16", documentation: "MsgBox icon: Critical." },
];

const ALL_ITEMS = [...BUILTIN_ITEMS, ...VBA_CONSTANTS];

// =============================================================================
// Provider
// =============================================================================

/**
 * Built-in function completion provider.
 *
 * Provides VBA built-in functions and constants for completion.
 */
export const builtinProvider: CompletionProvider = {
  id: "builtin",

  provideCompletions(
    context: CompletionContext,
    _source: string,
    _procedures: readonly import("@aurochs-office/vba").VbaProcedure[],
  ): readonly CompletionItem[] {
    // Don't provide builtins after "."
    if (context.trigger === "dot") {
      return [];
    }

    // Filter by prefix
    const prefix = context.prefix.toLowerCase();
    if (!prefix) {
      return ALL_ITEMS;
    }

    return ALL_ITEMS.filter((item) =>
      item.label.toLowerCase().startsWith(prefix),
    );
  },
};
