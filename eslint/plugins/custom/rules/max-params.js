/**
 * @file Custom rule: require object parameter for functions with many arguments.
 *
 * Functions with 4 or more parameters should use a single object parameter
 * to improve readability and make call sites self-documenting.
 *
 * Disallows:
 *   function foo(a, b, c, d) {}
 *   const bar = (a, b, c, d) => {}
 *   class X { method(a, b, c, d) {} }
 *
 * Also disallows rest parameter with tuple type workaround:
 *   function foo(...args: [a, b, c, d]) {}
 *   const bar = (...args: readonly [a, b, c, d]) => {}
 *
 * Allowed:
 *   function foo(a, b, c) {}
 *   function foo(options: { a, b, c, d }) {}
 *   const bar = ({ a, b, c, d }) => {}
 */

const DEFAULT_MAX_PARAMS = 3;

export default {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require functions with many parameters to use a single object parameter",
      recommended: true,
    },
    schema: [
      {
        type: "object",
        properties: {
          max: {
            type: "integer",
            minimum: 1,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      tooManyParams:
        "Function has {{count}} parameters (max {{max}}). " +
        "Use a single object parameter instead for better readability. " +
        "Example: function foo({ a, b, c, d }: Options) {}",
      restTupleWorkaround:
        "Rest parameter with tuple type has {{count}} elements (max {{max}}). " +
        "This is a workaround to bypass max-params. " +
        "Use a single object parameter instead. " +
        "Example: function foo({ a, b, c, d }: Options) {}",
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const max = options.max ?? DEFAULT_MAX_PARAMS;

    /**
     * Get the tuple element count from a type annotation.
     * Handles both TSTypeReference (readonly [...]) and TSTupleType ([...]).
     * @param {object} typeAnnotation - Type annotation node
     * @returns {number | null} - Element count or null if not a tuple
     */
    function getTupleElementCount(typeAnnotation) {
      if (!typeAnnotation) return null;

      // Direct tuple type: [...args: [a, b, c]]
      if (typeAnnotation.type === "TSTupleType") {
        return typeAnnotation.elementTypes?.length ?? null;
      }

      // readonly tuple: [...args: readonly [a, b, c]]
      if (typeAnnotation.type === "TSTypeOperator") {
        if (
          typeAnnotation.operator === "readonly" &&
          typeAnnotation.typeAnnotation?.type === "TSTupleType"
        ) {
          return typeAnnotation.typeAnnotation.elementTypes?.length ?? null;
        }
      }

      return null;
    }

    /**
     * Check if a parameter is a rest parameter with tuple type.
     * @param {object} param - Parameter node
     * @returns {{ isRestTuple: boolean, count: number }}
     */
    function checkRestTupleParam(param) {
      if (param.type !== "RestElement") {
        return { isRestTuple: false, count: 0 };
      }

      const typeAnnotation = param.typeAnnotation?.typeAnnotation;
      const count = getTupleElementCount(typeAnnotation);

      if (count !== null) {
        return { isRestTuple: true, count };
      }

      return { isRestTuple: false, count: 0 };
    }

    /**
     * Count non-object parameters.
     * ObjectPattern (destructuring) counts as 1 regardless of properties.
     * @param {Array} params - Function parameters
     * @returns {number} - Count of parameters
     */
    function countParams(params) {
      return params.length;
    }

    /**
     * Check if function uses object pattern for many params.
     * If there's exactly 1 param and it's an ObjectPattern, it's allowed.
     * @param {Array} params - Function parameters
     * @returns {boolean}
     */
    function usesObjectPattern(params) {
      return params.length === 1 && params[0].type === "ObjectPattern";
    }

    /**
     * Check function parameters and report if too many.
     * @param {object} node - AST node
     */
    function checkParams(node) {
      const params = node.params || [];

      // Allow single object parameter pattern
      if (usesObjectPattern(params)) {
        return;
      }

      // Check for rest parameter with tuple type workaround
      if (params.length === 1) {
        const { isRestTuple, count } = checkRestTupleParam(params[0]);
        if (isRestTuple && count > max) {
          context.report({
            node,
            messageId: "restTupleWorkaround",
            data: {
              count,
              max,
            },
          });
          return;
        }
      }

      const count = countParams(params);
      if (count > max) {
        context.report({
          node,
          messageId: "tooManyParams",
          data: {
            count,
            max,
          },
        });
      }
    }

    return {
      FunctionDeclaration: checkParams,
      FunctionExpression: checkParams,
      ArrowFunctionExpression: checkParams,
    };
  },
};
