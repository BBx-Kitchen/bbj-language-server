import { AstNode, AstNodeDescription, isAstNode } from "langium";
import { NodeKindProvider } from "langium/lsp";
import { CompletionItemKind, SymbolKind } from "vscode-languageserver";
import { ArrayDecl, BbjClass, DefFunction, FieldDecl, JavaClass, JavaMethod, JavaPackage, LabelDecl, LibEventType, LibFunction, MethodDecl, VariableDecl } from "./generated/ast.js";


export class BBjNodeKindProvider implements NodeKindProvider {

   getSymbolKind(node: AstNode | AstNodeDescription): SymbolKind {
        switch (isAstNode(node) ? node.$type : node.type) {
            case LabelDecl.$type:
                return SymbolKind.Key
            case VariableDecl.$type:
            case FieldDecl.$type:
                return SymbolKind.Variable
            case MethodDecl.$type:
                return SymbolKind.Method
            case DefFunction.$type:
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
            case LabelDecl.$type:
                return CompletionItemKind.Keyword
            case VariableDecl.$type:
            case FieldDecl.$type:
                return CompletionItemKind.Variable
            case MethodDecl.$type:
                return CompletionItemKind.Method
            case DefFunction.$type:
            case LibFunction.$type:
            case JavaMethod.$type:
                return CompletionItemKind.Function
            case JavaClass.$type:
            case BbjClass.$type:
                return CompletionItemKind.Class
            case LibEventType.$type:
                return CompletionItemKind.Event
            case JavaPackage.$type:
                return CompletionItemKind.Folder
            default:
                return CompletionItemKind.Field
        }
    }
}