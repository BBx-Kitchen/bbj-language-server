import { AstNode } from "langium";
import { AbstractSemanticTokenProvider, LangiumServices, SemanticTokenAcceptor } from "langium/lsp";
import { SymbolRef, ParameterDecl } from "./generated/ast.js";
import { SemanticTokenTypes } from "vscode-languageserver-types";

export class BBjSemanticTokenProvider extends AbstractSemanticTokenProvider {
    constructor(services: LangiumServices) {
        super(services);
    }

    protected override highlightElement(node: AstNode, acceptor: SemanticTokenAcceptor): void | undefined | "prune" {
        switch (node.$type) {
            case ParameterDecl:
                return acceptor({ node: node as ParameterDecl, property: 'name', type: SemanticTokenTypes.variable });
            case SymbolRef:
                return this.highlightSymbolRef(node as SymbolRef, acceptor);
        }
    }

    protected highlightSymbolRef(node: SymbolRef, acceptor: SemanticTokenAcceptor): void {
        acceptor({ node: node, property: 'instanceAccess', type: SemanticTokenTypes.keyword });
        acceptor({ node: node, property: 'symbol', type: SemanticTokenTypes.variable });
        acceptor({ node: node, property: 'isMethodCall', type: SemanticTokenTypes.keyword });
        acceptor({ node: node, property: 'err', type: SemanticTokenTypes.keyword });
    }
}