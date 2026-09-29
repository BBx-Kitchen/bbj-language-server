import { AstNode, AstUtils, DocumentState, LangiumDocument } from "langium";
import { LangiumSharedServices } from "langium/lsp";
import { Socket } from "net";
import { createMessageConnection, RequestType, SocketMessageReader, SocketMessageWriter } from "vscode-jsonrpc/node.js";
import { JavaSyntheticDocUri } from "../src/language/java-interop.js";

/** The one request every cheap peer answers, and the request java-interop.ts itself sends. */
const getClassInfoRequest = new RequestType<{ className: string }, unknown, void>('getClassInfo');

/**
 * Asks whatever is listening on `host:port` a real JSON-RPC `getClassInfo` question for
 * `java.lang.Object`, instead of trusting a bare TCP connect. Resolves `true` only when the
 * reply is a non-null object with a string `name` and no `error` property — a bare open port, a
 * peer that never answers, or a peer that answers something else all resolve `false`.
 *
 * Settles exactly once via a guard flag. On every path — success, any socket error, a JSON-RPC
 * error reply, a malformed reply, or the single overall timer firing — the timer is cleared, the
 * message connection (if one was created) is disposed, and the socket is destroyed.
 */
export function isInteropPeerAnswering(port: number, host = '127.0.0.1', timeoutMs = 3000): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    let settled = false;
    const socket = new Socket();
    let connection: ReturnType<typeof createMessageConnection> | undefined;

    const timer = setTimeout(() => settle(false), timeoutMs);

    function settle(result: boolean): void {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      connection?.dispose();
      socket.destroy();
      resolve(result);
    }

    socket.on('error', () => settle(false));
    socket.on('close', () => settle(false));

    socket.on('connect', () => {
      connection = createMessageConnection(new SocketMessageReader(socket), new SocketMessageWriter(socket));
      connection.listen();
      connection.sendRequest(getClassInfoRequest, { className: 'java.lang.Object' })
        .then((reply) => {
          const isAnsweringClass = reply !== null && typeof reply === 'object'
            && typeof (reply as { name?: unknown }).name === 'string'
            && !('error' in (reply as object));
          settle(isAnsweringClass);
        })
        .catch(() => settle(false));
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
 *   - Unset (default): they run only when a working interop peer answers a real
 *     `getClassInfo` request on port 5008 (local dev with BBjServices up) — a bare open
 *     port no longer counts — and are skipped otherwise.
 *
 * Use with vitest's `describe.runIf(...)` / `test.runIf(...)`.
 */
export async function shouldRunBBjTests(): Promise<boolean> {
  const flag = process.env.RUN_BBJ_TESTS?.trim().toLowerCase();
  if (flag === '1' || flag === 'true' || flag === 'yes') return true;
  if (flag === '0' || flag === 'false' || flag === 'no') return false;
  return isInteropPeerAnswering(5008);
}

/**
 * Load libraries.
 */
export async function initializeWorkspace(shared: LangiumSharedServices) {
  const wsManager = shared.workspace.WorkspaceManager;
  await wsManager.initializeWorkspace([{ name: 'test', uri: 'file:/test' }]);
}

/**
 * Indexes the synthetic Java classpath document (`classpath:/bbj.bbl`) into the shared
 * IndexManager, the same way production does before any user document links against it.
 *
 * In production, `loadImplicitImports()` (or a workspace build that reaches it) indexes the
 * classpath document before any real source file is parsed, so a Java class reached by its
 * simple name — or `BBjAPI()` resolving to its JavaClass — is already visible in the global
 * scope. A `parseHelper` suite builds only the single document it parses; it never runs the
 * workspace build that would index the classpath document as a side effect. Without this call,
 * `IndexManager.allElements('JavaClass')` stays empty and no Java class linking that goes
 * through the global scope (`resolveClassScopeByName`) can resolve, even though
 * `getResolvedClass()`/`resolveClassByName()` already return the class correctly.
 */
export async function indexJavaClasspathDocument(shared: LangiumSharedServices): Promise<void> {
  const classpathDoc = shared.workspace.LangiumDocuments.all
    .find(d => d.uri.toString() === JavaSyntheticDocUri);
  if (!classpathDoc) {
    throw new Error('The Java classpath document (classpath:/bbj.bbl) was not found in LangiumDocuments — a broken test setup must fail loudly rather than silently skip indexing.');
  }
  await shared.workspace.IndexManager.updateContent(classpathDoc);
  classpathDoc.state = DocumentState.IndexedContent;
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
