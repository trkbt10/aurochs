/**
 * @file VBA/dir stream serializer
 *
 * Serializes dir stream information to binary format.
 * This is the inverse of the parser in parser/dir-stream.ts.
 *
 * @see MS-OVBA 2.3.4.2 (dir Stream)
 */

import type { DirStreamInfo, DirReferenceInfo } from "../parser/dir-stream";
import { encodeMbcs } from "./mbcs-encoder";

// =============================================================================
// Record IDs from MS-OVBA 2.3.4.2
// =============================================================================

// PROJECTINFORMATION records
const PROJECTSYSKIND = 0x0001;
const PROJECTLCID = 0x0002;
const PROJECTLCIDINVOKE = 0x0014;
const PROJECTCODEPAGE = 0x0003;
const PROJECTNAME = 0x0004;
const PROJECTDOCSTRING = 0x0005;
const PROJECTHELPFILEPATH = 0x0006;
const PROJECTHELPFILEPATH2 = 0x003d;
const PROJECTHELPCONTEXT = 0x0007;
const PROJECTLIBFLAGS = 0x0008;
const PROJECTVERSION = 0x0009;
const PROJECTCONSTANTS = 0x000c;

// REFERENCE records
const REFERENCENAME = 0x0016;
const REFERENCEREGISTERED = 0x000d;
const REFERENCEPROJECT = 0x000e;
const REFERENCECONTROL = 0x002f;

// MODULE records
const PROJECTMODULES = 0x000f;
const PROJECTCOOKIE = 0x0013;
const MODULENAME = 0x0019;
const MODULENAMEUNICODE = 0x0047;
const MODULESTREAMNAME = 0x001a;
const MODULEDOCSTRING = 0x001c;
const MODULEOFFSET = 0x0031;
const MODULEHELPCONTEXT = 0x001e;
const MODULECOOKIE = 0x002c;
const MODULETYPEPROCEDURAL = 0x0021;
const MODULETYPEDOCUMENT = 0x0022;
const MODULETERMINATOR = 0x002b;

// =============================================================================
// Binary Writer Helper
// =============================================================================

type BinaryWriter = {
  writeUint16(value: number): void;
  writeUint32(value: number): void;
  writeBytes(bytes: Uint8Array): void;
  toBytes(): Uint8Array;
};

function createBinaryWriter(): BinaryWriter {
  const chunks: Uint8Array[] = [];
  const state = { totalSize: 0 };

  return {
    writeUint16(value: number): void {
      const buf = new Uint8Array(2);
      new DataView(buf.buffer).setUint16(0, value, true);
      chunks.push(buf);
      state.totalSize += 2;
    },

    writeUint32(value: number): void {
      const buf = new Uint8Array(4);
      new DataView(buf.buffer).setUint32(0, value, true);
      chunks.push(buf);
      state.totalSize += 4;
    },

    writeBytes(bytes: Uint8Array): void {
      chunks.push(bytes);
      state.totalSize += bytes.length;
    },

    toBytes(): Uint8Array {
      const result = new Uint8Array(state.totalSize);
      chunks.reduce((offset, chunk) => {
        result.set(chunk, offset);
        return offset + chunk.length;
      }, 0);
      return result;
    },
  };
}

// =============================================================================
// Text Encoding
// =============================================================================

/**
 * Encode text to MBCS bytes using the specified code page.
 *
 * Uses the encodeMbcs function which supports proper MBCS encoding
 * for Japanese (Shift_JIS), Chinese (GBK, Big5), Korean (EUC-KR), etc.
 */
function encodeText(text: string, codePage: number): Uint8Array {
  return encodeMbcs(text, codePage);
}

/**
 * Encode text to UTF-16LE bytes.
 */
function encodeUtf16Le(text: string): Uint8Array {
  const buf = new Uint8Array(text.length * 2);
  const view = new DataView(buf.buffer);
  for (let i = 0; i < text.length; i++) {
    view.setUint16(i * 2, text.charCodeAt(i), true);
  }
  return buf;
}

// =============================================================================
// Record Writing Helpers
// =============================================================================

/**
 * Write a record with MBCS + Unicode structure.
 * Format: SizeOfMBCS (4) + MBCS (var) + Reserved (2) + SizeOfUnicode (4) + Unicode (var)
 */
