import { AstNode, AstNodeDescription, DefaultAstNodeDescriptionProvider, LangiumDocument, getDocument, isAstNodeDescription } from "langium";
import { JavaMethod, MethodDecl } from "./generated/ast";


export class BBjAstNodeDescriptionProvider extends DefaultAstNodeDescriptionProvider {

    override createDescription(node: AstNode, name: string | undefined, document: LangiumDocument = getDocument(node)): AstNodeDescription {
        const descr = super.createDescription(node, name, document);
        switch (node.$type) {
            case MethodDecl: {
                const method = node as MethodDecl
                return enhanceFunctionDescription(descr, {
                    returnType: method.returnType?.$refText ?? '',
                    parameters: method.params.map(p => { return { name: p.name, type: p.type?.$refText ?? '' } })
                })
            };
            case JavaMethod: return enhanceFunctionDescription(descr, node as JavaMethod);
            default: return descr;
        }
    }

}

function enhanceFunctionDescription(descr: AstNodeDescription, func: { returnType: string, parameters: { name: string, type: string }[] }): FunctionNodeDescription {
    return {
        ...descr,
        parameters: func.parameters.map(p => { return { name: p.name, type: p.type } }),
        returnType: func.returnType
    };
}

export type FunctionNodeDescription = AstNodeDescription & {
    parameters: { name: string, type: string }[]
    returnType: string
}

export function isFunctionNodeDescription(obj: unknown): obj is FunctionNodeDescription {
    return typeof obj === 'object' && obj !== null && isAstNodeDescription(obj)
        && 'parameters' in obj
        && 'returnType' in obj
}