/**
 * @file VBA/dir stream parser
 *
 * Parses the decompressed VBA/dir stream to extract module information.
 * Implements MS-OVBA 2.3.4.2 (dir Stream) specification.
 *
 * @see MS-OVBA 2.3.4.2 (dir Stream)
 */

import type { VbaModuleType } from "../types";

/**
 * Parsed module information from dir stream.
 */
export type DirModuleInfo = {
  /** Module name */
  readonly name: string;
  /** Module stream name (may differ from name) */
  readonly streamName: string;
  /** Module type */
  readonly type: VbaModuleType;
  /** Text offset within module stream (after decompression) */
  readonly textOffset: number;
};

/**
 * Parsed reference information from dir stream.
 */
export type DirReferenceInfo = {
  /** Reference name (as used in code) */
  readonly name: string;
  /** Library identifier (GUID or path) */
  readonly libId: string;
  /** Reference type */
  readonly type: "registered" | "project" | "control";
};

/**
 * Parsed dir stream information.
 */
export type DirStreamInfo = {
  /** Project name */
  readonly projectName: string;
  /** Code page for text encoding */
  readonly codePage: number;
  /** Module information */
  readonly modules: readonly DirModuleInfo[];
  /** Reference information */
  readonly references: readonly DirReferenceInfo[];
};

// =============================================================================
// Record IDs from MS-OVBA 2.3.4.2
// =============================================================================

// PROJECTINFORMATION records
const PROJECTSYSKIND = 0x0001;
const _PROJECTLCID = 0x0002;
const _PROJECTLCIDINVOKE = 0x0014;
const _PROJECTCODEPAGE = 0x0003;
const _PROJECTNAME = 0x0004;
const _PROJECTDOCSTRING = 0x0005;
const _PROJECTHELPFILEPATH = 0x0006;
const _PROJECTHELPCONTEXT = 0x0007;
const _PROJECTLIBFLAGS = 0x0008;
const _PROJECTVERSION = 0x0009;
const PROJECTCONSTANTS = 0x000c;

// REFERENCE records
const REFERENCENAME = 0x0016;
const REFERENCEORIGINAL = 0x0033;
const REFERENCECONTROL = 0x002f;
const REFERENCEREGISTERED = 0x000d;
const REFERENCEPROJECT = 0x000e;

// MODULE records
const PROJECTMODULES = 0x000f;
const _PROJECTCOOKIE = 0x0013;
const MODULENAME = 0x0019;
const MODULENAMEUNICODE = 0x0047;
const MODULESTREAMNAME = 0x001a;
const MODULEDOCSTRING = 0x001c;
const MODULEOFFSET = 0x0031;
const MODULEHELPCONTEXT = 0x001e;
const MODULECOOKIE = 0x002c;
const MODULETYPEPROCEDURAL = 0x0021;
const MODULETYPEDOCUMENT = 0x0022;
const MODULEREADONLY = 0x0025;
const MODULEPRIVATE = 0x0028;
const MODULETERMINATOR = 0x002b;

// =============================================================================
// Binary Reader Helper
// =============================================================================

type BinaryReader = {
  readonly offset: number;
  readonly remaining: number;
  readonly readUint16: () => number;
  readonly readUint32: () => number;
  readonly readBytes: (length: number) => Uint8Array;
  readonly skip: (length: number) => void;
  readonly peekUint16: () => number;
};

function createBinaryReader(bytes: Uint8Array, initialOffset = 0): BinaryReader {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const state = { offset: initialOffset };

  return {
    get offset(): number {
      return state.offset;
    },

    get remaining(): number {
      return view.byteLength - state.offset;
    },

    readUint16(): number {
      const value = view.getUint16(state.offset, true);
      state.offset += 2;
      return value;
    },

    readUint32(): number {
      const value = view.getUint32(state.offset, true);
      state.offset += 4;
      return value;
    },

    readBytes(length: number): Uint8Array {
      const result = new Uint8Array(view.buffer, view.byteOffset + state.offset, length);
      state.offset += length;
      return result;
    },

    skip(length: number): void {
      state.offset += length;
    },

    peekUint16(): number {
      return view.getUint16(state.offset, true);
    },
  };
}

