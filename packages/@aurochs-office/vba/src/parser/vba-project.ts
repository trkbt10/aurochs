/**
 * @file VBA Project parser
 *
 * Parses vbaProject.bin (MS-OVBA format) into VBA IR.
 *
 * @see MS-OVBA (Office VBA File Format)
 */

import { openCfb, type CfbFile } from "@aurochs-office/cfb";
import type { VbaProgramIr, VbaModule, VbaModuleType, VbaReference } from "../types";
import { VbaParseError } from "../errors";
import { parseProjectStream } from "./project-stream";
import { parseDirStream, decodeText, type DirModuleInfo } from "./dir-stream";
import { decompressVba } from "./compression";
import { parseProcedures } from "./procedure-parser";

/**
 * Find all potential compressed data start positions in a module stream.
 *
 * Module streams have a Performance Cache followed by compressed source.
 * We look for 0x01 (signature) followed by a valid chunk header.
 * Returns all candidates because the Performance Cache may contain
 * bytes that look like valid chunk headers.
 *
 * @param bytes - Module stream bytes
 * @returns Array of potential offsets, ordered by position
 */
function findCompressedDataCandidates(bytes: Uint8Array): number[] {
  const candidates: number[] = [];

  for (let i = 0; i < bytes.length - 3; i++) {
    if (bytes[i] !== 0x01) {continue;}

    // Check chunk header
    const chunkHeader = bytes[i + 1] | (bytes[i + 2] << 8);
    const chunkSignature = (chunkHeader >> 12) & 0x07;

    // Valid signature is 0b011 (3)
    if (chunkSignature === 3) {
      candidates.push(i);
    }
  }
  return candidates;
}

/**
 * Try to decompress data from a given start position.
 * Returns null if decompression fails.
 */
function tryDecompress(bytes: Uint8Array): Uint8Array | null {
  try {
    return decompressVba(bytes);
  } catch (err: unknown) {
    // Decompression failed - this is expected for invalid data positions
    // Check if it's an expected decompression error vs a programming error
    if (err instanceof Error && err.message.includes("VBA")) {
      return null;
    }
    // For any error during decompression, return null (expected behavior)
    return null;
  }
}

/**
 * Check if source code indicates a UserForm (designer module).
 *
 * UserForms typically have:
 * - A BEGIN block for form layout definition
 * - Or explicit VB_Ext_KEY attributes
 */
function isUserFormSource(sourceCode: string): boolean {
  // UserForms start with VERSION...BEGIN block for form layout
  // Example: VERSION 5.00\nBegin {C62A69F0-...} UserForm1
  const trimmed = sourceCode.trimStart();
  if (trimmed.startsWith("VERSION") && /\bBegin\s+\{[0-9A-Fa-f-]+\}/.test(trimmed)) {
    return true;
  }
  // VB_Ext_KEY is specific to designer modules (forms)
  if (sourceCode.includes("Attribute VB_Ext_KEY")) {
    return true;
  }
  return false;
}

/**
 * Refine module type based on source code content.
 *
 * MS-OVBA 2.3.4.2.3.2.4:
 * - MODULETYPEPROCEDURAL (0x0021): procedural module (standard)
 * - MODULETYPEDOCUMENT (0x0022): document module, class module, or designer module
 *
 * Since class/form modules use MODULETYPEDOCUMENT, we check source attributes:
 * - Form: has BEGIN block or VB_Ext_KEY (designer module)
 * - Class: has VB_Creatable/VB_Exposed attributes
 * - Document: everything else with MODULETYPEDOCUMENT
 */
function refineModuleType(type: VbaModuleType, sourceCode: string): VbaModuleType {
  // Only refine MODULETYPEDOCUMENT (parsed as "document")
  if (type !== "document") {
    return type;
  }

  // Check for UserForm (designer module) first
  if (isUserFormSource(sourceCode)) {
    return "form";
  }

  // Class modules have VB_Creatable/VB_Exposed attributes
  if (sourceCode.includes("VB_Creatable") || sourceCode.includes("VB_Exposed")) {
    return "class";
  }

  return type;
}

