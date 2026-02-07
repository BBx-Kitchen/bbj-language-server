/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { CstNode } from 'langium';
import { DefaultDefinitionProvider } from 'langium/lsp';
import type { LangiumServices } from 'langium/lsp';
import { LocationLink } from 'vscode-languageserver';
import type { DefinitionParams } from 'vscode-languageserver';
import { isBbjClass } from './generated/ast.js';

/**
 * Custom definition provider that enhances USE statement navigation.
 *
 * For USE statements with BbjClass references (e.g., USE ::filename.bbj::ClassName),
 * this provider navigates to the specific class declaration line within the file,
 * not just the file start position.
 */
export class BBjDefinitionProvider extends DefaultDefinitionProvider {

    constructor(services: LangiumServices) {
        super(services);
    }

    protected override collectLocationLinks(sourceCstNode: CstNode, params: DefinitionParams): LocationLink[] | undefined {
        const goToLinks = this.findLinks(sourceCstNode);
        if (goToLinks.length === 0) {
            return undefined;
        }

        return goToLinks.map(link => {
            // For USE statements with BbjClass references, navigate to the class name declaration
            const targetNode = link.target.astNode;
            if (isBbjClass(targetNode)) {
                // Find the name node of the BbjClass (the class name in the declaration)
                const nameNode = this.nameProvider.getNameNode(targetNode);
                if (nameNode) {
                    return LocationLink.create(
                        link.targetDocument.textDocument.uri,
                        targetNode.$cstNode?.range ?? nameNode.range,
                        nameNode.range,
                        link.source.range
                    );
                }
            }

            // Default behavior for all other cases
            return LocationLink.create(
                link.targetDocument.textDocument.uri,
                (link.target.astNode.$cstNode ?? link.target).range,
                link.target.range,
                link.source.range
            );
        });
    }
}
