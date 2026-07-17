import { DeepPartial, IndexManager, Module, inject } from "langium";
import { PartialLangiumServices, createDefaultModule, createDefaultSharedModule, LangiumSharedServices, DefaultSharedModuleContext } from "langium/lsp";
import { BBjAddedServices, BBjModule, BBjServices, BBjSharedModule } from "../src/language/bbj-module.js";
import { BBjGeneratedModule, BBjGeneratedSharedModule } from "../src/language/generated/module.js";
import { registerValidationChecks } from "../src/language/bbj-validator.js";
import { JavaInteropService } from "../src/language/java-interop.js";
import { Classpath, JavaClass, JavaField, JavaMethod } from "../src/language/generated/ast.js";
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
            createJavaLangClassClass(this.classpath)
        ]
        fakeJavaClasses.forEach(clazz => {
            this.classpath.classes.push(clazz)
            this.resolveClass(clazz)
        })

        if (!this.langiumDocuments.hasDocument(this.classpathDocument.uri)) {
            this.langiumDocuments.addDocument(this.classpathDocument);
        }
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
