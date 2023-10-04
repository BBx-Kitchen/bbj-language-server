import { AstNode, AstNodeDescription, NodeKindProvider, isAstNode } from "langium";
import { CompletionItemKind, SymbolKind } from "vscode-languageserver";
import { ArrayDecl, BbjClass, JavaClass, JavaMethod, LibFunction, MethodDecl } from "./generated/ast";


export class BBjNodeKindProvider implements NodeKindProvider {

   getSymbolKind(node: AstNode | AstNodeDescription): SymbolKind {
        switch (isAstNode(node) ? node.$type : node.type) {
            case MethodDecl:
            case LibFunction:
                return SymbolKind.Function
            case BbjClass:
                return SymbolKind.Class
            case ArrayDecl:
                return SymbolKind.Array
            default:
                return SymbolKind.Field
        }
    }

    getCompletionItemKind(node: AstNode | AstNodeDescription): CompletionItemKind {
        switch (isAstNode(node) ? node.$type : node.type) {
            case MethodDecl:
            case JavaMethod:
            case LibFunction:
                return CompletionItemKind.Function
            case JavaClass:
            case BbjClass:
                return CompletionItemKind.Class
            default:
                return CompletionItemKind.Field
        }
    }
}