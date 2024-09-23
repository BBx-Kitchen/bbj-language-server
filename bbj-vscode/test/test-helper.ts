import { AstNode, AstUtils, LangiumDocument } from "langium";
import { LangiumSharedServices } from "langium/lsp";

/**
 * Load libraries.
 */
export async function initializeWorkspace(shared: LangiumSharedServices) {
    const wsManager = shared.workspace.WorkspaceManager;
    await wsManager.initializeWorkspace([{ name: 'test', uri: 'file:/test' }]);
}

export function findFirst<T extends AstNode = AstNode>(document: LangiumDocument, filter: (item: unknown) => item is T, streamAll: boolean = false): T | undefined {
    return (streamAll ? AstUtils.streamAllContents(document.parseResult.value) : AstUtils.streamContents(document.parseResult.value)).find(filter);
}

export function findByIndex<T extends AstNode = AstNode>(document: LangiumDocument, filter: (item: unknown) => item is T, index: number): T | undefined {
    const matches = AstUtils.streamContents(document.parseResult.value).filter(filter).toArray();
    if (index < 0 || index >= matches.length) {
        return undefined;
    }
    return matches[index];
}
