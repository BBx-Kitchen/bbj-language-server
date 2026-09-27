import { DeepPartial, Module, inject } from "langium";
import { PartialLangiumServices, createDefaultModule, createDefaultSharedModule, LangiumSharedServices, DefaultSharedModuleContext } from "langium/lsp";
import { BBjAddedServices, BBjModule, BBjServices, BBjSharedModule } from "../src/language/bbj-module.js";
import { BBjGeneratedModule, BBjGeneratedSharedModule } from "../src/language/generated/module.js";
import { registerValidationChecks } from "../src/language/bbj-validator.js";
import { JavaInteropService, ParseError, ParseProgramParams, ParseProgramResult } from "../src/language/java-interop.js";
import { Classpath, JavaClass, JavaField, JavaMethod, JavaMethodParameter } from "../src/language/generated/ast.js";
import { CancellationToken, ErrorCodes, MessageConnection, ResponseError } from "vscode-jsonrpc/node.js";
import { BbjLexer } from "../src/language/bbj-lexer.js";
import { JavadocProvider } from "../src/language/java-javadoc.js";

export function createBBjTestServices(context: DefaultSharedModuleContext): {
    shared: LangiumSharedServices,
    BBj: BBjServices
} {
    const shared = inject(
        createDefaultSharedModule(context),
        BBjGeneratedSharedModule,
        BBjSharedModule
    );
    const BBj = inject(
        createDefaultModule({ shared }),
        BBjGeneratedModule,
        BBjModule,
        BBjTestModule
    );
    shared.ServiceRegistry.register(BBj);
    registerValidationChecks(BBj);
    return { shared, BBj };
}

export const BBjTestModule: Module<BBjServices, PartialLangiumServices & DeepPartial<BBjAddedServices>> = {
    parser: {
        Lexer: (services) => new TestableBBjLexer(services)
    },
    java: {
        JavaInteropService: (services) => new JavaInteropTestService(services)
    }
}

export class TestableBBjLexer extends BbjLexer {
    public override prepareLineSplitter(text: string): string {
        return super.prepareLineSplitter(text)
    }
}

/**
 * The scriptable answers {@link JavaInteropTestService.parseProgram} can be set to give:
 * the default old-server `MethodNotFound`; a plain rejected `Error` standing in for a transport
 * failure; a resolved result whose `errors` field is missing (`malformed-result`); a resolved
 * result carrying a scripted error list; or a JSON-RPC error with an arbitrary code/message
 * (covers every application error code and, via `-32800`, a `RequestCancelled` cancellation).
 */
export type JavaInteropTestServiceParseProgramScript =
    | 'method-not-found'
    | 'transport-error'
    | 'malformed-result'
    | { errors: ParseError[] }
    | { code: number; message: string };

export class JavaInteropTestService extends JavaInteropService {
    constructor(services: BBjServices) {
        super(services)

        // Init JavadocProvider otherwise adding Classes will throw an error
        if (!JavadocProvider.getInstance().isInitialized()) {
            JavadocProvider.getInstance().initialize([], services.shared.workspace.FileSystemProvider);
        }
        // Add some faked Java classes to test java service related code.
        const fakeJavaClasses: JavaClass[] = [
            createBBjApiClass(this.classpath),
            createHashMapClass(this.classpath),
            createJavaLangStringClass(this.classpath),
            createJavaLangClassClass(this.classpath),
            createSysGuiClass(this.classpath)
        ]
        fakeJavaClasses.forEach(clazz => {
            this.classpath.classes.push(clazz)
            this.resolveClass(clazz)
        })

        if (!this.langiumDocuments.hasDocument(this.classpathDocument.uri)) {
            this.langiumDocuments.addDocument(this.classpathDocument);
        }
    }

    // The fake service must never reach the real Java interop socket (:5008). By default it
    // behaves like an OLD server with no getAllClassNames endpoint, so ensureCompleteClassIndex
    // reports "unavailable" and callers exercise the fallback path. Tests can opt into the
    // augmented-server behaviour with seedCompleteClassIndex().
    public override async ensureCompleteClassIndex(): Promise<boolean> {
        return this.hasCompleteClassIndex();
    }

