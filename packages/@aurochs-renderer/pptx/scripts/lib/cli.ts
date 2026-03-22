/**
 * @file CLI utility helpers for PPTX renderer scripts
 */
import { existsSync } from "node:fs";









































/** Create an error with usage information */
export function usageError(message: string, usage: string): Error {
  return new Error(`${message}\n\nUsage:\n  ${usage}`);
}









































/** Require a positional CLI argument, throwing with usage on missing */
export function requirePositionalArg({
  args,
  index,
  name,
  usage,
}: {
  args: readonly string[];
  index: number;
  name: string;
  usage: string;
}): string {
  const value = args[index];
  if (!value) {
    throw usageError(`Missing required argument: ${name}`, usage);
  }
  return value;
}









































/** Parse an optional integer CLI argument */
export function optionalIntArg(value: string | undefined, name: string, usage: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw usageError(`Invalid integer for ${name}: ${value}`, usage);
  }
  return parsed;
}









































/** Require an integer CLI argument, throwing with usage on missing */
export function requireIntArg(value: string | undefined, name: string, usage: string): number {
  const parsed = optionalIntArg(value, name, usage);
  if (parsed === undefined) {
    throw usageError(`Missing required integer: ${name}`, usage);
  }
  return parsed;
}









































/** Assert that a file exists, throwing with usage on missing */
export function requireFileExists(filePath: string, usage: string): void {
  if (!existsSync(filePath)) {
    throw usageError(`File not found: ${filePath}`, usage);
  }
}
