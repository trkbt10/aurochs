/**
 * @file Custom rule: prohibit @aurochs-office/* imports within @aurochs/* packages.
 *
 * Utility/core packages (@aurochs/*) should not depend on Office-domain packages (@aurochs-office/*).
 * This maintains a clean architecture where office/domain depends on utilities, not vice versa.
 */

/**
 * Check if the file is within @aurochs/* package (excluding @aurochs-ui/* and @aurochs-office/*)
 * @param {string} filename - The file path
 * @returns {boolean}
 */
function isInaurochsPackage(filename) {
  if (!filename) return false;
  return filename.includes("packages/@aurochs/") || filename.includes("packages\\@aurochs\\");
}

/**
 * Check if import source is from @aurochs-office/*
 * @param {string} source - The import source path
 * @returns {boolean}
 */
function isaurochsOfficeImport(source) {
  if (!source || typeof source !== "string") return false;
  return source.startsWith("@aurochs-office/");
}

export default {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow @aurochs-office/* imports within @aurochs/* packages to maintain clean architecture",
      recommended: true,
    },
    schema: [],
    messages: {
      noaurochsOfficeImport:
        "@aurochs/* packages cannot import from @aurochs-office/*. " +
        "Utility packages should not depend on Office-domain packages. " +
        "Import source: '{{source}}'",
    },
  },

  create(context) {
    const filename = context.filename || context.getFilename();

    if (!isInaurochsPackage(filename)) {
      return {};
    }

    function checkImport(node) {
      const source = node.source?.value;
      if (!source) return;

      if (isaurochsOfficeImport(source)) {
        context.report({
          node: node.source,
          messageId: "noaurochsOfficeImport",
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