/**
 * Infer module type from module name and source code content.
 */
function inferModuleType(moduleName: string, sourceCode: string): VbaModuleType {
  // Check for UserForm first
  if (isUserFormSource(sourceCode)) {
    return "form";
  }
  // Document modules (sheets, workbook, document)
  if (moduleName.startsWith("Sheet") || moduleName === "ThisWorkbook" || moduleName === "ThisDocument") {
    return "document";
  }
  // Class modules
  if (sourceCode.includes("VB_Creatable") || sourceCode.includes("VB_Exposed")) {
    return "class";
  }
  return "standard";
}

/**
 * Try to decompress from multiple candidate positions.
 * Returns the first successful decompression result, or null if all fail.
 */
function tryDecompressCandidates(
  moduleBytes: Uint8Array,
  candidates: number[]
): { data: Uint8Array; offset: number } | null {
  // Try each candidate, starting from the last (most likely to be actual compressed data)
  // because Performance Cache comes before compressed container
  for (const idx of Array.from({ length: candidates.length }, (_, i) => candidates.length - 1 - i)) {
    const candidateStart = candidates[idx];
    const compressedData = moduleBytes.subarray(candidateStart);
    const decompressed = tryDecompress(compressedData);
    if (decompressed !== null) {
      return { data: decompressed, offset: candidateStart };
    }
  }
  return null;
}

// =============================================================================
// Parse Options
// =============================================================================

/**
 * Options for parsing vbaProject.bin.
 */
export type ParseVbaProjectOptions = {
  /**
   * Strict mode throws on parse errors.
   * Non-strict mode collects warnings and attempts to continue.
   * @default true
   */
  readonly strict?: boolean;
};

// =============================================================================
// Parse Result
// =============================================================================

/**
 * Result of parsing vbaProject.bin.
 */
export type ParseVbaProjectResult =
  | { readonly ok: true; readonly program: VbaProgramIr }
  | { readonly ok: false; readonly error: Error };

// =============================================================================
// Parser Entry Point
// =============================================================================

/**
 * Parse vbaProject.bin bytes into VBA IR.
 *
 * @param bytes - Raw bytes of vbaProject.bin from OPC package
 * @param opts - Parse options
 * @returns Parsed VBA program IR or error
 *
 * @example
 * ```typescript
 * const vbaBytes = pkg.readBinary("xl/vbaProject.bin");
 * const result = parseVbaProject(new Uint8Array(vbaBytes));
 * if (result.ok) {
 *   console.log(`Found ${result.program.modules.length} modules`);
 * }
 * ```
 *
 * @see MS-OVBA (Office VBA File Format)
 */
export function parseVbaProject(
  bytes: Uint8Array,
  opts?: ParseVbaProjectOptions
): ParseVbaProjectResult {
  const strict = opts?.strict ?? true;
  const warnings: string[] = [];

  try {
    // Open as CFB container
    const cfb = openCfb(bytes, {
      strict,
      onWarning: (w) => warnings.push(w.message),
    });

    // Parse PROJECT stream (text format)
    const projectBytes = cfb.readStream(["PROJECT"]);
    const projectInfo = parseProjectStream(projectBytes);

    // Parse VBA/dir stream (compressed)
    const dirBytes = cfb.readStream(["VBA", "dir"]);
    const decompressedDir = decompressVba(dirBytes);
    const dirInfo = parseDirStream(decompressedDir);

    // Use project name from dir stream if available
    const finalProjectInfo = {
      ...projectInfo,
      name: dirInfo.projectName || projectInfo.name,
    };

    // Parse each module's source code
    const modules = parseModules({
      cfb,
      moduleInfos: dirInfo.modules,
      codePage: dirInfo.codePage,
      strict,
    });

    // Convert references from dir stream
    const references: VbaReference[] = dirInfo.references.map((ref) => ({
      name: ref.name,
      libId: ref.libId,
      type: ref.type === "project" ? "project" : "registered",
    }));

    const program: VbaProgramIr = {
      project: finalProjectInfo,
      modules,
      references,
    };

    return { ok: true, program };
  } catch (err) {
    if (err instanceof Error) {
      return { ok: false, error: err };
    }
    return { ok: false, error: new VbaParseError(String(err)) };
  }
}


