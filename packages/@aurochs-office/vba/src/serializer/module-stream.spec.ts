/**
 * @file Module stream serializer tests
 */

import { readFileSync } from "node:fs";
import { loadZipPackage } from "@aurochs/zip";
import {
  serializeModuleStream,
  serializeModuleStreams,
  vbaModuleToInput,
} from "./module-stream";
import { decompressVba } from "../parser/compression";
import { parseVbaProject } from "../parser/vba-project";

const FIXTURE_DIR = "packages/@aurochs-office/vba/fixtures";
const XLSM_FIXTURE = `${FIXTURE_DIR}/SimpleMacro.xlsm`;

describe("serializeModuleStream", () => {
  it("serializes simple module", () => {
    const module = {
      name: "Module1",
      type: "standard" as const,
      sourceCode: "Sub Main()\nEnd Sub\n",
    };

    const result = serializeModuleStream(module);

    expect(result.name).toBe("Module1");
    expect(result.streamName).toBe("Module1");
    expect(result.type).toBe("standard");
    expect(result.textOffset).toBe(0);
    expect(result.bytes.length).toBeGreaterThan(0);
  });

  it("round-trips source code", () => {
    const sourceCode = `Sub HelloWorld()
    MsgBox "Hello, World!"
End Sub

Public Function Add(a As Integer, b As Integer) As Integer
    Add = a + b
End Function
`;
    const module = {
      name: "TestModule",
      type: "standard" as const,
      sourceCode,
    };

    const result = serializeModuleStream(module);

    // Decompress to verify
    const compressedData = result.bytes.subarray(result.textOffset);
    const decompressed = decompressVba(compressedData);
    const recoveredSource = new TextDecoder().decode(decompressed);

    expect(recoveredSource).toBe(sourceCode);
  });

  it("handles empty source code", () => {
    const module = {
      name: "EmptyModule",
      type: "standard" as const,
      sourceCode: "",
    };

    const result = serializeModuleStream(module);

    expect(result.bytes.length).toBeGreaterThan(0); // At least signature byte

    const compressedData = result.bytes.subarray(result.textOffset);
    const decompressed = decompressVba(compressedData);
    expect(decompressed.length).toBe(0);
  });

  it("handles class module type", () => {
    // Class modules require VB_Creatable/VB_Exposed attributes for parser recognition
    const classSource = `VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
END
Attribute VB_Name = "Class1"
Attribute VB_Creatable = False
Attribute VB_Exposed = False
Option Explicit
`;
    const module = {
      name: "Class1",
      type: "class" as const,
      sourceCode: classSource,
    };

    const result = serializeModuleStream(module);

    expect(result.type).toBe("class");
    expect(result.name).toBe("Class1");

    // Verify round-trip preserves source including class attributes
    const compressedData = result.bytes.subarray(result.textOffset);
    const decompressed = decompressVba(compressedData);
    const recoveredSource = new TextDecoder().decode(decompressed);
    expect(recoveredSource).toBe(classSource);
    expect(recoveredSource).toContain("VB_Creatable");
  });

  it("handles document module type", () => {
    const module = {
      name: "ThisWorkbook",
      type: "document" as const,
      sourceCode: "Private Sub Workbook_Open()\nEnd Sub\n",
    };

    const result = serializeModuleStream(module);

    expect(result.type).toBe("document");
  });

  it("handles form module type", () => {
    const module = {
      name: "UserForm1",
      type: "form" as const,
      sourceCode: "Private Sub UserForm_Click()\nEnd Sub\n",
    };

    const result = serializeModuleStream(module);

    expect(result.type).toBe("form");
  });

  it("handles large source code", () => {
    // Generate a large module with many procedures
    const sourceCode = Array.from({ length: 100 }, (_, i) =>
      `Sub Procedure${i}()\n    ' Comment line ${i}\n    Debug.Print "Procedure ${i}"\nEnd Sub\n\n`
    ).join("");

    const module = {
      name: "LargeModule",
      type: "standard" as const,
      sourceCode,
    };

    const result = serializeModuleStream(module);

    // Verify round-trip
    const compressedData = result.bytes.subarray(result.textOffset);
    const decompressed = decompressVba(compressedData);
    const recoveredSource = new TextDecoder().decode(decompressed);

    expect(recoveredSource).toBe(sourceCode);
  });

  it("handles source code with special characters", () => {
    const sourceCode = `Sub SpecialChars()
    ' Comment with special chars: @#$%^&*()
    Dim s As String
    s = "Hello" & Chr(10) & "World"
    s = """Quoted"""
End Sub
`;
    const module = {
      name: "SpecialModule",
      type: "standard" as const,
      sourceCode,
    };

    const result = serializeModuleStream(module);

    const compressedData = result.bytes.subarray(result.textOffset);
    const decompressed = decompressVba(compressedData);
    const recoveredSource = new TextDecoder().decode(decompressed);

    expect(recoveredSource).toBe(sourceCode);
  });
});

describe("serializeModuleStreams", () => {
  it("serializes multiple modules", () => {
    const modules = [
      { name: "Module1", type: "standard" as const, sourceCode: "Sub A(): End Sub" },
      { name: "Module2", type: "standard" as const, sourceCode: "Sub B(): End Sub" },
      { name: "Class1", type: "class" as const, sourceCode: "Option Explicit" },
    ];

    const results = serializeModuleStreams(modules);

    expect(results.length).toBe(3);
    expect(results[0].name).toBe("Module1");
    expect(results[1].name).toBe("Module2");
    expect(results[2].name).toBe("Class1");
  });

  it("handles empty module list", () => {
    const results = serializeModuleStreams([]);
    expect(results.length).toBe(0);
  });
});

describe("vbaModuleToInput", () => {
  it("converts VbaModule to SerializeModuleInput", () => {
    const vbaModule = {
      name: "TestModule",
      type: "standard" as const,
      sourceCode: "Sub Test(): End Sub",
      streamOffset: 123,
      procedures: [],
    };

    const input = vbaModuleToInput(vbaModule);

    expect(input.name).toBe("TestModule");
    expect(input.type).toBe("standard");
    expect(input.sourceCode).toBe("Sub Test(): End Sub");
  });
});

describe("module stream round-trip with fixture", () => {
  it("round-trips real VBA module source", async () => {
    const bytes = readFileSync(XLSM_FIXTURE);
    const pkg = await loadZipPackage(bytes);
    const vbaBytes = pkg.readBinary("xl/vbaProject.bin");
    if (!vbaBytes) {
      throw new Error("vbaProject.bin not found");
    }

    const result = parseVbaProject(new Uint8Array(vbaBytes));
    expect(result.ok).toBe(true);
    if (!result.ok) {return;}

    // Round-trip each module
    for (const module of result.program.modules) {
      const serialized = serializeModuleStream(vbaModuleToInput(module));

      // Decompress serialized data
      const compressedData = serialized.bytes.subarray(serialized.textOffset);
      const decompressed = decompressVba(compressedData);
      const recoveredSource = new TextDecoder().decode(decompressed);

      expect(recoveredSource).toBe(module.sourceCode);
    }
  });
});
