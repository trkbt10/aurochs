/**
 * @file VBA Program Factory
 *
 * Factory functions for creating new VBA programs.
 */

import type { VbaProgramIr, VbaModule } from "@aurochs-office/vba";

/**
 * Default source code for a new standard module.
 */
const DEFAULT_MODULE_SOURCE = `Option Explicit

Public Sub Main()
    ' Your code here
End Sub
`;

/**
 * Create a new empty VBA program with a single standard module.
 *
 * @param projectName - Name of the VBA project (default: "VBAProject")
 * @returns A new VbaProgramIr with one empty module
 *
 * @example
 * ```typescript
 * const program = createEmptyVbaProgram();
 * // program.modules[0].name === "Module1"
 * ```
 */
export function createEmptyVbaProgram(projectName = "VBAProject"): VbaProgramIr {
  const module: VbaModule = {
    name: "Module1",
    type: "standard",
    sourceCode: DEFAULT_MODULE_SOURCE,
    streamOffset: 0,
    procedures: [
      {
        name: "Main",
        type: "sub",
        visibility: "public",
        parameters: [],
        returnType: null,
      },
    ],
  };

  return {
    project: {
      name: projectName,
      helpFile: null,
      helpContext: 0,
      constants: null,
      version: { major: 1, minor: 0 },
    },
    modules: [module],
    references: [],
  };
}

/**
 * Create a new standard module.
 *
 * @param name - Module name
 * @param sourceCode - Optional initial source code
 * @returns A new VbaModule
 */
export function createStandardModule(
  name: string,
  sourceCode = DEFAULT_MODULE_SOURCE
): VbaModule {
  return {
    name,
    type: "standard",
    sourceCode,
    streamOffset: 0,
    procedures: [],
  };
}

/**
 * Add a module to an existing VBA program.
 *
 * @param program - Existing program
 * @param module - Module to add
 * @returns New program with the module added
 */
export function addModuleToProgram(
  program: VbaProgramIr,
  module: VbaModule
): VbaProgramIr {
  return {
    ...program,
    modules: [...program.modules, module],
  };
}
