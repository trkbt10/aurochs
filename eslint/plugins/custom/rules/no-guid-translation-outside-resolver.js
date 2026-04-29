/**
 * @file Custom rule: `buildGuidTranslationMap` / `translateOverrides` /
 * `getInstanceSymbolOverrides` / `getEffectiveSymbolID` /
 * `resolveSymbolGuidStr` from `@aurochs/fig/symbols` may only be
 * imported by code that legitimately owns symbol-resolution.
 *
 * SSoT statement: override-path resolution lives in exactly one place —
 * `@aurochs-builder/fig/src/context/tree-to-document.ts`. Any other
 * consumer is either a spec, a diagnostic script, a low-level
 * implementation within `@aurochs/fig/src/symbols/` itself, or a
 * legacy resolver that is being deliberately retained (fig-to-pptx,
 * fig-viewer symbol resolver). Every new caller outside those
 * whitelisted paths is a SSoT violation and must error at lint time.
 *
 * Why lint and not a runtime guard: the violation is structural. It's
 * about *where the code lives*, not what it does at runtime. A
 * compile-time / lint-time boundary prevents the drift that led to
 * `translateRemainingPathToSymbolNamespace` in the scene-graph layer.
 */

const GUARDED_SYMBOLS = new Set([
  "buildGuidTranslationMap",
  "translateOverrides",
  "getInstanceSymbolOverrides",
  "getEffectiveSymbolID",
  "resolveSymbolGuidStr",
]);

const ALLOWED_PATHS = [
  // The SoT: resolveOverridePaths and its helpers.
  "packages/@aurochs-builder/fig/src/context/",
  // Low-level implementation of the helpers themselves.
  "packages/@aurochs/fig/src/symbols/",
  // Fig-viewer: needs `resolveSymbolGuidStr` to look up SYMBOL nodes
  // by guid for its standalone FigNode-level resolver. No other
  // primitive is imported here (enforced by grep).
  "packages/@aurochs-renderer/fig/src/symbols/",
  // Spec files anywhere (they test the helpers).
  // Diagnostic scripts under scripts/ (debug-only, not shipped).
];

function normalizeForward(filename) {
  return (filename || "").replace(/\\/g, "/");
}

function isAllowed(filename) {
  const f = normalizeForward(filename);
  if (f.endsWith(".spec.ts") || f.endsWith(".spec.tsx")) {return true;}
  if (f.includes("/scripts/")) {return true;}
  for (const path of ALLOWED_PATHS) {
    if (f.includes(path)) {return true;}
  }
  return false;
}

function isGuardedSource(source) {
  if (!source || typeof source !== "string") {return false;}
  return source === "@aurochs/fig/symbols";
}

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow importing GUID-translation / symbol-resolution helpers " +
        "outside the single symbol-resolution owner " +
        "(@aurochs-builder/fig/src/context). The SSoT for override-path " +
        "resolution is resolveOverridePaths — new call sites fragment that SoT.",
      recommended: true,
    },
    schema: [],
    messages: {
      forbidden:
        "'{{name}}' from '@aurochs/fig/symbols' is a symbol-resolution helper " +
        "and must not be imported here. The single SoT for override-path " +
        "resolution is resolveOverridePaths in " +
        "@aurochs-builder/fig/src/context/tree-to-document.ts. " +
        "Consume its output (FigDesignNode.overrides) instead of re-running " +
        "GUID translation downstream.",
    },
  },

  create(context) {
    const filename = context.filename || context.getFilename();
    if (isAllowed(filename)) {return {};}

    function checkImport(node) {
      const source = node.source?.value;
      if (!isGuardedSource(source)) {return;}
      if (!node.specifiers) {return;}
      for (const spec of node.specifiers) {
        if (spec.type !== "ImportSpecifier") {continue;}
        const imported = spec.imported?.name;
        if (imported && GUARDED_SYMBOLS.has(imported)) {
          context.report({
            node: spec,
            messageId: "forbidden",
            data: { name: imported },
          });
        }
      }
    }

    return {
      ImportDeclaration: checkImport,
    };
  },
};
