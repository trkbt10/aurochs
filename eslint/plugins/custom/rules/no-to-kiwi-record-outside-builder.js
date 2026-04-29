/**
 * @file Custom rule: `toKiwiRecord` is builder-only.
 *
 * `toKiwiRecord(node)` is the only sanctioned boundary where a typed
 * `BuilderNode` is passed into code that expects `Record<string,
 * unknown>` (the Kiwi encoder surface). It must ONLY be called from
 * the builder package — the pipeline direction is:
 *
 *   parser → context → builder → toKiwiRecord → Kiwi encoder
 *
 * Any other caller is a "broken window": it implies a consumer is
 * reaching into the builder's encoder-boundary helper to launder typed
 * data into an untyped record shape. Parser/context/renderer code
 * must never need this — they already hold typed FigNode / FigDesignNode
 * objects and should not go through `Record<string, unknown>`.
 *
 * Scope: allowed in files under `packages/@aurochs/fig/src/builder/**`
 * (including that directory's own definition of `toKiwiRecord`).
 * All other files reporting an import or a call of `toKiwiRecord`
 * are flagged.
 */

/**
 * Is the file inside the builder package of @aurochs/fig?
 * @param {string} filename
 * @returns {boolean}
 */
function isInFigBuilder(filename) {
  if (!filename) return false;
  // Unix + Windows path separators.
  return (
    filename.includes("packages/@aurochs/fig/src/builder/") ||
    filename.includes("packages\\@aurochs\\fig\\src\\builder\\")
  );
}

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "`toKiwiRecord` is the builder's Kiwi-encoder boundary helper. " +
        "It may only be imported / called from @aurochs/fig/src/builder/**. " +
        "Any other caller is converting a typed BuilderNode into a " +
        "`Record<string, unknown>` — which defeats the SSoT by re-opening " +
        "the structural escape hatch the helper was introduced to replace.",
      recommended: true,
    },
    schema: [],
    messages: {
      importNotAllowed:
        "`toKiwiRecord` may only be imported from files under " +
        "packages/@aurochs/fig/src/builder/**. Found in: {{filename}}. " +
        "Pass the typed BuilderNode / FigNode through — do not laund­er it " +
        "through `Record<string, unknown>` outside the builder boundary.",
      callNotAllowed:
        "`toKiwiRecord` may only be called from files under " +
        "packages/@aurochs/fig/src/builder/**. Calls elsewhere defeat " +
        "the SSoT for the typed builder → Kiwi-encoder boundary.",
    },
  },

  create(context) {
    const filename = context.filename || context.getFilename();
    if (isInFigBuilder(filename)) {
      return {};
    }

    function flagImport(node, specifier) {
      context.report({
        node: specifier,
        messageId: "importNotAllowed",
        data: { filename },
      });
    }

    return {
      ImportDeclaration(node) {
        const source = node.source?.value;
        if (typeof source !== "string") return;
        for (const spec of node.specifiers ?? []) {
          // Named import: `import { toKiwiRecord } from ...`
          if (spec.type === "ImportSpecifier" && spec.imported?.name === "toKiwiRecord") {
            flagImport(node, spec);
          }
        }
      },
      CallExpression(node) {
        const callee = node.callee;
        // Direct call: `toKiwiRecord(...)`
        if (callee.type === "Identifier" && callee.name === "toKiwiRecord") {
          context.report({ node: callee, messageId: "callNotAllowed" });
          return;
        }
        // Namespace / member call: `x.toKiwiRecord(...)`
        if (callee.type === "MemberExpression" && callee.property?.type === "Identifier" && callee.property.name === "toKiwiRecord") {
          context.report({ node: callee.property, messageId: "callNotAllowed" });
        }
      },
    };
  },
};
