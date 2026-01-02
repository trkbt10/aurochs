/**
 * @file Number format utilities
 *
 * Formats numeric values using ECMA-376 format codes.
 *
 * @see ECMA-376 Part 1, Section 18.8.31 (numFmt)
 * @see ECMA-376 Part 4, Section 3.8.30 (formatCode)
 */

// =============================================================================
// Format Code Types
// =============================================================================

/**
 * Parsed format code structure
 *
 * ECMA-376 format codes follow Excel number format patterns:
 * - # = optional digit
 * - 0 = required digit
 * - , = thousands separator
 * - . = decimal point
 * - % = multiply by 100 and add percent sign
 * - "text" = literal text
 */
type ParsedFormat = {
  readonly type: "general" | "number" | "percentage" | "currency" | "scientific" | "text";
  readonly decimals: number;
  readonly useThousands: boolean;
  readonly prefix: string;
  readonly suffix: string;
};

// =============================================================================
// Format Code Parsing
// =============================================================================

/**
 * Parse a format code string into a structured format
 *
 * @see ECMA-376 Part 1, Section 18.8.31 (numFmt)
 */
function parseFormatCode(formatCode: string | undefined): ParsedFormat {
  if (!formatCode) {
    return {
      type: "general",
      decimals: -1, // Auto
      useThousands: false,
      prefix: "",
      suffix: "",
    };
  }

  if (formatCode === "General") {
    return {
      type: "general",
      decimals: -1, // Auto
      useThousands: false,
      prefix: "",
      suffix: "",
    };
  }

  // Check for percentage
  if (formatCode.includes("%")) {
    const decimals = (formatCode.match(/0\.0*/)?.[0]?.split(".")?.[1]?.length) ?? 0;
    return {
      type: "percentage",
      decimals,
      useThousands: false,
      prefix: "",
      suffix: "%",
    };
  }

  // Check for scientific notation
  if (containsScientificNotation(formatCode)) {
    const decimals = (formatCode.match(/0\.0*/)?.[0]?.split(".")?.[1]?.length) ?? 2;
    return {
      type: "scientific",
      decimals,
      useThousands: false,
      prefix: "",
      suffix: "",
    };
  }

  // Check for currency symbols
  const currencyMatch = formatCode.match(/^([$¥€£])/);
  if (currencyMatch) {
    const decimals = (formatCode.match(/0\.0*/)?.[0]?.split(".")?.[1]?.length) ?? 2;
    return {
      type: "currency",
      decimals,
      useThousands: formatCode.includes(","),
      prefix: currencyMatch[1],
      suffix: "",
    };
  }

  // Standard number format
  const useThousands = containsThousandsSeparator(formatCode);
  const decimalMatch = formatCode.match(/\.([0#]+)/);
  const decimals = decimalMatch ? decimalMatch[1].replace(/#/g, "").length : 0;

  return {
    type: "number",
    decimals,
    useThousands,
    prefix: "",
    suffix: "",
  };
}

function containsScientificNotation(formatCode: string): boolean {
  if (formatCode.includes("E+")) {
    return true;
  }
  return formatCode.includes("E-");
}

function containsThousandsSeparator(formatCode: string): boolean {
  if (formatCode.includes("#,##")) {
    return true;
  }
  return formatCode.includes(",");
}

// =============================================================================
// Number Formatting
// =============================================================================

/**
 * Format a number using thousands separators
 */
function formatWithThousands(value: number, decimals: number): string {
  const fixed = decimals >= 0 ? value.toFixed(decimals) : String(value);
  const parts = fixed.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

/**
 * Format a number according to a format code
 *
 * @see ECMA-376 Part 1, Section 18.8.31 (numFmt)
 */
export function formatNumber(value: number, formatCode: string | undefined): string {
  const format = parseFormatCode(formatCode);

  switch (format.type) {
    case "general": {
      // Auto-format: use reasonable precision
      if (Number.isInteger(value)) {
        return String(value);
      }
      // For small decimals, show more precision
      if (Math.abs(value) < 1) {
        return value.toFixed(2);
      }
      // For larger numbers, limit decimals
      return value.toFixed(1);
    }

    case "percentage": {
      const percentValue = value * 100;
      const formatted =
        format.decimals >= 0 ? percentValue.toFixed(format.decimals) : String(percentValue);
      return format.prefix + formatted + format.suffix;
    }

    case "scientific": {
      return value.toExponential(format.decimals);
    }

    case "currency":
    case "number": {
      const formatted = formatNumberValue(value, format);
      return format.prefix + formatted + format.suffix;
    }

    case "text":
      return String(value);

    default:
      return String(value);
  }
}

function formatNumberValue(value: number, format: ParsedFormat): string {
  if (format.useThousands) {
    return formatWithThousands(value, format.decimals);
  }

  if (format.decimals >= 0) {
    return value.toFixed(format.decimals);
  }

  return String(value);
}

/**
 * Format value for axis labels with smart abbreviation
 *
 * When no format code is provided, uses smart abbreviation for large numbers.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.121 (numFmt)
 */
export function formatAxisValue(value: number, formatCode: string | undefined): string {
  // If format code is provided, use it directly
  if (formatCode && formatCode !== "General") {
    return formatNumber(value, formatCode);
  }

  // Smart abbreviation for large numbers (implementation-defined)
  const absValue = Math.abs(value);
  if (absValue >= 1_000_000_000) {
    return (value / 1_000_000_000).toFixed(1) + "B";
  }
  if (absValue >= 1_000_000) {
    return (value / 1_000_000).toFixed(1) + "M";
  }
  if (absValue >= 10_000) {
    return (value / 1_000).toFixed(0) + "k";
  }
  if (absValue >= 1_000) {
    return (value / 1_000).toFixed(1) + "k";
  }
  if (Number.isInteger(value)) {
    return String(value);
  }
  return value.toFixed(1);
}

/**
 * Format value for data labels
 *
 * @see ECMA-376 Part 1, Section 21.2.2.121 (numFmt)
 */
export function formatDataValue(value: number, formatCode: string | undefined): string {
  if (formatCode) {
    return formatNumber(value, formatCode);
  }

  // Default formatting for data labels
  if (Number.isInteger(value)) {
    return String(value);
  }
  return value.toFixed(1);
}
