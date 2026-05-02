/**
 * @file Custom rule: forbid inline construction of `"sessionID:localID"`
 * GUID strings.
 *
 * The repo's single SoT for "format a GUID as a Map key / lookup
 * string" is `guidToString` in `@aurochs/fig/parser`. Hand-rolled
 * template literals like `` `${g.sessionID}:${g.localID}` `` fragment
 * that SoT — they bypass any future cache layer, hide a duplicate
 * definition of the format, and turn any change to the format
 * (escaping, separator, etc.) into a hunt for silent copies.
 *
 * Detected shape (any of):
 *
 *   `${X.sessionID}:${X.localID}`
 *   `${X?.sessionID}:${X?.localID}`
 *   `${(X.sessionID ?? 0)}:${(X.localID ?? 0)}`
 *   `prefix${X.sessionID}:${X.localID}suffix`
 *
 * In words: a TemplateLiteral whose interpolations include, in
 * order, a member access ending in `.sessionID` and one ending in
 * `.localID`, with the literal `":"` between them.
 *
 * Exempt: `parser/tree-builder.ts` (the SoT itself).
 */

function isExemptFile(filename) {
  if (!filename) { return true; }
  if (filename.includes("/parser/tree-builder.ts")) { return true; }
  return false;
}

/** Return the trailing identifier name of a chain like `foo.bar.sessionID`, or undefined. */
function trailingPropertyName(node) {
  if (!node) { return undefined; }
  if (node.type === "MemberExpression" && node.property && node.property.type === "Identifier") {
    return node.property.name;
  }
  if (node.type === "ChainExpression") {
    return trailingPropertyName(node.expression);
  }
  if (node.type === "LogicalExpression" && (node.operator === "??" || node.operator === "||")) {
    // `(foo.sessionID ?? 0)` / `(foo.sessionID || 0)` — peek the LHS.
    return trailingPropertyName(node.left);
  }
  if (node.type === "TSNonNullExpression" || node.type === "TSAsExpression") {
    return trailingPropertyName(node.expression);
  }
  return undefined;
}

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow inline `${guid.sessionID}:${guid.localID}` template literals. " +
        "Use `guidToString` from `@aurochs/fig/parser` (or a scoped " +
        "`FigResolveContext.guidString`) so the GUID-stringify SoT lives " +
        "in one place — every consumer benefits from any future format " +
        "or caching change without hunting silent copies.",
      recommended: true,
    },
    schema: [],
    messages: {
      inlineGuid:
        "Inline GUID stringification detected. Replace with " +
        "`guidToString(...)` (or `ctx.guidString(...)` inside a " +
        "FigResolveContext-aware function) — that's the single source " +
        "of truth for the `\"sessionID:localID\"` format.",
    },
  },

  create(context) {
    const filename = context.filename || context.getFilename();
    if (isExemptFile(filename)) { return {}; }

    return {
      TemplateLiteral(node) {
        // We need at least two interpolations.
        const exprs = node.expressions;
        if (!Array.isArray(exprs) || exprs.length < 2) { return; }

        // Scan adjacent interpolation pairs separated by exactly ":".
        for (let i = 0; i + 1 < exprs.length; i++) {
          const left = exprs[i];
          const right = exprs[i + 1];
          // The TemplateLiteral structure interleaves quasis and expressions.
          // The string between expression i and i+1 is `quasis[i+1].value.cooked`.
          const between = node.quasis[i + 1] && node.quasis[i + 1].value
            ? node.quasis[i + 1].value.cooked
            : undefined;
          if (between !== ":") { continue; }
          if (trailingPropertyName(left) !== "sessionID") { continue; }
          if (trailingPropertyName(right) !== "localID") { continue; }
          context.report({ node, messageId: "inlineGuid" });
          return;
        }
      },
    };
  },
};
