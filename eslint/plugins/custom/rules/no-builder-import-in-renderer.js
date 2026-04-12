/**
 * @file Custom rule: prohibit @aurochs-builder/* imports within @aurochs-renderer/* packages.
 *
 * Renderer packages (@aurochs-renderer/*) must not depend on builder packages (@aurochs-builder/*).
 * Dependency direction: parser/domain → renderer, parser/domain → builder.
 * Renderer and builder are siblings, not parent-child.
 *
 * Domain types live in @aurochs/{format}/domain and are the shared contract
 * consumed by both renderer and builder.
 */

/**
 * Check if the file is within @aurochs-renderer/* package
 * @param {string} filename - The file path
 * @returns {boolean}
 */
function isInRendererPackage(filename) {
  if (!filename) return false;
  return filename.includes("packages/@aurochs-renderer/") || filename.includes("packages\\@aurochs-renderer\\");
}

/**
 * Check if import source is from @aurochs-builder/*
 * @param {string} source - The import source path
 * @returns {boolean}
 */
function isBuilderImport(source) {
  if (!source || typeof source !== "string") return false;
  return source.startsWith("@aurochs-builder/");
}

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow @aurochs-builder/* imports within @aurochs-renderer/* packages. " +
        "Use @aurochs/{format}/domain for shared domain types instead.",
      recommended: true,
    },
    schema: [],
    messages: {
      noBuilderImport:
        "@aurochs-renderer/* packages cannot import from @aurochs-builder/*. " +
        "Renderer and builder are sibling packages — shared types belong in " +
        "@aurochs/{format}/domain. Import source: '{{source}}'",
    },
  },

  create(context) {
    const filename = context.filename || context.getFilename();

    if (!isInRendererPackage(filename)) {
      return {};
    }

    function checkImport(node) {
      const source = node.source?.value;
      if (!source) return;

      if (isBuilderImport(source)) {
        context.report({
          node: node.source,
          messageId: "noBuilderImport",
          data: { source },
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