// =============================================================================
// Text Decoding
// =============================================================================

/**
 * Map Windows code page numbers to TextDecoder encoding labels.
 * @see https://encoding.spec.whatwg.org/#names-and-labels
 */
export const CODE_PAGE_TO_ENCODING: Record<number, string> = {
  932: "shift_jis", // Japanese
  936: "gbk", // Simplified Chinese
  949: "euc-kr", // Korean
  950: "big5", // Traditional Chinese
  1250: "windows-1250", // Central European
  1251: "windows-1251", // Cyrillic
  1252: "windows-1252", // Western European (default)
  1253: "windows-1253", // Greek
  1254: "windows-1254", // Turkish
  1255: "windows-1255", // Hebrew
  1256: "windows-1256", // Arabic
  1257: "windows-1257", // Baltic
  1258: "windows-1258", // Vietnamese
  65001: "utf-8", // UTF-8
};











/**
 * Decode bytes to string using the specified code page.
 *
 * @param bytes - Raw bytes to decode
 * @param codePage - Windows code page number
 * @returns Decoded string
 * @throws Error if code page is not supported
 */
export function decodeText(bytes: Uint8Array, codePage: number): string {
  const encoding = CODE_PAGE_TO_ENCODING[codePage];
  if (encoding === undefined) {
    throw new Error(
      `Unsupported code page: ${codePage}. Supported: ${Object.keys(CODE_PAGE_TO_ENCODING).join(", ")}`
    );
  }
  // TextDecoder throws if encoding is not supported by the runtime
  return new TextDecoder(encoding).decode(bytes);
}

// =============================================================================
// Record Parsing Helpers
// =============================================================================

/**
 * Decode UTF-16LE bytes to string.
 */
function decodeUtf16Le(bytes: Uint8Array): string {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // Build array of character codes and join
  const charCount = Math.floor(bytes.length / 2);
  return Array.from({ length: charCount }, (_, i) =>
    String.fromCharCode(view.getUint16(i * 2, true))
  ).join("");
}

/**
 * Read a record with MBCS + Unicode structure.
 * Format: SizeOfMBCS (4) + MBCS (var) + Reserved (2) + SizeOfUnicode (4) + Unicode (var)
 *
 * Prefers Unicode data when available for better compatibility with all code pages.
 */
function readMbcsUnicodeRecord(reader: BinaryReader, codePage: number): string {
  const sizeOfMbcs = reader.readUint32();
  const mbcsData = reader.readBytes(sizeOfMbcs);
  reader.skip(2); // Reserved
  const sizeOfUnicode = reader.readUint32();
  const unicodeData = reader.readBytes(sizeOfUnicode);

  // Prefer Unicode if available (more reliable for non-ASCII characters)
  if (sizeOfUnicode > 0) {
    return decodeUtf16Le(unicodeData);
  }
  // Fallback to MBCS for legacy compatibility
  return decodeText(mbcsData, codePage);
}

/**
 * Skip a record with MBCS + Unicode structure.
 */
function skipMbcsUnicodeRecord(reader: BinaryReader): void {
  const sizeOfMbcs = reader.readUint32();
  reader.skip(sizeOfMbcs);
  reader.skip(2); // Reserved
  const sizeOfUnicode = reader.readUint32();
  reader.skip(sizeOfUnicode);
}

// =============================================================================
// PROJECTINFORMATION Parsing
// =============================================================================

type ProjectInfo = {
  projectName: string;
  codePage: number;
};

