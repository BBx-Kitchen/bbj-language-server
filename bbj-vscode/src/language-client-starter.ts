/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * Lazy start of the language client. The extension activates on startup so that it can watch for
 * tokenized programs, but the language server it spawns connects to the Java interop service and
 * is only useful once a BBj document exists. This module decides *when* the single start happens;
 * it knows nothing about the editor, so it is unit-testable with plain objects.
 */

/** The document languages that make the server worth starting. */
export const SERVER_LANGUAGE_IDS: readonly string[] = ['bbj', 'bbx-config'];

export interface LanguageClientStarter {
    /**
     * Starts the client on the first call and returns the same promise on every later call, so
     * concurrent triggers share one start and a command can await readiness. The promise of a
     * failed start stays cached: the failure is reported once by the start function, and later
     * triggers do not retry on every document that opens.
     */
    ensureStarted(): Promise<void>;
    /** Whether a start was requested (it may still be in flight or have failed). */
    isStarted(): boolean;
}

export function createLanguageClientStarter(start: () => Promise<void>): LanguageClientStarter {
    let pending: Promise<void> | undefined;
    return {
        ensureStarted(): Promise<void> {
            if (pending === undefined) {
                try {
                    pending = Promise.resolve(start());
                } catch (error) {
                    pending = Promise.reject(error);
                }
            }
            return pending;
        },
        isStarted(): boolean {
            return pending !== undefined;
        }
    };
}

/** The slice of a text document the trigger looks at. */
export interface DocumentLike {
    languageId: string;
}

/** The editor-side events the trigger needs, injected so no editor host is required. */
export interface DocumentSource {
    /** The documents that are open right now. */
    openDocuments(): Iterable<DocumentLike>;
    /** Subscribes to documents being opened. */
    onDidOpen(listener: (document: DocumentLike) => void): { dispose(): void };
}

/**
 * Starts the client on the first BBj document: one that is already open when this is called, or
 * one that opens later. Documents of any other language never start it. Returns the listener's
 * disposable.
 */
export function startOnServerDocuments(
    starter: LanguageClientStarter,
    source: DocumentSource,
    onStartError: (error: unknown) => void = () => undefined
): { dispose(): void } {
    const trigger = (document: DocumentLike): void => {
        if (SERVER_LANGUAGE_IDS.includes(document.languageId)) {
            starter.ensureStarted().catch(onStartError);
        }
    };
    for (const document of source.openDocuments()) {
        trigger(document);
    }
    return source.onDidOpen(trigger);
}
