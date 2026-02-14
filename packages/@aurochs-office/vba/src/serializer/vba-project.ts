/**
 * @file VBA Project serializer
 *
 * Serializes a VBA program IR to vbaProject.bin (MS-CFB format).
 * This is the main entry point for VBA serialization.
 *
 * @see MS-OVBA (Office VBA File Format)
 */

import { createCfbBuilder } from "@aurochs-office/cfb";
import type { VbaProgramIr } from "../types";
import { serializeProjectStream } from "./project-stream";
import { serializeDirStream, createDirStreamInfo } from "./dir-stream";
import { serializeModuleStream, vbaModuleToInput } from "./module-stream";
import { compressVba } from "./compression";

/**
 * Options for serializing a VBA project.
 */
export type SerializeVbaProjectOptions = {
  /**
   * Code page for text encoding.
   * @default 1252 (Windows-1252, Western European)
   */
  readonly codePage?: number;
};

/**
 * Serialize a VBA program IR to vbaProject.bin bytes.
 *
 * @param program - VBA program IR to serialize
 * @param options - Serialization options
 * @returns vbaProject.bin bytes (MS-CFB format)
 *
 * @example
 * ```typescript
 * const program: VbaProgramIr = {
 *   project: { name: "VBAProject", ... },
 *   modules: [{ name: "Module1", type: "standard", sourceCode: "...", ... }],
 *   references: [],
 * };
 * const vbaBytes = serializeVbaProject(program);
 * // Write to ZIP: xl/vbaProject.bin
 * ```
 */
export function serializeVbaProject(
  program: VbaProgramIr,
  options?: SerializeVbaProjectOptions
): Uint8Array {
  const codePage = options?.codePage ?? 1252;

  // Create CFB builder
  const builder = createCfbBuilder();

  // 1. Serialize PROJECT stream (text format)
  const projectModules = program.modules.map((m) => ({
    name: m.name,
    type: m.type,
  }));
  const projectBytes = serializeProjectStream(program.project, projectModules);
  builder.addStream(["PROJECT"], projectBytes);

  // 2. Serialize module streams and collect metadata
  const moduleEntries: Array<{
    name: string;
    streamName: string;
    type: "standard" | "class" | "document" | "form";
    textOffset: number;
  }> = [];

  for (const module of program.modules) {
    const serialized = serializeModuleStream(vbaModuleToInput(module), codePage);

    // Add to VBA storage
    builder.addStream(["VBA", serialized.streamName], serialized.bytes);

    moduleEntries.push({
      name: serialized.name,
      streamName: serialized.streamName,
      type: serialized.type,
      textOffset: serialized.textOffset,
    });
  }

  // 3. Serialize dir stream (binary, then compressed)
  const dirInfo = createDirStreamInfo({
    projectName: program.project.name,
    codePage,
    modules: moduleEntries,
    references: program.references.map((r) => ({
      name: r.name,
      libId: r.libId,
      type: r.type,
    })),
  });
  const dirUncompressed = serializeDirStream(dirInfo, codePage);
  const dirCompressed = compressVba(dirUncompressed);
  builder.addStream(["VBA", "dir"], dirCompressed);

  // 4. Add _VBA_PROJECT stream (minimal structure)
  // This stream contains version info and is required for valid VBA projects
  const vbaProjectStream = createVbaProjectStream();
  builder.addStream(["VBA", "_VBA_PROJECT"], vbaProjectStream);

  // 5. Build CFB container
  return builder.build();
}

/**
 * Create a minimal _VBA_PROJECT stream.
 *
 * This stream contains version information and performance cache settings.
 * The format is specified in MS-OVBA 2.3.4.1.
 *
 * Structure:
 * - Reserved1 (2 bytes): 0x61CC
 * - Version (2 bytes): 0xFFFF
 * - Reserved2 (2 bytes): 0x0000
 * - Reserved3 (2 bytes): 0x0000
 */
function createVbaProjectStream(): Uint8Array {
  const bytes = new Uint8Array(7);
  const view = new DataView(bytes.buffer);

  // Reserved1: 0x61CC (magic number)
  view.setUint16(0, 0x61cc, true);

  // Version: 0xFFFF (indicates extended version)
  view.setUint16(2, 0xffff, true);

  // Reserved2: 0x0000
  view.setUint8(4, 0x00);

  // Reserved3: 0x0000
  // The remaining bytes are optional performance cache data
  // A minimal 7-byte stream is sufficient for basic functionality

  return bytes;
}
