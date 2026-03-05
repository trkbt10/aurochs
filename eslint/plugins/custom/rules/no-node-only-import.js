/**
 * @file no-node-only-import
 *
 * Prohibits importing Node.js-only packages (like pngjs) except in .node.ts files.
 * This prevents accidentally bundling Node.js dependencies in browser code.
 */

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow importing Node.js-only packages in browser code",
      category: "Best Practices",
    },
    schema: [
      {
        type: "object",
        properties: {
          packages: {
            type: "array",
            items: { type: "string" },
            description: "List of Node.js-only package names to restrict",
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noNodeOnlyImport:
        "Import of Node.js-only package '{{packageName}}' is not allowed in browser code. Use a .node.ts file for Node.js-specific code.",
    },
  },
  create(context) {
    const options = context.options[0] || {};
    const nodeOnlyPackages = new Set(options.packages || ["pngjs"]);

    /**
     * Check if the current file is a Node.js-specific file
     * @param {string} filename
     * @returns {boolean}
     */
    function isNodeSpecificFile(filename) {
      // .node.ts files are explicitly Node.js only
      if (filename.endsWith(".node.ts") || filename.endsWith(".node.js")) {
        return true;
      }
      // Test files run in Node.js via vitest
      if (filename.endsWith(".spec.ts") || filename.endsWith(".spec.tsx")) {
        return true;
      }
      // Scripts in spec/ directories are Node.js tools
      if (filename.includes("/spec/") || filename.includes("/scripts/")) {
        return true;
      }
      return false;
    }

    /**
     * Check if an import source is a Node.js-only package
     * @param {string} source
     * @returns {string | null} The package name if it's a Node.js-only package, null otherwise
     */
    function getNodeOnlyPackage(source) {
      // Check direct package name
      if (nodeOnlyPackages.has(source)) {
        return source;
      }
      // Check scoped or subpath imports (e.g., "pngjs/lib/foo")
      const packageName = source.split("/")[0];
      if (nodeOnlyPackages.has(packageName)) {
        return packageName;
      }
      return null;
    }

    return {
      ImportDeclaration(node) {
        const filename = context.filename || context.getFilename();
        if (isNodeSpecificFile(filename)) {
          return;
        }

        const source = node.source.value;
        if (typeof source !== "string") {
          return;
        }

        const packageName = getNodeOnlyPackage(source);
        if (packageName) {
          context.report({
            node,
            messageId: "noNodeOnlyImport",
            data: { packageName },
          });
        }
      },
      CallExpression(node) {
        // Check require() calls
        if (
          node.callee.type !== "Identifier" ||
          node.callee.name !== "require"
        ) {
          return;
        }

        const filename = context.filename || context.getFilename();
        if (isNodeSpecificFile(filename)) {
          return;
        }

        const arg = node.arguments[0];
        if (!arg || arg.type !== "Literal" || typeof arg.value !== "string") {
          return;
        }

        const packageName = getNodeOnlyPackage(arg.value);
        if (packageName) {
          context.report({
            node,
            messageId: "noNodeOnlyImport",
            data: { packageName },
          });
        }
      },
    };
  },
};
