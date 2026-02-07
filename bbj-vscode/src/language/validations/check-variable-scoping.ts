import { AstNode, AstUtils, ValidationAcceptor, ValidationChecks, ValidationRegistry } from 'langium';
import {
    BBjAstType,
    Program,
    MethodDecl,
    VariableDecl,
    isLetStatement,
    isArrayDeclarationStatement,
    isDreadStatement,
    isForStatement,
    isSymbolRef,
    isVariableDecl,
    isInputVariable,
    isReadStatement,
    isEnterStatement,
    isFieldDecl,
    isBbjClass,
    isArrayElement,
    isParameterDecl,
    isAssignment,
    isCompoundStatement,
    isDefFunction,
    isMethodDecl,
    isProgram,
} from '../generated/ast.js';
import { getFQNFullname } from '../bbj-nodedescription-provider.js';

/**
 * Register variable scoping validation checks for both Program and MethodDecl scopes.
 */
export function registerVariableScopingChecks(registry: ValidationRegistry): void {
    const checks: ValidationChecks<BBjAstType> = {
        Program: (program, accept) => {
            checkUseBeforeAssignment(program, accept);
            checkConflictingDeclares(program, accept);
        },
        MethodDecl: (method, accept) => {
            checkUseBeforeAssignment(method, accept);
            checkConflictingDeclares(method, accept);
        },
    };
    registry.register(checks);
}

/**
 * Walk statements in order, recursing into CompoundStatements.
 * Does NOT recurse into MethodDecl, BbjClass, or DefFunction bodies.
 */
function walkStatements(statements: ReadonlyArray<AstNode>, callback: (stmt: AstNode) => void): void {
    for (const statement of statements) {
        callback(statement);
        if (isCompoundStatement(statement)) {
            walkStatements(statement.statements, callback);
        }
    }
}

/**
 * Extract a variable name from a SymbolRef expression (case-insensitive).
 * Returns undefined if the expression is not a SymbolRef.
 */
function getSymbolRefName(expr: AstNode): string | undefined {
    if (isSymbolRef(expr)) {
        return expr.symbol.$refText?.toLowerCase();
    }
    return undefined;
}

/**
 * Record the first assignment position for a variable name.
 * Only records if no previous assignment has been recorded (first wins).
 */
function recordFirst(
    map: Map<string, number>,
    name: string | undefined,
    line: number | undefined
): void {
    if (name !== undefined && line !== undefined && !map.has(name)) {
        map.set(name, line);
    }
}

/**
 * Check for variables used before their first assignment in the given scope.
 *
 * Algorithm (two-pass):
 *   Pass 1: Walk statements to build a map of first-assignment line for each variable.
 *   Pass 2: Walk all SymbolRef usages and flag those before their first assignment.
 *
 * DECLARE (VariableDecl) variables are exempt -- they have whole-scope visibility.
 * Class fields and method parameters are also exempt.
 */
