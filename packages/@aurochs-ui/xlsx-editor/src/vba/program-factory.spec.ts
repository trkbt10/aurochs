/**
 * @file VBA Program Factory Tests
 */

import { describe, it, expect } from "vitest";
import {
  createEmptyVbaProgram,
  createStandardModule,
  addModuleToProgram,
} from "./program-factory";

describe("createEmptyVbaProgram", () => {
  it("creates a program with default project name", () => {
    const program = createEmptyVbaProgram();

    expect(program.project.name).toBe("VBAProject");
    expect(program.modules).toHaveLength(1);
    expect(program.references).toHaveLength(0);
  });

  it("creates a program with custom project name", () => {
    const program = createEmptyVbaProgram("MyProject");

    expect(program.project.name).toBe("MyProject");
  });

  it("creates a default module named Module1", () => {
    const program = createEmptyVbaProgram();
    const module = program.modules[0];

    expect(module.name).toBe("Module1");
    expect(module.type).toBe("standard");
    expect(module.sourceCode).toContain("Public Sub Main()");
  });

  it("creates a module with a Main procedure", () => {
    const program = createEmptyVbaProgram();
    const module = program.modules[0];

    expect(module.procedures).toHaveLength(1);
    expect(module.procedures[0].name).toBe("Main");
    expect(module.procedures[0].type).toBe("sub");
    expect(module.procedures[0].visibility).toBe("public");
  });

  it("sets default project version to 1.0", () => {
    const program = createEmptyVbaProgram();

    expect(program.project.version.major).toBe(1);
    expect(program.project.version.minor).toBe(0);
  });
});

describe("createStandardModule", () => {
  it("creates a module with given name", () => {
    const module = createStandardModule("MyModule");

    expect(module.name).toBe("MyModule");
    expect(module.type).toBe("standard");
  });

  it("creates a module with default source code", () => {
    const module = createStandardModule("Module2");

    expect(module.sourceCode).toContain("Option Explicit");
    expect(module.sourceCode).toContain("Public Sub Main()");
  });

  it("creates a module with custom source code", () => {
    const customCode = "Public Sub CustomSub()\nEnd Sub";
    const module = createStandardModule("Module2", customCode);

    expect(module.sourceCode).toBe(customCode);
  });
});

describe("addModuleToProgram", () => {
  it("adds a module to existing program", () => {
    const program = createEmptyVbaProgram();
    const newModule = createStandardModule("Module2");

    const updated = addModuleToProgram(program, newModule);

    expect(updated.modules).toHaveLength(2);
    expect(updated.modules[1].name).toBe("Module2");
  });

  it("does not mutate the original program", () => {
    const program = createEmptyVbaProgram();
    const newModule = createStandardModule("Module2");

    addModuleToProgram(program, newModule);

    expect(program.modules).toHaveLength(1);
  });

  it("preserves original modules", () => {
    const program = createEmptyVbaProgram();
    const newModule = createStandardModule("Module2");

    const updated = addModuleToProgram(program, newModule);

    expect(updated.modules[0].name).toBe("Module1");
  });
});