type ParseModulesOptions = {
  readonly cfb: CfbFile;
  readonly moduleInfos: readonly DirModuleInfo[];
  readonly codePage: number;
  readonly strict: boolean;
};

/**
 * Parse module source code from CFB streams.
 */
function parseModules(opts: ParseModulesOptions): VbaModule[] {
  const { cfb, moduleInfos, codePage, strict } = opts;
  const modules: VbaModule[] = [];

  // If dir stream parsing found modules, use those
  if (moduleInfos.length > 0) {
    for (const info of moduleInfos) {
      try {
        const moduleBytes = cfb.readStream(["VBA", info.streamName]);
        if (moduleBytes.length === 0) {
          if (strict) {
            throw new VbaParseError(`Module stream "${info.streamName}" is empty`, "module");
          }
          continue;
        }

        // textOffset is the offset within the raw module stream where compressed data starts
        // (i.e., where the CompressedContainer begins after PerformanceCache)
        const compressedData = moduleBytes.subarray(info.textOffset);
        const decompressed = decompressVba(compressedData);
        const sourceCode = decodeText(decompressed, codePage);

        // Extract procedures from source code
        const procedures = parseProcedures(sourceCode);

        // Refine module type: MODULETYPEPROCEDURAL can be either "standard" or "class"
        // Class modules have VB_Creatable/VB_Exposed attributes (regardless of value)
        // Standard modules don't have these attributes at all
        const moduleType = refineModuleType(info.type, sourceCode);

        modules.push({
          name: info.name,
          type: moduleType,
          sourceCode,
          streamOffset: info.textOffset,
          procedures,
        });
      } catch (err) {
        if (strict) {
          throw err;
        }
        // Non-strict mode: skip failed modules silently
        continue;
      }
    }
    return modules;
  }

  // Fallback: discover modules from VBA storage entries
  const vbaEntries = cfb.list(["VBA"]);
  const excludedStreams = new Set(["dir", "_VBA_PROJECT", "__SRP_0", "__SRP_1", "__SRP_2", "__SRP_3"]);

  for (const entry of vbaEntries) {
    if (entry.type !== "stream") {continue;}
    if (excludedStreams.has(entry.name)) {continue;}
    if (entry.name.startsWith("__SRP_")) {continue;}

    try {
      const moduleBytes = cfb.readStream(["VBA", entry.name]);
      if (moduleBytes.length === 0) {continue;}

      // Find all potential compressed data starts
      const candidates = findCompressedDataCandidates(moduleBytes);
      if (candidates.length === 0) {continue;}

      // Try each candidate, starting from the last (most likely to be actual compressed data)
      // because Performance Cache comes before compressed container
      const decompressResult = tryDecompressCandidates(moduleBytes, candidates);

      if (decompressResult === null) {continue;}

      // VBA source starts directly (no additional offset needed after decompression)
      const sourceCode = decodeText(decompressResult.data, codePage);

      // Determine module type from name or content
      const moduleType = inferModuleType(entry.name, sourceCode);

      // Extract procedures from source code
      const procedures = parseProcedures(sourceCode);

      modules.push({
        name: entry.name,
        type: moduleType,
        sourceCode,
        streamOffset: decompressResult.offset,
        procedures,
      });
    } catch (err) {
      if (strict) {
        throw err;
      }
      // Non-strict mode: skip failed modules silently
      continue;
    }
  }

  return modules;
}
