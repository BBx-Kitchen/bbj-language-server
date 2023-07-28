import { AstNode, MaybePromise, MultilineCommentHoverProvider } from "langium";
import { Hover } from "vscode-languageclient";
import { isClass, isLibMember } from "./generated/ast";

export class BBjHoverProvider extends MultilineCommentHoverProvider {

    protected override getAstNodeHoverContent(node: AstNode): MaybePromise<Hover | undefined> {
        if (isLibMember(node) && node.docu && node.docu.length > 5) {
            return {
                contents: {
                    kind: 'markdown',
                    value: node.docu.substring(3, node.docu.length - 2).replaceAll('\\`', '`').trim()
                }
            };
        }
        const docu = super.getAstNodeHoverContent(node);
        if(!docu) {
            if(isClass(node)) {
                return {
                    contents: {
                        kind: 'markdown',
                        value: `${node.$type}: ${(node as any)['simpleName']?(node as any)['simpleName']:node.name}`
                    }
                };
            }
        }
        return docu;
    }
}