/**
 * @file Enum extraction utilities
 */

import { FigBuildError } from "../../errors";

/**
 * Extract enum value from message object (lenient version).
 * Used by standard encoder.
 */
export function extractEnumValue(message: Record<string, unknown>): number {
  if (typeof message === "object" && message !== null && "value" in message) {
    return message.value as number;
  }
  return 0;
}

/**
 * Extract enum value with strict validation.
 * Used by streaming encoder.
 */
export function extractEnumValueStrict(value: unknown): number {
  if (typeof value !== "object" || value === null) {
    throw new FigBuildError(
      `Expected enum object with "value" property, got ${value === null ? "null" : typeof value}`
    );
  }
  if (!("value" in value)) {
    throw new FigBuildError(
      `Expected enum object with "value" property, got object without "value"`
    );
  }
  const enumValue = (value as { value: unknown }).value;
  if (typeof enumValue !== "number") {
    throw new FigBuildError(
      `Expected enum "value" to be number, got ${typeof enumValue}`
    );
  }
  return enumValue;
}