function checkUseBeforeAssignment(
    node: Program | MethodDecl,
    accept: ValidationAcceptor
): void {
    const declPositions = new Map<string, number>(); // varName (lowercase) -> first assignment line (0-based)
    const statements = getStatements(node);

    // For MethodDecl: params are always visible, record at position -1
    if (isMethodDecl(node)) {
        for (const param of node.params) {
            if (param.name) {
                declPositions.set(param.name.toLowerCase(), -1);
            }
        }
    }

    // Pass 1: Walk statements in source order, record first assignment position
    walkStatements(statements, (stmt) => {
        // LetStatement: LET x = ..., or x = ... (LET is optional)
        if (isLetStatement(stmt)) {
            for (const assignment of stmt.assignments) {
                if (assignment.variable) {
                    const name = getSymbolRefName(assignment.variable);
                    const line = stmt.$cstNode?.range.start.line;
                    recordFirst(declPositions, name, line);
                }
            }
        }

        // ArrayDeclarationStatement: DIM x[10], y$[5]
        if (isArrayDeclarationStatement(stmt)) {
            for (const item of stmt.items) {
                if (item.name) {
                    const line = item.$cstNode?.range.start.line ?? stmt.$cstNode?.range.start.line;
                    recordFirst(declPositions, item.name.toLowerCase(), line);
                }
            }
        }

        // DreadStatement: DREAD A$, B$, C$
        if (isDreadStatement(stmt)) {
            for (const item of stmt.items) {
                if (isInputVariable(item)) {
                    if (isSymbolRef(item)) {
                        const name = item.symbol.$refText?.toLowerCase();
                        const line = stmt.$cstNode?.range.start.line;
                        recordFirst(declPositions, name, line);
                    } else if (isArrayElement(item)) {
                        // DREAD COLOR$[ALL] -- extract receiver variable name
                        if (isSymbolRef(item.receiver)) {
                            const name = item.receiver.symbol.$refText?.toLowerCase();
                            const line = stmt.$cstNode?.range.start.line;
                            recordFirst(declPositions, name, line);
                        }
                    }
                }
            }
        }

        // ReadStatement: READ(1)A$,B$
        if (isReadStatement(stmt)) {
            for (const item of stmt.items) {
                if (isInputVariable(item)) {
                    if (isSymbolRef(item)) {
                        const name = item.symbol.$refText?.toLowerCase();
                        const line = stmt.$cstNode?.range.start.line;
                        recordFirst(declPositions, name, line);
                    } else if (isArrayElement(item)) {
                        if (isSymbolRef(item.receiver)) {
                            const name = item.receiver.symbol.$refText?.toLowerCase();
                            const line = stmt.$cstNode?.range.start.line;
                            recordFirst(declPositions, name, line);
                        }
                    }
                }
            }
        }

        // EnterStatement: ENTER A$, B$
        if (isEnterStatement(stmt)) {
            for (const variable of stmt.variables) {
                if (isInputVariable(variable)) {
                    if (isSymbolRef(variable)) {
                        const name = variable.symbol.$refText?.toLowerCase();
                        const line = stmt.$cstNode?.range.start.line;
                        recordFirst(declPositions, name, line);
                    } else if (isArrayElement(variable)) {
                        if (isSymbolRef(variable.receiver)) {
                            const name = variable.receiver.symbol.$refText?.toLowerCase();
                            const line = stmt.$cstNode?.range.start.line;
                            recordFirst(declPositions, name, line);
                        }
                    }
                }
            }
        }

        // ForStatement: FOR i = 1 TO 10
        if (isForStatement(stmt)) {
            if (stmt.init?.variable) {
                const name = getSymbolRefName(stmt.init.variable);
                const line = stmt.$cstNode?.range.start.line;
                recordFirst(declPositions, name, line);
            }
        }

    });

    // Pass 2: Walk all SymbolRef usages and check if before first assignment
    for (const child of AstUtils.streamAllContents(node)) {
        // Do NOT traverse into nested MethodDecl, BbjClass, or DefFunction bodies
        // AstUtils.streamAllContents visits everything, so we need to filter
        if (isMethodDecl(child) && child !== node) {
            continue; // Skip nested methods (they have their own scope)
        }
        if (isBbjClass(child)) {
            continue; // Skip class bodies
        }
        if (isDefFunction(child)) {
            continue; // Skip DEF function bodies
        }

        if (!isSymbolRef(child)) {
            continue;
        }

        const usageLine = child.$cstNode?.range.start.line;
        const varName = child.symbol.$refText?.toLowerCase();

        if (usageLine === undefined || varName === undefined) {
            continue;
        }

        // Skip unresolved references -- linking warnings handle those
        if (child.symbol.ref === undefined) {
            continue;
        }

        // Skip DECLARE variables -- they have whole-scope visibility
        if (isVariableDecl(child.symbol.ref) && !isParameterDecl(child.symbol.ref) && !isFieldDecl(child.symbol.ref)) {
            continue;
        }

        // Skip class fields (FieldDecl inside a BbjClass)
        if (isFieldDecl(child.symbol.ref) && child.symbol.ref.$container && isBbjClass(child.symbol.ref.$container)) {
            continue;
        }

        // Skip method parameters
        if (isParameterDecl(child.symbol.ref)) {
            continue;
        }

        // Skip if this SymbolRef is the LHS target of an assignment (not a read)
        if (isAssignment(child.$container) && child.$container.variable === child) {
            continue;
        }

        // Skip if the variable is not in our declaration map (global/library/imported symbol)
        if (!declPositions.has(varName)) {
            continue;
        }

        const declLine = declPositions.get(varName)!;
        if (usageLine < declLine) {
            // Find the original-case name from the ref text
            const originalName = child.symbol.$refText ?? varName;
            accept('hint', `'${originalName}' used before assignment (first assigned at line ${declLine + 1})`, {
                node: child,
            });
        }
    }
}

/**
 * Check for conflicting DECLARE statements (same variable, different types) in a scope.
 */
function checkConflictingDeclares(
    node: Program | MethodDecl,
    accept: ValidationAcceptor
): void {
    const declares = new Map<string, VariableDecl[]>(); // varName (lowercase) -> list of VariableDecl nodes
    const statements = getStatements(node);

    // Collect all DECLARE statements in scope
    walkStatements(statements, (stmt) => {
        if (isVariableDecl(stmt)) {
            const key = stmt.name?.toLowerCase();
            if (key) {
                if (!declares.has(key)) {
                    declares.set(key, []);
                }
                declares.get(key)!.push(stmt);
            }
        }
    });

    // Check for type conflicts
    for (const [, decls] of declares) {
        if (decls.length > 1) {
            const firstType = getFQNFullname(decls[0].type);
            const firstLine = decls[0].$cstNode?.range.start.line;
            for (let i = 1; i < decls.length; i++) {
                const thisType = getFQNFullname(decls[i].type);
                if (thisType.toLowerCase() !== firstType.toLowerCase()) {
                    const lineInfo = firstLine !== undefined ? ` (declared at line ${firstLine + 1})` : '';
                    accept('error', `Conflicting DECLARE for '${decls[i].name}': type '${thisType}' conflicts with '${firstType}'${lineInfo}`, {
                        node: decls[i],
                    });
                }
            }
        }
    }
}

/**
 * Get the statements array from a Program or MethodDecl scope.
 */
function getStatements(node: Program | MethodDecl): ReadonlyArray<AstNode> {
    if (isProgram(node)) {
        return node.statements;
    }
    if (isMethodDecl(node)) {
        return node.body;
    }
    return [];
}
