/**
 * @file PROJECT stream serializer
 *
 * Serializes VBA project metadata to PROJECT stream format.
 * The PROJECT stream is an INI-like text format.
 *
 * @see MS-OVBA 2.3.1 (PROJECT Stream)
 */

import type { VbaProjectInfo, VbaModuleType } from "../types";

/**
 * Module entry for serialization.
 */
export type ProjectModuleEntry = {
  readonly name: string;
  readonly type: VbaModuleType;
};

/**
 * Serialize PROJECT stream.
 *
 * @param project - Project metadata
 * @param modules - Module entries
 * @returns PROJECT stream bytes (MBCS/UTF-8)
 */
export function serializeProjectStream(
  project: VbaProjectInfo,
  modules: readonly ProjectModuleEntry[]
): Uint8Array {
  const lines: string[] = [];

  // ID (GUID) - generate a random one
  const guid = generateGuid();
  lines.push(`ID="${guid}"`);

  // Module entries
  for (const module of modules) {
    switch (module.type) {
      case "standard":
        lines.push(`Module=${module.name}`);
        break;
      case "class":
        lines.push(`Class=${module.name}`);
        break;
      case "document":
        // Document modules have "/&H00000000" suffix
        lines.push(`Document=${module.name}/&H00000000`);
        break;
      case "form":
        lines.push(`BaseClass=${module.name}`);
        break;
    }
  }

  // Package information (optional, but required for some parsers)
  lines.push(`Package={AC9F2F90-E877-11CE-9F68-00AA00574A4F}`);

  // Project name
  lines.push(`Name="${project.name}"`);

  // Help file (empty if not set)
  const helpFile = project.helpFile ?? "";
  lines.push(`HelpFile="${helpFile}"`);

  // Help context
  lines.push(`HelpContext=${project.helpContext}`);

  // Version - use default if not provided
  // Note: VersionCompatible32 is a fixed value per MS-OVBA spec
  // major/minor are part of project info but not directly written here
  lines.push(`VersionCompatible32="393222000"`);

  // CMG, DPB, GC - empty protection strings (unprotected)
  // These are for VBA project protection/password
  lines.push(`CMG=""`);
  lines.push(`DPB=""`);
  lines.push(`GC=""`);

  // Host Extender Info section
  lines.push("");
  lines.push("[Host Extender Info]");
  lines.push(`&H00000001={3832D640-CF90-11CF-8E43-00A0C911005A};VBE;&H00000000`);

  // Workspace section (optional)
  lines.push("");
  lines.push("[Workspace]");
  for (const module of modules) {
    // Each module has workspace coordinates
    lines.push(`${module.name}=0, 0, 0, 0, C`);
  }

  // Join with CRLF
  const text = lines.join("\r\n") + "\r\n";

  // Encode as UTF-8 (PROJECT stream is typically MBCS but UTF-8 works)
  return new TextEncoder().encode(text);
}

/**
 * Generate a random GUID for the project.
 */
function generateGuid(): string {
  const hex = (n: number): string => Math.floor(Math.random() * (1 << (n * 4)))
    .toString(16)
    .padStart(n, "0")
    .toUpperCase();

  return `{${hex(8)}-${hex(4)}-${hex(4)}-${hex(4)}-${hex(12)}}`;
}
