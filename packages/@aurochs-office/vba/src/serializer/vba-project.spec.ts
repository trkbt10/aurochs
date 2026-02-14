/**
 * @file VBA Project serializer tests
 */

import { readFileSync } from "node:fs";
import { loadZipPackage } from "@aurochs/zip";
import { openCfb } from "@aurochs-office/cfb";
import { serializeVbaProject } from "./vba-project";
import { parseVbaProject } from "../parser/vba-project";
import type { VbaProgramIr, VbaProjectInfo, VbaModule } from "../types";
import { FIXTURES } from "../test-utils/fixtures";

// Class module source code with required VB_Creatable attribute for parser recognition
const CLASS_MODULE_SOURCE = `VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
END
Attribute VB_Name = "ClassModule"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Option Explicit
Private mValue As Integer
`;

// UserForm source code with BEGIN block that identifies it as a form (designer module)
const FORM_MODULE_SOURCE = `VERSION 5.00
Begin {C62A69F0-16DC-11CE-9E98-00AA00574A4F} UserForm1
   Caption         =   "My Form"
   ClientHeight    =   3015
   ClientLeft      =   120
   ClientTop       =   450
   ClientWidth     =   4560
   StartUpPosition =   1  'CenterOwner
End
Attribute VB_Name = "UserForm1"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Private Sub CommandButton1_Click()
End Sub
`;

// Document module source code (ThisWorkbook) with VB_PredeclaredId = True and VB_Exposed = True
// This should remain as "document" type, NOT be reclassified as "class"
const DOCUMENT_MODULE_SOURCE = `Attribute VB_Name = "ThisWorkbook"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = True
Private Sub Workbook_Open()
    MsgBox "Hello"
End Sub
`;

function createMinimalProgram(): VbaProgramIr {
  const project: VbaProjectInfo = {
    name: "VBAProject",
    helpFile: null,
    helpContext: 0,
    constants: null,
    version: { major: 1, minor: 0 },
  };

  const modules: VbaModule[] = [
    {
      name: "Module1",
      type: "standard",
      sourceCode: "Sub Main()\n    MsgBox \"Hello\"\nEnd Sub\n",
      streamOffset: 0,
      procedures: [],
    },
  ];

  return {
    project,
    modules,
    references: [],
  };
}

