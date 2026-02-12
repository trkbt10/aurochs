import { existsSync } from "node:fs";































export function usageError(message: string, usage: string): Error {
  return new Error(`${message}\n\nUsage:\n  ${usage}`);
}































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































export function requireIntArg(value: string | undefined, name: string, usage: string): number {
  const parsed = optionalIntArg(value, name, usage);
  if (parsed === undefined) {
    throw usageError(`Missing required integer: ${name}`, usage);
  }
  return parsed;
}































export function requireFileExists(filePath: string, usage: string): void {
  if (!existsSync(filePath)) {
    throw usageError(`File not found: ${filePath}`, usage);
  }
}
