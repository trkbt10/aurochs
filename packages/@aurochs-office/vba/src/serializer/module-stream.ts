/**
 * @file VBA Module stream serializer
 *
 * Serializes VBA module source code to module stream format.
 * Module streams consist of a Performance Cache followed by compressed source code.
 *
 * @see MS-OVBA 2.3.4.3 (Module Stream)
 */

import type { VbaModule, VbaModuleType } from "../types";
import { compressVba } from "./compression";
import { encodeMbcs } from "./mbcs-encoder";

/**
 * Module entry for serialization.
 */
export type SerializeModuleInput = {
  /** Module name */
  readonly name: string;
  /** Module type */
  readonly type: VbaModuleType;
  /** Source code text */
  readonly sourceCode: string;
};

/**
 * Serialized module result.
 */
export type SerializedModule = {
  /** Module name */
  readonly name: string;
  /** Stream name (same as module name) */
  readonly streamName: string;
  /** Module type */
  readonly type: VbaModuleType;
  /** Text offset within the stream (where compressed data starts) */
  readonly textOffset: number;
  /** Serialized stream bytes (Performance Cache + Compressed Source) */
  readonly bytes: Uint8Array;
};


/**
 * Serialize a VBA module to module stream bytes.
 *
 * Module stream format:
 * - Performance Cache (optional, zeros for simplicity)
 * - Compressed Source Code (VBA compressed)
 *
 * The Performance Cache can be omitted (textOffset = 0), but some
 * implementations expect a minimal cache. We use a small zeroed
 * cache for compatibility.
 *
 * @param module - Module to serialize
 * @param codePage - Code page for source encoding (default: 1252)
 * @returns Serialized module with stream bytes and metadata
 *
 * @example
 * ```typescript
 * const module = {
 *   name: "Module1",
 *   type: "standard",
 *   sourceCode: "Sub Main()\n  MsgBox \"Hello\"\nEnd Sub\n",
 * };
 * const result = serializeModuleStream(module);
 * // result.bytes contains the raw stream
 * // result.textOffset is where compressed data starts
 * ```
 */
export function serializeModuleStream(
  module: SerializeModuleInput,
  codePage = 1252
): SerializedModule {
  // Encode source code to bytes using the specified code page
  // Throws MbcsEncodingError if code page is unsupported or characters cannot be encoded
  const sourceBytes = encodeMbcs(module.sourceCode, codePage);

  // Compress the source code
  const compressedSource = compressVba(sourceBytes);

  // Performance Cache: We use a minimal empty cache (textOffset = 0)
  // The parser handles textOffset = 0 by reading compressed data from start
  // This is the simplest approach and works with Excel/Word VBA
  const textOffset = 0;

  // Final stream is just the compressed source
  const bytes = compressedSource;

  return {
    name: module.name,
    streamName: module.name,
    type: module.type,
    textOffset,
    bytes,
  };
}

/**
 * Serialize multiple VBA modules.
 *
 * @param modules - Modules to serialize
 * @param codePage - Code page for source encoding (default: 1252)
 * @returns Array of serialized modules
 */
export function serializeModuleStreams(
  modules: readonly SerializeModuleInput[],
  codePage = 1252
): SerializedModule[] {
  return modules.map((m) => serializeModuleStream(m, codePage));
}

/**
 * Convert VbaModule to SerializeModuleInput.
 */
export function vbaModuleToInput(module: VbaModule): SerializeModuleInput {
  return {
    name: module.name,
    type: module.type,
    sourceCode: module.sourceCode,
  };
}
