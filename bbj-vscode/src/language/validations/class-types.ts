/**
 * Class-type helpers shared by the class checks (check-class-reference.ts,
 * check-return-types.ts, check-constructor.ts, check-cyclic-inheritance.ts) and by the
 * variable-scoping check, which needs to decide whether two resolved classes are the same
 * or related type for its conflicting-DECLARE diagnostic.
 */
import { getClass } from '../bbj-nodedescription-provider.js';
import { BbjClass, Class, JavaClass, isBbjClass, isJavaClass } from '../generated/ast.js';

/** Fully-qualified name of a resolved class (JavaClass carries a package; BBj classes do not). */
export function classFqn(klass: Class): string {
    if (isJavaClass(klass)) {
        const name = (klass as JavaClass).name;
        if (name.includes('.')) {
            return name;
        }
        const pkg = (klass as JavaClass).packageName;
        return pkg ? `${pkg}.${name}` : name;
    }
    return klass.name;
}

/** True if walking the BBj class's resolvable extends/implements chain reaches `target`. */
export function bbjSupertypesReach(klass: BbjClass, target: Class): boolean {
    const visited = new Set<Class>();
    const queue: BbjClass[] = [klass];
    while (queue.length > 0) {
        const current = queue.pop()!;
        if (visited.has(current)) {
            continue;
        }
        visited.add(current);
        for (const ref of [...current.extends, ...current.implements]) {
            const superType = getClass(ref);
            if (!superType) {
                continue;
            }
            if (superType === target) {
                return true;
            }
            if (isBbjClass(superType)) {
                queue.push(superType);
            }
        }
    }
    return false;
}

/**
 * Type names (case-insensitive, simple name) that must never be flagged as unresolvable even
 * when java-interop has not resolved them. These are BBj's built-in scalar types: they are
 * backed by real `com.basis.startup.type.*` classes that resolve once the classpath is loaded,
 * but they are so fundamental to typed FIELD/METHOD/DECLARE declarations that a
 * partially-loaded classpath (or a test double that does not preload them) must not produce a
 * false positive.
 */
export const KNOWN_BBJ_SCALAR_TYPES = new Set(['bbjnumber', 'bbjstring', 'bbjint']);

/**
 * True when two resolved classes are related closely enough that a conflicting-DECLARE
 * diagnostic between them should stay silent: they are the same class object, they share a
 * fully-qualified name (case-insensitive), either one is `java.lang.Object` (the universal top
 * type), or either one is a BBj class whose resolvable supertype chain reaches the other.
 */
export function bbjTypesAreRelated(a: Class, b: Class): boolean {
    if (a === b) {
        return true;
    }
    const aFqn = classFqn(a).toLowerCase();
    const bFqn = classFqn(b).toLowerCase();
    if (aFqn === bFqn) {
        return true;
    }
    if (aFqn === 'java.lang.object' || bFqn === 'java.lang.object') {
        return true;
    }
    if (isBbjClass(a) && bbjSupertypesReach(a, b)) {
        return true;
    }
    if (isBbjClass(b) && bbjSupertypesReach(b, a)) {
        return true;
    }
    return false;
}
