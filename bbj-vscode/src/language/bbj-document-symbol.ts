import { DefaultDocumentSymbolProvider } from "langium";
import { SymbolKind } from "vscode-languageserver";
import { ArrayDecl, BbjClass, LibFunction, MethodDecl } from "./generated/ast";


export class BBjDocumentSymbolProvider extends DefaultDocumentSymbolProvider {

    protected override getSymbolKind(type: string): SymbolKind {
        switch (type) {
            case MethodDecl:
            case LibFunction:
                return SymbolKind.Function
            case BbjClass:
                return SymbolKind.Class
            case ArrayDecl:
                return SymbolKind.Array
            default:
                return super.getSymbolKind(type);
        }
    }
}