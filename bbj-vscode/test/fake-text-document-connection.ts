import type { NormalizedTextDocuments } from 'langium/lsp';
import type {
    Connection,
    Disposable,
    DidCloseTextDocumentParams,
    DidChangeTextDocumentParams,
    DidOpenTextDocumentParams,
    DidSaveTextDocumentParams,
    NotificationHandler,
    RequestHandler,
    TextDocumentContentChangeEvent,
    TextEdit,
    WillSaveTextDocumentParams,
} from 'vscode-languageserver';

/**
 * The six registration methods `NormalizedTextDocuments.listen()` actually calls on the
 * connection it is given -- see `NormalizedTextDocuments.listen()` in Langium's own
 * `normalized-text-documents.ts`. A real `Connection` exposes dozens of other LSP methods this
 * fake never needs to implement; every call site below passes this structural object to `listen`
 * via a structural cast, never as a real `Connection`.
 */
type FakeConnection = Pick<Connection,
    'onDidOpenTextDocument' |
    'onDidChangeTextDocument' |
    'onDidCloseTextDocument' |
    'onWillSaveTextDocument' |
    'onWillSaveTextDocumentWaitUntil' |
    'onDidSaveTextDocument'
>;

const NOOP_DISPOSABLE: Disposable = { dispose: () => { /* no-op */ } };

/** Drives a real `NormalizedTextDocuments` the way a client's six LSP notifications do. */
export interface FakeTextDocumentClient {
    open(uri: string, version: number, text: string, languageId?: string): void;
    change(uri: string, version: number, contentChanges: TextDocumentContentChangeEvent[]): void;
    save(uri: string): void;
    close(uri: string): void;
}

/**
 * Builds a structural connection object whose six registration methods
 * (`onDidOpenTextDocument`, `onDidChangeTextDocument`, `onDidCloseTextDocument`,
 * `onWillSaveTextDocument`, `onWillSaveTextDocumentWaitUntil`, `onDidSaveTextDocument`) store the
 * handler `textDocuments.listen(...)` registers and return a no-op `Disposable`, then calls
 * `textDocuments.listen(...)` with it (a structural cast -- `FakeConnection` covers only the six
 * methods `listen()` actually calls, not the whole `Connection` surface). Returns a
 * `FakeTextDocumentClient` whose `open`/`change`/`save`/`close` methods invoke the stored handler
 * with the same LSP notification params shape a real client sends, so `open`/`change` drive the
 * store's own update path (`_syncedDocuments`, `onDidOpen`/`onDidChangeContent` firing) exactly as
 * a real editor would, and `save` fires the real `onDidSave` event -- the event this phase's
 * `BBjDocumentBuilder` listener needs a real driver for.
 */
export function listenOnFakeConnection(textDocuments: NormalizedTextDocuments): FakeTextDocumentClient {
    let openHandler: NotificationHandler<DidOpenTextDocumentParams> | undefined;
    let changeHandler: NotificationHandler<DidChangeTextDocumentParams> | undefined;
    let closeHandler: NotificationHandler<DidCloseTextDocumentParams> | undefined;
    let saveHandler: NotificationHandler<DidSaveTextDocumentParams> | undefined;

    const fakeConnection: FakeConnection = {
        onDidOpenTextDocument(handler: NotificationHandler<DidOpenTextDocumentParams>): Disposable {
            openHandler = handler;
            return NOOP_DISPOSABLE;
        },
        onDidChangeTextDocument(handler: NotificationHandler<DidChangeTextDocumentParams>): Disposable {
            changeHandler = handler;
            return NOOP_DISPOSABLE;
        },
        onDidCloseTextDocument(handler: NotificationHandler<DidCloseTextDocumentParams>): Disposable {
            closeHandler = handler;
            return NOOP_DISPOSABLE;
        },
        onWillSaveTextDocument(_handler: NotificationHandler<WillSaveTextDocumentParams>): Disposable {
            return NOOP_DISPOSABLE;
        },
        onWillSaveTextDocumentWaitUntil(_handler: RequestHandler<WillSaveTextDocumentParams, TextEdit[] | undefined | null, void>): Disposable {
            return NOOP_DISPOSABLE;
        },
        onDidSaveTextDocument(handler: NotificationHandler<DidSaveTextDocumentParams>): Disposable {
            saveHandler = handler;
            return NOOP_DISPOSABLE;
        },
    };

    textDocuments.listen(fakeConnection as unknown as Connection);

    return {
        open(uri: string, version: number, text: string, languageId = 'bbj'): void {
            openHandler?.({ textDocument: { uri, languageId, version, text } });
        },
        change(uri: string, version: number, contentChanges: TextDocumentContentChangeEvent[]): void {
            changeHandler?.({ textDocument: { uri, version }, contentChanges });
        },
        save(uri: string): void {
            saveHandler?.({ textDocument: { uri } });
        },
        close(uri: string): void {
            closeHandler?.({ textDocument: { uri } });
        },
    };
}

/** A zero-width ranged change inserting `text` at `line`/`character` -- an incremental edit, not
 * a whole-document replacement. */
export function insertTextAt(line: number, character: number, text: string): TextDocumentContentChangeEvent {
    const position = { line, character };
    return { range: { start: position, end: position }, text };
}

/** A ranged change replacing every line from `startLine` up to (not including) `endLineExclusive`
 * with `text`, from column 0 of `startLine` to column 0 of `endLineExclusive`. */
export function replaceLines(startLine: number, endLineExclusive: number, text: string): TextDocumentContentChangeEvent {
    return {
        range: {
            start: { line: startLine, character: 0 },
            end: { line: endLineExclusive, character: 0 },
        },
        text,
    };
}
