/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { CstNode } from 'langium';
import { DefaultDefinitionProvider } from 'langium/lsp';
import type { LangiumServices } from 'langium/lsp';
import { LocationLink, Range } from 'vscode-languageserver';
import type { CancellationToken, DefinitionParams } from 'vscode-languageserver';
import type { LangiumDocument, MaybePromise } from 'langium';
import { isBbjClass } from './generated/ast.js';
import { findLeafNodeAtOffset } from './bbj-validator.js';
import { findRunCallTargetAtLeaf, resolveRunCallPath, type RunCallResolutionContext } from './run-call-target.js';
import type { BBjWorkspaceManager } from './bbj-ws-manager.js';

const ZERO_RANGE = Range.create(0, 0, 0, 0);

/**
 * Custom definition provider that enhances USE statement navigation.
 *
 * For USE statements with BbjClass references (e.g., USE ::filename.bbj::ClassName),
 * this provider navigates to the specific class declaration line within the file,
 * not just the file start position.
 *
 * Also handles RUN/CALL file literals (#663): a string literal has no declaration, so the
 * default declaration-resolution path in `getDefinition` never reaches it.
 */
export class BBjDefinitionProvider extends DefaultDefinitionProvider {

    private readonly runCallContext: RunCallResolutionContext;

    constructor(services: LangiumServices) {
        super(services);
        this.runCallContext = {
            langiumDocuments: services.shared.workspace.LangiumDocuments,
            fileSystemProvider: services.shared.workspace.FileSystemProvider,
            workspaceManager: services.shared.workspace.WorkspaceManager as BBjWorkspaceManager
        };
    }

    override getDefinition(document: LangiumDocument, params: DefinitionParams, cancelToken?: CancellationToken): MaybePromise<LocationLink[] | undefined> {
        const rootNode = document.parseResult.value.$cstNode;
        if (rootNode) {
            const offset = document.textDocument.offsetAt(params.position);
            const leaf = findLeafNodeAtOffset(rootNode, offset);
            if (leaf && leaf.offset + leaf.length > offset) {
                const target = findRunCallTargetAtLeaf(leaf);
                if (target) {
                    const resolvedUri = resolveRunCallPath(target.path, document.uri, this.runCallContext);
                    if (resolvedUri && target.literal.$cstNode) {
                        return [LocationLink.create(resolvedUri.toString(), ZERO_RANGE, ZERO_RANGE, target.literal.$cstNode.range)];
                    }
                    return undefined;
                }
            }
        }
        return super.getDefinition(document, params, cancelToken);
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
