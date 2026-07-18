import { AstNode, AstUtils, DiagnosticInfo, ValidationAcceptor, ValidationChecks, ValidationRegistry } from 'langium';
import { basename, dirname, isAbsolute, relative } from 'path';
import type { BBjServices } from '../bbj-module.js';
import { TypeInferer } from '../bbj-type-inferer.js';
import { JavaInteropService } from '../java-interop.js';
import { isTypeResolutionWarningsEnabled } from '../bbj-validator.js';
import { getClass, getFQNFullname } from '../bbj-nodedescription-provider.js';
import { BBjAstType, BbjClass, Class, ConstructorCall, Expression, FieldDecl, isBbjClass, isClass, isJavaClass, isMethodDecl, isMethodReturnStatement, isNumberLiteral, isStringLiteral, JavaClass, MethodDecl, QualifiedClass } from '../generated/ast.js';

export function registerClassChecks(registry: ValidationRegistry, services: BBjServices) {
    const validator = new ClassValidator(services.types.Inferer, services.java.JavaInteropService);
    const classChecks: ValidationChecks<BBjAstType> = {
        Use: (use, accept) => {
            if(!use.bbjClass) {
                return;
            }
            const ref = use.bbjClass;
            const uriOfUsage = AstUtils.getDocument(ref.$refNode!.root.astNode).uri.fsPath;
            if(ref.ref && isBbjClass(ref.ref)) {
                const uriOfDeclaration = AstUtils.getDocument(ref.ref).uri.fsPath;
                validator.checkBBjClass(ref.ref, uriOfDeclaration, uriOfUsage, accept, {
                    node: use,
                    property: 'bbjClass'
                });
            }
        },
        BbjClass: (decl, accept) => {
            if(!decl.visibility) {
                const typeName = decl.interface ? 'Interface' : 'Class';
                accept("warning", `${typeName} visibility (public, protected, or private) declaration is missing.`, {
                    node: decl,
                    property: 'name'
                });
                return;
            }
            decl.extends.forEach((extend, index) => {
                validator.checkClassReference(accept, extend, {
                    node: decl,
                    property: 'extends',
                    index
                });
            });
            decl.implements.forEach((implement, index) => {
                validator.checkClassReference(accept, implement, {
                    node: decl,
                    property: 'implements',
                    index
                });
            });
            // Check for cyclic inheritance
            if (decl.extends.length > 0) {
                validator.checkCyclicInheritance(decl, accept);
            }
        },
        ConstructorCall: (call, accept) => {
            validator.checkClassReference(accept, call.klass, {
                node: call,
                property: 'klass'
            });
            validator.checkInstantiable(call, accept);
            validator.checkConstructorArguments(call, accept);
        },
        MethodDecl: (meth, accept) => {
            validator.checkClassReference(accept, meth.returnType, {
                node: meth,
                property: 'returnType'
            });
            validator.checkMethodReturn(meth, accept);
        },
        FieldDecl: (field, accept) => {
            validator.checkClassReference(accept, field.type, {
                node: field,
                property: 'type'
            });
            validator.checkFieldInit(field, accept);
        },
        ParameterDecl: (param, accept) => validator.checkClassReference(accept, param.type, {
            node: param,
            property: 'type'
        }),
        VariableDecl: (decl, accept) => validator.checkClassReference(accept, decl.type, {
            node: decl,
            property: 'type'
        }),
    };
    registry.register(classChecks, validator);
}

class ClassValidator {

    /**
     * Type names (case-insensitive, simple name) that must never be flagged as unresolvable even
     * when java-interop has not resolved them. These are BBj's built-in scalar types: they are
     * backed by real `com.basis.startup.type.*` classes that resolve once the classpath is loaded,
     * but they are so fundamental to typed FIELD/METHOD/DECLARE declarations that a
     * partially-loaded classpath (or a test double that does not preload them) must not produce a
     * false positive.
     */
    private static readonly KNOWN_BBJ_SCALAR_TYPES = new Set(['bbjnumber', 'bbjstring', 'bbjint']);

    constructor(private readonly inferer: TypeInferer, private readonly javaInterop?: JavaInteropService) {
    }

