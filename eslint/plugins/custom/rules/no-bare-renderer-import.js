/**
 * @file Custom rule: prohibit bare @aurochs-renderer/* imports for reorganized packages.
 *
 * Packages that have been reorganized into sub-path exports (e.g., /react, /svg, /ascii)
 * should not be imported via their bare package name.
 *
 * Disallows:
 *   import { Foo } from '@aurochs-renderer/drawing-ml'
 *   import { Bar } from '@aurochs-renderer/chart'
 *
 * Allowed:
 *   import { Foo } from '@aurochs-renderer/drawing-ml/react'
 *   import { Bar } from '@aurochs-renderer/chart/svg'
 *   import { baz } from '@aurochs-renderer/chart/ascii'
 */

/** Packages that must not be imported via bare path */
const RESTRICTED_PACKAGES = new Set(["@aurochs-renderer/drawing-ml", "@aurochs-renderer/chart"]);

/** Human-readable sub-paths per package */
const SUB_PATHS = {
  "@aurochs-renderer/drawing-ml": "/react or /ascii",
  "@aurochs-renderer/chart": "/svg or /ascii",
};

export default {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow bare @aurochs-renderer/* imports for reorganized packages; use explicit sub-path imports",
      recommended: true,
    },
    schema: [],
    messages: {
      noBareImport: "Bare '{{source}}' import is not allowed. " + "Use '{{source}}/{{subPaths}}' instead.",
    },
  },

  create(context) {
    function checkImport(node) {
      const source = node.source?.value;
      if (!source || !RESTRICTED_PACKAGES.has(source)) return;

      const subPaths = SUB_PATHS[source] ?? "<sub-path>";
      context.report({
        node: node.source,
        messageId: "noBareImport",
        data: { source, subPaths },
      });
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
