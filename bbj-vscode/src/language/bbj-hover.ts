import { AstNode, MaybePromise, MultilineCommentHoverProvider } from "langium";
import { Hover } from "vscode-languageclient";
import { isLibMember } from "./generated/ast";

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
        return super.getAstNodeHoverContent(node);
    }
}