describe("serializeVbaProject", () => {
  it("creates valid CFB container", () => {
    const program = createMinimalProgram();
    const bytes = serializeVbaProject(program);

    // Should be valid CFB
    expect(bytes.length).toBeGreaterThan(0);

    // Should have CFB signature
    const signature = Array.from(bytes.subarray(0, 8));
    expect(signature).toEqual([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

    // Should be readable as CFB
    const cfb = openCfb(bytes);
    expect(cfb).toBeDefined();
  });

  it("includes PROJECT stream", () => {
    const program = createMinimalProgram();
    const bytes = serializeVbaProject(program);

    const cfb = openCfb(bytes);
    const projectBytes = cfb.readStream(["PROJECT"]);

    expect(projectBytes.length).toBeGreaterThan(0);

    // Should be text format
    const text = new TextDecoder().decode(projectBytes);
    expect(text).toContain("ID=");
    expect(text).toContain('Name="VBAProject"');
  });

  it("includes VBA/dir stream", () => {
    const program = createMinimalProgram();
    const bytes = serializeVbaProject(program);

    const cfb = openCfb(bytes);
    const dirBytes = cfb.readStream(["VBA", "dir"]);

    expect(dirBytes.length).toBeGreaterThan(0);

    // Should start with compression signature
    expect(dirBytes[0]).toBe(0x01);
  });

  it("includes VBA/_VBA_PROJECT stream", () => {
    const program = createMinimalProgram();
    const bytes = serializeVbaProject(program);

    const cfb = openCfb(bytes);
    const vbaProjectBytes = cfb.readStream(["VBA", "_VBA_PROJECT"]);

    expect(vbaProjectBytes.length).toBeGreaterThan(0);

    // Should have correct magic number
    const view = new DataView(
      vbaProjectBytes.buffer,
      vbaProjectBytes.byteOffset,
      vbaProjectBytes.byteLength
    );
    expect(view.getUint16(0, true)).toBe(0x61cc);
  });

  it("includes module streams", () => {
    const program = createMinimalProgram();
    const bytes = serializeVbaProject(program);

    const cfb = openCfb(bytes);
    const moduleBytes = cfb.readStream(["VBA", "Module1"]);

    expect(moduleBytes.length).toBeGreaterThan(0);
  });

  it("round-trips minimal program", () => {
    const original = createMinimalProgram();
    const bytes = serializeVbaProject(original);

    // Parse back
    const result = parseVbaProject(bytes);
    expect(result.ok).toBe(true);
    if (!result.ok) {return;}

    // Project info
    expect(result.program.project.name).toBe(original.project.name);

    // Modules
    expect(result.program.modules.length).toBe(original.modules.length);
    expect(result.program.modules[0].name).toBe(original.modules[0].name);
    expect(result.program.modules[0].type).toBe(original.modules[0].type);
    expect(result.program.modules[0].sourceCode).toBe(original.modules[0].sourceCode);
  });

  it("round-trips multiple modules", () => {
    const project: VbaProjectInfo = {
      name: "MultiModule",
      helpFile: null,
      helpContext: 0,
      constants: null,
      version: { major: 1, minor: 0 },
    };

    const modules: VbaModule[] = [
      {
        name: "Module1",
        type: "standard",
        sourceCode: "Sub Procedure1()\nEnd Sub\n",
        streamOffset: 0,
        procedures: [],
      },
      {
        name: "Module2",
        type: "standard",
        sourceCode: "Sub Procedure2()\nEnd Sub\n",
        streamOffset: 0,
        procedures: [],
      },
      {
        name: "ClassModule",
        type: "class",
        sourceCode: CLASS_MODULE_SOURCE,
        streamOffset: 0,
        procedures: [],
      },
    ];

    const original: VbaProgramIr = { project, modules, references: [] };
    const bytes = serializeVbaProject(original);

    const result = parseVbaProject(bytes);
    expect(result.ok).toBe(true);
    if (!result.ok) {return;}

    expect(result.program.modules.length).toBe(3);

    // Verify each module including type
    for (const origModule of original.modules) {
      const found = result.program.modules.find((m) => m.name === origModule.name);
      expect(found).toBeDefined();
      if (found) {
        expect(found.sourceCode).toBe(origModule.sourceCode);
        expect(found.type).toBe(origModule.type);
      }
    }
  });

  it("round-trips document module with VB_Exposed attribute", () => {
    // Document modules (ThisWorkbook, Sheet1) have VB_Exposed = True
    // but should NOT be reclassified as "class" - VB_PredeclaredId = True
    // distinguishes them from class modules
    const project: VbaProjectInfo = {
      name: "DocModule",
      helpFile: null,
      helpContext: 0,
      constants: null,
      version: { major: 1, minor: 0 },
    };

    const modules: VbaModule[] = [
      {
        name: "ThisWorkbook",
        type: "document",
        sourceCode: DOCUMENT_MODULE_SOURCE,
        streamOffset: 0,
        procedures: [],
      },
    ];

    const original: VbaProgramIr = { project, modules, references: [] };
    const bytes = serializeVbaProject(original);

    const result = parseVbaProject(bytes);
    expect(result.ok).toBe(true);
    if (!result.ok) { return; }

    expect(result.program.modules.length).toBe(1);
    expect(result.program.modules[0].name).toBe("ThisWorkbook");
    // Critical: must remain "document" despite having VB_Exposed = True
    expect(result.program.modules[0].type).toBe("document");
    expect(result.program.modules[0].sourceCode).toBe(DOCUMENT_MODULE_SOURCE);
  });

  it("round-trips with references", () => {
    const project: VbaProjectInfo = {
      name: "RefProject",
      helpFile: null,
      helpContext: 0,
      constants: null,
      version: { major: 1, minor: 0 },
    };

    const modules: VbaModule[] = [
      {
        name: "Module1",
        type: "standard",
        sourceCode: "Sub Test()\nEnd Sub\n",
        streamOffset: 0,
        procedures: [],
      },
    ];

    const original: VbaProgramIr = {
      project,
      modules,
      references: [
        {
          name: "stdole",
          libId: "*\\G{00020430-0000-0000-C000-000000000046}#2.0#0#stdole2.tlb",
          type: "registered",
        },
      ],
    };

    const bytes = serializeVbaProject(original);

    const result = parseVbaProject(bytes);
    expect(result.ok).toBe(true);
    if (!result.ok) {return;}

    expect(result.program.references.length).toBe(1);
    expect(result.program.references[0].name).toBe("stdole");
    expect(result.program.references[0].type).toBe("registered");
  });

  it("handles large source code", () => {
    const largeSource = Array.from({ length: 50 }, (_, i) =>
      `Sub Procedure${i}()\n    ' Line 1\n    ' Line 2\n    Debug.Print "Test"\nEnd Sub\n\n`
    ).join("");

    const project: VbaProjectInfo = {
      name: "LargeProject",
      helpFile: null,
      helpContext: 0,
      constants: null,
      version: { major: 1, minor: 0 },
    };

    const modules: VbaModule[] = [
      {
        name: "LargeModule",
        type: "standard",
        sourceCode: largeSource,
        streamOffset: 0,
        procedures: [],
      },
    ];

    const original: VbaProgramIr = { project, modules, references: [] };
    const bytes = serializeVbaProject(original);

    const result = parseVbaProject(bytes);
    expect(result.ok).toBe(true);
    if (!result.ok) {return;}

    expect(result.program.modules[0].sourceCode).toBe(largeSource);
  });

  it("handles empty module list", () => {
    const project: VbaProjectInfo = {
      name: "EmptyProject",
      helpFile: null,
      helpContext: 0,
      constants: null,
      version: { major: 1, minor: 0 },
    };

    const original: VbaProgramIr = { project, modules: [], references: [] };
    const bytes = serializeVbaProject(original);

    const result = parseVbaProject(bytes);
    expect(result.ok).toBe(true);
    if (!result.ok) {return;}

    expect(result.program.modules.length).toBe(0);
  });

  it("round-trips class module type correctly", () => {
    // Class modules require VB_Creatable/VB_Exposed attributes in source code
    // for the parser to identify them as class type
    const project: VbaProjectInfo = {
      name: "ClassProject",
      helpFile: null,
      helpContext: 0,
      constants: null,
      version: { major: 1, minor: 0 },
    };

    const modules: VbaModule[] = [
      {
        name: "MyClass",
        type: "class",
        sourceCode: CLASS_MODULE_SOURCE,
        streamOffset: 0,
        procedures: [],
      },
    ];

    const original: VbaProgramIr = { project, modules, references: [] };
    const bytes = serializeVbaProject(original);

    const result = parseVbaProject(bytes);
    expect(result.ok).toBe(true);
    if (!result.ok) { return; }

    expect(result.program.modules.length).toBe(1);
    expect(result.program.modules[0].name).toBe("MyClass");
    expect(result.program.modules[0].type).toBe("class");
    expect(result.program.modules[0].sourceCode).toBe(CLASS_MODULE_SOURCE);
  });

  it("round-trips form module type correctly", () => {
    // UserForm modules have BEGIN block that identifies them as designer modules
    const project: VbaProjectInfo = {
      name: "FormProject",
      helpFile: null,
      helpContext: 0,
      constants: null,
      version: { major: 1, minor: 0 },
    };

    const modules: VbaModule[] = [
      {
        name: "UserForm1",
        type: "form",
        sourceCode: FORM_MODULE_SOURCE,
        streamOffset: 0,
        procedures: [],
      },
    ];

    const original: VbaProgramIr = { project, modules, references: [] };
    const bytes = serializeVbaProject(original);

    const result = parseVbaProject(bytes);
    expect(result.ok).toBe(true);
    if (!result.ok) { return; }

    expect(result.program.modules.length).toBe(1);
    expect(result.program.modules[0].name).toBe("UserForm1");
    expect(result.program.modules[0].type).toBe("form");
    expect(result.program.modules[0].sourceCode).toBe(FORM_MODULE_SOURCE);
  });
});

describe("VBA Project end-to-end round-trip", () => {
  it("round-trips real VBA project from fixture", async () => {
    const fileBytes = readFileSync(FIXTURES.SIMPLE_MACRO_XLSM);
    const pkg = await loadZipPackage(fileBytes);
    const vbaBytes = pkg.readBinary("xl/vbaProject.bin");
    if (!vbaBytes) {
      throw new Error("vbaProject.bin not found");
    }

    // Parse original
    const parseResult = parseVbaProject(new Uint8Array(vbaBytes));
    expect(parseResult.ok).toBe(true);
    if (!parseResult.ok) {return;}

    const original = parseResult.program;

    // Serialize
    const serialized = serializeVbaProject(original);

    // Parse serialized
    const reparsed = parseVbaProject(serialized);
    expect(reparsed.ok).toBe(true);
    if (!reparsed.ok) {return;}

    // Compare
    expect(reparsed.program.project.name).toBe(original.project.name);
    expect(reparsed.program.modules.length).toBe(original.modules.length);

    // Compare each module's source code
    for (const origModule of original.modules) {
      const found = reparsed.program.modules.find((m) => m.name === origModule.name);
      expect(found).toBeDefined();
      if (found) {
        expect(found.sourceCode).toBe(origModule.sourceCode);
        expect(found.type).toBe(origModule.type);
      }
    }
  });

  it("allows modification before re-serialization", async () => {
    const fileBytes = readFileSync(FIXTURES.SIMPLE_MACRO_XLSM);
    const pkg = await loadZipPackage(fileBytes);
    const vbaBytes = pkg.readBinary("xl/vbaProject.bin");
    if (!vbaBytes) {
      throw new Error("vbaProject.bin not found");
    }

    // Parse original
    const parseResult = parseVbaProject(new Uint8Array(vbaBytes));
    expect(parseResult.ok).toBe(true);
    if (!parseResult.ok) {return;}

    // Modify: add a comment to first module's source
    const modifyFirstModule = (m: VbaModule, i: number): VbaModule =>
      i === 0 ? { ...m, sourceCode: "' Modified by test\n" + m.sourceCode } : m;
    const modified: VbaProgramIr = {
      ...parseResult.program,
      modules: parseResult.program.modules.map(modifyFirstModule),
    };

    // Serialize modified
    const serialized = serializeVbaProject(modified);

    // Parse serialized
    const reparsed = parseVbaProject(serialized);
    expect(reparsed.ok).toBe(true);
    if (!reparsed.ok) {return;}

    // Verify modification persisted
    expect(reparsed.program.modules[0].sourceCode).toContain("Modified by test");
    expect(reparsed.program.modules[0].sourceCode).toContain(
      parseResult.program.modules[0].sourceCode
    );
  });
});
