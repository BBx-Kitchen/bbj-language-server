import { AstNode, AstUtils, LangiumDocument } from "langium";
import { LangiumSharedServices } from "langium/lsp";
import { Socket } from "net";

export function isPortOpen(port: number, host = '127.0.0.1') {
  return new Promise<boolean>((resolve) => {
    const socket = new Socket();

    socket.setTimeout(1000);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      resolve(false);
    });

    socket.connect(port, host);
  });
}
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
