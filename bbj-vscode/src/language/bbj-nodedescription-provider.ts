import { AstNode, AstNodeDescription, AstUtils, DefaultAstNodeDescriptionProvider, LangiumDocument, isAstNodeDescription } from "langium";
import { JavaMethod, LibEventType, LibFunction, MethodDecl } from "./generated/ast.js";
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
        parameters: methDecl.params.map(p => { return { name: p.name, type: p.type?.type.$refText ?? '' } }),
        returnType: methDecl.returnType?.type.$refText ?? ''
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
