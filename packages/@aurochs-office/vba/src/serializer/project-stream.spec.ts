/**
 * @file PROJECT stream serializer tests
 */

import { readFileSync } from "node:fs";
import { loadZipPackage } from "@aurochs/zip";
import { serializeProjectStream } from "./project-stream";
import { parseProjectStream } from "../parser/project-stream";
import { parseVbaProject } from "../parser/vba-project";
import { FIXTURES } from "../test-utils/fixtures";

describe("serializeProjectStream", () => {
  it("serializes minimal project", () => {
    const project = {
      name: "VBAProject",
      helpFile: null,
      helpContext: 0,
      constants: null,
      version: { major: 1, minor: 0 },
    };

    const bytes = serializeProjectStream(project, []);
    const text = new TextDecoder().decode(bytes);

    expect(text).toContain("ID=");
    expect(text).toContain('Name="VBAProject"');
    expect(text).toContain("HelpContext=0");
  });

  it("round-trips project info", () => {
    const project = {
      name: "TestProject",
      helpFile: null,
      helpContext: 42,
      constants: null,
      version: { major: 2, minor: 5 },
    };

    const bytes = serializeProjectStream(project, []);
    const parsed = parseProjectStream(bytes);

    expect(parsed.name).toBe("TestProject");
    expect(parsed.helpContext).toBe(42);
  });

  it("round-trips conditional compilation constants", () => {
    const project = {
      name: "ConstantsTest",
      helpFile: null,
      helpContext: 0,
      constants: "DEBUG = 1 : RELEASE = 0",
      version: { major: 1, minor: 0 },
    };

    const bytes = serializeProjectStream(project, []);
    const text = new TextDecoder().decode(bytes);

    // Verify constants are serialized
    expect(text).toContain('Constants="DEBUG = 1 : RELEASE = 0"');

    // Verify round-trip preserves constants
    const parsed = parseProjectStream(bytes);
    expect(parsed.constants).toBe("DEBUG = 1 : RELEASE = 0");
  });

  it("omits Constants field when null", () => {
    const project = {
      name: "NoConstantsTest",
      helpFile: null,
      helpContext: 0,
      constants: null,
      version: { major: 1, minor: 0 },
    };

    const bytes = serializeProjectStream(project, []);
    const text = new TextDecoder().decode(bytes);

    // Should not contain Constants= line
    expect(text).not.toContain("Constants=");
  });

  it("includes standard module entries", () => {
    const project = {
      name: "ModuleTest",
      helpFile: null,
      helpContext: 0,
      constants: null,
      version: { major: 1, minor: 0 },
    };

    const modules = [
      { name: "Module1", type: "standard" as const },
      { name: "Module2", type: "standard" as const },
    ];

    const bytes = serializeProjectStream(project, modules);
    const text = new TextDecoder().decode(bytes);

    expect(text).toContain("Module=Module1");
    expect(text).toContain("Module=Module2");
  });

  it("includes class module entries", () => {
    const project = {
      name: "ClassTest",
      helpFile: null,
      helpContext: 0,
      constants: null,
      version: { major: 1, minor: 0 },
    };

    const modules = [{ name: "Class1", type: "class" as const }];

    const bytes = serializeProjectStream(project, modules);
    const text = new TextDecoder().decode(bytes);

    expect(text).toContain("Class=Class1");
  });

  it("includes document module entries", () => {
    const project = {
      name: "DocTest",
      helpFile: null,
      helpContext: 0,
      constants: null,
      version: { major: 1, minor: 0 },
    };

    const modules = [{ name: "ThisWorkbook", type: "document" as const }];

    const bytes = serializeProjectStream(project, modules);
    const text = new TextDecoder().decode(bytes);

    expect(text).toContain("Document=ThisWorkbook/&H00000000");
  });

  it("includes form module entries", () => {
    const project = {
      name: "FormTest",
      helpFile: null,
      helpContext: 0,
      constants: null,
      version: { major: 1, minor: 0 },
    };

    const modules = [{ name: "UserForm1", type: "form" as const }];

    const bytes = serializeProjectStream(project, modules);
    const text = new TextDecoder().decode(bytes);

    expect(text).toContain("BaseClass=UserForm1");
  });

  it("includes mixed module types", () => {
    const project = {
      name: "MixedTest",
      helpFile: null,
      helpContext: 0,
      constants: null,
      version: { major: 1, minor: 0 },
    };

    const modules = [
      { name: "Module1", type: "standard" as const },
      { name: "Class1", type: "class" as const },
      { name: "ThisWorkbook", type: "document" as const },
      { name: "UserForm1", type: "form" as const },
    ];

    const bytes = serializeProjectStream(project, modules);
    const text = new TextDecoder().decode(bytes);

    expect(text).toContain("Module=Module1");
    expect(text).toContain("Class=Class1");
    expect(text).toContain("Document=ThisWorkbook/&H00000000");
    expect(text).toContain("BaseClass=UserForm1");
  });

  it("includes Host Extender Info section", () => {
    const project = {
      name: "TestProject",
      helpFile: null,
      helpContext: 0,
      constants: null,
      version: { major: 1, minor: 0 },
    };

    const bytes = serializeProjectStream(project, []);
    const text = new TextDecoder().decode(bytes);

    expect(text).toContain("[Host Extender Info]");
    expect(text).toContain("&H00000001=");
  });

  it("includes Workspace section", () => {
    const project = {
      name: "WorkspaceTest",
      helpFile: null,
      helpContext: 0,
      constants: null,
      version: { major: 1, minor: 0 },
    };

    const modules = [
      { name: "Module1", type: "standard" as const },
      { name: "Module2", type: "standard" as const },
    ];

    const bytes = serializeProjectStream(project, modules);
    const text = new TextDecoder().decode(bytes);

    expect(text).toContain("[Workspace]");
    expect(text).toContain("Module1=0, 0, 0, 0, C");
    expect(text).toContain("Module2=0, 0, 0, 0, C");
  });

  it("uses CRLF line endings", () => {
    const project = {
      name: "TestProject",
      helpFile: null,
      helpContext: 0,
      constants: null,
      version: { major: 1, minor: 0 },
    };

    const bytes = serializeProjectStream(project, []);
    const text = new TextDecoder().decode(bytes);

    // Should contain CRLF
    expect(text).toContain("\r\n");

    // Should not have standalone LF without CR
    const lines = text.split("\r\n");
    for (const line of lines) {
      expect(line).not.toContain("\n");
    }
  });

  it("generates valid GUID format", () => {
    const project = {
      name: "TestProject",
      helpFile: null,
      helpContext: 0,
      constants: null,
      version: { major: 1, minor: 0 },
    };

    const bytes = serializeProjectStream(project, []);
    const text = new TextDecoder().decode(bytes);

    // Extract GUID from ID="..."
    const match = text.match(/ID="\{([0-9A-F-]+)\}"/);
    expect(match).not.toBeNull();

    if (match) {
      const guid = match[1];
      // GUID format: 8-4-4-4-12 hex chars
      expect(guid).toMatch(/^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/);
    }
  });

  it("handles help file path", () => {
    const project = {
      name: "HelpTest",
      helpFile: "C:\\Help\\MyHelp.chm",
      helpContext: 100,
      constants: null,
      version: { major: 1, minor: 0 },
    };

    const bytes = serializeProjectStream(project, []);
    const text = new TextDecoder().decode(bytes);

    expect(text).toContain('HelpFile="C:\\Help\\MyHelp.chm"');
    expect(text).toContain("HelpContext=100");
  });
});

describe("PROJECT stream round-trip with fixture", () => {
  it("round-trips real VBA project info", async () => {
    const fileBytes = readFileSync(FIXTURES.SIMPLE_MACRO_XLSM);
    const pkg = await loadZipPackage(fileBytes);
    const vbaBytes = pkg.readBinary("xl/vbaProject.bin");
    if (!vbaBytes) {
      throw new Error("vbaProject.bin not found");
    }

    const result = parseVbaProject(new Uint8Array(vbaBytes));
    expect(result.ok).toBe(true);
    if (!result.ok) {return;}

    const project = result.program.project;
    const modules = result.program.modules.map((m) => ({
      name: m.name,
      type: m.type,
    }));

    // Serialize and re-parse
    const serialized = serializeProjectStream(project, modules);
    const reparsed = parseProjectStream(serialized);

    // Core fields should match
    expect(reparsed.name).toBe(project.name);
    expect(reparsed.helpContext).toBe(project.helpContext);
  });
});
