import { AstNode, MaybePromise, MultilineCommentHoverProvider } from "langium";
import { Hover } from "vscode-languageclient";
import { MethodData, toMethodData } from "./bbj-nodedescription-provider";
import { isClass, isJavaMethod, isLibMember, isMethodDecl } from "./generated/ast";

export class BBjHoverProvider extends MultilineCommentHoverProvider {

    protected override getAstNodeHoverContent(node: AstNode): MaybePromise<Hover | undefined> {
        if (isClass(node)) {
            const superDocu = super.getAstNodeHoverContent(node);
            if (superDocu) {
                return superDocu;
            }

        }
        return documentationContent(node);
    }
}

export function documentationContent(node: AstNode): Hover | undefined {
    if (isLibMember(node) && node.docu && node.docu.length > 5) {
        return {
            contents: {
                kind: 'markdown',
                value: node.docu.substring(3, node.docu.length - 2).replaceAll('\\`', '`').trim()
            }
        };
    }
    if (isClass(node)) {
        return {
            contents: {
                kind: 'markdown',
                value: `${node.$type}: ${(node as any)['simpleName'] ? (node as any)['simpleName'] : node.name}`
            }
        };
    }
    if (isJavaMethod(node)) {
        return {
            contents: {
                kind: 'markdown',
                value: 'Java Function: ' + methodSignature(node)
            }
        };
    }
    if (isMethodDecl(node)) {
        return {
            contents: {
                kind: 'markdown',
                value: 'Java Function: ' + methodSignature(toMethodData(node))
            }
        };
    }
    return undefined;
}


export function methodSignature(nodeDescription: MethodData, typeAdjust: ((type: string) => string) = (t) => t) {
    return `${nodeDescription.name}(${nodeDescription.parameters.map(p => `${typeAdjust(p.type)} ${p.name}${p.optional ? '?' : ''}`).join(', ')})`
}