function writeMbcsUnicodeRecord(
  writer: BinaryWriter,
  text: string,
  codePage: number
): void {
  const mbcsBytes = encodeText(text, codePage);
  const unicodeBytes = encodeUtf16Le(text);

  writer.writeUint32(mbcsBytes.length);
  writer.writeBytes(mbcsBytes);
  writer.writeUint16(0); // Reserved
  writer.writeUint32(unicodeBytes.length);
  writer.writeBytes(unicodeBytes);
}

// =============================================================================
// PROJECTINFORMATION Serialization
// =============================================================================

type SerializeDirOptions = {
  /** Project name */
  readonly projectName: string;
  /** Code page (default: 1252) */
  readonly codePage: number;
  /** Help file path (optional) */
  readonly helpFile?: string;
  /** Help context ID (default: 0) */
  readonly helpContext?: number;
  /** Conditional compilation constants (optional) */
  readonly constants?: string;
  /** Version major (default: 1) */
  readonly versionMajor?: number;
  /** Version minor (default: 0) */
  readonly versionMinor?: number;
};

function writeProjectInformation(
  writer: BinaryWriter,
  options: SerializeDirOptions
): void {
  const {
    projectName,
    codePage,
    helpFile = "",
    helpContext = 0,
    constants = "",
    versionMajor = 1,
    versionMinor = 0,
  } = options;

  // PROJECTSYSKIND
  writer.writeUint16(PROJECTSYSKIND);
  writer.writeUint32(4); // Size
  writer.writeUint32(0x00000001); // SysKind = Win32

  // PROJECTLCID
  writer.writeUint16(PROJECTLCID);
  writer.writeUint32(4); // Size
  writer.writeUint32(0x00000409); // LCID = 1033 (en-US)

  // PROJECTLCIDINVOKE
  writer.writeUint16(PROJECTLCIDINVOKE);
  writer.writeUint32(4); // Size
  writer.writeUint32(0x00000409); // LcidInvoke = 1033 (en-US)

  // PROJECTCODEPAGE
  writer.writeUint16(PROJECTCODEPAGE);
  writer.writeUint32(2); // Size
  writer.writeUint16(codePage);

  // PROJECTNAME
  const nameBytes = encodeText(projectName, codePage);
  writer.writeUint16(PROJECTNAME);
  writer.writeUint32(nameBytes.length);
  writer.writeBytes(nameBytes);

  // PROJECTDOCSTRING (MBCS + Unicode)
  writer.writeUint16(PROJECTDOCSTRING);
  writeMbcsUnicodeRecord(writer, "", codePage); // Empty doc string

  // PROJECTHELPFILEPATH (two paths)
  const helpBytes = encodeText(helpFile, codePage);
  writer.writeUint16(PROJECTHELPFILEPATH);
  writer.writeUint32(helpBytes.length);
  writer.writeBytes(helpBytes);
  writer.writeUint16(PROJECTHELPFILEPATH2);
  writer.writeUint32(helpBytes.length);
  writer.writeBytes(helpBytes);

  // PROJECTHELPCONTEXT
  writer.writeUint16(PROJECTHELPCONTEXT);
  writer.writeUint32(4); // Size
  writer.writeUint32(helpContext);

  // PROJECTLIBFLAGS
  writer.writeUint16(PROJECTLIBFLAGS);
  writer.writeUint32(4); // Size
  writer.writeUint32(0); // No flags

  // PROJECTVERSION
  writer.writeUint16(PROJECTVERSION);
  writer.writeUint32(4); // Size (MajorVersion(2) + MinorVersion(2))
  writer.writeUint16(versionMajor);
  writer.writeUint16(versionMinor);

  // PROJECTCONSTANTS (MBCS + Unicode)
  writer.writeUint16(PROJECTCONSTANTS);
  writeMbcsUnicodeRecord(writer, constants, codePage);
}

// =============================================================================
// PROJECTREFERENCES Serialization
// =============================================================================