function parseProjectInformation(reader: BinaryReader): ProjectInfo {
  const result = { projectName: "", codePage: 1252 };

  // PROJECTSYSKIND
  if (reader.remaining < 10) {return result;}
  const sysKindId = reader.readUint16();
  if (sysKindId !== PROJECTSYSKIND) {return result;}
  reader.skip(4); // Size (always 4)
  reader.skip(4); // SysKind value

  // PROJECTLCID
  if (reader.remaining < 10) {return result;}
  reader.skip(2); // Id
  reader.skip(4); // Size
  reader.skip(4); // Lcid value

  // PROJECTLCIDINVOKE
  if (reader.remaining < 10) {return result;}
  reader.skip(2); // Id
  reader.skip(4); // Size
  reader.skip(4); // LcidInvoke value

  // PROJECTCODEPAGE
  if (reader.remaining < 8) {return result;}
  reader.skip(2); // Id
  reader.skip(4); // Size (always 2)
  result.codePage = reader.readUint16();

  // PROJECTNAME
  if (reader.remaining < 6) {return result;}
  reader.skip(2); // Id
  const nameSize = reader.readUint32();
  if (reader.remaining < nameSize) {return result;}
  const nameData = reader.readBytes(nameSize);
  result.projectName = decodeText(nameData, result.codePage);

  // PROJECTDOCSTRING (complex: MBCS + Unicode)
  if (reader.remaining < 6) {return result;}
  reader.skip(2); // Id (0x0005)
  skipMbcsUnicodeRecord(reader);

  // PROJECTHELPFILEPATH (complex: two paths)
  if (reader.remaining < 6) {return result;}
  reader.skip(2); // Id (0x0006)
  const helpPath1Size = reader.readUint32();
  reader.skip(helpPath1Size);
  reader.skip(2); // Reserved (0x003D)
  const helpPath2Size = reader.readUint32();
  reader.skip(helpPath2Size);

  // PROJECTHELPCONTEXT
  if (reader.remaining < 10) {return result;}
  reader.skip(2); // Id
  reader.skip(4); // Size
  reader.skip(4); // HelpContext value

  // PROJECTLIBFLAGS
  if (reader.remaining < 10) {return result;}
  reader.skip(2); // Id
  reader.skip(4); // Size
  reader.skip(4); // ProjectLibFlags value

  // PROJECTVERSION
  if (reader.remaining < 10) {return result;}
  reader.skip(2); // Id
  const versionSize = reader.readUint32(); // Size (should be 4)
  reader.skip(versionSize); // VersionMajor (2) + VersionMinor (2)

  // PROJECTCONSTANTS (optional, complex: MBCS + Unicode)
  // Some files have extra bytes before PROJECTCONSTANTS - scan forward
  while (reader.remaining >= 2) {
    const nextId = reader.peekUint16();
    if (nextId === PROJECTCONSTANTS) {
      reader.skip(2); // Id
      skipMbcsUnicodeRecord(reader);
      break;
    }
    // Check if we've reached PROJECTREFERENCES or PROJECTMODULES
    if (
      nextId === REFERENCENAME ||
      nextId === REFERENCEORIGINAL ||
      nextId === REFERENCECONTROL ||
      nextId === REFERENCEREGISTERED ||
      nextId === REFERENCEPROJECT ||
      nextId === PROJECTMODULES
    ) {
      break;
    }
    // Skip unknown byte and continue scanning
    reader.skip(1);
  }

  return result;
}

// =============================================================================
// PROJECTREFERENCES Parsing
// =============================================================================

