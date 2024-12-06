import { DeepPartial, IndexManager, Module, inject } from "langium";
import { PartialLangiumServices, createDefaultModule, createDefaultSharedModule, LangiumSharedServices, DefaultSharedModuleContext } from "langium/lsp";
import { BBjAddedServices, BBjModule, BBjServices, BBjSharedModule } from "../src/language/bbj-module.js";
import { BBjGeneratedModule, BBjGeneratedSharedModule } from "../src/language/generated/module.js";
import { registerValidationChecks } from "../src/language/bbj-validator.js";
import { JavaInteropService } from "../src/language/java-interop.js";
import { JavaClass, JavaMethod } from "../src/language/generated/ast.js";
import { BbjLexer } from "../src/language/bbj-lexer.js";

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
    protected readonly index: () => IndexManager;
    private indexed: boolean = false;

    constructor(services: BBjServices) {
        super(services)
        this.index = () => services.shared.workspace.IndexManager

        const bbjApi: JavaClass = {
            $type: JavaClass,
            name: 'BBjAPI',
            $container: this.classpathDocument.parseResult.value,
            $containerProperty: 'classes',
            fields: [],
            methods: []
        }
        bbjApi.methods = [
            {
                name: 'getThinClient',
                $containerProperty: 'methods',
                $container: bbjApi,
                returnType: 'java.lang.String',
                $type: JavaMethod,
                parameters: []
            }
        ]
        this.classpathDocument.parseResult.value.classes.push(bbjApi)
        this.resolveClass(bbjApi)

        if (!this.langiumDocuments.hasDocument(this.classpathDocument.uri)) {
            this.langiumDocuments.addDocument(this.classpathDocument);
        }
    }

    override getResolvedClass(className: string): JavaClass | undefined {
        if (!this.indexed) {
            this.index().updateContent(this.classpathDocument)
            this.indexed = true
        }
        if (className === 'java.lang.String') {
            const fakeStringClass: JavaClass = {
                $type: JavaClass,
                name: 'java.lang.String',
                $container: this.classpath,
                $containerProperty: 'classes',
                fields: [],
                methods: []
            }
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
        return super.getResolvedClass(className)
    }
}