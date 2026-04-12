/**
 * @file Custom rule: enforce rendering path boundaries in @aurochs-renderer/fig.
 *
 * The fig renderer has two rendering paths with different input types:
 *
 * 1. Scene-graph path (src/scene-graph/): accepts FigDesignNode (domain type)
 *    - Property extraction: scene-graph/extract.ts
 *    - Text conversion: scene-graph/convert/text.ts → text/layout/extract-props.ts
 *
 * 2. Direct SVG path (src/svg/): accepts FigNode (raw parser type)
 *    - Property extraction: svg/nodes/extract-props.ts
 *    - Node renderers: svg/nodes/*.ts
 *
 * These paths must not cross-import each other's extractors because the
 * input types are incompatible (FigDesignNode vs FigNode). Shared utilities
 * (e.g., text/layout/) use structural types that both can satisfy.
 *
 * Prohibited:
 * - scene-graph/** importing from svg/nodes/extract-props
 * - svg/** importing from scene-graph/extract
 */

/**
 * Check if the file is within @aurochs-renderer/fig package
 * @param {string} filename
 * @returns {boolean}
 */
function isInFigRenderer(filename) {
  if (!filename) return false;
  const normalized = filename.replace(/\\/g, "/");
  return normalized.includes("packages/@aurochs-renderer/fig/");
}

/**
 * Determine which rendering path the file belongs to.
 * @param {string} filename
 * @returns {"scene-graph" | "svg" | null}
 */
function getRenderPath(filename) {
  const normalized = filename.replace(/\\/g, "/");
  if (normalized.includes("/src/scene-graph/")) return "scene-graph";
  if (normalized.includes("/src/svg/")) return "svg";
  return null;
}

/**
 * Check if an import source targets the other path's extractor.
 * @param {string} source - The import specifier (relative or bare)
 * @param {"scene-graph" | "svg"} currentPath
 * @returns {{ violated: boolean; target: string }}
 */
function crossesPathBoundary(source, currentPath) {
  if (!source || typeof source !== "string") return { violated: false, target: "" };

  // Only check relative imports (path-internal)
  if (!source.startsWith(".")) return { violated: false, target: "" };

  if (currentPath === "scene-graph") {
    // scene-graph must not import svg/nodes/extract-props
    if (source.includes("svg/nodes/extract-props") || source.includes("svg\\nodes\\extract-props")) {
      return { violated: true, target: "svg/nodes/extract-props" };
    }
  }

  if (currentPath === "svg") {
    // svg must not import scene-graph/extract
    if (source.includes("scene-graph/extract") || source.includes("scene-graph\\extract")) {
      return { violated: true, target: "scene-graph/extract" };
    }
  }

  return { violated: false, target: "" };
}

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Prevent cross-imports between scene-graph and Direct SVG rendering paths " +
        "in @aurochs-renderer/fig. Each path has its own property extractors for " +
        "its input type (FigDesignNode vs FigNode).",
      recommended: true,
    },
    schema: [],
    messages: {
      crossPathImport:
        "{{currentPath}} path must not import from {{target}}. " +
        "The scene-graph path uses scene-graph/extract.ts (FigDesignNode) " +
        "and the Direct SVG path uses svg/nodes/extract-props.ts (FigNode). " +
        "For shared text extraction, use text/layout/extract-props.ts (TextNodeInput).",
    },
  },

  create(context) {
    const filename = context.filename || context.getFilename();

    if (!isInFigRenderer(filename)) return {};

    const currentPath = getRenderPath(filename);
    if (!currentPath) return {};

    function checkImport(node) {
      const source = node.source?.value;
      if (!source) return;

      const { violated, target } = crossesPathBoundary(source, currentPath);
      if (violated) {
        context.report({
          node: node.source,
          messageId: "crossPathImport",
          data: { currentPath, target },
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