function parseProjectReferences(reader: BinaryReader, codePage: number): DirReferenceInfo[] {
  const references: DirReferenceInfo[] = [];
  const state = { currentName: "" };

  // Parse all references until we hit PROJECTMODULES (0x000F)
  while (reader.remaining >= 2) {
    const id = reader.peekUint16();

    if (id === PROJECTMODULES) {
      // We've reached the modules section
      return references;
    }

    reader.skip(2); // Consume the ID we peeked

    switch (id) {
      case REFERENCENAME: {
        // REFERENCENAME: SizeOfName (4) + Name (var) + Reserved (2) + SizeOfNameUnicode (4) + NameUnicode (var)
        state.currentName = readMbcsUnicodeRecord(reader, codePage);
        break;
      }

      case REFERENCEORIGINAL: {
        // REFERENCEORIGINAL: SizeOfLibidOriginal (4) + LibidOriginal (var)
        // This is used with REFERENCECONTROL, skip for now
        const size = reader.readUint32();
        reader.skip(size);
        break;
      }

      case REFERENCECONTROL: {
        // REFERENCECONTROL: complex structure
        // SizeTwiddled (4) includes: SizeOfLibidTwiddled (4) + LibidTwiddled
        const sizeTwiddled = reader.readUint32();
        reader.skip(sizeTwiddled);
        reader.skip(6); // Reserved1 (4) + Reserved2 (2)

        // Optional NameRecordExtended
        if (reader.remaining >= 2 && reader.peekUint16() === REFERENCENAME) {
          reader.skip(2);
          state.currentName = readMbcsUnicodeRecord(reader, codePage);
        }

        // Reserved3 (4) + SizeOfLibidExtended (4) + LibidExtended
        reader.skip(4); // Reserved3
        const sizeExtended = reader.readUint32();
        const libIdData = reader.readBytes(sizeExtended);
        const libId = decodeText(libIdData, codePage);

        reader.skip(4 + 4 + 16 + 4); // Reserved4 + Reserved5 + OriginalTypeLib + Cookie

        if (state.currentName) {
          references.push({ name: state.currentName, libId, type: "control" });
          state.currentName = "";
        }
        break;
      }

      case REFERENCEREGISTERED: {
        // REFERENCEREGISTERED: Size (4) includes everything after
        // SizeOfLibid (4) + Libid (var) + Reserved1 (4) + Reserved2 (2)
        const totalSize = reader.readUint32();
        const startOffset = reader.offset;

        const sizeOfLibid = reader.readUint32();
        const libIdData = reader.readBytes(sizeOfLibid);
        const libId = decodeText(libIdData, codePage);

        // Skip remaining bytes (Reserved1 + Reserved2)
        const consumed = reader.offset - startOffset;
        if (totalSize > consumed) {
          reader.skip(totalSize - consumed);
        }

        if (state.currentName) {
          references.push({ name: state.currentName, libId, type: "registered" });
          state.currentName = "";
        }
        break;
      }

      case REFERENCEPROJECT: {
        // REFERENCEPROJECT: Size (4) includes everything after
        // SizeOfLibidAbsolute (4) + LibidAbsolute + SizeOfLibidRelative (4) + LibidRelative + MajorVersion (4) + MinorVersion (2)
        const totalSize = reader.readUint32();
        const startOffset = reader.offset;

        const sizeAbsolute = reader.readUint32();
        const libIdAbsoluteData = reader.readBytes(sizeAbsolute);
        const libId = decodeText(libIdAbsoluteData, codePage);

        // Skip remaining bytes
        const consumed = reader.offset - startOffset;
        if (totalSize > consumed) {
          reader.skip(totalSize - consumed);
        }

        if (state.currentName) {
          references.push({ name: state.currentName, libId, type: "project" });
          state.currentName = "";
        }
        break;
      }

      default:
        // Unknown reference type, try to skip using Size field
        if (reader.remaining >= 4) {
          const size = reader.readUint32();
          if (size < reader.remaining) {
            reader.skip(size);
          }
        }
        break;
    }
  }

  return references;
}

// =============================================================================
// PROJECTMODULES Parsing
// =============================================================================

function parseProjectModules(reader: BinaryReader, codePage: number): DirModuleInfo[] {
  const modules: DirModuleInfo[] = [];

  // PROJECTMODULES header
  if (reader.remaining < 8) {return modules;}
  const modulesId = reader.readUint16();
  if (modulesId !== PROJECTMODULES) {return modules;}
  reader.skip(4); // Size (always 2)
  const moduleCount = reader.readUint16();

  // PROJECTCOOKIE
  if (reader.remaining < 8) {return modules;}
  reader.skip(2); // Id (0x0013)
  reader.skip(4); // Size (always 2)
  reader.skip(2); // Cookie value

  // Parse each module
  for (let i = 0; i < moduleCount && reader.remaining >= 6; i++) {
    const module = parseModule(reader, codePage);
    if (module) {
      modules.push(module);
    }
  }

  return modules;
}