    private isSubFolderOf(folder: string, parentFolder: string) {
        if(parentFolder === folder) {
            return true;
        }
        const relativePath = relative(parentFolder, folder);
        return relativePath && !relativePath.startsWith('..') && !isAbsolute(relativePath);
    }

    public checkClassReference<N extends AstNode>(accept: ValidationAcceptor, qclass: QualifiedClass|undefined, info: DiagnosticInfo<N>): void {
        if(!qclass) {
            return;
        }
        const klass = getClass(qclass);
        if(!klass) {
            // The type reference resolved to nothing. Flag it as unresolvable (#438), but only when
            // it is safe to conclude the name is genuinely invalid rather than "interop is down".
            this.warnUnresolvableType(accept, qclass, info);
            return;
        }
        const uriOfUsage = AstUtils.getDocument(qclass).uri.fsPath;
        if(isBbjClass(klass) && klass.visibility) {
            const uriOfDeclaration = AstUtils.getDocument(klass).uri.fsPath;
            return this.checkBBjClass<N>(klass, uriOfDeclaration, uriOfUsage, accept, info);
        }
    }

    /**
     * Emits a warning that a {@link QualifiedClass} type reference cannot be resolved (#438), gated
     * so it never floods environments where java-interop is unavailable:
     *  - only when the `typeResolutionWarnings` flag is enabled, and
     *  - only when the java-interop classpath is actually available (at least one class resolved) —
     *    otherwise an unresolved reference just means the interop service is down, not that the
     *    type is invalid; and
     *  - never for the built-in BBj scalar types (see {@link KNOWN_BBJ_SCALAR_TYPES}).
     */
    private warnUnresolvableType<N extends AstNode>(accept: ValidationAcceptor, qclass: QualifiedClass, info: DiagnosticInfo<N>): void {
        if(!isTypeResolutionWarningsEnabled()) {
            return;
        }
        if(!this.javaInterop?.isClasspathAvailable()) {
            return;
        }
        const name = getFQNFullname(qclass);
        if(!name) {
            return;
        }
        const simpleName = name.substring(name.lastIndexOf('.') + 1).toLowerCase();
        if(ClassValidator.KNOWN_BBJ_SCALAR_TYPES.has(simpleName)) {
            return;
        }
        accept('warning', `Type '${name}' cannot be resolved.`, info);
    }

    public checkBBjClass<N extends AstNode>(klass: BbjClass, uriOfDeclaration: string, uriOfUsage: string, accept: ValidationAcceptor, info: DiagnosticInfo<N>) {
        const typeName = klass.interface ? 'interface' : 'class';

        if(!klass.visibility) {
            accept("warning", `Visibility of ${typeName} '${klass.name}' is not declared and might not be accessible here.`, info);
            return;
        }

        // Get source location info for the declaration
        const filename = basename(uriOfDeclaration);
        const lineNumber = klass.$cstNode?.range.start.line;
        const lineInfo = lineNumber !== undefined ? `:${lineNumber + 1}` : '';
        const sourceInfo = `${filename}${lineInfo}`;

        switch (klass.visibility.toUpperCase()) {
            case "PUBLIC":
                //everything is allowed
                return;
            case "PROTECTED":
                const dirOfDeclaration = dirname(uriOfDeclaration);
                const dirOfUsage = dirname(uriOfUsage);
                if (!this.isSubFolderOf(dirOfUsage, dirOfDeclaration)) {
                    accept("error", `Protected ${typeName} '${klass.name}' (declared in ${sourceInfo}) is not visible from this directory.`, info);
                }
                break;
            case "PRIVATE":
                if (uriOfUsage !== uriOfDeclaration) {
                    accept("error", `Private ${typeName} '${klass.name}' (declared in ${sourceInfo}) is not visible from this file.`, info);
                }
                break;
        }
    }

    // BBj scalar return types whose value kind can be checked against returned literals without
    // needing type resolution. Names are compared case-insensitively (BBj is case-insensitive).
    private static readonly STRING_RETURN_TYPES = new Set(['bbjstring']);
    private static readonly NUMERIC_RETURN_TYPES = new Set(['bbjnumber']);

