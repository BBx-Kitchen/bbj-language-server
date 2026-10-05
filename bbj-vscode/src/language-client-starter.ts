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
     * Starts the client on the first call and returns the same promise to every caller while that
     * attempt is in flight or after it succeeded, so concurrent triggers share one start and a
     * command can await readiness. A failed attempt rejects every caller that shared it, is
     * reported once through the `onStartError` the starter was created with, and is then forgotten:
     * the next call starts a new attempt, so a user who fixed the cause does not have to reload.
     */
    ensureStarted(): Promise<void>;
    /** Whether a start is in flight or has succeeded. False before the first call and after a failed attempt. */
    isStarted(): boolean;
}

/**
 * The reason a command could not run because the language server did not start. The starter has
 * already reported the underlying failure, so a command that catches this one stays quiet instead
 * of adding a second, less informative message.
 */
export class LanguageServerStartError extends Error {
    constructor(cause: unknown) {
        super(cause instanceof Error ? cause.message : String(cause), { cause });
        this.name = 'LanguageServerStartError';
    }
}

/**
 * Waits for the server on behalf of a command. Resolves once it is running; rejects with a
 * {@link LanguageServerStartError} when the start failed, so the command can stop before it sends
 * a request to a client that never came up.
 */
export async function ensureStartedForCommand(starter: LanguageClientStarter): Promise<void> {
    try {
        await starter.ensureStarted();
    } catch (error) {
        throw new LanguageServerStartError(error);
    }
}

/**
 * @param start performs one start attempt.
 * @param onStartError called once per failed attempt, however many callers shared it; an error it
 *        throws is ignored so the caller still sees the start failure.
 */
export function createLanguageClientStarter(
    start: () => Promise<void>,
    onStartError: (error: unknown) => void = () => undefined
): LanguageClientStarter {
    let pending: Promise<void> | undefined;
    return {
        ensureStarted(): Promise<void> {
            if (pending === undefined) {
                const attempt: Promise<void> = new Promise<void>(resolve => resolve(start())).catch(error => {
                    // Forget the failed attempt unless a newer one already replaced it.
                    if (pending === attempt) {
                        pending = undefined;
                    }
                    try {
                        onStartError(error);
                    } catch {
                        // Reporting must not hide the failure from the callers.
                    }
                    throw error;
                });
                pending = attempt;
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
 * one that opens later. Documents of any other language never start it. A document that opens
 * after a failed attempt starts a new one. Returns the listener's disposable.
 */
export function startOnServerDocuments(
    starter: LanguageClientStarter,
    source: DocumentSource
): { dispose(): void } {
    const trigger = (document: DocumentLike): void => {
        if (SERVER_LANGUAGE_IDS.includes(document.languageId)) {
            // The starter reports a failed attempt itself; this only keeps the rejection handled.
            starter.ensureStarted().catch(() => undefined);
        }
    };
    for (const document of source.openDocuments()) {
        trigger(document);
    }
    return source.onDidOpen(trigger);
}
