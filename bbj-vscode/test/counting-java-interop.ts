/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * A narrower Java-interop test double than the project's default `JavaInteropTestService`
 * (`test/bbj-test-module.ts`). That default double overrides `resolveClassByName` itself, so a
 * test built on it never exercises the production `resolveClassByName`/`resolveClass` code path.
 * `CountingJavaInteropService` extends `JavaInteropService` directly and overrides only the
 * deepest layer, the protected `getRawClass`, as a call-counting spy — leaving the real,
 * inherited `resolveClassByName`/`resolveClass` to run. Never opens a real socket: `connect()` is
 * overridden to reject.
 */
import { DeepPartial, EmptyFileSystem, inject, Module } from 'langium';
import { createDefaultModule, createDefaultSharedModule, LangiumSharedServices, PartialLangiumServices } from 'langium/lsp';
import { CancellationToken, MessageConnection } from 'vscode-jsonrpc/node.js';
import { BBjAddedServices, BBjModule, BBjServices, BBjSharedModule } from '../src/language/bbj-module.js';
import { BBjGeneratedModule, BBjGeneratedSharedModule } from '../src/language/generated/module.js';
import { registerValidationChecks } from '../src/language/bbj-validator.js';
import { JavaClass } from '../src/language/generated/ast.js';
import { JavadocProvider } from '../src/language/java-javadoc.js';
import { JavaInteropService } from '../src/language/java-interop.js';

/** The nine names Guava's `Primitives.allPrimitiveTypes()` covers on both backends: the eight Java primitives plus `void`. */
export const BACKEND_PRIMITIVE_NAMES: ReadonlySet<string> = new Set([
    'boolean', 'byte', 'char', 'double', 'float', 'int', 'long', 'short', 'void'
]);

/** A method as the backend's `getClassInfo` DTO shape carries it, before `resolveClass`'s Phase 1 sets `$type`. */
export interface RawMethod {
    name: string;
    returnType: string;
    parameters: Array<{ name: string; type: string }>;
    isStatic?: boolean;
}

/** A field as the backend's `getClassInfo` DTO shape carries it, before `resolveClass`'s Phase 1 sets `$type`. */
export interface RawField {
    name: string;
    type: string;
    isStatic?: boolean;
}

/** The backend's `getClassInfo` DTO shape (`ClassInfo` in both `bbj-ls` and `java-interop/`'s `InteropService`). */
export interface RawClassInfo {
    name: string;
    simpleName?: string;
    packageName?: string;
    isDeprecated?: boolean;
    fields: RawField[];
    methods: RawMethod[];
    constructors: RawMethod[];
    error?: string;
}

/** Builds a fresh raw method DTO. `parameterTypes` become positionally-named parameters (`p0`, `p1`, ...). */
export function rawMethod(name: string, returnType: string, parameterTypes: string[] = [], isStatic = false): RawMethod {
    return {
        name,
        returnType,
        isStatic,
        parameters: parameterTypes.map((type, index) => ({ name: `p${index}`, type })),
    };
}

/** Builds a fresh raw field DTO. */
export function rawField(name: string, type: string, isStatic = false): RawField {
    return { name, type, isStatic };
}

/**
 * Models `loadClassInfo` from both backends (`bbj-ls` `InteropService.java:402-471` and the
 * in-repo `java-interop/` `InteropService.java:166-238`): the response's `name` is always an echo
 * of the requested spelling. With no `script`, a name in {@link BACKEND_PRIMITIVE_NAMES} answers
 * like a primitive/void (packageName `java.lang`, no error, no members); any other name answers
 * like a class `Class.forName` rejects (empty members, `error: "Class not found: " + className`).
 * A `script` overrides this default with fresh, per-call data (a real class's own shape).
 */
export function backendLikeDto(className: string, script?: () => Omit<RawClassInfo, 'name'>): JavaClass {
    const body: Omit<RawClassInfo, 'name'> = script
        ? script()
        : BACKEND_PRIMITIVE_NAMES.has(className.trim())
            ? { simpleName: className, packageName: 'java.lang', isDeprecated: false, fields: [], methods: [], constructors: [] }
            : { fields: [], methods: [], constructors: [], error: `Class not found: ${className}` };
    return { name: className, ...body } as unknown as JavaClass;
}

/**
 * Extends `JavaInteropService` directly (not `JavaInteropTestService`) so the real, inherited
 * `resolveClassByName`/`resolveClass` run unmodified. Only `getRawClass` — the single function
 * that would otherwise send a `getClassInfo` request — is overridden, recording every requested
 * spelling and answering like the real backends via {@link backendLikeDto}. Per-class-name
 * scripts can be installed via `scripts` before a lookup to model a specific class's own fields
 * and methods.
 */
export class CountingJavaInteropService extends JavaInteropService {
    /** Every className passed to `getRawClass`, in call order — proves no backend request was sent for a name that should stay local. */
    public readonly rawClassCalls: string[] = [];
    /** Per-class-name scripts consumed by {@link backendLikeDto}, keyed by the exact requested spelling. */
    public readonly scripts = new Map<string, () => Omit<RawClassInfo, 'name'>>();

    constructor(services: BBjServices) {
        super(services);
        // Init JavadocProvider otherwise resolveClass() throws (mirrors test/bbj-test-module.ts).
        if (!JavadocProvider.getInstance().isInitialized()) {
            JavadocProvider.getInstance().initialize([], services.shared.workspace.FileSystemProvider);
        }
    }

    // Hermetic: never opens a real socket, so this double never reaches the interop service on :5008.
    protected override connect(): Promise<MessageConnection> {
        return Promise.reject(new Error('Java interop is disabled in the counting test double'));
    }

    protected override async getRawClass(className: string, _token?: CancellationToken): Promise<JavaClass> {
        this.rawClassCalls.push(className);
        return backendLikeDto(className, this.scripts.get(className));
    }

    /** Runs a raw DTO through the real (protected) `resolveClass` pipeline, for building the "what today's round trip produced" comparison side of a neutrality test. */
    resolveRaw(dto: JavaClass): Promise<JavaClass> {
        return this.resolveClass(dto);
    }
}

/** Wires a fresh `CountingJavaInteropService` into the standard BBj service graph, following `test/java-interop-service.test.ts`'s `createServices` pattern. */
export function createCountingInteropServices(): { shared: LangiumSharedServices; BBj: BBjServices; interop: CountingJavaInteropService } {
    const shared = inject(
        createDefaultSharedModule(EmptyFileSystem),
        BBjGeneratedSharedModule,
        BBjSharedModule
    );
    const testModule: Module<BBjServices, PartialLangiumServices & DeepPartial<BBjAddedServices>> = {
        java: {
            JavaInteropService: (services) => new CountingJavaInteropService(services)
        }
    };
    const BBj = inject(
        createDefaultModule({ shared }),
        BBjGeneratedModule,
        BBjModule,
        testModule
    );
    shared.ServiceRegistry.register(BBj);
    registerValidationChecks(BBj);
    return { shared, BBj, interop: BBj.java.JavaInteropService as CountingJavaInteropService };
}