function writeProjectReferences(
  writer: BinaryWriter,
  references: readonly DirReferenceInfo[],
  codePage: number
): void {
  for (const ref of references) {
    // REFERENCENAME
    writer.writeUint16(REFERENCENAME);
    writeMbcsUnicodeRecord(writer, ref.name, codePage);

    // Reference body depends on type
    switch (ref.type) {
      case "registered": {
        // REFERENCEREGISTERED
        const libIdBytes = encodeText(ref.libId, codePage);
        const totalSize = 4 + libIdBytes.length + 4 + 2; // SizeOfLibid + Libid + Reserved1 + Reserved2

        writer.writeUint16(REFERENCEREGISTERED);
        writer.writeUint32(totalSize);
        writer.writeUint32(libIdBytes.length);
        writer.writeBytes(libIdBytes);
        writer.writeUint32(0); // Reserved1
        writer.writeUint16(0); // Reserved2
        break;
      }

      case "project": {
        // REFERENCEPROJECT
        const libIdAbsBytes = encodeText(ref.libId, codePage);
        const libIdRelBytes = encodeText(ref.libId, codePage);
        // SizeOfLibidAbsolute + LibidAbsolute + SizeOfLibidRelative + LibidRelative + MajorVersion + MinorVersion
        const totalSize = 4 + libIdAbsBytes.length + 4 + libIdRelBytes.length + 4 + 2;

        writer.writeUint16(REFERENCEPROJECT);
        writer.writeUint32(totalSize);
        writer.writeUint32(libIdAbsBytes.length);
        writer.writeBytes(libIdAbsBytes);
        writer.writeUint32(libIdRelBytes.length);
        writer.writeBytes(libIdRelBytes);
        writer.writeUint32(0); // MajorVersion
        writer.writeUint16(0); // MinorVersion
        break;
      }

      case "control": {
        // REFERENCECONTROL - complex structure, simplified implementation
        const libIdBytes = encodeText(ref.libId, codePage);

        // Write SizeTwiddled (contains SizeOfLibidTwiddled + LibidTwiddled)
        // For simplicity, we write empty twiddled lib
        writer.writeUint16(REFERENCECONTROL);
        writer.writeUint32(4); // SizeTwiddled = just the size field
        writer.writeUint32(0); // SizeOfLibidTwiddled = 0

        // Reserved1 (4) + Reserved2 (2)
        writer.writeUint32(0); // Reserved1
        writer.writeUint16(0); // Reserved2

        // Reserved3 (4) + SizeOfLibidExtended (4) + LibidExtended
        writer.writeUint32(0); // Reserved3
        writer.writeUint32(libIdBytes.length);
        writer.writeBytes(libIdBytes);

        // Reserved4 (4) + Reserved5 (4) + OriginalTypeLib (16) + Cookie (4)
        writer.writeUint32(0); // Reserved4
        writer.writeUint32(0); // Reserved5
        writer.writeBytes(new Uint8Array(16)); // OriginalTypeLib (GUID, zeroed)
        writer.writeUint32(0); // Cookie
        break;
      }
    }
  }
}

// =============================================================================
// PROJECTMODULES Serialization
// =============================================================================

/**
 * Module entry for serialization.
 */
export type SerializeModuleEntry = {
  /** Module name */
  readonly name: string;
  /** Module stream name (may differ from name) */
  readonly streamName: string;
  /** Module type */
  readonly type: "standard" | "class" | "document" | "form";
  /** Text offset within module stream */
  readonly textOffset: number;
};

function writeProjectModules(
  writer: BinaryWriter,
  modules: readonly SerializeModuleEntry[],
  codePage: number
): void {
  // PROJECTMODULES header
  writer.writeUint16(PROJECTMODULES);
  writer.writeUint32(2); // Size
  writer.writeUint16(modules.length);

  // PROJECTCOOKIE
  writer.writeUint16(PROJECTCOOKIE);
  writer.writeUint32(2); // Size
  writer.writeUint16(0xffff); // Cookie value

  // Write each module
  for (const module of modules) {
    writeModule(writer, module, codePage);
  }
}

