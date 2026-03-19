/**
 * @file Custom rule: prohibit re-exporting from other packages.
 *
 * Packages should not re-export symbols from other packages.
 * Each package should expose only its own implementation.
 *
 * Disallows:
 *   export * from '@aurochs/core'
 *   export { Foo } from '@aurochs-ui/components'
 *   import { Bar } from '@aurochs/utils'; export { Bar }
 *   import { Bar as Baz } from '@aurochs/utils'; export const Bar = Baz;
 *   import { fn } from '@aurochs/utils'; export function wrapper(x) { return fn(x); }
 *   import { fn } from '@aurochs/utils'; export const wrapper = (x) => fn(x);
 *
 * Allowed:
 *   export * from './local'        // re-export from same package
 *   export { foo } from '../utils' // relative re-export within same package
 *   import { Bar } from '@aurochs/utils'; const transformed = transform(Bar); export { transformed }
 */

/**
 * Check if a source is an external package import (starts with @)
 * @param {string} source - The import/export source path
 * @returns {boolean}
 */
function isPackageImport(source) {
  if (!source || typeof source !== "string") return false;
  // Matches @scope/package-name patterns
  return source.startsWith("@");
}

export default {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow re-exporting symbols from other packages to maintain clear package boundaries",
      recommended: true,
    },
    schema: [],
    messages: {
      noPackageReexport:
        "Re-exporting from another package is not allowed. " +
        "Each package should expose only its own implementation. " +
        "Source: '{{source}}'",
      noIndirectPackageReexport:
        "Re-exporting '{{name}}' that was imported from package '{{source}}' is not allowed. " +
        "Each package should expose only its own implementation.",
      noAliasReexport:
        "Exporting '{{exported}}' as an alias for '{{imported}}' from package '{{source}}' is not allowed. " +
        "This is an indirect re-export that bypasses lint rules.",
      noWrapperReexport:
        "Exported function '{{name}}' is a passthrough wrapper for '{{callee}}' from package '{{source}}'. " +
        "Import '{{callee}}' directly from '{{source}}' at the call site instead.",
    },
  },

  create(context) {
    // Track imports from other packages: Map<localName, { source }>
    const packageImports = new Map();

    function checkDirectReexport(node) {
      const source = node.source?.value;
      if (!source) return;

      if (isPackageImport(source)) {
        context.report({
          node: node.source,
          messageId: "noPackageReexport",
          data: {
            source,
          },
        });
      }
    }

    function trackImport(node) {
      const source = node.source?.value;
      if (!source) return;

      if (!isPackageImport(source)) return;

      // Track all imported names from package imports
      for (const specifier of node.specifiers || []) {
        const localName = specifier.local?.name;
        if (localName) {
          packageImports.set(localName, { source });
        }
      }
    }

    function checkIndirectReexport(node) {
      // Skip if this is a direct re-export (export { x } from '...')
      if (node.source != null) return;

      // Check each exported specifier
      for (const specifier of node.specifiers || []) {
        const localName = specifier.local?.name;
        if (!localName) continue;

        const importInfo = packageImports.get(localName);
        if (importInfo) {
          context.report({
            node: specifier,
            messageId: "noIndirectPackageReexport",
            data: {
              name: localName,
              source: importInfo.source,
            },
          });
        }
      }
    }

    function checkAliasReexport(node) {
      // Check for: export const X = importedValue
      const declaration = node.declaration;
      if (!declaration || declaration.type !== "VariableDeclaration") return;

      for (const declarator of declaration.declarations || []) {
        // Only check simple assignments: const X = Y (not const X = transform(Y))
        if (declarator.init?.type !== "Identifier") continue;

        const initName = declarator.init.name;
        const importInfo = packageImports.get(initName);
        if (!importInfo) continue;

        const exportedName = declarator.id?.name;
        if (!exportedName) continue;

        context.report({
          node: declarator,
          messageId: "noAliasReexport",
          data: {
            exported: exportedName,
            imported: initName,
            source: importInfo.source,
          },
        });
      }
    }

    /**
     * Check if a function is a passthrough wrapper: all parameters are
     * forwarded as-is to the callee, in the same order, with no extra
     * arguments and no transformations.
     *
     * Detects:
     *   function f(x, y) { return imported(x, y); }
     *   const f = (x) => imported(x);
     *   const f = (x) => { return imported(x); }
     *
     * Does NOT flag:
     *   function f(spec) { return imported("tag", spec.x); } // args differ
     *   function f() { return imported(42); }                 // literal arg
     *
     * Returns the callee Identifier name, or null if not a passthrough.
     */
    function getPassthroughCallee(params, body) {
      if (!body) return null;

      let returnArg;

      if (body.type === "BlockStatement") {
        const stmts = body.body;
        if (stmts.length !== 1) return null;
        const stmt = stmts[0];
        if (stmt.type !== "ReturnStatement" || !stmt.argument) return null;
        returnArg = stmt.argument;
      } else {
        // Arrow function with expression body: (x) => fn(x)
        returnArg = body;
      }

      if (returnArg.type !== "CallExpression") return null;
      if (returnArg.callee.type !== "Identifier") return null;

      // Verify arguments are an exact forward of params
      const args = returnArg.arguments;
      if (args.length !== params.length) return null;

      for (let i = 0; i < params.length; i++) {
        const param = params[i];
        const arg = args[i];
        // Only simple Identifier params forwarded as Identifier args
        if (param.type !== "Identifier") return null;
        if (arg.type !== "Identifier") return null;
        if (arg.name !== param.name) return null;
      }

      return returnArg.callee.name;
    }

    function checkWrapperReexport(node) {
      const declaration = node.declaration;
      if (!declaration) return;

      // export function foo(...) { return imported(...); }
      if (declaration.type === "FunctionDeclaration") {
        const callee = getPassthroughCallee(declaration.params, declaration.body);
        if (!callee) return;

        const importInfo = packageImports.get(callee);
        if (!importInfo) return;

        context.report({
          node: declaration,
          messageId: "noWrapperReexport",
          data: {
            name: declaration.id.name,
            callee,
            source: importInfo.source,
          },
        });
        return;
      }

      // export const foo = (...) => imported(...);
      // export const foo = function(...) { return imported(...); };
      if (declaration.type !== "VariableDeclaration") return;

      for (const declarator of declaration.declarations || []) {
        const init = declarator.init;
        if (!init) continue;
        if (
          init.type !== "ArrowFunctionExpression" &&
          init.type !== "FunctionExpression"
        )
          continue;

        const callee = getPassthroughCallee(init.params, init.body);
        if (!callee) continue;

        const importInfo = packageImports.get(callee);
        if (!importInfo) continue;

        const exportedName = declarator.id?.name;
        if (!exportedName) continue;

        context.report({
          node: declarator,
          messageId: "noWrapperReexport",
          data: {
            name: exportedName,
            callee,
            source: importInfo.source,
          },
        });
      }
    }

    return {
      ImportDeclaration: trackImport,
      ExportAllDeclaration: checkDirectReexport,
      ExportNamedDeclaration(node) {
        checkDirectReexport(node);
        checkIndirectReexport(node);
        checkAliasReexport(node);
        checkWrapperReexport(node);
      },
    };
  },
};
