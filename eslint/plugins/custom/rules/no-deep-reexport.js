/**
 * @file Custom rule: prohibit re-exports that cross multiple directory levels.
 *
 * Disallows patterns like:
 *   export * from '../../something'
 *   export { foo } from '../../../bar'
 *
 * These "deep re-exports" that cross multiple layers violate module boundaries
 * and make the codebase harder to understand and refactor.
 *
 * Allowed:
 *   export * from './local'           // same directory
 *   export { foo } from '../sibling'  // one level up is OK by default
 *
 * Configurable threshold via options.maxParentDepth (default: 1)
 */

/**
 * Count how many parent directory traversals (..) are in a path
 * @param {string} path - The import/export path
 * @returns {number} - Number of parent traversals
 */
function countParentTraversals(path) {
  if (!path || typeof path !== "string") return 0;
  if (!path.startsWith(".")) return 0; // not a relative path

  const parts = path.split("/");
  let count = 0;
  for (const part of parts) {
    if (part === "..") {
      count++;
    } else if (part !== ".") {
      break; // stop counting after non-.. part
    }
  }
  return count;
}

/**
 * Check if this is a re-export (export from) statement
 * @param {object} node - AST node
 * @returns {boolean}
 */
function isReexport(node) {
  // ExportAllDeclaration: export * from '...'
  // ExportNamedDeclaration with source: export { x } from '...'
  return node.source != null;
}

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow re-exports (export from) that traverse multiple parent directories",
      recommended: true,
    },
    schema: [
      {
        type: "object",
        properties: {
          maxParentDepth: {
            type: "integer",
            minimum: 0,
            default: 1,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      deepReexport:
        "Re-export crosses {{depth}} parent directories (max allowed: {{max}}). " +
        "Deep re-exports violate module boundaries. Consider importing and re-exporting from a closer module, " +
        "or restructure the module hierarchy.",
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const maxParentDepth = options.maxParentDepth ?? 1;

    function checkExport(node) {
      if (!isReexport(node)) return;

      const sourcePath = node.source?.value;
      if (!sourcePath) return;

      const depth = countParentTraversals(sourcePath);

      if (depth > maxParentDepth) {
        context.report({
          node: node.source,
          messageId: "deepReexport",
          data: {
            depth: String(depth),
            max: String(maxParentDepth),
          },
        });
      }
    }

    return {
      ExportAllDeclaration: checkExport,
      ExportNamedDeclaration: checkExport,
    };
  },
};
