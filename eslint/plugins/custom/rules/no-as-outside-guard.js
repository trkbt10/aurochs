/**
 * @file ESLint rule to disallow `as any`, `as unknown`, and `as never`
 * except in type guard casts.
 *
 * All three assertions are SSoT escape hatches: they erase the type
 * checker's ability to verify the cast.
 * - `as any` / `as unknown`: widen to "anything", erasing outgoing info.
 * - `as never`: widen INTO "impossible", letting any source type flow
 *   into any target — equally unsafe and often used as a test-mock
 *   shortcut that disguises missing domain objects.
 *
 * The only sanctioned use is the type-guard idiom
 *   function isX(v): v is X { return ((v as unknown) as X) !== null; }
 * where the intermediate widening is immediately re-narrowed inside a
 * predicate-returning function. That pattern is detected by walking
 * up to the nearest function and checking its return type.
 */
export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow `as any`, `as unknown`, and `as never` except in type-guard casts (`x as unknown as Y` inside a function returning `x is Y`).",
    },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        properties: {
          /**
           * Which widening keywords to flag. Defaults to the original
           * "any + unknown" set to preserve existing call-site counts.
           * Opt in to "never" by setting
           *   ["custom/no-as-outside-guard", "error", { targets: ["any", "unknown", "never"] }]
           * once the repo-wide `as never` sweep completes.
           */
          targets: {
            type: "array",
            items: { type: "string", enum: ["any", "unknown", "never"] },
            uniqueItems: true,
          },
        },
      },
    ],
    messages: {
      noAs: "`as any` / `as unknown` / `as never` assertions are forbidden (except as intermediate casts in type guard functions).",
    },
  },
  create(context) {
    const options = context.options[0] ?? {};
    const targets = options.targets ?? ["any", "unknown"];
    const kindMap = {
      any: "TSAnyKeyword",
      unknown: "TSUnknownKeyword",
      never: "TSNeverKeyword",
    };
    const kinds = new Set(targets.map((t) => kindMap[t]).filter(Boolean));
    return {
      TSAsExpression(node) {
        const t = node.typeAnnotation;
        if (!t || !kinds.has(t.type)) {
          return; // not in the opted-in widening set
        }

        // Find nearest function
        const findNearestFunction = (startNode) => {
          const searchParent = (current) => {
            if (!current) return null;
            if (["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"].includes(current.type)) {
              return current;
            }
            return searchParent(current.parent);
          };
          return searchParent(startNode.parent);
        };
        const func = findNearestFunction(node);

        // ✅ allow only if inside a type guard AND
        // the parent is another TSAsExpression (e.g., `value as any as Hoge`)
        if (
          func &&
          func.returnType &&
          func.returnType.typeAnnotation &&
          func.returnType.typeAnnotation.type === "TSTypePredicate" &&
          node.parent.type === "TSAsExpression"
        ) {
          return; // valid use
        }

        // ❌ otherwise error
        context.report({ node, messageId: "noAs" });
      },
    };
  },
};