    /**
     * Checks on a method's METHODRET statements against its declared return type. Interface methods
     * (no body, hence no `endTag`) are declared elsewhere and excluded. Covers:
     *  - void method must not return a value;
     *  - non-void method with a body must return a value (issue #372);
     *  - a returned literal whose kind contradicts a BBj scalar return type or a resolvable class.
     * Java-class and unresolved return types are checked only where it is safe without full
     * java-interop-backed type inference, to avoid false positives on BBj's loose typing.
     */
    public checkMethodReturn(meth: MethodDecl, accept: ValidationAcceptor): void {
        if (!meth.endTag) {
            return; // no body (interface method) — nothing to check
        }
        const valueReturns = AstUtils.streamAllContents(meth)
            .filter(isMethodReturnStatement)
            .filter(ret => ret.return !== undefined)
            .toArray();

        // A void method must not return a value.
        if (meth.voidReturn) {
            for (const ret of valueReturns) {
                accept('error', `Method '${meth.name}' is declared void and must not return a value.`, {
                    node: ret,
                    property: 'return'
                });
            }
            return;
        }

        if (!meth.returnType) {
            return; // neither void nor an explicit return type — nothing required
        }

        // #372: a non-void method with no value-returning METHODRET is an error.
        if (valueReturns.length === 0) {
            accept('error', `Method '${meth.name}' declares a return type but has no METHODRET returning a value.`, {
                node: meth,
                property: 'name'
            });
            return;
        }

        // Conservative return-type check on returned literals. Array return types are skipped.
        if (meth.array) {
            return;
        }
        for (const ret of valueReturns) {
            const mismatch = this.literalTypeMismatch(meth.returnType, ret.return!);
            if (mismatch) {
                accept('error', `Method '${meth.name}' declares return type '${mismatch.typeName}' but returns a ${mismatch.valueKind}.`, {
                    node: ret,
                    property: 'return'
                });
                continue; // already reported by the literal check — don't double-report
            }
            // Deeper check against Java / non-BBj return types via type inference (issue #437).
            this.checkReturnTypeAssignable(meth, ret.return!, {
                node: ret,
                property: 'return'
            }, accept);
        }
    }

    // BBj scalar return types are handled by the literal check above and are otherwise loosely
    // typed (BBj coerces), so the inference-based Java-type check below skips them to stay
    // false-positive-free. Compared case-insensitively.
    private static readonly BBJ_SCALAR_RETURN_TYPES = new Set(['bbjstring', 'bbjnumber', 'bbjint']);

    /**
     * The complete set of assignable target types for well-known FINAL Java types, keyed by the
     * returned type's fully-qualified name (all lower-cased). Because these classes are `final`,
     * their supertype closure is fixed and fully known here — so if the declared return type's FQN
     * is NOT in the set, the returned value is *provably* not assignable and can be flagged with no
     * risk of missing a subtype relationship. Non-final Java types are never flagged (see below),
     * since their hierarchy is not walkable from the AST (a JavaClass carries no supertype info).
     */
    private static readonly FINAL_TYPE_ASSIGNABLE_TO: ReadonlyMap<string, ReadonlySet<string>> = new Map([
        ['java.lang.string', new Set(['java.lang.string', 'java.lang.charsequence', 'java.lang.comparable', 'java.io.serializable', 'java.lang.object'])],
        ['java.lang.integer', new Set(['java.lang.integer', 'java.lang.number', 'java.lang.comparable', 'java.io.serializable', 'java.lang.object'])],
        ['java.lang.long', new Set(['java.lang.long', 'java.lang.number', 'java.lang.comparable', 'java.io.serializable', 'java.lang.object'])],
        ['java.lang.short', new Set(['java.lang.short', 'java.lang.number', 'java.lang.comparable', 'java.io.serializable', 'java.lang.object'])],
        ['java.lang.byte', new Set(['java.lang.byte', 'java.lang.number', 'java.lang.comparable', 'java.io.serializable', 'java.lang.object'])],
        ['java.lang.double', new Set(['java.lang.double', 'java.lang.number', 'java.lang.comparable', 'java.io.serializable', 'java.lang.object'])],
        ['java.lang.float', new Set(['java.lang.float', 'java.lang.number', 'java.lang.comparable', 'java.io.serializable', 'java.lang.object'])],
        ['java.lang.boolean', new Set(['java.lang.boolean', 'java.lang.comparable', 'java.io.serializable', 'java.lang.object'])],
        ['java.lang.character', new Set(['java.lang.character', 'java.lang.comparable', 'java.io.serializable', 'java.lang.object'])],
        ['java.math.bigdecimal', new Set(['java.math.bigdecimal', 'java.lang.number', 'java.lang.comparable', 'java.io.serializable', 'java.lang.object'])],
        ['java.math.biginteger', new Set(['java.math.biginteger', 'java.lang.number', 'java.lang.comparable', 'java.io.serializable', 'java.lang.object'])]
    ]);

