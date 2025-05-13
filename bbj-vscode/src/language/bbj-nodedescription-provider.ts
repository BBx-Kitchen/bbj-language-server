import { AstNode, AstNodeDescription, AstUtils, CstNode, DefaultAstNodeDescriptionProvider, LangiumDocument, Reference, assertUnreachable, isAstNodeDescription } from "langium";
import { Class, JavaClass, JavaMethod, LibEventType, LibFunction, MethodDecl, QualifiedClass } from "./generated/ast.js";
import { documentationHeader } from "./bbj-hover.js";

export class BBjAstNodeDescriptionProvider extends DefaultAstNodeDescriptionProvider {

    override createDescription(node: AstNode, name: string | undefined, document: LangiumDocument = AstUtils.getDocument(node)): AstNodeDescription {
        const descr = super.createDescription(node, name, document);
        switch (node.$type) {
            case MethodDecl: return enhanceFunctionDescription(descr, toMethodData(node as MethodDecl))
            case LibFunction: return enhanceFunctionDescription(descr, node as LibFunction);
            case JavaMethod: return enhanceFunctionDescription(descr, node as JavaMethod);
            case LibEventType: return { ...descr, docu: documentationHeader(node)! } as AstNodeDescription;
            default: return descr;
        }
    }

}

function enhanceFunctionDescription(descr: AstNodeDescription, func: MethodData): FunctionNodeDescription {
    return { ...descr, ...func };
}


export function toMethodData(methDecl: MethodDecl): MethodData {
    return {
        name: methDecl.name,
        parameters: methDecl.params.map(p => { return { name: p.name, type: getFQNFullname(p.type) } }),
        returnType: getFQNFullname(methDecl.returnType)
    }
}

export function getFQNFullname(klass: QualifiedClass|undefined) {
    if(klass) {
        switch(klass.$type) {
            case 'BBjTypeRef': return klass.klass.$refText;
            case 'SimpleTypeRef': return klass.simpleClass.$refText;
            case "JavaTypeRef": return klass.pathParts.map(m => m.symbol.$refText).join('.')  
            default: assertUnreachable(klass);
        }
    }
    return '';
}

export function getClassRefNode(klass: QualifiedClass): CstNode|undefined {
    switch(klass.$type) {
        case 'BBjTypeRef': return klass.klass.$refNode;
        case 'SimpleTypeRef': return klass.simpleClass.$refNode;
        case "JavaTypeRef": return klass.pathParts[klass.pathParts.length-1].symbol.$refNode;
        default: assertUnreachable(klass);
    }
}

export function getClass(klass: QualifiedClass|undefined): Class|undefined {
    if(!klass) {
        return undefined;
    }
    switch(klass.$type) {
        case 'BBjTypeRef': return klass.klass.ref;
        case 'SimpleTypeRef': return klass.simpleClass.ref;
        case "JavaTypeRef":
            const parts = klass.pathParts;
            const symbol = parts[parts.length - 1].symbol;
            return symbol && symbol.ref && symbol.ref.$type === "JavaClass" ? symbol.ref : undefined;
        default: assertUnreachable(klass);
    }
}

export function getClassRef(klass: QualifiedClass|undefined): Reference<Class>|undefined {
    if(!klass) {
        return undefined;
    }
    switch(klass.$type) {
        case 'BBjTypeRef': return klass.klass;
        case 'SimpleTypeRef': return klass.simpleClass;
        case "JavaTypeRef":
            const parts = klass.pathParts;
            const symbol = parts[parts.length - 1].symbol;
            return symbol && symbol.ref && symbol.ref.$type === "JavaClass" ? symbol as Reference<JavaClass> : undefined;
        default: assertUnreachable(klass);
    }
}

export type FunctionNodeDescription = AstNodeDescription & MethodData

export function isFunctionNodeDescription(obj: unknown): obj is FunctionNodeDescription {
    return typeof obj === 'object' && obj !== null && isAstNodeDescription(obj)
        && 'parameters' in obj
        && 'returnType' in obj
}

export type MethodData = {
    name: string,
    parameters: ParameterData[],
    returnType: string
}

export type ParameterData = {
    name: string
    type: string
    optional?: boolean
    realName?: string
}
