import { AstNode, LangiumDocument, LangiumSharedServices, streamContents } from "langium";

/**
 * Load libraries.
 */
export async function initializeWorkspace(shared: LangiumSharedServices) {
    const wsManager = shared.workspace.WorkspaceManager;
    await wsManager.initializeWorkspace([{ name: 'test', uri: 'file:///' }]);
}

export function findFirst<T extends AstNode = AstNode>(document: LangiumDocument, filter: (item: unknown) => item is T): T | undefined {
    return streamContents(document.parseResult.value).find(filter);
}
