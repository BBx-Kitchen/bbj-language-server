/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

interface Classpath {
    classes: JavaClass[]
}

interface NamedElement {
    name: string
}

interface Class extends NamedElement {
}

interface DocumentationInfo {
    javadoc: string
    signature?: string
}

interface Documented {
    docu?: DocumentationInfo
}

interface JavaClass extends Class, Documented {
    fields: JavaField[]
    methods: JavaMethod[]
    error?: string
}

type JavaMember = JavaField | JavaMethod

interface JavaField extends NamedElement, Documented {
    type: string
    resolvedType?: @JavaClass
}

interface JavaMethod extends NamedElement, Documented {
    returnType: string
    parameters: JavaMethodParameter[]
    resolvedReturnType?: @JavaClass
}

interface JavaMethodParameter {
    name: string
    type: string

    resolvedType?: @JavaClass
}
