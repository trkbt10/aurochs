/**
 * @file dir stream serializer tests
 */

import { readFileSync } from "node:fs";
import { loadZipPackage } from "@aurochs/zip";
import { serializeDirStream, createDirStreamInfo } from "./dir-stream";
import { MbcsEncodingError } from "./mbcs-encoder";
import { parseDirStream, type DirStreamInfo } from "../parser/dir-stream";
import { parseVbaProject } from "../parser/vba-project";

const FIXTURE_DIR = "packages/@aurochs-office/vba/fixtures";
const XLSM_FIXTURE = `${FIXTURE_DIR}/SimpleMacro.xlsm`;

async function loadVbaProject(fixturePath: string, vbaPath: string): Promise<Uint8Array> {
  const bytes = readFileSync(fixturePath);
  const pkg = await loadZipPackage(bytes);
  const binary = pkg.readBinary(vbaPath);
  if (!binary) {
    throw new Error(`${vbaPath} not found in ${fixturePath}`);
  }
  return new Uint8Array(binary);
}

describe("serializeDirStream", () => {
  it("serializes minimal dir stream", () => {
    const info = createDirStreamInfo({
      projectName: "VBAProject",
      codePage: 1252,
      modules: [
        {
          name: "Module1",
          streamName: "Module1",
          type: "standard",
          textOffset: 0,
        },
      ],
    });

    const serialized = serializeDirStream(info);
    expect(serialized.length).toBeGreaterThan(0);

    // Should be parseable
    const reparsed = parseDirStream(serialized);
    expect(reparsed.projectName).toBe("VBAProject");
    expect(reparsed.codePage).toBe(1252);
    expect(reparsed.modules.length).toBe(1);
    expect(reparsed.modules[0].name).toBe("Module1");
  });

  it("round-trips project name", () => {
    const info = createDirStreamInfo({
      projectName: "MyTestProject",
      modules: [],
    });

    const serialized = serializeDirStream(info);
    const reparsed = parseDirStream(serialized);

    expect(reparsed.projectName).toBe("MyTestProject");
  });

  it("round-trips multiple modules", () => {
    const info = createDirStreamInfo({
      projectName: "MultiModule",
      modules: [
        { name: "Module1", streamName: "Module1", type: "standard", textOffset: 0 },
        { name: "Module2", streamName: "Module2", type: "standard", textOffset: 100 },
        { name: "ThisWorkbook", streamName: "ThisWorkbook", type: "document", textOffset: 300 },
      ],
    });

    const serialized = serializeDirStream(info);
    const reparsed = parseDirStream(serialized);

    expect(reparsed.modules.length).toBe(3);
    expect(reparsed.modules[0].name).toBe("Module1");
    expect(reparsed.modules[0].type).toBe("standard");
    expect(reparsed.modules[0].textOffset).toBe(0);

    expect(reparsed.modules[1].name).toBe("Module2");
    expect(reparsed.modules[1].textOffset).toBe(100);

    expect(reparsed.modules[2].name).toBe("ThisWorkbook");
    expect(reparsed.modules[2].type).toBe("document");
    expect(reparsed.modules[2].textOffset).toBe(300);
  });

  it("round-trips class module type via MODULETYPEDOCUMENT", () => {
    // MS-OVBA 2.3.4.2.3.2.4:
    // - 0x0021 (PROCEDURAL): procedural module only (standard)
    // - 0x0022 (DOCUMENT): document module, class module, or designer module (form)
    // At dir stream level, class uses MODULETYPEDOCUMENT, parser returns "document".
    // The actual class type is determined by source code attributes during vba-project parsing.
    const info = createDirStreamInfo({
      projectName: "ClassTest",
      modules: [
        { name: "Class1", streamName: "Class1", type: "class", textOffset: 0 },
      ],
    });

    const serialized = serializeDirStream(info);
    const reparsed = parseDirStream(serialized);

    expect(reparsed.modules.length).toBe(1);
    expect(reparsed.modules[0].name).toBe("Class1");
    // Dir stream uses MODULETYPEDOCUMENT (0x0022) for class modules
    // Parser returns "document", actual class type determined by source code attributes
    expect(reparsed.modules[0].type).toBe("document");
  });

  it("round-trips form module type via MODULETYPEDOCUMENT", () => {
    // Form (designer) modules also use MODULETYPEDOCUMENT per MS-OVBA spec
    const info = createDirStreamInfo({
      projectName: "FormTest",
      modules: [
        { name: "UserForm1", streamName: "UserForm1", type: "form", textOffset: 0 },
      ],
    });

    const serialized = serializeDirStream(info);
    const reparsed = parseDirStream(serialized);

    expect(reparsed.modules.length).toBe(1);
    expect(reparsed.modules[0].name).toBe("UserForm1");
    // Parser returns "document" for MODULETYPEDOCUMENT
    expect(reparsed.modules[0].type).toBe("document");
  });

  it("round-trips module with different stream name", () => {
    const info = createDirStreamInfo({
      projectName: "StreamNameTest",
      modules: [
        { name: "Module1", streamName: "Module1Stream", type: "standard", textOffset: 50 },
      ],
    });

    const serialized = serializeDirStream(info);
    const reparsed = parseDirStream(serialized);

    expect(reparsed.modules[0].name).toBe("Module1");
    expect(reparsed.modules[0].streamName).toBe("Module1Stream");
  });

  it("round-trips registered reference", () => {
    const info = createDirStreamInfo({
      projectName: "RefTest",
      modules: [],
      references: [
        {
          name: "stdole",
          libId: "*\\G{00020430-0000-0000-C000-000000000046}#2.0#0#C:\\Windows\\SysWOW64\\stdole2.tlb#OLE Automation",
          type: "registered",
        },
      ],
    });

    const serialized = serializeDirStream(info);
    const reparsed = parseDirStream(serialized);

    expect(reparsed.references.length).toBe(1);
    expect(reparsed.references[0].name).toBe("stdole");
    expect(reparsed.references[0].type).toBe("registered");
    expect(reparsed.references[0].libId).toContain("00020430");
  });

  it("round-trips project reference", () => {
    const info = createDirStreamInfo({
      projectName: "ProjectRefTest",
      modules: [],
      references: [
        {
          name: "OtherProject",
          libId: "*\\H{12345678-1234-1234-1234-123456789012}",
          type: "project",
        },
      ],
    });

    const serialized = serializeDirStream(info);
    const reparsed = parseDirStream(serialized);

    expect(reparsed.references.length).toBe(1);
    expect(reparsed.references[0].name).toBe("OtherProject");
    expect(reparsed.references[0].type).toBe("project");
  });

  it("round-trips real VBA dir stream from fixture", async () => {
    const vbaBytes = await loadVbaProject(XLSM_FIXTURE, "xl/vbaProject.bin");
    const result = parseVbaProject(vbaBytes);

    expect(result.ok).toBe(true);
    if (!result.ok) {return;}

    // Extract dir stream info from parsed project
    const original: DirStreamInfo = {
      projectName: result.program.project.name,
      codePage: 1252, // Assume default
      modules: result.program.modules.map((m) => ({
        name: m.name,
        streamName: m.name, // Assume same as name
        type: m.type,
        textOffset: m.streamOffset,
      })),
      references: result.program.references.map((r) => ({
        name: r.name,
        libId: r.libId,
        type: r.type,
      })),
    };

    // Serialize and re-parse
    const serialized = serializeDirStream(original);
    const reparsed = parseDirStream(serialized);

    // Verify project name
    expect(reparsed.projectName).toBe(original.projectName);

    // Verify modules
    expect(reparsed.modules.length).toBe(original.modules.length);
    for (let i = 0; i < original.modules.length; i++) {
      expect(reparsed.modules[i].name).toBe(original.modules[i].name);
      expect(reparsed.modules[i].streamName).toBe(original.modules[i].streamName);
      expect(reparsed.modules[i].textOffset).toBe(original.modules[i].textOffset);
    }

    // Verify references
    expect(reparsed.references.length).toBe(original.references.length);
    for (let i = 0; i < original.references.length; i++) {
      expect(reparsed.references[i].name).toBe(original.references[i].name);
      expect(reparsed.references[i].type).toBe(original.references[i].type);
    }
  });

  it("handles empty module list", () => {
    const info = createDirStreamInfo({
      projectName: "EmptyProject",
      modules: [],
    });

    const serialized = serializeDirStream(info);
    const reparsed = parseDirStream(serialized);

    expect(reparsed.projectName).toBe("EmptyProject");
    expect(reparsed.modules.length).toBe(0);
  });

  it("handles different code pages", () => {
    // Japanese code page
    const info = createDirStreamInfo({
      projectName: "JapaneseProject",
      codePage: 932,
      modules: [
        { name: "Module1", streamName: "Module1", type: "standard", textOffset: 0 },
      ],
    });

    const serialized = serializeDirStream(info);
    const reparsed = parseDirStream(serialized);

    expect(reparsed.projectName).toBe("JapaneseProject");
    expect(reparsed.codePage).toBe(932);
  });

  it("round-trips ASCII project names correctly", () => {
    // ASCII characters work with any code page
    const info = createDirStreamInfo({
      projectName: "MyProject_123",
      codePage: 1252,
      modules: [
        { name: "Module_1", streamName: "Module_1", type: "standard", textOffset: 0 },
      ],
    });

    const serialized = serializeDirStream(info);
    const reparsed = parseDirStream(serialized);

    expect(reparsed.projectName).toBe("MyProject_123");
    expect(reparsed.modules[0].name).toBe("Module_1");
  });

  it("round-trips Japanese project name via Unicode", () => {
    // The serializer writes both MBCS and Unicode versions.
    // The parser now prefers Unicode, so Japanese characters round-trip correctly
    // regardless of the code page (as long as Unicode is present).
    const info = createDirStreamInfo({
      projectName: "テストプロジェクト",
      codePage: 932, // Japanese Shift_JIS
      modules: [
        { name: "モジュール1", streamName: "モジュール1", type: "standard", textOffset: 0 },
      ],
    });

    const serialized = serializeDirStream(info);
    const reparsed = parseDirStream(serialized);

    // Unicode is used for decoding, so Japanese characters round-trip correctly
    expect(reparsed.projectName).toBe("テストプロジェクト");
    expect(reparsed.modules[0].name).toBe("モジュール1");
    expect(reparsed.modules[0].streamName).toBe("モジュール1");
  });

  it("round-trips Chinese project name via Unicode", () => {
    // Test with Chinese characters (code page 936 = GBK)
    const info = createDirStreamInfo({
      projectName: "测试项目",
      codePage: 936,
      modules: [
        { name: "模块一", streamName: "模块一", type: "standard", textOffset: 0 },
      ],
    });

    const serialized = serializeDirStream(info);
    const reparsed = parseDirStream(serialized);

    expect(reparsed.projectName).toBe("测试项目");
    expect(reparsed.modules[0].name).toBe("模块一");
  });

  it("round-trips Korean project name via Unicode", () => {
    // Test with Korean characters (code page 949 = EUC-KR)
    const info = createDirStreamInfo({
      projectName: "테스트프로젝트",
      codePage: 949,
      modules: [
        { name: "모듈", streamName: "모듈", type: "standard", textOffset: 0 },
      ],
    });

    const serialized = serializeDirStream(info);
    const reparsed = parseDirStream(serialized);

    expect(reparsed.projectName).toBe("테스트프로젝트");
    expect(reparsed.modules[0].name).toBe("모듈");
  });

  it("round-trips mixed ASCII and Unicode characters", () => {
    // PROJECTNAME only has MBCS (no Unicode version in MS-OVBA spec),
    // so we must use UTF-8 (codePage 65001) for mixed/international characters.
    // Module names have MODULENAMEUNICODE and would work with any code page,
    // but for consistency we use UTF-8 for the entire project.
    const info = createDirStreamInfo({
      projectName: "Project_日本語_123",
      codePage: 65001, // UTF-8 for international character support
      modules: [
        { name: "Module_テスト", streamName: "Module_テスト", type: "standard", textOffset: 0 },
      ],
    });

    const serialized = serializeDirStream(info);
    const reparsed = parseDirStream(serialized);

    expect(reparsed.projectName).toBe("Project_日本語_123");
    expect(reparsed.modules[0].name).toBe("Module_テスト");
  });

  it("throws MbcsEncodingError for unsupported characters in code page", () => {
    // Japanese characters cannot be encoded in code page 1252 (Windows-1252)
    // This must throw, not silently replace with '?'
    const info = createDirStreamInfo({
      projectName: "日本語プロジェクト",
      codePage: 1252, // Windows-1252 doesn't support Japanese
      modules: [],
    });

    expect(() => serializeDirStream(info)).toThrow(MbcsEncodingError);
  });

  it("throws MbcsEncodingError for unsupported code page", () => {
    const info = createDirStreamInfo({
      projectName: "Test",
      codePage: 99999, // Invalid code page
      modules: [],
    });

    expect(() => serializeDirStream(info)).toThrow(MbcsEncodingError);
  });
});