function parseModule(reader: BinaryReader, codePage: number): DirModuleInfo | null {
  // MODULENAME (MBCS version)
  if (reader.remaining < 6) { return null; }
  const nameId = reader.readUint16();
  if (nameId !== MODULENAME) { return null; }
  const nameSize = reader.readUint32();
  if (reader.remaining < nameSize) { return null; }
  const nameData = reader.readBytes(nameSize);
  const initialName = decodeText(nameData, codePage);

  const state = {
    name: initialName,
    streamName: initialName,
    streamNameFromUnicode: false,
    textOffset: 0,
    moduleType: "standard" as VbaModuleType,
  };

  // Parse remaining module records
  while (reader.remaining >= 6) {
    const id = reader.readUint16();
    const size = reader.readUint32();

    switch (id) {
      case MODULENAMEUNICODE:
        // Prefer Unicode name over MBCS name
        if (size > 0) {
          const unicodeData = reader.readBytes(size);
          state.name = decodeUtf16Le(unicodeData);
          if (!state.streamNameFromUnicode) {
            state.streamName = state.name;
          }
        } else {
          reader.skip(size);
        }
        break;

      case MODULESTREAMNAME: {
        // Read MBCS stream name
        const streamData = size > 0 ? reader.readBytes(size) : new Uint8Array(0);
        const mbcsStreamName = size > 0 ? decodeText(streamData, codePage) : "";
        // Read Reserved + SizeOfStreamNameUnicode + StreamNameUnicode
        reader.skip(2); // Reserved
        const unicodeSize = reader.readUint32();
        if (unicodeSize > 0) {
          const unicodeData = reader.readBytes(unicodeSize);
          state.streamName = decodeUtf16Le(unicodeData);
          state.streamNameFromUnicode = true;
        } else {
          state.streamName = mbcsStreamName;
        }
        break;
      }

      case MODULEDOCSTRING: {
        reader.skip(size);
        // Skip Reserved + SizeOfDocStringUnicode + DocStringUnicode
        reader.skip(2);
        const docUnicodeSize = reader.readUint32();
        reader.skip(docUnicodeSize);
        break;
      }

      case MODULEOFFSET:
        if (size >= 4) {
          state.textOffset = reader.readUint32();
        } else {
          reader.skip(size);
        }
        break;

      case MODULEHELPCONTEXT:
      case MODULECOOKIE:
        reader.skip(size);
        break;

      case MODULETYPEPROCEDURAL:
        state.moduleType = "standard";
        reader.skip(size);
        break;

      case MODULETYPEDOCUMENT:
        state.moduleType = "document";
        reader.skip(size);
        break;

      case MODULEREADONLY:
      case MODULEPRIVATE:
        reader.skip(size);
        break;

      case MODULETERMINATOR:
        // End of this module
        // Note: 'size' is actually Reserved (4 bytes, must be 0), already read
        return { name: state.name, streamName: state.streamName, type: state.moduleType, textOffset: state.textOffset };

      default:
        // Unknown record, skip it
        reader.skip(size);
        break;
    }
  }

  return { name: state.name, streamName: state.streamName, type: state.moduleType, textOffset: state.textOffset };
}

// =============================================================================
// Main Parser Entry Point
// =============================================================================

/**
 * Parse decompressed dir stream.
 *
 * @param bytes - Decompressed dir stream bytes
 * @returns Parsed dir stream information
 */
export function parseDirStream(bytes: Uint8Array): DirStreamInfo {
  const reader = createBinaryReader(bytes);

  // Parse PROJECTINFORMATION
  const { projectName, codePage } = parseProjectInformation(reader);

  // Parse PROJECTREFERENCES
  const references = parseProjectReferences(reader, codePage);

  // Parse PROJECTMODULES
  const modules = parseProjectModules(reader, codePage);

  return {
    projectName,
    codePage,
    modules,
    references,
  };
}
