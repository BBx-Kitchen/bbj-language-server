import { AstNode, GenericAstNode } from "langium";
import { CommentProvider } from "langium";
import { CommentStatement, isBBjClassMember, isBbjClass, isCommentStatement } from "./generated/ast.js";

export class BBjCommentProvider implements CommentProvider {

    getComment(node: AstNode): string | undefined {
        if (isBbjClass(node)) {
            if (node.$containerProperty !== undefined && node.$containerIndex !== undefined) {
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
        } else if (isBBjClassMember(node) && isBbjClass(node.$container)) {
            // Note: BBjClassMember includes VariableDecl, which is also a plain DECLARE
            // statement that can live outside a class (in a Program or method body). Only
            // treat it as a class member when its container really is a BbjClass — otherwise
            // clazz.comments / clazz.members are undefined and iterating them throws (#comment-crash).
            const untilOffset = node.$cstNode?.offset;
            const clazz = node.$container;
            const fromOffset = node.$containerIndex === 0 ? clazz.$cstNode?.offset : clazz.members[node.$containerIndex! - 1].$cstNode?.end;
            const comments = []
            for (const comment of clazz.comments ?? []) {
                if (comment.$cstNode?.offset! < untilOffset! && comment.$cstNode?.end! > fromOffset!) {
                    const commentText = cutRemKeyword(comment);
                    if (commentText?.startsWith('/**')) {
                        if (comments.length > 0) {
                            comments.length = 0; // reset comments
                        }
                        comments.push(commentText);
                    } else if (comments.length > 0) {
                        comments.push(commentText);
                    }
                }
            };
            return comments.join('\n');
        }
        return undefined;
    }
}

function cutRemKeyword(comment: CommentStatement) {
    return comment.$cstNode?.text?.slice(3)?.trim();
}