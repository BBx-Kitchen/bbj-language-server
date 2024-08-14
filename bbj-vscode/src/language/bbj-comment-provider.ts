import { AstNode, getPreviousNode } from "langium";
import { CommentProvider } from "langium/lib/documentation/comment-provider";
import { isRuleCall } from "langium/lib/grammar/generated/ast";
import { isBBjClassMember, isBbjClass } from "./generated/ast";

export class BBjCommentProvider implements CommentProvider {

    getComment(node: AstNode): string | undefined {
        if (isBbjClass(node) || isBBjClassMember(node)) {
            if (node.comments.length > 0) {
                // TODO check why commented nodes have an empty array.
                return node.comments.map(c => c.$cstNode?.text).join('\n');
            }
        }
        if (node.$cstNode) {
            const previous = getPreviousNode(node.$cstNode, false);
            if (previous && isRuleCall(previous.feature) && previous.feature.rule.$refText === 'Comments') {
                return previous.text;
            }
        }
        return undefined;
    }
}