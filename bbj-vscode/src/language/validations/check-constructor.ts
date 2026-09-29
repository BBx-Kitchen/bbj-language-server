/**
 * Constructor checks: an interface cannot be instantiated with `new`, and a `new` call's
 * argument count must match one of a BBj class's declared constructor overloads. Array
 * allocation (`new X[n]`) is not an instantiation of `X` and is excluded from both checks.
 */
import { ValidationAcceptor } from 'langium';
import { getClass } from '../bbj-nodedescription-provider.js';
import { ConstructorCall, isBbjClass, isMethodDecl, MethodDecl } from '../generated/ast.js';

/**
 * An interface cannot be instantiated with `new` (#86). Array allocation `new X[n]` is not an
 * instantiation of `X` (it creates an array whose element type is `X`) and is left alone.
 */
export function checkInstantiable(call: ConstructorCall, accept: ValidationAcceptor): void {
    if (isArrayConstruction(call)) {
        return;
    }
    const klass = getClass(call.klass);
    if (isBbjClass(klass) && klass.interface) {
        accept('error', `Interface '${klass.name}' cannot be instantiated.`, {
            node: call,
            property: 'klass'
        });
    }
}

/**
 * Validates the argument count of a `new` call against the declared constructors of a BBj class
 * (#87). BBj constructors are methods whose name matches the class name (case-insensitive), and
 * a class may declare several overloads. Only checked when the class declares at least one
 * constructor and the class resolves to a BBj class — Java classes (constructors resolved via
 * java-interop) and array allocations are left alone. Argument *types* are not checked here, to
 * avoid false positives without java-interop-backed inference.
 */
export function checkConstructorArguments(call: ConstructorCall, accept: ValidationAcceptor): void {
    if (isArrayConstruction(call)) {
        return;
    }
    const klass = getClass(call.klass);
    if (!isBbjClass(klass) || klass.interface) {
        return;
    }
    const constructors = klass.members.filter(
        (m): m is MethodDecl => isMethodDecl(m) && m.name.toLowerCase() === klass.name.toLowerCase()
    );
    if (constructors.length === 0) {
        return; // no explicit constructor declared — nothing to check against
    }
    const argCount = call.args.length;
    if (!constructors.some(ctor => ctor.params.length === argCount)) {
        const counts = [...new Set(constructors.map(c => c.params.length))].sort((a, b) => a - b).join(' or ');
        accept('error', `No constructor of '${klass.name}' takes ${argCount} argument(s) (expected ${counts}).`, {
            node: call,
            property: 'klass'
        });
    }
}

/**
 * Distinguishes array allocation `new X[...]` from object instantiation `new X(...)`. The AST
 * models both with the same `ConstructorCall.args`, so the bracket is recovered from the CST:
 * the first delimiter after the class name is `[` for an array allocation.
 */
function isArrayConstruction(call: ConstructorCall): boolean {
    const callNode = call.$cstNode;
    const klassNode = call.klass.$cstNode;
    if (!callNode || !klassNode) {
        return false;
    }
    const afterClass = callNode.text.slice(klassNode.end - callNode.offset).trimStart();
    return afterClass.startsWith('[');
}