function writeModule(
  writer: BinaryWriter,
  module: SerializeModuleEntry,
  codePage: number
): void {
  const nameBytes = encodeText(module.name, codePage);
  const nameUnicodeBytes = encodeUtf16Le(module.name);
  const streamNameBytes = encodeText(module.streamName, codePage);
  const streamNameUnicodeBytes = encodeUtf16Le(module.streamName);

  // MODULENAME
  writer.writeUint16(MODULENAME);
  writer.writeUint32(nameBytes.length);
  writer.writeBytes(nameBytes);

  // MODULENAMEUNICODE
  writer.writeUint16(MODULENAMEUNICODE);
  writer.writeUint32(nameUnicodeBytes.length);
  writer.writeBytes(nameUnicodeBytes);

  // MODULESTREAMNAME (MBCS + Unicode)
  writer.writeUint16(MODULESTREAMNAME);
  writer.writeUint32(streamNameBytes.length);
  writer.writeBytes(streamNameBytes);
  writer.writeUint16(0); // Reserved
  writer.writeUint32(streamNameUnicodeBytes.length);
  writer.writeBytes(streamNameUnicodeBytes);

  // MODULEDOCSTRING (MBCS + Unicode, empty)
  writer.writeUint16(MODULEDOCSTRING);
  writeMbcsUnicodeRecord(writer, "", codePage);

  // MODULEOFFSET
  writer.writeUint16(MODULEOFFSET);
  writer.writeUint32(4); // Size
  writer.writeUint32(module.textOffset);

  // MODULEHELPCONTEXT
  writer.writeUint16(MODULEHELPCONTEXT);
  writer.writeUint32(4); // Size
  writer.writeUint32(0); // HelpContext

  // MODULECOOKIE
  writer.writeUint16(MODULECOOKIE);
  writer.writeUint32(2); // Size
  writer.writeUint16(0xffff); // Cookie

  // MODULETYPE
  // MS-OVBA 2.3.4.2.3.2.4:
  // - 0x0021 (PROCEDURAL): procedural module only (standard)
  // - 0x0022 (DOCUMENT): document module, class module, or designer module (form)
  if (module.type === "standard") {
    writer.writeUint16(MODULETYPEPROCEDURAL);
    writer.writeUint32(0); // Reserved
  } else {
    // document, class, form all use MODULETYPEDOCUMENT
    writer.writeUint16(MODULETYPEDOCUMENT);
    writer.writeUint32(0); // Reserved
  }

  // MODULETERMINATOR
  writer.writeUint16(MODULETERMINATOR);
  writer.writeUint32(0); // Reserved
}

// =============================================================================
// Main Serializer Entry Point
// =============================================================================

/**
 * Serialize dir stream to bytes.
 *
 * Note: The output is NOT compressed. Use compressVba() to compress before
 * storing in the VBA project.
 *
 * @param info - Dir stream information
 * @param codePage - Code page for text encoding (default: from info or 1252)
 * @returns Serialized dir stream bytes (uncompressed)
 */
export function serializeDirStream(
  info: DirStreamInfo,
  codePage?: number
): Uint8Array {
  const effectiveCodePage = codePage ?? info.codePage;
  const writer = createBinaryWriter();

  // Convert DirModuleInfo to SerializeModuleEntry
  const modules: SerializeModuleEntry[] = info.modules.map((m) => ({
    name: m.name,
    streamName: m.streamName,
    type: m.type,
    textOffset: m.textOffset,
  }));

  // Convert DirReferenceInfo (parser type already matches)
  const references = info.references;

  // Write PROJECTINFORMATION
  writeProjectInformation(writer, {
    projectName: info.projectName,
    codePage: effectiveCodePage,
  });

  // Write PROJECTREFERENCES
  writeProjectReferences(writer, references, effectiveCodePage);

  // Write PROJECTMODULES
  writeProjectModules(writer, modules, effectiveCodePage);

  return writer.toBytes();
}

/**
 * Create dir stream info from project and modules.
 *
 * This is a helper to construct DirStreamInfo from higher-level types.
 */
export function createDirStreamInfo(options: {
  readonly projectName: string;
  readonly codePage?: number;
  readonly modules: readonly SerializeModuleEntry[];
  readonly references?: readonly DirReferenceInfo[];
}): DirStreamInfo {
  return {
    projectName: options.projectName,
    codePage: options.codePage ?? 1252,
    modules: options.modules.map((m) => ({
      name: m.name,
      streamName: m.streamName,
      type: m.type,
      textOffset: m.textOffset,
    })),
    references: options.references ?? [],
  };
}
