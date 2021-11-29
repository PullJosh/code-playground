module.exports = function (babel) {
  const t = babel.types;
  return {
    visitor: {
      Program(path) {
        path.unshiftContainer(
          "body",
          t.importDeclaration(
            [
              t.importSpecifier(
                t.identifier("__reportValuesBeforeStatement"),
                t.identifier("__reportValuesBeforeStatement")
              ),
              t.importSpecifier(
                t.identifier("__reportValuesAfterStatement"),
                t.identifier("__reportValuesAfterStatement")
              ),
              t.importSpecifier(
                t.identifier("console"),
                t.identifier("__console")
              ),
            ],
            t.stringLiteral("http://localhost:3000/__diagnostics.js")
          )
        );
      },
      "ExpressionStatement|VariableDeclaration|ReturnStatement"(path) {
        // Check if this statement is part of a list
        // such as the top-level of the program, or
        // inside a function declaration
        if (!path.inList) {
          return;
        }

        if (t.isExpressionStatement(path)) {
          if (t.isCallExpression(path.get("expression"))) {
            if (
              path
                .get("expression.callee")
                .isIdentifier({ name: "__reportValuesAfterStatement" }) ||
              path
                .get("expression.callee")
                .isIdentifier({ name: "__reportValuesBeforeStatement" })
            ) {
              return;
            }

            if (
              path.get("expression.callee").isIdentifier({ name: "__report" })
            ) {
              return;
            }
          }
        }

        // It feels like there should be a built-in way to
        // do this, but I didn't immediately see anything
        // so I just wrote my own.
        function getAllVarsInScope(scope) {
          let varsInScope = Object.keys(scope.bindings);
          if (scope.parent) {
            varsInScope.push(...getAllVarsInScope(scope.parent));
          }
          return varsInScope;
        }

        const varsInScope = getAllVarsInScope(path.scope);

        const createReportValuesCode = (
          funcName,
          startLine,
          endLine,
          varNames
        ) => {
          return t.expressionStatement(
            t.callExpression(t.identifier(funcName), [
              t.numericLiteral(startLine),
              t.numericLiteral(endLine),
              t.arrowFunctionExpression(
                [t.identifier("__report")],
                t.blockStatement(
                  varNames.map((name) =>
                    t.tryStatement(
                      t.blockStatement([
                        t.expressionStatement(
                          t.callExpression(t.identifier("__report"), [
                            t.stringLiteral(name),
                            t.identifier(name),
                          ])
                        ),
                      ]),
                      t.catchClause(t.identifier("e"), t.blockStatement([]))
                    )
                  )
                )
              ),
            ])
          );
        };

        path.replaceWithMultiple([
          createReportValuesCode(
            "__reportValuesBeforeStatement",
            path.node.loc.start.line,
            path.node.loc.end.line,
            varsInScope
          ),
          path.node,
          createReportValuesCode(
            "__reportValuesAfterStatement",
            path.node.loc.start.line,
            path.node.loc.end.line,
            varsInScope
          ),
        ]);
      },
    },
  };
};