    /**
     * Validates a single returned expression against a method's declared (Java / non-BBj) return
     * type using type inference (issue #437, follow-up to #372/#436). Gated behind the
     * `typeResolutionWarnings` flag, exactly like the CAST-resolvability check.
     *
     * Deliberately conservative to avoid false positives on BBj's loose typing:
     *  - fires ONLY when both the declared and the inferred returned type FULLY resolve to a Class;
     *  - skips BBj scalar declared types (owned by the literal check, and loosely coerced);
     *  - `java.lang.Object` (the top type) is always assignable;
     *  - only reports when the returned value's type is *provably* not assignable — currently when
     *    the returned type is a well-known FINAL Java type whose complete supertype set is known and
     *    does not contain the declared type. Non-final returned types and BBj-class returns are left
     *    unflagged because the Java class hierarchy is not walkable from the AST here.
     */
    private checkReturnTypeAssignable<N extends AstNode>(meth: MethodDecl, returned: Expression, info: DiagnosticInfo<N>, accept: ValidationAcceptor): void {
        if (!isTypeResolutionWarningsEnabled() || meth.array) {
            return;
        }
        // BBj scalar declared types are handled elsewhere / loosely typed — never flag them here.
        const declaredName = this.simpleTypeName(meth.returnType!);
        if (declaredName && ClassValidator.BBJ_SCALAR_RETURN_TYPES.has(declaredName.toLowerCase())) {
            return;
        }
        const declaredClass = getClass(meth.returnType);
        if (!declaredClass) {
            return; // declared type does not fully resolve — skip silently
        }
        const inferred = this.inferer.getType(returned);
        if (!inferred || !isClass(inferred)) {
            return; // returned type does not resolve to a Class — skip silently
        }
        if (this.isAssignable(declaredClass, inferred) === false) {
            accept('error', `Method '${meth.name}' declares return type '${this.classDisplayName(declaredClass)}' but returns a value of incompatible type '${this.classDisplayName(inferred)}'.`, info);
        }
    }

    /**
     * Three-valued assignability of a returned value of type `returned` to the declared type
     * `declared`: `true` = provably assignable, `false` = provably NOT assignable, `undefined` =
     * unknown (must be treated as assignable, i.e. not flagged). Only definitive answers are used
     * to emit a diagnostic.
     */
    private isAssignable(declared: Class, returned: Class): boolean | undefined {
        if (declared === returned) {
            return true;
        }
        const declaredFqn = this.classFqn(declared).toLowerCase();
        const returnedFqn = this.classFqn(returned).toLowerCase();
        if (declaredFqn === returnedFqn) {
            return true;
        }
        // java.lang.Object is the top type: every reference type is assignable to it.
        if (declaredFqn === 'java.lang.object') {
            return true;
        }
        // A returned BBj class whose resolvable supertype chain reaches the declared class is
        // assignable; otherwise we cannot be certain (the chain may reach Java types we cannot
        // walk), so we defer rather than risk a false positive.
        if (isBbjClass(returned)) {
            return this.bbjSupertypesReach(returned, declared) ? true : undefined;
        }
        // A returned well-known FINAL Java type has a fully-known supertype set: decide definitively.
        if (isJavaClass(returned)) {
            const assignableTo = ClassValidator.FINAL_TYPE_ASSIGNABLE_TO.get(returnedFqn);
            if (assignableTo) {
                return assignableTo.has(declaredFqn);
            }
        }
        return undefined; // hierarchy not walkable / unknown — do not flag
    }

