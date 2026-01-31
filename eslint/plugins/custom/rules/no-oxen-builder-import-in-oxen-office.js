/**
 * @file Custom rule: prohibit @oxen-builder/* imports within @oxen-office/* packages.
 *
 * Office-domain packages (@oxen-office/*) should not depend on builder packages (@oxen-builder/*).
 * This maintains a clean architecture with proper dependency direction.
 */

/**
 * Check if the file is within @oxen-office/* package
 * @param {string} filename - The file path
 * @returns {boolean}
 */
function isInOxenOfficePackage(filename) {
  if (!filename) return false;
  return (
    filename.includes("packages/@oxen-office/") ||
    filename.includes("packages\\@oxen-office\\")
  );
}

/**
 * Check if import source is from @oxen-builder/*
 * @param {string} source - The import source path
 * @returns {boolean}
 */
function isOxenBuilderImport(source) {
  if (!source || typeof source !== "string") return false;
  return source.startsWith("@oxen-builder/");
}

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow @oxen-builder/* imports within @oxen-office/* packages to maintain clean architecture",
      recommended: true,
    },
    schema: [],
    messages: {
      noOxenBuilderImport:
        "@oxen-office/* packages cannot import from @oxen-builder/*. " +
        "Office-domain packages should not depend on builder packages. " +
        "Import source: '{{source}}'",
    },
  },

  create(context) {
    const filename = context.filename || context.getFilename();

    if (!isInOxenOfficePackage(filename)) {
      return {};
    }

    function checkImport(node) {
      const source = node.source?.value;
      if (!source) return;

      if (isOxenBuilderImport(source)) {
        context.report({
          node: node.source,
          messageId: "noOxenBuilderImport",
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