    /** Test seam: simulate an augmented bbj-ls by seeding the complete class index. */
    public seedCompleteClassIndex(fqns: string[]): void {
        this.buildCompleteClassIndex(fqns);
    }

    /** Test seam: revert to the default old-server behaviour (no complete index). */
    public resetCompleteClassIndex(): void {
        this.clearCompleteClassIndex();
    }

    // --- parseProgram scripting: default answers like an old server (MethodNotFound). ---
    private parseProgramScript: JavaInteropTestServiceParseProgramScript = 'method-not-found';

    /** Test seam: script the next/every {@link parseProgram} answer. */
    public scriptParseProgram(script: JavaInteropTestServiceParseProgramScript): void {
        this.parseProgramScript = script;
    }

    /**
     * Never touches {@link connect} (which unconditionally rejects, hermetic): a socket-shaped
     * failure would produce a transport-failure shape, not the specific MethodNotFound/result/
     * application-error shapes tests need to script directly.
     */
    public override async parseProgram(params: ParseProgramParams): Promise<ParseProgramResult> {
        const script = this.parseProgramScript;
        if (script === 'method-not-found') {
            throw new ResponseError(ErrorCodes.MethodNotFound, 'Unsupported request method: parseProgram');
        }
        if (script === 'transport-error') {
            // Stands in for a plain rejected promise that is not a JSON-RPC error at all — a
            // failed connect, a closed connection, or a breaker-open short circuit.
            throw new Error('connection reset');
        }
        if (script === 'malformed-result') {
            // A resolved result whose `errors` property is missing entirely.
            return { version: params.version, errors: undefined as unknown as ParseError[] };
        }
        if ('errors' in script) {
            return { version: params.version, errors: script.errors };
        }
        throw new ResponseError(script.code, script.message);
    }

    /** Test seam: simulate a post-outage reconnect or cache-clear-forced reconnect. */
    public simulateReconnect(): void {
        this._connectionGeneration++;
    }

    // Avoid the base class's on-demand package probe (which would resolve uncached FQNs and
    // reach the interop socket). With a seeded index, defer to the base (index-only) path;
    // otherwise resolve candidates from the in-memory index alone.
    public override async resolveClassCandidatesBySimpleName(simpleName: string, token?: CancellationToken): Promise<string[]> {
        if (this.hasCompleteClassIndex()) {
            return super.resolveClassCandidatesBySimpleName(simpleName, token);
        }
        return this.findClassCandidatesBySimpleName(simpleName);
    }

    // --- Hermetic: the test double must never open a real socket to the interop service. ---
    // On CI there is no service on :5008, so real connection attempts reject asynchronously and
    // log via console.*. A late log arriving while a vitest worker closes its RPC channel throws
    // "EnvironmentTeardownError: Closing rpc while onUserConsoleLog was pending" and fails the whole
    // run nondeterministically (green on rerun). The double preloads the classes it needs, so every
    // network path below is a silent no-op instead.

    protected override connect(): Promise<MessageConnection> {
        return Promise.reject(new Error('Java interop is disabled in the test double'));
    }

    public override async loadClasspath(): Promise<boolean> {
        return false;
    }

    public override async loadImplicitImports(): Promise<boolean> {
        return false;
    }

    public override async resolveClassByName(className: string): Promise<JavaClass> {
        // A preloaded class, or a silent stub for anything else — never a socket, never a log.
        return this.getResolvedClass(className) ?? this.stubClass(className);
    }

    private stubClass(className: string): JavaClass {
        const dot = className.lastIndexOf('.');
        return {
            $type: JavaClass.$type,
            name: className,
            packageName: dot >= 0 ? className.substring(0, dot) : '',
            $container: this.classpath,
            $containerProperty: 'classes',
            classes: [], fields: [], methods: [], constructors: [],
            deprecated: false,
            error: 'not resolved (test double)'
        } as unknown as JavaClass;
    }
}

