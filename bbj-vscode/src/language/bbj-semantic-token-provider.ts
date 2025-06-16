import { AstNode } from "langium";
import { AbstractSemanticTokenProvider, LangiumServices, SemanticTokenAcceptor } from "langium/lsp";
import { SymbolRef, ParameterDecl, MethodCall } from "./generated/ast.js";
import { SemanticTokenTypes } from "vscode-languageserver-types";

export class BBjSemanticTokenProvider extends AbstractSemanticTokenProvider {
    constructor(services: LangiumServices) {
        super(services);
    }

    protected override highlightElement(node: AstNode, acceptor: SemanticTokenAcceptor): void | undefined | "prune" {
        switch (node.$type) {
            case ParameterDecl:
                return acceptor({ node: node as ParameterDecl, property: 'name', type: SemanticTokenTypes.parameter });
            case SymbolRef:
                return this.highlightSymbolRef(node as SymbolRef, acceptor);
            case MethodCall:
                return this.highlightMethodCall(node as MethodCall, acceptor);
        }
    }
    
    protected highlightMethodCall(node: MethodCall, acceptor: SemanticTokenAcceptor): void {
        acceptor({ node: node, keyword: '(', type: SemanticTokenTypes.keyword });
        acceptor({ node: node, property: 'err', type: SemanticTokenTypes.keyword });
    }

    protected highlightSymbolRef(node: SymbolRef, acceptor: SemanticTokenAcceptor): void {
        acceptor({ node: node, property: 'instanceAccess', type: SemanticTokenTypes.keyword });
        acceptor({ node: node, property: 'symbol', type: SemanticTokenTypes.variable });
    }
}