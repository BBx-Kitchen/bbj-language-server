import { AstNode, AstNodeDescription, DefaultDocumentSymbolProvider, isAstNode } from "langium";
import { CompletionItemKind, SymbolKind } from "vscode-languageserver";
import { ArrayDecl, BbjClass, JavaClass, JavaMethod, LibFunction, MethodDecl } from "./generated/ast";



export class BBjDocumentSymbolProvider extends DefaultDocumentSymbolProvider {

    protected override getSymbolKind(type: string): SymbolKind {
        return BBjNodeKindProvider.getSymbolKind(type);
    }
}

export class BBjNodeKindProvider {

   static getSymbolKind(nodeType: string): SymbolKind {
        switch (nodeType) {
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

    static getCompletionItemKind(node: AstNode | AstNodeDescription): CompletionItemKind {
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