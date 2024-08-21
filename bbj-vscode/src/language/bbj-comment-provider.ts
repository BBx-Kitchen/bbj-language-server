import { AstNode, GenericAstNode } from "langium";
import { CommentProvider } from "langium/lib/documentation/comment-provider";
import { CommentStatement, isBBjClassMember, isBbjClass, isCommentStatement } from "./generated/ast";

export class BBjCommentProvider implements CommentProvider {

    getComment(node: AstNode): string | undefined {
        if (isBbjClass(node) || isBBjClassMember(node)) {
            if (node.$containerProperty && node.$containerIndex) {
                const siblings = (node.$container as AstNode as GenericAstNode)[node.$containerProperty]
                if (Array.isArray(siblings)) {
                    const comments = []
                    for (let index = node.$containerIndex - 1; index >= 0; index--) {
                        const element = siblings[index];
                        if (isCommentStatement(element)) {
                            comments.push(cutRemKeyword(element));
                        } else {
                            break;
                        }
                    }
                    if (comments.length > 0 && comments[comments.length - 1]?.startsWith('/**')) {
                        // only return javadoc comments
                        return comments.reverse().join('\n');
                    }
                }
            }
        }
        return undefined;
    }
}

function cutRemKeyword(comment: CommentStatement) {
    return comment.$cstNode?.text?.slice(3)?.trim();
}