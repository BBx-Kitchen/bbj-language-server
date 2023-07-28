import { DeepPartial, DefaultSharedModuleContext, LangiumSharedServices, Module, PartialLangiumServices, createDefaultModule, createDefaultSharedModule, inject } from "langium";
import { BBjAddedServices, BBjModule, BBjServices, BBjSharedModule } from "../src/language/bbj-module";
import { BBjGeneratedModule, BBjGeneratedSharedModule } from "../src/language/generated/module";
import { registerValidationChecks } from "../src/language/bbj-validator";
import { JavaInteropService } from "../src/language/java-interop";
import { Classpath, JavaClass, JavaMethod } from "../src/language/generated/ast";

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
    java: {
        JavaInteropService: (services) => new JavaInteropTestService(services)
    }
}

class JavaInteropTestService extends JavaInteropService {

    constructor(services: BBjServices) {
        super(services)
        if (!this.langiumDocuments.hasDocument(this.classpathDocument.uri)) {
            this.langiumDocuments.addDocument(this.classpathDocument);
        }
    }

    override getResolvedClass(className: string): JavaClass | undefined {
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