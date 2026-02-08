/**
 * @file Custom rule: prohibit @aurochs-builder/* imports within @aurochs-office/* packages.
 *
 * Office-domain packages (@aurochs-office/*) should not depend on builder packages (@aurochs-builder/*).
 * This maintains a clean architecture with proper dependency direction.
 */

/**
 * Check if the file is within @aurochs-office/* package
 * @param {string} filename - The file path
 * @returns {boolean}
 */
function isInaurochsOfficePackage(filename) {
  if (!filename) return false;
  return filename.includes("packages/@aurochs-office/") || filename.includes("packages\\@aurochs-office\\");
}

/**
 * Check if import source is from @aurochs-builder/*
 * @param {string} source - The import source path
 * @returns {boolean}
 */
function isaurochsBuilderImport(source) {
  if (!source || typeof source !== "string") return false;
  return source.startsWith("@aurochs-builder/");
}

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow @aurochs-builder/* imports within @aurochs-office/* packages to maintain clean architecture",
      recommended: true,
    },
    schema: [],
    messages: {
      noaurochsBuilderImport:
        "@aurochs-office/* packages cannot import from @aurochs-builder/*. " +
        "Office-domain packages should not depend on builder packages. " +
        "Import source: '{{source}}'",
    },
  },

  create(context) {
    const filename = context.filename || context.getFilename();

    if (!isInaurochsOfficePackage(filename)) {
      return {};
    }

    function checkImport(node) {
      const source = node.source?.value;
      if (!source) return;

      if (isaurochsBuilderImport(source)) {
        context.report({
          node: node.source,
          messageId: "noaurochsBuilderImport",
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