    /** True if walking the BBj class's resolvable extends/implements chain reaches `target`. */
    private bbjSupertypesReach(klass: BbjClass, target: Class): boolean {
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

    /** Fully-qualified name of a resolved class (JavaClass carries a package; BBj classes do not). */
    private classFqn(klass: Class): string {
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

    /** Human-readable class name for diagnostics (FQN for Java types, simple name for BBj types). */
    private classDisplayName(klass: Class): string {
        return isJavaClass(klass) ? this.classFqn(klass) : klass.name;
    }

    /**
     * Validates a field's literal initializer against its declared type (#79), e.g.
     * `field public BBjNumber n! = "text"`. Reuses the same conservative, java-interop-free
     * literal check as method return types.
     */
    public checkFieldInit(field: FieldDecl, accept: ValidationAcceptor): void {
        if (!field.init || field.array) {
            return; // no initializer, or an array field — nothing to check here
        }
        const mismatch = this.literalTypeMismatch(field.type, field.init);
        if (mismatch) {
            accept('error', `Field '${field.name}' is declared '${mismatch.typeName}' but is initialized with a ${mismatch.valueKind}.`, {
                node: field,
                property: 'init'
            });
        }
    }

    /**
     * If `value` is a literal whose kind contradicts the declared scalar/class `type`, returns the
     * expected type name and the literal kind; otherwise undefined. Only cases that are safe
     * without java-interop-backed type inference are reported, matching BBj's loose typing:
     * a BBjNumber assigned a string literal, a BBjString assigned a number literal, or any literal
     * assigned to a resolvable user-defined BBj class/interface.
     */
    private literalTypeMismatch(type: QualifiedClass | undefined, value: Expression): { typeName: string, valueKind: string } | undefined {
        if (!type) {
            return undefined;
        }
        const returnsString = isStringLiteral(value);
        const returnsNumber = isNumberLiteral(value);
        if (!returnsString && !returnsNumber) {
            return undefined; // non-literal: needs deeper type inference, left untouched
        }
        const typeName = this.simpleTypeName(type);
        if (!typeName) {
            return undefined;
        }
        const lower = typeName.toLowerCase();
        const expectsNumber = ClassValidator.NUMERIC_RETURN_TYPES.has(lower);
        const expectsString = ClassValidator.STRING_RETURN_TYPES.has(lower);
        // A literal is never an instance of a user-defined BBj class/interface, so any literal
        // assigned to a resolvable BBj class is a mismatch.
        const declaredBBjClass = !expectsNumber && !expectsString && isBbjClass(getClass(type));
        if ((expectsNumber && returnsString) || (expectsString && returnsNumber) || declaredBBjClass) {
            return { typeName, valueKind: returnsString ? 'string' : 'number' };
        }
        return undefined;
    }

    /** Simple (unqualified) name of a declared type, taken from its source text. */
    private simpleTypeName(type: QualifiedClass): string | undefined {
        const text = type.$cstNode?.text?.trim();
        if (!text) {
            return undefined;
        }
        return text.substring(text.lastIndexOf('.') + 1);
    }

    /**
     * An interface cannot be instantiated with `new` (#86). Array allocation `new X[n]` is not an
     * instantiation of `X` (it creates an array whose element type is `X`) and is left alone.
     */
    public checkInstantiable(call: ConstructorCall, accept: ValidationAcceptor): void {
        if (this.isArrayConstruction(call)) {
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
    public checkConstructorArguments(call: ConstructorCall, accept: ValidationAcceptor): void {
        if (this.isArrayConstruction(call)) {
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
    private isArrayConstruction(call: ConstructorCall): boolean {
        const callNode = call.$cstNode;
        const klassNode = call.klass.$cstNode;
        if (!callNode || !klassNode) {
            return false;
        }
        const afterClass = callNode.text.slice(klassNode.end - callNode.offset).trimStart();
        return afterClass.startsWith('[');
    }

    public checkCyclicInheritance(klass: BbjClass, accept: ValidationAcceptor): void {
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
}

