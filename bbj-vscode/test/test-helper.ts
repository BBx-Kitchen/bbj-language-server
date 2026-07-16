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
 * Gate for tests that require the BBj/Java side (Java classpath resolution via the
 * interop service on port 5008, or the bbjcpl compiler). These cannot pass in an
 * environment without BBj (e.g. GitHub CI), so they are opt-in:
 *
 *   - RUN_BBJ_TESTS=1 (or `npm run test:bbj`) forces them on — request them explicitly.
 *   - RUN_BBJ_TESTS=0 forces them off.
 *   - Unset (default): they run only when the interop service is actually reachable
 *     on port 5008 (local dev with BBjServices up), and are skipped otherwise.
 *
 * Use with vitest's `describe.runIf(...)` / `test.runIf(...)`.
 */
export async function shouldRunBBjTests(): Promise<boolean> {
  const flag = process.env.RUN_BBJ_TESTS?.trim().toLowerCase();
  if (flag === '1' || flag === 'true' || flag === 'yes') return true;
  if (flag === '0' || flag === 'false' || flag === 'no') return false;
  return isPortOpen(5008);
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
