/**
 * Detects a cyclic BBj class inheritance chain (A extends B, B extends A, or a longer cycle),
 * walking only the resolvable, single-first-extends BBj chain and bounding the walk so a
 * malformed or adversarial extends graph cannot make validation run unboundedly long.
 */
import { ValidationAcceptor } from 'langium';
import { BbjClass, isBbjClass } from '../generated/ast.js';
import { getClass } from '../bbj-nodedescription-provider.js';

export function checkCyclicInheritance(klass: BbjClass, accept: ValidationAcceptor): void {
    const visited = new Set<BbjClass>();
    visited.add(klass);
    let current: BbjClass | undefined = klass;
    const MAX_INHERITANCE_DEPTH = 20;
    let depth = 0;

    while (current && current.extends.length > 0 && depth < MAX_INHERITANCE_DEPTH) {
        const superType = getClass(current.extends[0]);
        if (!isBbjClass(superType)) {
            break; // Java class or unresolvable -- stop walking
        }
        if (visited.has(superType)) {
            accept("error", `Cyclic inheritance detected: class '${klass.name}' is involved in an inheritance cycle.`, {
                node: klass,
                property: 'extends',
                index: 0
            });
            return;
        }
        visited.add(superType);
        current = superType;
        depth++;
    }
}
