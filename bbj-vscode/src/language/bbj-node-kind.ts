import { AstNode, AstNodeDescription, isAstNode } from "langium";
import { NodeKindProvider } from "langium/lsp";
import { CompletionItemKind, SymbolKind } from "vscode-languageserver";
import { ArrayDecl, BbjClass, JavaClass, JavaMethod, JavaPackage, LibEventType, LibFunction, MethodDecl } from "./generated/ast.js";


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
            case LibEventType:
                return SymbolKind.Event
            case JavaPackage:
                return SymbolKind.Package
            default:
                return SymbolKind.Field
        }
    }

    getCompletionItemKind(node: AstNode | AstNodeDescription): CompletionItemKind {
        switch (isAstNode(node) ? node.$type : node.type) {
            case LibEventType:
                return CompletionItemKind.Event
            case MethodDecl:
            case JavaMethod:
            case LibFunction:
                return CompletionItemKind.Function
            case JavaClass:
            case BbjClass:
                return CompletionItemKind.Class
            case JavaPackage:
                return CompletionItemKind.Folder
            default:
                return CompletionItemKind.Field
        }
    }
}