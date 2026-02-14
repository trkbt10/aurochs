/**
 * @file VBA Module Factory
 *
 * Factory functions for creating new VBA modules.
 */

import type { VbaModule, VbaModuleType } from "@aurochs-office/vba";

/**
 * Default source code for a new standard module.
 */
const DEFAULT_STANDARD_SOURCE = `Option Explicit

Public Sub Main()
    ' Your code here
End Sub
`;

/**
 * Default source code for a new class module.
 */
const DEFAULT_CLASS_SOURCE = `Option Explicit

' Class module
`;

/**
 * Default source code for a new UserForm module.
 */
const DEFAULT_FORM_SOURCE = `Option Explicit

' UserForm module
`;

/**
 * Get default source code for a module type.
 */
function getDefaultSource(type: VbaModuleType): string {
  switch (type) {
    case "standard":
      return DEFAULT_STANDARD_SOURCE;
    case "class":
      return DEFAULT_CLASS_SOURCE;
    case "form":
      return DEFAULT_FORM_SOURCE;
    case "document":
      return "";
  }
}

/**
 * Create a new VBA module.
 *
 * @param name - Module name
 * @param type - Module type
 * @param sourceCode - Optional initial source code (uses default if not provided)
 */
export function createModule(
  name: string,
  type: VbaModuleType,
  sourceCode?: string
): VbaModule {
  return {
    name,
    type,
    sourceCode: sourceCode ?? getDefaultSource(type),
    streamOffset: 0,
    procedures: [],
  };
}

/**
 * Create a new standard module.
 */
export function createStandardModule(
  name: string,
  sourceCode?: string
): VbaModule {
  return createModule(name, "standard", sourceCode);
}

/**
 * Create a new class module.
 */
export function createClassModule(
  name: string,
  sourceCode?: string
): VbaModule {
  return createModule(name, "class", sourceCode);
}

/**
 * Create a new UserForm module.
 */
export function createFormModule(
  name: string,
  sourceCode?: string
): VbaModule {
  return createModule(name, "form", sourceCode);
}

/**
 * Generate a unique module name.
 *
 * @param prefix - Name prefix (e.g., "Module", "Class")
 * @param existingNames - List of existing module names
 * @returns A unique name like "Module1", "Module2", etc.
 */
export function generateUniqueModuleName(
  prefix: string,
  existingNames: readonly string[]
): string {
  let index = 1;
  let name = `${prefix}${index}`;
  while (existingNames.includes(name)) {
    index++;
    name = `${prefix}${index}`;
  }
  return name;
}

/**
 * Get default name prefix for a module type.
 */
export function getModuleNamePrefix(type: VbaModuleType): string {
  switch (type) {
    case "standard":
      return "Module";
    case "class":
      return "Class";
    case "form":
      return "UserForm";
    case "document":
      return "Document";
  }
}
