/**
 * @file PROJECT stream parser
 *
 * Parses the PROJECT stream from vbaProject.bin.
 * The PROJECT stream contains project metadata in INI-like text format.
 *
 * @see MS-OVBA 2.3.1 (PROJECT Stream)
 */

import type { VbaProjectInfo } from "../types";
import { VbaParseError } from "../errors";

/**
 * Parse PROJECT stream bytes into VbaProjectInfo.
 *
 * PROJECT stream format is text with key=value pairs and sections.
 * Example:
 * ```
 * ID="{GUID}"
 * Document=ThisDocument/&H00000000
 * Module=Module1
 * Name="ProjectName"
 * HelpFile=""
 * HelpContext=0
 * CMG="..."
 * DPB="..."
 * GC="..."
 * ```
 *
 * @param bytes - PROJECT stream bytes
 * @returns Parsed project info
 */
export function parseProjectStream(bytes: Uint8Array): VbaProjectInfo {
  // PROJECT stream is typically MBCS (code page) or ASCII
  // For simplicity, decode as UTF-8 which handles ASCII
  const text = new TextDecoder("utf-8").decode(bytes);

  const pairs = parseKeyValuePairs(text);

  // Extract project name
  // Name field may be quoted: Name="MyProject" or Name=MyProject
  let name = pairs.get("Name") ?? "";
  if (name.startsWith('"') && name.endsWith('"')) {
    name = name.slice(1, -1);
  }

  // Extract help file
  let helpFile = pairs.get("HelpFile") ?? null;
  if (helpFile === '""' || helpFile === "") {
    helpFile = null;
  } else if (helpFile?.startsWith('"') && helpFile.endsWith('"')) {
    helpFile = helpFile.slice(1, -1);
  }

  // Extract help context
  const helpContextStr = pairs.get("HelpContext") ?? "0";
  const helpContext = parseInt(helpContextStr, 10) || 0;

  // Extract conditional compilation constants
  let constants = pairs.get("Constants") ?? null;
  if (constants === '""' || constants === "") {
    constants = null;
  } else if (constants?.startsWith('"') && constants.endsWith('"')) {
    constants = constants.slice(1, -1);
  }

  // Version is not directly in PROJECT stream text
  // It's in the VBA/_VBA_PROJECT stream binary header
  // Return default for now
  const version = { major: 0, minor: 0 };

  return {
    name,
    helpFile,
    helpContext,
    constants,
    version,
  };
}

/**
 * Parsed key-value pairs supporting repeated keys.
 */
type KeyValuePairs = {
  /** Get first value for a key, or undefined if not present */
  get(key: string): string | undefined;
  /** Get all values for a key (supports repeated keys like Module=) */
  getAll(key: string): string[];
  /** Iterate over all key-value pairs */
  entries(): IterableIterator<[string, string]>;
};

/**
 * Parse INI-like key=value pairs from text.
 * Supports repeated keys (e.g., multiple Module= entries).
 */
function parseKeyValuePairs(text: string): KeyValuePairs {
  const allPairs: Array<[string, string]> = [];
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    // Skip empty lines and section headers
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("[")) {
      continue;
    }

    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx);
      const value = trimmed.slice(eqIdx + 1);
      allPairs.push([key, value]);
    }
  }

  return {
    get(key: string): string | undefined {
      for (const [k, v] of allPairs) {
        if (k === key) return v;
      }
      return undefined;
    },
    getAll(key: string): string[] {
      return allPairs.filter(([k]) => k === key).map(([, v]) => v);
    },
    *entries(): IterableIterator<[string, string]> {
      yield* allPairs;
    },
  };
}

/**
 * Extract module names from PROJECT stream.
 *
 * Module entries appear as:
 * - Module=ModuleName
 * - Document=DocName/&H00000000
 * - Class=ClassName
 * - BaseClass=BaseClassName
 *
 * @param bytes - PROJECT stream bytes
 * @returns Array of module names
 */
export function extractModuleNamesFromProject(bytes: Uint8Array): string[] {
  const text = new TextDecoder("utf-8").decode(bytes);
  const pairs = parseKeyValuePairs(text);
  const moduleNames: string[] = [];

  for (const [key, value] of pairs.entries()) {
    if (key === "Module" || key === "Class" || key === "BaseClass") {
      moduleNames.push(value);
    } else if (key === "Document") {
      // Document=Name/&Hxxxxxxxx
      const slashIdx = value.indexOf("/");
      if (slashIdx > 0) {
        moduleNames.push(value.slice(0, slashIdx));
      } else {
        moduleNames.push(value);
      }
    }
  }

  return moduleNames;
}
