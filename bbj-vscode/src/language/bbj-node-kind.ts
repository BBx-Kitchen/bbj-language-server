import { AstNode, AstNodeDescription, isAstNode } from "langium";
import { NodeKindProvider } from "langium/lsp";
import { CompletionItemKind, SymbolKind } from "vscode-languageserver";
import { ArrayDecl, BbjClass, JavaClass, JavaMethod, JavaPackage, LibEventType, LibFunction, MethodDecl } from "./generated/ast.js";


export class BBjNodeKindProvider implements NodeKindProvider {

   getSymbolKind(node: AstNode | AstNodeDescription): SymbolKind {
        switch (isAstNode(node) ? node.$type : node.type) {
            case MethodDecl.$type:
            case LibFunction.$type:
                return SymbolKind.Function
            case BbjClass.$type:
                return SymbolKind.Class
            case ArrayDecl.$type:
                return SymbolKind.Array
            case LibEventType.$type:
                return SymbolKind.Event
            case JavaPackage.$type:
                return SymbolKind.Package
            default:
                return SymbolKind.Field
        }
    }

    getCompletionItemKind(node: AstNode | AstNodeDescription): CompletionItemKind {
        switch (isAstNode(node) ? node.$type : node.type) {
            case LibEventType.$type:
                return CompletionItemKind.Event
            case MethodDecl.$type:
            case JavaMethod.$type:
            case LibFunction.$type:
                return CompletionItemKind.Function
            case JavaClass.$type:
            case BbjClass.$type:
                return CompletionItemKind.Class
            case JavaPackage.$type:
                return CompletionItemKind.Folder
            default:
                return CompletionItemKind.Field
        }
    }
}