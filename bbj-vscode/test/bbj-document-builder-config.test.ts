import type { LangiumSharedCoreServices } from 'langium';
import { DefaultDocumentBuilder, EmptyFileSystem, URI } from 'langium';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { CancellationToken } from 'vscode-jsonrpc';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { createBBjServices } from '../src/language/bbj-module.js';
import { BBjDocumentBuilder, isBuildableDocumentUri } from '../src/language/bbj-document-builder.js';

/**
 * Coverage for `isBuildableDocumentUri` and `BBjDocumentBuilder.update`'s config filter (#650): a
 * `bbx-config` document must never reach Langium's own `DocumentBuilder.update`/`build` — it
 * reaches this server only for its composer cue, and Phase 84's "never parsed" invariant is
 * re-pinned here for the widened `bbx-config`-reaches-the-server routing.
 */

const CONFIG_URI = URI.parse('file:///proj/config.bbx');
const CONFIG_NAMED_BBJ_URI = URI.parse('file:///proj/myconfig.bbj');
const OPEN_BBJ_URI = URI.parse('file:///proj/open.bbj');
const UNOPENED_BBJ_URI = URI.parse('file:///proj/unopened.bbj');
const UNOPENED_BBX_URI = URI.parse('file:///proj/unopened-config.bbx');

/**
 * A `TextDocuments`-shaped stub: `.get()` returns a real `TextDocument` (so `.languageId` is a
 * live field, not a hand-rolled shape) for exactly the uris registered via `open()`.
 */
function fakeTextDocuments() {
    const open = new Map<string, TextDocument>();
    return {
        open(uri: URI, languageId: string, text = ''): void {
            open.set(uri.toString(), TextDocument.create(uri.toString(), languageId, 1, text));
        },
        get(uri: URI): TextDocument | undefined {
            return open.get(uri.toString());
        },
    };
}

describe('isBuildableDocumentUri (#650)', () => {
    test('false for an open document whose language id is bbx-config, even named *.bbj', () => {
        const services = createBBjServices(EmptyFileSystem);
        const textDocuments = fakeTextDocuments();
        textDocuments.open(CONFIG_NAMED_BBJ_URI, 'bbx-config');

        expect(isBuildableDocumentUri(CONFIG_NAMED_BBJ_URI, textDocuments, services.shared.ServiceRegistry)).toBe(false);
    });

    test('false for an unopened uri with a config extension — no registered services', () => {
        const services = createBBjServices(EmptyFileSystem);
        const textDocuments = fakeTextDocuments();

        expect(isBuildableDocumentUri(UNOPENED_BBX_URI, textDocuments, services.shared.ServiceRegistry)).toBe(false);
    });

    test('true for an open document whose language id is bbj', () => {
        const services = createBBjServices(EmptyFileSystem);
        const textDocuments = fakeTextDocuments();
        textDocuments.open(OPEN_BBJ_URI, 'bbj');

        expect(isBuildableDocumentUri(OPEN_BBJ_URI, textDocuments, services.shared.ServiceRegistry)).toBe(true);
    });

    test('true for an unopened .bbj uri — resolved by extension via the service registry', () => {
        const services = createBBjServices(EmptyFileSystem);
        const textDocuments = fakeTextDocuments();

        expect(isBuildableDocumentUri(UNOPENED_BBJ_URI, textDocuments, services.shared.ServiceRegistry)).toBe(true);
    });
});

describe('BBjDocumentBuilder.update filters config documents before the base update (#650)', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    function buildHarness() {
        const services = createBBjServices(EmptyFileSystem);
        const textDocuments = fakeTextDocuments();
        const fakeServices = {
            workspace: {
                LangiumDocuments: services.shared.workspace.LangiumDocuments,
                LangiumDocumentFactory: services.shared.workspace.LangiumDocumentFactory,
                TextDocuments: textDocuments,
                IndexManager: services.shared.workspace.IndexManager,
                FileSystemProvider: services.shared.workspace.FileSystemProvider,
                WorkspaceManager: services.shared.workspace.WorkspaceManager,
            },
            ServiceRegistry: services.shared.ServiceRegistry,
        };
        const builder = new BBjDocumentBuilder(fakeServices as unknown as LangiumSharedCoreServices);
        return { builder, textDocuments };
    }

    test('a config uri mixed with a bbj uri: base update is called once with only the bbj uri', async () => {
        const { builder, textDocuments } = buildHarness();
        textDocuments.open(CONFIG_URI, 'bbx-config');
        textDocuments.open(OPEN_BBJ_URI, 'bbj');
        const updateSpy = vi.spyOn(DefaultDocumentBuilder.prototype, 'update').mockResolvedValue(undefined);

        await builder.update([CONFIG_URI, OPEN_BBJ_URI], [], CancellationToken.None);

        expect(updateSpy).toHaveBeenCalledTimes(1);
        expect(updateSpy).toHaveBeenCalledWith([OPEN_BBJ_URI], [], CancellationToken.None);
    });

    test('a config-only change: base update is never called', async () => {
        const { builder, textDocuments } = buildHarness();
        textDocuments.open(CONFIG_URI, 'bbx-config');
        const updateSpy = vi.spyOn(DefaultDocumentBuilder.prototype, 'update').mockResolvedValue(undefined);

        await builder.update([CONFIG_URI], [], CancellationToken.None);

        expect(updateSpy).not.toHaveBeenCalled();
    });

    test('a config change alongside a deletion: base update is called with an empty changed list and the deletion', async () => {
        const { builder, textDocuments } = buildHarness();
        textDocuments.open(CONFIG_URI, 'bbx-config');
        const deletedUri = URI.parse('file:///proj/deleted.bbj');
        const updateSpy = vi.spyOn(DefaultDocumentBuilder.prototype, 'update').mockResolvedValue(undefined);

        await builder.update([CONFIG_URI], [deletedUri], CancellationToken.None);

        expect(updateSpy).toHaveBeenCalledTimes(1);
        expect(updateSpy).toHaveBeenCalledWith([], [deletedUri], CancellationToken.None);
    });
});
