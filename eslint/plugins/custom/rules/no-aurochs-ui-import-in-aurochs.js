/**
 * @file Custom rule: prohibit @aurochs-ui/* imports within @aurochs/* packages.
 *
 * Core packages (@aurochs/*) should not depend on UI packages (@aurochs-ui/*).
 * This maintains a clean architecture where UI depends on core, not vice versa.
 *
 * Disallows:
 *   import { Foo } from '@aurochs-ui/components'  // within @aurochs/* package
 *   import * as UI from '@aurochs-ui/editor'
 *
 * Allowed:
 *   import { Foo } from '@aurochs-ui/components'  // within @aurochs-ui/* or other packages
 *   import { Bar } from '@aurochs/core'           // @aurochs/* importing other @aurochs/*
 */

/**
 * Check if the file is within @aurochs/* package (excluding @aurochs-ui/*)
 * @param {string} filename - The file path
 * @returns {boolean}
 */
function isInaurochsPackage(filename) {
  if (!filename) return false;
  // Match packages/@aurochs/ but not packages/@aurochs-ui/
  return filename.includes("packages/@aurochs/") || filename.includes("packages\\@aurochs\\");
}

/**
 * Check if import source is from @aurochs-ui/*
 * @param {string} source - The import source path
 * @returns {boolean}
 */
function isaurochsUiImport(source) {
  if (!source || typeof source !== "string") return false;
  return source.startsWith("@aurochs-ui/");
}

export default {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow @aurochs-ui/* imports within @aurochs/* packages to maintain clean architecture",
      recommended: true,
    },
    schema: [],
    messages: {
      noaurochsUiImport:
        "@aurochs/* packages cannot import from @aurochs-ui/*. " +
        "Core packages should not depend on UI packages. " +
        "Import source: '{{source}}'",
    },
  },

  create(context) {
    const filename = context.filename || context.getFilename();

    // Only apply this rule within @aurochs/* packages
    if (!isInaurochsPackage(filename)) {
      return {};
    }

    function checkImport(node) {
      const source = node.source?.value;
      if (!source) return;

      if (isaurochsUiImport(source)) {
        context.report({
          node: node.source,
          messageId: "noaurochsUiImport",
          data: {
            source,
          },
        });
      }
    }

    return {
      ImportDeclaration: checkImport,
      ExportAllDeclaration: checkImport,
      ExportNamedDeclaration(node) {
        if (node.source) {
          checkImport(node);
        }
      },
    };
  },
};