// --- Small, fully-typed factories for fake AST nodes. Every fake Java class/method/field/
// parameter below is a complete JavaClass/JavaMethod/JavaField/JavaMethodParameter object
// (string $type constants from the generated AST, $container wired to its real owner, realName
// mirroring name) rather than a partial literal papered over with a cast.

function makeParameter(container: JavaMethod, name: string, type: string): JavaMethodParameter {
    return {
        $type: JavaMethodParameter.$type,
        $container: container,
        name,
        realName: name,
        type
    }
}

function makeMethod(
    container: JavaClass,
    name: string,
    returnType: string,
    paramSpecs: Array<{ name: string, type: string }> = []
): JavaMethod {
    const method: JavaMethod = {
        $type: JavaMethod.$type,
        name,
        $containerProperty: 'methods',
        $container: container,
        returnType,
        isStatic: false,
        deprecated: false,
        parameters: []
    }
    method.parameters = paramSpecs.map(spec => makeParameter(method, spec.name, spec.type))
    return method
}

function makeField(
    container: JavaClass,
    name: string,
    type: string,
    opts: { isStatic?: boolean } = {}
): JavaField {
    return {
        $type: JavaField.$type,
        name,
        $containerProperty: 'fields',
        $container: container,
        type,
        isStatic: opts.isStatic ?? false,
        deprecated: false
    }
}

function createBBjApiClass(container: Classpath): JavaClass {
    const clazz: JavaClass = {
        $type: JavaClass.$type,
        name: 'BBjAPI',
        packageName: '',
        $container: container,
        $containerProperty: 'classes',
        classes: [],
        fields: [],
        methods: [],
        constructors: [],
        deprecated: false
    }
    clazz.methods = [
        makeMethod(clazz, 'getThinClient', 'java.lang.String')
    ]
    return clazz
}

// Overloaded methods à la BBjSysGui.addWindow: the multi-parameter overload comes first,
// so name-based linking resolves to it and call sites must re-select by arity (#478).
function createSysGuiClass(container: Classpath): JavaClass {
    const clazz: JavaClass = {
        $type: JavaClass.$type,
        name: 'com.test.SysGui',
        // The interop DTO's `simpleName` carries the canonical (fully qualified) name;
        // getDocumentation() depends on it once storeJavaClass has cut `name` down to
        // the simple name. `simpleName` is a runtime-only interop DTO property, not part
        // of the generated JavaClass schema, hence the trailing cast (see bbj-hover.ts's
        // readSimpleName for the read side of the same contract).
        simpleName: 'com.test.SysGui',
        packageName: 'com.test',
        $container: container,
        $containerProperty: 'classes',
        classes: [],
        fields: [],
        methods: [],
        constructors: [],
        deprecated: false
    } as JavaClass
    clazz.methods = [
        makeMethod(clazz, 'addWindow', 'java.lang.Object', [
            { name: 'p_context', type: 'int' },
            { name: 'p_id', type: 'int' },
            { name: 'p_title', type: 'java.lang.String' }
        ]),
        makeMethod(clazz, 'addWindow', 'java.lang.Object', [
            { name: 'p_title', type: 'java.lang.String' }
        ]),
        // The two-parameter addWindow pair: (context, title) vs (title, flags) —
        // same arity, distinguishable only by the argument types in order.
        makeMethod(clazz, 'addWindow', 'java.lang.Object', [
            { name: 'p_context', type: 'int' },
            { name: 'p_title', type: 'java.lang.String' }
        ]),
        makeMethod(clazz, 'addWindow', 'java.lang.Object', [
            { name: 'p_title', type: 'java.lang.String' },
            // byte[] in the real API; the interop service erases arrays to their
            // component type, so this is what the language server actually sees
            { name: 'p_flags', type: 'byte' }
        ]),
        // Like addWindow above, but with the synthetic parameter names produced by
        // reflection on jars compiled without -parameters: the real names exist only
        // in the javadoc (see inlay-hints-javadoc.test.ts).
        makeMethod(clazz, 'openWindow', 'java.lang.Object', [
            { name: 'arg0', type: 'int' },
            { name: 'arg1', type: 'java.lang.String' }
        ]),
        makeMethod(clazz, 'openWindow', 'java.lang.Object', [
            { name: 'arg0', type: 'java.lang.String' },
            { name: 'arg1', type: 'java.lang.String' }
        ]),
        // Not overloaded: its single untyped javadoc entry is an unambiguous match
        // by name+arity alone (inlay-hints-javadoc.test.ts).
        makeMethod(clazz, 'closeWindow', 'void', [
            { name: 'arg0', type: 'int' }
        ]),
        // Like openWindow, but its javadoc entries carry no types (old-format files):
        // the assignment would be a guess, so no doc entry is used and the hints are
        // suppressed (inlay-hints-javadoc.test.ts).
        makeMethod(clazz, 'showDialog', 'java.lang.Object', [
            { name: 'arg0', type: 'int' },
            { name: 'arg1', type: 'java.lang.String' }
        ]),
        makeMethod(clazz, 'showDialog', 'java.lang.Object', [
            { name: 'arg0', type: 'java.lang.String' },
            { name: 'arg1', type: 'java.lang.String' }
        ]),
        // Same arity, different parameter order — only the argument types tell the
        // overloads apart (like the 7-parameter addWindow overloads in the real API).
        makeMethod(clazz, 'setValue', 'void', [
            { name: 'p_index', type: 'int' },
            { name: 'p_text', type: 'java.lang.String' }
        ]),
        makeMethod(clazz, 'setValue', 'void', [
            { name: 'p_text', type: 'java.lang.String' },
            { name: 'p_flags', type: 'int' }
        ])
    ]
    return clazz
}

