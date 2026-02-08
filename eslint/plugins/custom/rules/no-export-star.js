/**
 * @file Custom rule: prohibit `export * from` statements.
 *
 * Barrel exports (export *) make it difficult to track dependencies
 * and can lead to circular dependency issues and bundle bloat.
 *
 * Disallows:
 *   export * from './utils'
 *   export * from '@aurochs/core'
 *
 * Allowed:
 *   export { foo, bar } from './utils'  // explicit named exports
 *   export { default } from './module'
 */

export default {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow `export * from` statements to maintain explicit exports",
      recommended: true,
    },
    schema: [],
    messages: {
      noExportStar: "`export * from` is not allowed. Use explicit named exports instead. " + "Source: '{{source}}'",
    },
  },

  create(context) {
    return {
      ExportAllDeclaration(node) {
        const source = node.source?.value || "";
        context.report({
          node,
          messageId: "noExportStar",
          data: {
            source,
          },
        });
      },
    };
  },
};
