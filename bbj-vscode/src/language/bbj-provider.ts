import { AstNode, MaybePromise, MultilineCommentHoverProvider } from "langium";
import { Hover } from "vscode-languageclient";
import { isLibFunction } from "./generated/ast";

export class BBjHoverProvider extends MultilineCommentHoverProvider {

    protected override getAstNodeHoverContent(node: AstNode): MaybePromise<Hover | undefined> {
        if (isLibFunction(node) && node.docu && node.docu.length > 4) {
            return {
                contents: {
                    kind: 'markdown',
                    value: node.docu.substring(2, node.docu.length - 2).trim()
                }
            };
        }
        return super.getAstNodeHoverContent(node);
    }
}