function createHashMapClass(container: Classpath): JavaClass {
    const clazz: JavaClass = {
        $type: JavaClass.$type,
        name: 'java.util.HashMap',
        packageName: 'java.util',
        $container: container,
        $containerProperty: 'classes',
        classes: [],
        fields: [],
        methods: [],
        constructors: [],
        deprecated: false
    }
    clazz.methods = [
        makeMethod(clazz, 'put', 'java.lang.Object'),
        // inherited from java.lang.Object; needed so `obj!.getClass()` resolves
        makeMethod(clazz, 'getClass', 'java.lang.Class')
    ]
    return clazz
}

function createJavaLangClassClass(container: Classpath): JavaClass {
    const clazz: JavaClass = {
        $type: JavaClass.$type,
        name: 'java.lang.Class',
        packageName: 'java.lang',
        $container: container,
        $containerProperty: 'classes',
        classes: [],
        fields: [],
        methods: [],
        constructors: [],
        deprecated: false
    }
    clazz.methods = [
        makeMethod(clazz, 'getName', 'java.lang.String')
    ]
    return clazz
}

function createJavaLangStringClass(container: Classpath): JavaClass {
    const fakeStringClass: JavaClass = {
        $type: JavaClass.$type,
        name: 'java.lang.String',
        packageName: 'java.lang',
        $container: container,
        $containerProperty: 'classes',
        fields: [],
        classes: [],
        methods: [],
        constructors: [],
        deprecated: false
    }
    fakeStringClass.fields = [
        // static field: accessible via class reference `String.CASE_INSENSITIVE_ORDER` (#440)
        makeField(fakeStringClass, 'CASE_INSENSITIVE_ORDER', 'java.util.Comparator', { isStatic: true }),
        // instance field: must NOT be reachable through a class reference
        makeField(fakeStringClass, 'someInstanceField', 'int')
    ]
    fakeStringClass.methods = [
        makeMethod(fakeStringClass, 'charAt', 'char')
    ]
    return fakeStringClass
}
