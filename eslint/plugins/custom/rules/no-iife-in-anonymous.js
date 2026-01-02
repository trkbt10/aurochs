/**
 * @file ESLint rule to disallow IIFE (Immediately Invoked Function Expression) inside anonymous functions.
 */
export default {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow IIFE inside anonymous functions",
    },
    schema: [],
    messages: {
      noIifeInAnonymous: "IIFE inside anonymous functions is forbidden.",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        // Check if this is an IIFE (calling a function expression immediately)
        const callee = node.callee;
        if (!["FunctionExpression", "ArrowFunctionExpression"].includes(callee.type)) {
          return; // Not an IIFE
        }

        // Find the nearest containing function
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

        const parentFunc = findNearestFunction(node);

        // Check if the parent function is anonymous
        if (parentFunc) {
          const isAnonymous =
            (parentFunc.type === "FunctionExpression" && !parentFunc.id) ||
            parentFunc.type === "ArrowFunctionExpression";

          if (isAnonymous) {
            context.report({ node, messageId: "noIifeInAnonymous" });
          }
        }
      },
    };
  },
};
