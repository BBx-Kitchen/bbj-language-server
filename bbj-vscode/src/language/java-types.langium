interface Classpath {
    classes: JavaClass[]
}

interface JavaClass {
    name: string
    fields: JavaField[]
    methods: JavaMethod[]

    error?: string
}

type JavaMember = JavaField | JavaMethod

interface JavaField {
    name: string
    type: string

    resolvedType?: @JavaClass
}

interface JavaMethod {
    name: string
    returnType: string
    parameters: JavaMethodParameter[]

    resolvedReturnType?: @JavaClass
}

interface JavaMethodParameter {
    name: string
    type: string

    resolvedType?: @JavaClass
}
