import { DeepPartial, IndexManager, Module, inject } from "langium";
import { PartialLangiumServices, createDefaultModule, createDefaultSharedModule, LangiumSharedServices, DefaultSharedModuleContext } from "langium/lsp";
import { BBjAddedServices, BBjModule, BBjServices, BBjSharedModule } from "../src/language/bbj-module.js";
import { BBjGeneratedModule, BBjGeneratedSharedModule } from "../src/language/generated/module.js";
import { registerValidationChecks } from "../src/language/bbj-validator.js";
import { JavaInteropService } from "../src/language/java-interop.js";
import { Classpath, JavaClass, JavaField, JavaMethod } from "../src/language/generated/ast.js";
import { CancellationToken, MessageConnection } from "vscode-jsonrpc/node.js";
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
    public prepareLineSplitter(text: string): string {
        return super.prepareLineSplitter(text)
    }
}

class JavaInteropTestService extends JavaInteropService {
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

function createBBjApiClass(container: Classpath) {
    const clazz: JavaClass = {
        $type: JavaClass,
        name: 'BBjAPI',
        packageName: '',
        $container: container,
        $containerProperty: 'classes',
        classes: [],
        fields: [],
        methods: []
    }
    clazz.methods = [
        {
            name: 'getThinClient',
            $containerProperty: 'methods',
            $container: clazz,
            returnType: 'java.lang.String',
            $type: JavaMethod,
            parameters: []
        }
    ]
    return clazz
}

// Overloaded methods à la BBjSysGui.addWindow: the multi-parameter overload comes first,
// so name-based linking resolves to it and call sites must re-select by arity (#478).
function createSysGuiClass(container: Classpath) {
    const clazz: JavaClass = {
        $type: JavaClass,
        name: 'com.test.SysGui',
        packageName: 'com.test',
        $container: container,
        $containerProperty: 'classes',
        classes: [],
        fields: [],
        methods: []
    }
    clazz.methods = [
        {
            name: 'addWindow',
            $containerProperty: 'methods',
            $container: clazz,
            returnType: 'java.lang.Object',
            $type: JavaMethod,
            parameters: [
                { name: 'p_context', type: 'int' },
                { name: 'p_id', type: 'int' },
                { name: 'p_title', type: 'java.lang.String' }
            ]
        },
        {
            name: 'addWindow',
            $containerProperty: 'methods',
            $container: clazz,
            returnType: 'java.lang.Object',
            $type: JavaMethod,
            parameters: [
                { name: 'p_title', type: 'java.lang.String' }
            ]
        }
    ]
    return clazz
}

function createHashMapClass(container: Classpath) {
    const clazz: JavaClass = {
        $type: JavaClass,
        name: 'java.util.HashMap',
        packageName: 'java.util',
        $container: container,
        $containerProperty: 'classes',
        classes: [],
        fields: [],
        methods: []
    }
    clazz.methods = [
        {
            name: 'put',
            $containerProperty: 'methods',
            $container: clazz,
            returnType: 'java.lang.Object',
            $type: JavaMethod,
            parameters: []
        },
        {
            // inherited from java.lang.Object; needed so `obj!.getClass()` resolves
            name: 'getClass',
            $containerProperty: 'methods',
            $container: clazz,
            returnType: 'java.lang.Class',
            $type: JavaMethod,
            parameters: []
        }
    ]
    return clazz
}

function createJavaLangClassClass(container: Classpath): JavaClass {
    const clazz: JavaClass = {
        $type: JavaClass,
        name: 'java.lang.Class',
        packageName: 'java.lang',
        $container: container,
        $containerProperty: 'classes',
        classes: [],
        fields: [],
        methods: []
    }
    clazz.methods = [
        {
            name: 'getName',
            $containerProperty: 'methods',
            $container: clazz,
            returnType: 'java.lang.String',
            $type: JavaMethod,
            parameters: []
        }
    ]
    return clazz
}

function createJavaLangStringClass(container: Classpath): JavaClass {
    const fakeStringClass: JavaClass = {
        $type: JavaClass,
        name: 'java.lang.String',
        packageName: 'java.lang',
        $container: container,
        $containerProperty: 'classes',
        fields: [],
        classes: [],
        methods: []
    }
    fakeStringClass.fields = [
        {
            // static field: accessible via class reference `String.CASE_INSENSITIVE_ORDER` (#440)
            name: 'CASE_INSENSITIVE_ORDER',
            $containerProperty: 'fields',
            $container: fakeStringClass,
            type: 'java.util.Comparator',
            isStatic: true,
            deprecated: false,
            $type: JavaField
        },
        {
            // instance field: must NOT be reachable through a class reference
            name: 'someInstanceField',
            $containerProperty: 'fields',
            $container: fakeStringClass,
            type: 'int',
            isStatic: false,
            deprecated: false,
            $type: JavaField
        }
    ]
    fakeStringClass.methods = [
        {
            name: 'charAt',
            $containerProperty: 'methods',
            $container: fakeStringClass,
            returnType: 'char',
            $type: JavaMethod,
            parameters: []
        }
    ]
    return fakeStringClass
}
