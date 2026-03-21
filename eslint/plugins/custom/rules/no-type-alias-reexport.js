/**
 * @file Custom rule: prohibit type alias re-exports.
 *
 * Detects patterns where an imported type is re-exported under a different
 * (or same) name via a trivial type alias. This circumvents module boundaries
 * by "laundering" types through an intermediary module.
 *
 * Disallows:
 *   import type { Foo } from "../domain";
 *   export type Bar = Foo;
 *
 *   import { type Foo } from "../domain";
 *   export type Bar = Foo;
 *
 * Allowed:
 *   export type Bar = Foo & { extra: string };   // intersection (transformation)
 *   export type Bar = Foo | null;                 // union (transformation)
 *   export type Bar = Partial<Foo>;               // utility type (transformation)
 *   export type Bar = string;                     // primitive (not imported)
 *   export type Bar = { x: number };              // literal type
 */

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow re-exporting imported types via trivial type aliases",
      recommended: true,
    },
    schema: [],
    messages: {
      noTypeAliasReexport:
        "Type alias '{{exported}}' is a trivial re-export of '{{imported}}' from '{{source}}'. " +
        "Import '{{imported}}' directly from '{{source}}' at the usage site instead of re-exporting.",
    },
  },

  create(context) {
    // Track type imports: Map<localName, { source, importedName }>
    const typeImports = new Map();

    function trackImport(node) {
      const source = node.source?.value;
      if (!source) return;

      for (const specifier of node.specifiers || []) {
        const localName = specifier.local?.name;
        if (!localName) continue;

        // Track type-only imports (import type { X }) and inline type imports (import { type X })
        // Also track regular imports since they can be used in type alias re-exports
        const importedName =
          specifier.type === "ImportDefaultSpecifier"
            ? "default"
            : specifier.imported?.name || localName;

        typeImports.set(localName, { source, importedName });
      }
    }

    function checkTypeAliasReexport(node) {
      const declaration = node.declaration;
      if (!declaration) return;
      if (declaration.type !== "TSTypeAliasDeclaration") return;

      const typeAnnotation = declaration.typeAnnotation;
      if (!typeAnnotation) return;

      // Only flag trivial aliases: `export type X = Y` where Y is a plain
      // TSTypeReference with no type arguments (no generics, no union, no intersection)
      if (typeAnnotation.type !== "TSTypeReference") return;
      if (typeAnnotation.typeArguments || typeAnnotation.typeParameters) return;

      const typeName = typeAnnotation.typeName;
      if (!typeName || typeName.type !== "Identifier") return;

      const importInfo = typeImports.get(typeName.name);
      if (!importInfo) return;

      context.report({
        node: declaration,
        messageId: "noTypeAliasReexport",
        data: {
          exported: declaration.id.name,
          imported: typeName.name,
          source: importInfo.source,
        },
      });
    }

    return {
      ImportDeclaration: trackImport,
      ExportNamedDeclaration: checkTypeAliasReexport,
    };
  },
};
